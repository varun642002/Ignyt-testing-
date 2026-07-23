package com.varun.ignyt.drivebackup

import android.app.Activity
import android.content.Context
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Scope
import com.varun.ignyt.MainActivity
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

/**
 * Google Drive backup/restore, hand-rolled like every other IGNYT plugin -- no third-party
 * Capacitor plugin. Uses Google Identity Services' Authorization API
 * (com.google.android.gms:play-services-auth, a stable Java-first library, not a source of the
 * Kotlin-metadata problems that ruled out @capacitor/filesystem/@capacitor/share earlier) to
 * get a drive.file-scoped OAuth access token -- the SAME OAuth client google-services.json
 * already registers for IgnytAuth's sign-in, so no separate Google Cloud Console client setup
 * is needed, only the Drive API enabled for that project. Drive REST calls themselves go
 * through DriveRestClient (plain HttpURLConnection, no google-api-services-drive dependency).
 *
 * drive.file scope (not full "drive") means this app can only see/manage files IT created --
 * the "IGNYT Backups" folder and the backup files inside it -- nothing else in the user's
 * Drive, which is both the least-scary consent screen and the correct least-privilege scope
 * for a backup feature.
 *
 * Same contract as the other plugins: resolves {"success"/...}, never rejects.
 */
private val DRIVE_FILE_SCOPE = Scope("https://www.googleapis.com/auth/drive.file")

@CapacitorPlugin(name = "IgnytDrive")
class DriveBackupPlugin : com.getcapacitor.Plugin() {

    companion object {
        private const val PREFS = "ignyt_drive_prefs"
        private const val KEEP_BACKUPS = 10
    }

    private val pluginScope = CoroutineScope(
        SupervisorJob() + Dispatchers.Main + CoroutineExceptionHandler { _, e ->
            android.util.Log.e("IgnytDrive", "Unhandled coroutine exception in DriveBackupPlugin", e)
        }
    )

    override fun handleOnDestroy() { pluginScope.cancel() }

    private fun prefs() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun saveAccount(email: String, name: String, photo: String) {
        prefs().edit().putString("email", email).putString("name", name).putString("photo", photo).apply()
    }

    private fun clearAccount() { prefs().edit().clear().apply() }

    @PluginMethod
    fun isConfigured(call: PluginCall) {
        // Reuses the OAuth web client id google-services.json already generates for IgnytAuth
        // -- if that resource is missing, Drive can't work either.
        val resId = context.resources.getIdentifier("default_web_client_id", "string", context.packageName)
        call.resolve(JSObject().apply { put("configured", resId != 0) })
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        val act = activity as? MainActivity
        if (act == null) { resolveError(call, "Drive connect requires the app to be in the foreground."); return }
        pluginScope.launch {
            val token = authorize(act)
            if (token == null) { resolveError(call, "Google Drive access was not granted."); return@launch }
            // The Authorization API alone doesn't return profile info -- reuse Firebase Auth's
            // current user if already signed in via IgnytAuth (same Google account in virtually
            // all cases); otherwise fall back to a generic label rather than guessing.
            val fbUser = try {
                if (com.google.firebase.FirebaseApp.getApps(context).isNotEmpty())
                    com.google.firebase.auth.FirebaseAuth.getInstance().currentUser else null
            } catch (e: Exception) { null }
            val email = fbUser?.email ?: ""
            val name = fbUser?.displayName?.takeIf { it.isNotBlank() } ?: "Google Drive"
            val photo = fbUser?.photoUrl?.toString() ?: ""
            saveAccount(email, name, photo)
            resolveSuccess(call, JSObject().apply {
                put("account", JSObject().apply { put("email", email); put("displayName", name); put("photoUrl", photo) })
            })
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        clearAccount()
        resolveSuccess(call, JSObject().apply { put("disconnected", true) })
    }

    @PluginMethod
    fun backupNow(call: PluginCall) {
        val content = call.getString("content")
        val fileName = call.getString("fileName")
        if (content.isNullOrEmpty() || fileName.isNullOrEmpty()) { resolveError(call, "content and fileName are required."); return }
        val act = activity as? MainActivity
        if (act == null) { resolveError(call, "Drive backup requires the app to be in the foreground."); return }
        pluginScope.launch {
            try {
                val token = authorize(act) ?: run { resolveError(call, "Google Drive access was not granted."); return@launch }
                val uploaded = withContext(Dispatchers.IO) {
                    val folderId = DriveRestClient.ensureBackupFolder(token)
                    val result = DriveRestClient.uploadFile(token, folderId, fileName, content)
                    pruneOldBackups(token, folderId)
                    result
                }
                resolveSuccess(call, JSObject().apply {
                    put("fileId", uploaded.getString("id"))
                    put("fileName", uploaded.optString("name", fileName))
                })
            } catch (e: Exception) {
                resolveError(call, "Backup failed: ${e.message}")
            }
        }
    }

    private fun pruneOldBackups(token: String, folderId: String) {
        val files = DriveRestClient.listFilesInFolder(token, folderId) // newest-first already
        for (i in KEEP_BACKUPS until files.length()) {
            try { DriveRestClient.deleteFile(token, files.getJSONObject(i).getString("id")) }
            catch (e: Exception) { /* best-effort pruning; a stray extra file isn't fatal */ }
        }
    }

    @PluginMethod
    fun listBackups(call: PluginCall) {
        val act = activity as? MainActivity
        if (act == null) { resolveError(call, "Requires the app to be in the foreground."); return }
        pluginScope.launch {
            try {
                val token = authorize(act) ?: run { resolveError(call, "Google Drive access was not granted."); return@launch }
                val arr = withContext(Dispatchers.IO) {
                    val folderId = DriveRestClient.ensureBackupFolder(token)
                    val files = DriveRestClient.listFilesInFolder(token, folderId)
                    val out = JSONArray()
                    for (i in 0 until files.length()) {
                        val f = files.getJSONObject(i)
                        out.put(JSONObject().apply {
                            put("fileId", f.getString("id"))
                            put("name", f.optString("name", ""))
                            put("sizeBytes", f.optString("size", "0"))
                            put("createdTime", f.optString("createdTime", ""))
                        })
                    }
                    out
                }
                resolveSuccess(call, JSObject().apply { put("backups", arr) })
            } catch (e: Exception) {
                resolveError(call, "Couldn't list backups: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun downloadBackup(call: PluginCall) {
        val fileId = call.getString("fileId")
        if (fileId.isNullOrEmpty()) { resolveError(call, "fileId is required."); return }
        val act = activity as? MainActivity
        if (act == null) { resolveError(call, "Requires the app to be in the foreground."); return }
        pluginScope.launch {
            try {
                val token = authorize(act) ?: run { resolveError(call, "Google Drive access was not granted."); return@launch }
                val content = withContext(Dispatchers.IO) { DriveRestClient.downloadFile(token, fileId) }
                resolveSuccess(call, JSObject().apply { put("content", content) })
            } catch (e: Exception) {
                resolveError(call, "Download failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun deleteBackup(call: PluginCall) {
        val fileId = call.getString("fileId")
        if (fileId.isNullOrEmpty()) { resolveError(call, "fileId is required."); return }
        val act = activity as? MainActivity
        if (act == null) { resolveError(call, "Requires the app to be in the foreground."); return }
        pluginScope.launch {
            try {
                val token = authorize(act) ?: run { resolveError(call, "Google Drive access was not granted."); return@launch }
                withContext(Dispatchers.IO) { DriveRestClient.deleteFile(token, fileId) }
                resolveSuccess(call, JSObject().apply { put("deleted", true) })
            } catch (e: Exception) {
                resolveError(call, "Delete failed: ${e.message}")
            }
        }
    }

    /** Requests (or silently re-confirms) the drive.file OAuth grant and returns a fresh
     *  access token, or null if it couldn't be obtained / the user declined. Suspends across
     *  any consent UI, which is launched via MainActivity.launchDriveAuthorization (an
     *  IntentSender, so it can't go through Capacitor's own Intent-only activity-result
     *  helper). */
    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    private suspend fun authorize(act: MainActivity): String? {
        val request = AuthorizationRequest.builder().setRequestedScopes(listOf(DRIVE_FILE_SCOPE)).build()
        val client = Identity.getAuthorizationClient(act)
        return suspendCancellableCoroutine { cont ->
            client.authorize(request)
                .addOnSuccessListener { result: AuthorizationResult ->
                    if (result.hasResolution()) {
                        val pending = result.pendingIntent
                        if (pending == null) { cont.resume(null, null); return@addOnSuccessListener }
                        act.launchDriveAuthorization(pending.intentSender) { resultCode, data ->
                            if (resultCode != Activity.RESULT_OK || data == null) {
                                cont.resume(null, null)
                            } else {
                                try {
                                    val finalResult = client.getAuthorizationResultFromIntent(data)
                                    cont.resume(finalResult.accessToken, null)
                                } catch (e: ApiException) {
                                    cont.resume(null, null)
                                }
                            }
                        }
                    } else {
                        cont.resume(result.accessToken, null)
                    }
                }
                .addOnFailureListener { cont.resume(null, null) }
        }
    }

    private fun resolveSuccess(call: PluginCall, data: JSObject) {
        call.resolve(JSObject().apply { put("success", true); put("data", data) })
    }

    private fun resolveError(call: PluginCall, message: String) {
        call.resolve(JSObject().apply { put("success", false); put("error", message) })
    }
}
