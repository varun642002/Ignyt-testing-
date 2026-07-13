package com.varun.ignyt.cloudsync

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.json.JSONArray
import org.json.JSONObject

/**
 * Capacitor bridge for the Phase 2B cloud-sync foundation. Deliberately tiny surface:
 * it reads and merge-writes exactly ONE Firestore document -- users/{uid} for the currently
 * signed-in Firebase user -- and nothing else. All sync policy (what fields, conflict
 * resolution, validation, triggers) lives in JS where the local data lives; the native side
 * is a dumb, safe pipe.
 *
 * Same contract as HealthConnectPlugin/AuthPlugin: every method resolves
 * {"success": true, "data": ...} or {"success": false, "error": "..."} -- never rejects,
 * never crashes the app, degrades cleanly when Firebase isn't configured or nobody is
 * signed in. The Firestore Android SDK's built-in disk persistence (on by default) gives
 * offline reads from cache and automatic queued-write delivery on reconnect -- no retry
 * loops needed anywhere.
 */
@CapacitorPlugin(name = "IgnytCloudSync")
class CloudSyncPlugin : com.getcapacitor.Plugin() {

    private val pluginScope = CoroutineScope(
        SupervisorJob() + Dispatchers.Main + CoroutineExceptionHandler { _, e ->
            Log.e("IgnytCloudSync", "Unhandled coroutine exception in CloudSyncPlugin", e)
        }
    )

    override fun handleOnDestroy() {
        pluginScope.cancel()
    }

    private fun currentUidOrNull(): String? = try {
        if (FirebaseApp.getApps(context).isEmpty()) null else FirebaseAuth.getInstance().currentUser?.uid
    } catch (e: Exception) {
        Log.w("IgnytCloudSync", "Firebase not available: ${e.message}")
        null
    }

    private fun firestoreOrNull(): FirebaseFirestore? = try {
        if (FirebaseApp.getApps(context).isEmpty()) null else FirebaseFirestore.getInstance()
    } catch (e: Exception) {
        Log.w("IgnytCloudSync", "Firestore not available: ${e.message}")
        null
    }

    /** Reads users/{uid}. Firestore serves from server when online, from its disk cache when
     *  offline; fromCache is passed through so JS can label the result honestly. */
    @PluginMethod
    fun getUserDoc(call: PluginCall) {
        val uid = currentUidOrNull()
        val db = firestoreOrNull()
        if (uid == null || db == null) {
            resolveError(call, if (db == null) "Cloud sync isn't configured in this build." else "Not signed in.")
            return
        }
        pluginScope.launch {
            try {
                // 20s guard: an offline get() normally falls back to cache quickly, but a hung
                // first-ever fetch (no cache yet, dead network) must not stall the JS side forever.
                val snapshot = withTimeout(20_000L) {
                    db.collection("users").document(uid).get().await()
                }
                val data = JSObject().apply {
                    put("exists", snapshot.exists())
                    put("fromCache", snapshot.metadata.isFromCache)
                    if (snapshot.exists()) {
                        put("doc", JSObject.fromJSONObject(mapToJson(snapshot.data ?: emptyMap())))
                    }
                }
                resolveSuccess(call, data)
            } catch (e: TimeoutCancellationException) {
                resolveError(call, "offline: cloud read timed out")
            } catch (e: FirebaseFirestoreException) {
                resolveError(call, firestoreErrorMessage(e))
            } catch (e: Exception) {
                resolveError(call, "Cloud read failed: ${e.message ?: "unknown error"}")
            }
        }
    }

    /** Merge-writes into users/{uid}. SetOptions.merge() means fields not present in this
     *  payload are never touched, let alone deleted -- structurally incapable of wiping a
     *  section it wasn't given. When offline the write is queued durably by Firestore and
     *  delivered on reconnect; that surfaces here as the 12s timeout -> {"queued": true}. */
    @PluginMethod
    fun setUserDoc(call: PluginCall) {
        val uid = currentUidOrNull()
        val db = firestoreOrNull()
        if (uid == null || db == null) {
            resolveError(call, if (db == null) "Cloud sync isn't configured in this build." else "Not signed in.")
            return
        }
        val payload = call.getObject("data")
        if (payload == null || payload.length() == 0) {
            resolveError(call, "setUserDoc requires a non-empty data object.")
            return
        }
        pluginScope.launch {
            try {
                val map = jsonToMap(payload)
                val task = db.collection("users").document(uid).set(map, SetOptions.merge())
                try {
                    withTimeout(12_000L) { task.await() }
                    resolveSuccess(call, JSObject().apply { put("written", true); put("queued", false) })
                } catch (e: TimeoutCancellationException) {
                    // Not a failure: Firestore has accepted the write into its durable local
                    // queue and will sync it when connectivity returns.
                    resolveSuccess(call, JSObject().apply { put("written", false); put("queued", true) })
                }
            } catch (e: FirebaseFirestoreException) {
                resolveError(call, firestoreErrorMessage(e))
            } catch (e: Exception) {
                resolveError(call, "Cloud write failed: ${e.message ?: "unknown error"}")
            }
        }
    }

    // ---- Phase 2C: per-record collections under users/{uid}/{collection}/{docId}. ----

    /** Only these subcollections exist in the IGNYT schema; anything else is refused even
     *  if a compromised/buggy JS layer asks for it. */
    private val allowedCollections = setOf("workouts", "routines", "prs", "bodylog", "races", "customExercises")

    /** Incremental pull: every record in users/{uid}/{collection} whose updatedAt is greater
     *  than sinceMs (JS passes lastPulledAt minus an overlap window to tolerate clock skew
     *  between devices). Single-field inequality queries need no composite index. */
    @PluginMethod
    fun listCollection(call: PluginCall) {
        val uid = currentUidOrNull()
        val db = firestoreOrNull()
        if (uid == null || db == null) {
            resolveError(call, if (db == null) "Cloud sync isn't configured in this build." else "Not signed in.")
            return
        }
        val name = call.getString("name")
        if (name == null || name !in allowedCollections) {
            resolveError(call, "listCollection: unknown collection.")
            return
        }
        val since = call.getString("since")?.toLongOrNull() ?: 0L
        pluginScope.launch {
            try {
                val snapshot = withTimeout(25_000L) {
                    db.collection("users").document(uid).collection(name)
                        .whereGreaterThan("updatedAt", since)
                        .get().await()
                }
                val items = JSONArray()
                for (doc in snapshot.documents) {
                    val obj = mapToJson(doc.data ?: emptyMap())
                    obj.put("docId", doc.id)
                    items.put(obj)
                }
                resolveSuccess(call, JSObject().apply {
                    put("items", items)
                    put("fromCache", snapshot.metadata.isFromCache)
                })
            } catch (e: TimeoutCancellationException) {
                resolveError(call, "offline: cloud read timed out")
            } catch (e: FirebaseFirestoreException) {
                resolveError(call, firestoreErrorMessage(e))
            } catch (e: Exception) {
                resolveError(call, "Cloud read failed: ${e.message ?: "unknown error"}")
            }
        }
    }

    /** Batched merge-writes of record docs. JS keeps batches <= 450 (Firestore's hard limit
     *  is 500 ops). Merge semantics again: a write can never clear fields it doesn't carry.
     *  Offline -> the whole batch is queued durably by Firestore -> {"queued": true}. */
    @PluginMethod
    fun writeRecords(call: PluginCall) {
        val uid = currentUidOrNull()
        val db = firestoreOrNull()
        if (uid == null || db == null) {
            resolveError(call, if (db == null) "Cloud sync isn't configured in this build." else "Not signed in.")
            return
        }
        val name = call.getString("name")
        if (name == null || name !in allowedCollections) {
            resolveError(call, "writeRecords: unknown collection.")
            return
        }
        val records = call.getArray("records")
        if (records == null || records.length() == 0 || records.length() > 450) {
            resolveError(call, "writeRecords requires 1..450 records.")
            return
        }
        pluginScope.launch {
            try {
                val batch = db.batch()
                val collectionRef = db.collection("users").document(uid).collection(name)
                for (i in 0 until records.length()) {
                    val entry = records.getJSONObject(i)
                    val docId = entry.optString("docId", "")
                    val doc = entry.optJSONObject("doc")
                    if (docId.isBlank() || doc == null) {
                        resolveError(call, "writeRecords: every record needs docId and doc.")
                        return@launch
                    }
                    batch.set(collectionRef.document(docId), jsonToMap(doc), SetOptions.merge())
                }
                val task = batch.commit()
                try {
                    withTimeout(15_000L) { task.await() }
                    resolveSuccess(call, JSObject().apply { put("written", true); put("queued", false) })
                } catch (e: TimeoutCancellationException) {
                    resolveSuccess(call, JSObject().apply { put("written", false); put("queued", true) })
                }
            } catch (e: FirebaseFirestoreException) {
                resolveError(call, firestoreErrorMessage(e))
            } catch (e: Exception) {
                resolveError(call, "Cloud write failed: ${e.message ?: "unknown error"}")
            }
        }
    }

    /** Maps Firestore error codes to short machine-checkable prefixes + readable text.
     *  JS keys off the prefix ("offline:", "permission-denied:") -- raw exception text is
     *  never shown to end users. */
    private fun firestoreErrorMessage(e: FirebaseFirestoreException): String = when (e.code) {
        FirebaseFirestoreException.Code.UNAVAILABLE -> "offline: Firestore is unreachable"
        FirebaseFirestoreException.Code.PERMISSION_DENIED -> "permission-denied: check Firestore security rules"
        FirebaseFirestoreException.Code.UNAUTHENTICATED -> "unauthenticated: session expired"
        FirebaseFirestoreException.Code.NOT_FOUND -> "not-found: database missing (create Firestore in Firebase Console)"
        FirebaseFirestoreException.Code.FAILED_PRECONDITION -> "failed-precondition: Firestore database may not exist yet"
        else -> "firestore-error(${e.code}): ${e.message ?: ""}"
    }

    // ---- JSON <-> Map converters. Only plain data crosses this bridge (numbers, strings,
    // booleans, lists, nested maps) -- exactly what the JS layer's allowlists produce. ----

    private fun jsonToMap(obj: JSONObject): Map<String, Any?> {
        val map = mutableMapOf<String, Any?>()
        val keys = obj.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            map[key] = fromJsonValue(obj.get(key))
        }
        return map
    }

    private fun fromJsonValue(value: Any?): Any? = when (value) {
        null, JSONObject.NULL -> null
        is JSONObject -> jsonToMap(value)
        is JSONArray -> (0 until value.length()).map { fromJsonValue(value.get(it)) }
        else -> value // String, Boolean, Int, Long, Double pass through as-is
    }

    private fun mapToJson(map: Map<String, Any?>): JSONObject {
        val obj = JSONObject()
        for ((key, value) in map) obj.put(key, toJsonValue(value))
        return obj
    }

    private fun toJsonValue(value: Any?): Any? = when (value) {
        null -> JSONObject.NULL
        is Map<*, *> -> {
            val obj = JSONObject()
            for ((k, v) in value) if (k is String) obj.put(k, toJsonValue(v))
            obj
        }
        is List<*> -> JSONArray(value.map { toJsonValue(it) })
        is String, is Boolean, is Int, is Long, is Double, is Float -> value
        is com.google.firebase.Timestamp -> value.toDate().time // defensive: shouldn't occur with our schema
        else -> value.toString() // defensive: unknown Firestore type, stringify rather than crash
    }

    private fun resolveSuccess(call: PluginCall, data: JSObject) {
        call.resolve(JSObject().apply { put("success", true); put("data", data) })
    }

    private fun resolveError(call: PluginCall, message: String) {
        call.resolve(JSObject().apply { put("success", false); put("error", message) })
    }
}
