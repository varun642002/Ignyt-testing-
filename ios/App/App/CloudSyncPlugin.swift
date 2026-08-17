import Foundation
import Capacitor
import FirebaseCore
import FirebaseAuth
import FirebaseFirestore

/*
 Cloud sync for iOS, registered as `IgnytCloudSync` — the same plugin name and the same five
 methods CloudSyncPlugin.kt exposes, because cloud-sync.js does
 window.Capacitor.Plugins.IgnytCloudSync[methodName](options) and must not need a per-platform
 branch. Until this existed, that lookup returned undefined on iPhone and every sync failed with
 "IgnytCloudSync.<method> is not available." Nothing was broken in the sync logic; the native
 half had only ever been written for Android.

 THE FIRESTORE LAYOUT IS ANDROID'S, and it has to be, or the two platforms write to different
 places and a user syncing across both silently gets two disjoint accounts:

     users/{uid}                        the profile document   (getUserDoc / setUserDoc)
     users/{uid}/{category}/{docId}     one collection per data category

 Same paths, same field names, same `updatedAt` cursor. A record written on Android is read here
 and vice versa.

 OFFLINE IS NOT AN ERROR. Firestore's local persistence queues writes and serves reads from
 cache, which is the whole reason the Android side reports `queued` and `fromCache` rather than
 failing. Those flags are reproduced exactly: cloud-sync.js already understands them, and
 reporting a queued write as a failure would make the app tell someone their data did not save
 when it did.

 UNVERIFIED AT RUNTIME. Never compiled and never run -- there is no Mac in this toolchain and
 iOS builds go through Codemagic. It also needs the Firebase iOS SDK in CapApp-SPM/Package.swift,
 which is a heavier dependency than StoreKit; if that is absent this file will not compile, which
 is the correct and obvious failure.
 */
@objc(IgnytCloudSyncPlugin)
public class IgnytCloudSyncPlugin: CAPPlugin {

    private var db: Firestore? {
        // Configured by AppDelegate. If Firebase never initialised, every method reports the same
        // "not signed in / unavailable" shape the Android side uses rather than crashing.
        guard FirebaseApp.app() != nil else { return nil }
        return Firestore.firestore()
    }

    private func currentUidOrNull() -> String? {
        return Auth.auth().currentUser?.uid
    }

    /// The exact shape Android returns when there is no signed-in user or no Firestore. The web
    /// layer keys off `success: false` and keeps everything local, so this must not throw.
    private func resolveUnavailable(_ call: CAPPluginCall, _ reason: String = "Not signed in.") {
        call.resolve(["success": false, "error": reason])
    }

    // MARK: - getUserDoc

    @objc func getUserDoc(_ call: CAPPluginCall) {
        guard let uid = currentUidOrNull(), let db = db else { return resolveUnavailable(call) }
        db.collection("users").document(uid).getDocument { snapshot, error in
            if let error = error {
                call.resolve(["success": false, "error": error.localizedDescription])
                return
            }
            call.resolve([
                "success": true,
                "data": snapshot?.data() ?? [:],
                "exists": snapshot?.exists ?? false,
                // Served from the local cache while offline. Not a failure -- see the note above.
                "fromCache": snapshot?.metadata.isFromCache ?? false
            ])
        }
    }

    // MARK: - setUserDoc

    @objc func setUserDoc(_ call: CAPPluginCall) {
        guard let uid = currentUidOrNull(), let db = db else { return resolveUnavailable(call) }
        guard let data = call.getObject("data") else {
            call.resolve(["success": false, "error": "Missing data."])
            return
        }
        /* MERGE, never overwrite. A full replace would delete any field this client did not
           happen to send -- which is exactly what happens when an older build syncs after a
           newer one has added a field. */
        let ref = db.collection("users").document(uid)
        var pending = true
        ref.setData(data, merge: true) { error in
            pending = false
            if let error = error {
                call.resolve(["success": false, "error": error.localizedDescription])
            } else {
                call.resolve(["success": true, "written": true, "queued": false])
            }
        }
        /* Offline, the completion handler does not fire until the write reaches the server --
           possibly hours later. Firestore has already durably queued it, so the call is answered
           now with queued:true rather than hanging. Android reports the same pair of flags. */
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            if pending { call.resolve(["success": true, "written": false, "queued": true]) }
        }
    }

    // MARK: - listCollection

    @objc func listCollection(_ call: CAPPluginCall) {
        guard let uid = currentUidOrNull(), let db = db else { return resolveUnavailable(call) }
        guard let name = call.getString("name") else {
            call.resolve(["success": false, "error": "Missing collection name."])
            return
        }
        // `since` arrives as a STRING from JS (cloud-sync.js sends String(since)) because a
        // millisecond timestamp exceeds what a JS number carries safely through the bridge.
        let since = Double(call.getString("since") ?? "0") ?? 0

        db.collection("users").document(uid).collection(name)
            .whereField("updatedAt", isGreaterThan: since)
            .getDocuments { snapshot, error in
                if let error = error {
                    call.resolve(["success": false, "error": error.localizedDescription])
                    return
                }
                var items: [[String: Any]] = []
                for doc in snapshot?.documents ?? [] {
                    var obj = doc.data()
                    // The web layer keys records by docId; without it a pulled record cannot be
                    // matched to its local counterpart and would be re-created as a duplicate.
                    obj["docId"] = doc.documentID
                    items.append(obj)
                }
                call.resolve([
                    "success": true,
                    "items": items,
                    "fromCache": snapshot?.metadata.isFromCache ?? false
                ])
            }
    }

    // MARK: - writeRecords

    @objc func writeRecords(_ call: CAPPluginCall) {
        guard let uid = currentUidOrNull(), let db = db else { return resolveUnavailable(call) }
        guard let name = call.getString("name"), let records = call.getArray("records") else {
            call.resolve(["success": false, "error": "Missing name or records."])
            return
        }
        let collectionRef = db.collection("users").document(uid).collection(name)
        let batch = db.batch()
        var count = 0
        for case let record as [String: Any] in records {
            guard let docId = record["docId"] as? String, !docId.isEmpty else { continue }
            var payload = record
            payload.removeValue(forKey: "docId")   // the id is the document's name, not a field
            batch.setData(payload, forDocument: collectionRef.document(docId), merge: true)
            count += 1
        }
        if count == 0 {
            call.resolve(["success": true, "written": false, "queued": false])
            return
        }
        var pending = true
        batch.commit { error in
            pending = false
            if let error = error {
                call.resolve(["success": false, "error": error.localizedDescription])
            } else {
                call.resolve(["success": true, "written": true, "queued": false])
            }
        }
        // Same offline reasoning as setUserDoc: durably queued counts as handled, not failed.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            if pending { call.resolve(["success": true, "written": false, "queued": true]) }
        }
    }

    // MARK: - deleteAllUserData

    /* Destructive and irreversible, so it deletes ONLY what it can enumerate and reports what it
       actually removed. Firestore has no recursive delete on the client -- deleting the parent
       document would orphan every subcollection while appearing to succeed, which is the worst
       possible outcome for a "delete my data" action. */
    @objc func deleteAllUserData(_ call: CAPPluginCall) {
        guard let uid = currentUidOrNull(), let db = db else { return resolveUnavailable(call) }
        let categories = call.getArray("categories") as? [String] ?? []
        let userRef = db.collection("users").document(uid)
        let group = DispatchGroup()
        var deleted = 0
        var failure: String?

        for category in categories {
            group.enter()
            userRef.collection(category).getDocuments { snapshot, error in
                defer { group.leave() }
                if let error = error { failure = error.localizedDescription; return }
                let batch = db.batch()
                for doc in snapshot?.documents ?? [] { batch.deleteDocument(doc.reference) }
                deleted += snapshot?.documents.count ?? 0
                if !(snapshot?.documents.isEmpty ?? true) {
                    group.enter()
                    batch.commit { err in
                        if let err = err { failure = err.localizedDescription }
                        group.leave()
                    }
                }
            }
        }

        group.notify(queue: .main) {
            // The profile document last: if a subcollection wipe failed, the parent staying put
            // is what lets a retry find the rest.
            if failure == nil {
                userRef.delete { error in
                    call.resolve([
                        "success": error == nil,
                        "deleted": deleted,
                        "error": error?.localizedDescription ?? NSNull()
                    ])
                }
            } else {
                call.resolve(["success": false, "deleted": deleted, "error": failure!])
            }
        }
    }
}
