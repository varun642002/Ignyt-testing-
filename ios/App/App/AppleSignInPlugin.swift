import Foundation
import Capacitor
import AuthenticationServices
import CryptoKit
import UIKit

/**
 Sign in with Apple, native half.

 This does ONE job: run Apple's authorisation sheet and hand back the identity token it
 produces. It does not talk to Firebase and knows nothing about IGNYT accounts — that exchange
 happens in js/auth/firebase-rest-auth.js, which is where the rest of iOS's auth already lives.
 Splitting it there keeps the native side to the part that genuinely requires a native API.

 THE NONCE, WHICH IS THE PART THAT LOOKS REDUNDANT AND IS NOT.

 A raw random string is generated here. Apple is given its SHA-256 hash; the raw string goes
 back to JS and is sent to Firebase, which hashes it and compares against the `nonce` claim
 inside the signed token. That round trip is what stops a token captured from one sign-in being
 replayed into another: an attacker holding the token does not hold the raw string it was
 issued against, and the hash in the token cannot be reversed to find it.

 Sending the raw nonce to Apple, or the hash to Firebase, produces a token that verifies
 against nothing and a sign-in that fails with a message about an invalid credential — which is
 why both directions are spelled out at the call site rather than left to be inferred.

 EMAIL AND NAME ARRIVE EXACTLY ONCE. Apple returns them on the FIRST authorisation for a given
 Apple ID and app, and never again — a second sign-in returns nulls, even after the app is
 deleted and reinstalled. They are passed straight up so the JS layer can store them on first
 use; asking Apple for them again later is not possible.
 */
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin,
                                ASAuthorizationControllerDelegate,
                                ASAuthorizationControllerPresentationContextProviding {

    public let identifier = "AppleSignInPlugin"
    public let jsName = "IgnytAppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    /// The call is resolved from a delegate callback rather than from signIn() itself, so it has
    /// to outlive the method. Held here and cleared on the first resolution — Apple's delegate
    /// fires exactly one of the two callbacks, but resolving a Capacitor call twice is a crash
    /// and the guard costs nothing.
    private var pendingCall: CAPPluginCall?
    private var rawNonce: String?

    /* ---------------- availability ---------------- */

    /// Sign in with Apple is iOS 13+. The deployment target is 15, so this is always true here —
    /// it exists because the JS layer asks every provider the same question, and answering
    /// honestly is cheaper than a special case in the caller.
    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": true])
    }

    /* ---------------- sign in ---------------- */

    @objc func signIn(_ call: CAPPluginCall) {
        if pendingCall != nil {
            call.resolve(["success": false, "error": "A sign-in is already in progress."])
            return
        }

        let nonce = Self.randomNonce()
        rawNonce = nonce
        pendingCall = call
        // The call outlives this method; without keepAlive Capacitor may release it before the
        // delegate fires and the promise would never settle.
        call.keepAlive = true

        DispatchQueue.main.async {
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = Self.sha256(nonce)      // Apple gets the HASH

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    /* ---------------- delegate ---------------- */

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pendingCall else { return }
        defer { finish() }

        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8) else {
            call.resolve(["success": false, "error": "Apple did not return an identity token."])
            return
        }

        /* givenName/familyName arrive as parts, and either can be absent. Joined here rather
           than in JS so the web layer receives one displayName field whatever Apple sent, and
           an empty result becomes an empty string rather than the literal "nil nil". */
        var displayName = ""
        if let name = credential.fullName {
            displayName = [name.givenName, name.familyName]
                .compactMap { $0 }
                .joined(separator: " ")
                .trimmingCharacters(in: .whitespaces)
        }

        call.resolve([
            "success": true,
            "identityToken": identityToken,
            // The RAW nonce, for Firebase. Apple received its hash.
            "nonce": rawNonce ?? "",
            "email": credential.email ?? "",
            "displayName": displayName,
            "userIdentifier": credential.user
        ])
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithError error: Error) {
        guard let call = pendingCall else { return }
        defer { finish() }

        /* Cancelling is not a failure and must not be reported as one — a toast saying sign-in
           failed, after the user deliberately dismissed the sheet, is the app arguing with
           them. Flagged separately so the JS layer can stay silent. */
        if let authError = error as? ASAuthorizationError, authError.code == .canceled {
            call.resolve(["success": false, "cancelled": true])
            return
        }
        call.resolve(["success": false, "error": "Apple sign-in failed: \(error.localizedDescription)"])
    }

    private func finish() {
        pendingCall?.keepAlive = false
        pendingCall = nil
        rawNonce = nil
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // The window the WebView is in. Falling back to a fresh UIWindow would present the
        // sheet on a window that is not on screen, which looks exactly like nothing happening.
        return bridge?.viewController?.view.window ?? UIWindow()
    }

    /* ---------------- nonce ---------------- */

    /// SecRandomCopyBytes, not Int.random. This value is the whole replay defence, and a
    /// predictable one is the same as none.
    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length
        while remaining > 0 {
            var byte: UInt8 = 0
            let status = SecRandomCopyBytes(kSecRandomDefault, 1, &byte)
            guard status == errSecSuccess else { continue }
            // Rejection sampling: taking byte % 64 would bias the low characters, because 256
            // is not a multiple of the charset size. 252 is, so anything above it is discarded.
            if byte < 252 {
                result.append(charset[Int(byte) % charset.count])
                remaining -= 1
            }
        }
        return result
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
