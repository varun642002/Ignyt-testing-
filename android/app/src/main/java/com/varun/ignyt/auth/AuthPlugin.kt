package com.varun.ignyt.auth

import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout

/**
 * Capacitor bridge for the IGNYT account layer: email and password, exchanged for a Firebase
 * Authentication session. Firebase Auth persists the session itself and restores it offline,
 * so getCurrentUser() works with no network after a previous successful sign-in.
 *
 * Email/password is the ONLY method. Google Sign-In and phone/SMS were both removed: each
 * carried its own certificate fingerprints, OAuth clients and verification path, and phone in
 * particular could not send a single SMS until Play Integrity succeeded. One method that works
 * everywhere -- including for a Play reviewer with no Indian phone number -- is worth more
 * than three that each fail differently.
 *
 * Same contract as HealthConnectPlugin: every method resolves {"success": true, "data": ...}
 * or {"success": false, "error": "..."} -- never rejects, and never crashes the app.
 */
@CapacitorPlugin(name = "IgnytAuth")
class AuthPlugin : com.getcapacitor.Plugin() {

    // SupervisorJob + handler for the same reason as HealthConnectPlugin: one failing
    // launch{} must never cancel the scope or reach the default handler and crash the app.
    private val pluginScope = CoroutineScope(
        SupervisorJob() + Dispatchers.Main + CoroutineExceptionHandler { _, e ->
            Log.e("IgnytAuth", "Unhandled coroutine exception in AuthPlugin", e)
        }
    )

    override fun handleOnDestroy() {
        pluginScope.cancel()
    }

    /** Null when google-services.json wasn't present at build time (FirebaseInitProvider
     *  then has nothing to initialize) or Firebase itself failed to init. */
    private fun firebaseAuthOrNull(): FirebaseAuth? = try {
        if (FirebaseApp.getApps(context).isEmpty()) null else FirebaseAuth.getInstance()
    } catch (e: Exception) {
        Log.w("IgnytAuth", "Firebase not available: ${e.message}")
        null
    }

    private fun userJson(user: FirebaseUser): JSObject = JSObject().apply {
        put("uid", user.uid)
        put("displayName", user.displayName ?: "")
        put("email", user.email ?: "")
        put("photoUrl", user.photoUrl?.toString() ?: "")
        put("emailVerified", user.isEmailVerified)
        put("provider", "password")   // email/password is the only provider now
    }

    /** Maps Firebase Auth's error codes to short, user-facing text. Falls back to the raw
     *  message for codes not worth a bespoke string. Never exposes stack traces or internal
     *  detail to the JS layer. */
    private fun authErrorMessage(e: FirebaseAuthException): String = when (e.errorCode) {
        "ERROR_INVALID_EMAIL" -> "That doesn't look like a valid email address."
        "ERROR_EMAIL_ALREADY_IN_USE" -> "An account already exists for this email. Try signing in instead."
        "ERROR_WEAK_PASSWORD" -> "Password is too weak — use at least 6 characters."
        "ERROR_WRONG_PASSWORD", "ERROR_INVALID_CREDENTIAL" -> "Incorrect email or password."
        "ERROR_USER_NOT_FOUND" -> "No account found for this email."
        "ERROR_USER_DISABLED" -> "This account has been disabled."
        "ERROR_TOO_MANY_REQUESTS" -> "Too many attempts. Please wait a moment and try again."
        "ERROR_NETWORK_REQUEST_FAILED" -> "Network error. Check your connection and try again."
        else -> e.message ?: "Something went wrong. Please try again."
    }

    /* =====================================================================
       SIGNING FINGERPRINTS

       Firebase phone auth verifies the app through Play Integrity, which is keyed to the
       signing certificate. If the certificate's fingerprints are not registered on the Firebase
       project, verification fails — and it fails with a generic message that says nothing about
       fingerprints, which is why this is such a common time sink.

       SHA-1 alone is not enough. google-services.json only ever carries SHA-1 (the
       certificate_hash field), so that file cannot tell anyone whether SHA-256 is registered;
       only the Firebase Console shows it. Play Integrity requires SHA-256. Rather than leave
       the user guessing, the app computes its OWN certificate fingerprints at runtime and can
       report them for comparison against the Console.

       These are public values — a certificate fingerprint is derived from the public
       certificate shipped inside every copy of the APK. Nothing secret is exposed.
    ===================================================================== */

    private fun fingerprints(): Pair<String, String>? = try {
        val pm = context.packageManager
        val certBytes: ByteArray? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val info = pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
            info.signingInfo?.apkContentsSigners?.firstOrNull()?.toByteArray()
        } else {
            @Suppress("DEPRECATION")
            val info = pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES)
            @Suppress("DEPRECATION")
            info.signatures?.firstOrNull()?.toByteArray()
        }
        if (certBytes == null) null else {
            fun digest(algorithm: String) = java.security.MessageDigest.getInstance(algorithm)
                .digest(certBytes)
                .joinToString(":") { "%02X".format(it) }
            Pair(digest("SHA-1"), digest("SHA-256"))
        }
    } catch (e: Exception) {
        Log.w("IgnytAuth", "Could not read signing certificate: ${e.message}")
        null
    }

    /**
     * Reports the running app's certificate fingerprints so they can be checked against the
     * Firebase Console. Returns both, plus a flag for whether Firebase is initialised at all.
     * Safe to call any time; performs no network I/O and changes no state.
     */
    @PluginMethod
    fun checkSigning(call: PluginCall) {
        try {
            val fp = fingerprints()
            val auth = firebaseAuthOrNull()
            /* Fingerprints are only returned to a DEBUG build. They are public values, but a
               release app has no reason to put its package name and certificate hashes on
               screen — that is developer diagnostics leaking into a shipped product, and the
               gate belongs here rather than in the UI so the web layer cannot decide to show
               what it was never given. `debug` is BuildConfig.DEBUG, which is set by the build
               type and cannot be spoofed from JS. */
            val isDebug: Boolean = com.varun.ignyt.BuildConfig.DEBUG
            val pkg: String = if (isDebug) context.packageName else ""
            val sha1: String = if (isDebug) (fp?.first ?: "") else ""
            val sha256: String = if (isDebug) (fp?.second ?: "") else ""
            resolveSuccess(call, JSObject().apply {
                put("debug", isDebug)
                put("firebaseInitialised", auth != null)
                put("packageName", pkg)
                put("sha1", sha1)
                put("sha256", sha256)
                put("readable", isDebug && fp != null)
            })
        } catch (e: Exception) {
            resolveError(call, "Could not read signing information: ${e.message}")
        }
    }

    /** Reports whether sign-in can work at all on this build/device, without side effects. */
    @PluginMethod
    fun isConfigured(call: PluginCall) {
        try {
            val configured = firebaseAuthOrNull() != null
            resolveSuccess(call, JSObject().apply { put("configured", configured) })
        } catch (e: Exception) {
            resolveError(call, "isConfigured failed: ${e.message}")
        }
    }

    /** Restores the persisted Firebase session. Works fully offline -- Firebase Auth caches
     *  the signed-in user on disk and only refreshes tokens opportunistically. */
    @PluginMethod
    fun getCurrentUser(call: PluginCall) {
        try {
            val auth = firebaseAuthOrNull()
            if (auth == null) {
                resolveSuccess(call, JSObject().apply { put("signedIn", false); put("configured", false) })
                return
            }
            val user = auth.currentUser
            resolveSuccess(call, JSObject().apply {
                put("configured", true)
                put("signedIn", user != null)
                if (user != null) put("user", userJson(user))
            })
        } catch (e: Exception) {
            resolveError(call, "getCurrentUser failed: ${e.message}")
        }
    }

    /**
     * Returns a short-lived Firebase ID token (JWT) for the currently signed-in user, for
     * authenticating requests to the IGNYT Integration Service backend. The backend verifies
     * this token with the Firebase Admin SDK, so it can trust the uid without the client ever
     * asserting one.
     *
     * Security: this returns ONLY the short-lived ID token (default ~1h expiry), minted on
     * demand. No long-lived secret (refresh token, credential) is ever exposed to JS. The
     * token is never logged. `forceRefresh` is accepted so the JS layer can retry once with a
     * fresh token after a 401 without a full re-auth.
     */
    @PluginMethod
    fun getIdToken(call: PluginCall) {
        val auth = firebaseAuthOrNull()
        if (auth == null) {
            resolveError(call, "Sign-in isn't configured in this build (missing Firebase configuration).")
            return
        }
        val user = auth.currentUser
        if (user == null) {
            resolveSuccess(call, JSObject().apply { put("signedIn", false) })
            return
        }
        val forceRefresh = call.getBoolean("forceRefresh", false) ?: false
        pluginScope.launch {
            try {
                // Plain network call when a refresh is needed -> bounded timeout so a hung
                // request never leaves the caller waiting forever. Cached token returns instantly.
                val result = withTimeout(30_000L) { user.getIdToken(forceRefresh).await() }
                val token = result?.token
                if (token.isNullOrBlank()) {
                    resolveError(call, "Could not obtain an ID token. Please sign in again.")
                    return@launch
                }
                resolveSuccess(call, JSObject().apply {
                    put("signedIn", true)
                    put("uid", user.uid)
                    put("token", token)
                })
            } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
                resolveError(call, "Fetching sign-in token timed out. Check your connection and try again.")
            } catch (e: Exception) {
                resolveError(call, "Could not obtain an ID token: ${e.message ?: "unknown error"}")
            }
        }
    }

    @PluginMethod
    fun signUpWithEmail(call: PluginCall) {
        val auth = firebaseAuthOrNull()
        if (auth == null) {
            resolveError(call, "Sign-in isn't configured in this build yet (missing Firebase configuration).")
            return
        }
        val email = call.getString("email")?.trim() ?: ""
        val password = call.getString("password") ?: ""
        if (email.isEmpty() || password.isEmpty()) {
            resolveError(call, "Enter an email and password.")
            return
        }
        pluginScope.launch {
            try {
                val authResult = withTimeout(30_000L) { auth.createUserWithEmailAndPassword(email, password).await() }
                val user = authResult.user
                if (user == null) {
                    resolveError(call, "Account creation completed but no user was returned. Please try again.")
                    return@launch
                }
                // Best-effort: a signup should still succeed locally even if the verification
                // email fails to send (e.g. transient network blip right after account creation).
                try { withTimeout(15_000L) { user.sendEmailVerification().await() } } catch (e: Exception) {
                    Log.w("IgnytAuth", "sendEmailVerification after signup failed: ${e.message}")
                }
                resolveSuccess(call, JSObject().apply { put("signedIn", true); put("user", userJson(user)) })
            } catch (e: FirebaseAuthException) {
                resolveError(call, authErrorMessage(e))
            } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
                resolveError(call, "Sign-up timed out. Check your internet connection and try again.")
            } catch (e: Exception) {
                resolveError(call, "Sign-up failed: ${e.message ?: "unknown error"}")
            }
        }
    }

    @PluginMethod
    fun signInWithEmail(call: PluginCall) {
        val auth = firebaseAuthOrNull()
        if (auth == null) {
            resolveError(call, "Sign-in isn't configured in this build yet (missing Firebase configuration).")
            return
        }
        val email = call.getString("email")?.trim() ?: ""
        val password = call.getString("password") ?: ""
        if (email.isEmpty() || password.isEmpty()) {
            resolveError(call, "Enter an email and password.")
            return
        }
        pluginScope.launch {
            try {
                val authResult = withTimeout(30_000L) { auth.signInWithEmailAndPassword(email, password).await() }
                val user = authResult.user
                if (user == null) {
                    resolveError(call, "Sign-in completed but no user was returned. Please try again.")
                    return@launch
                }
                resolveSuccess(call, JSObject().apply { put("signedIn", true); put("user", userJson(user)) })
            } catch (e: FirebaseAuthException) {
                resolveError(call, authErrorMessage(e))
            } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
                resolveError(call, "Sign-in timed out. Check your internet connection and try again.")
            } catch (e: Exception) {
                resolveError(call, "Sign-in failed: ${e.message ?: "unknown error"}")
            }
        }
    }

    @PluginMethod
    fun sendPasswordReset(call: PluginCall) {
        val auth = firebaseAuthOrNull()
        if (auth == null) {
            resolveError(call, "Sign-in isn't configured in this build yet (missing Firebase configuration).")
            return
        }
        val email = call.getString("email")?.trim() ?: ""
        if (email.isEmpty()) {
            resolveError(call, "Enter your email address.")
            return
        }
        pluginScope.launch {
            try {
                withTimeout(30_000L) { auth.sendPasswordResetEmail(email).await() }
                resolveSuccess(call, JSObject().apply { put("sent", true) })
            } catch (e: FirebaseAuthException) {
                resolveError(call, authErrorMessage(e))
            } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
                resolveError(call, "Request timed out. Check your internet connection and try again.")
            } catch (e: Exception) {
                resolveError(call, "Could not send reset email: ${e.message ?: "unknown error"}")
            }
        }
    }

    /** Resends the verification email to the currently signed-in user. */
    @PluginMethod
    fun sendEmailVerification(call: PluginCall) {
        val auth = firebaseAuthOrNull()
        val user = auth?.currentUser
        if (user == null) {
            resolveError(call, "You need to be signed in to verify your email.")
            return
        }
        pluginScope.launch {
            try {
                withTimeout(15_000L) { user.sendEmailVerification().await() }
                resolveSuccess(call, JSObject().apply { put("sent", true) })
            } catch (e: FirebaseAuthException) {
                resolveError(call, authErrorMessage(e))
            } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
                resolveError(call, "Request timed out. Check your internet connection and try again.")
            } catch (e: Exception) {
                resolveError(call, "Could not send verification email: ${e.message ?: "unknown error"}")
            }
        }
    }

    /** Network call to refresh the current user's data from Firebase (e.g. to pick up
     *  emailVerified turning true after the user taps the link in their inbox). Deliberately
     *  separate from getCurrentUser, which stays instant/offline-safe for the boot path. */
    @PluginMethod
    fun reloadUser(call: PluginCall) {
        val auth = firebaseAuthOrNull()
        val user = auth?.currentUser
        if (user == null) {
            resolveSuccess(call, JSObject().apply { put("signedIn", false) })
            return
        }
        pluginScope.launch {
            try {
                withTimeout(15_000L) { user.reload().await() }
                resolveSuccess(call, JSObject().apply { put("signedIn", true); put("user", userJson(user)) })
            } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
                resolveError(call, "Request timed out. Check your internet connection and try again.")
            } catch (e: Exception) {
                resolveError(call, "Could not refresh account status: ${e.message ?: "unknown error"}")
            }
        }
    }

    @PluginMethod
    fun signOut(call: PluginCall) {
        pluginScope.launch {
            try {
                firebaseAuthOrNull()?.signOut()
            } catch (e: Exception) {
                Log.w("IgnytAuth", "Firebase signOut failed: ${e.message}")
            }
            resolveSuccess(call, JSObject().apply { put("signedOut", true) })
        }
    }

    private fun resolveSuccess(call: PluginCall, data: JSObject) {
        call.resolve(JSObject().apply { put("success", true); put("data", data) })
    }

    private fun resolveError(call: PluginCall, message: String) {
        call.resolve(JSObject().apply { put("success", false); put("error", message) })
    }

}
