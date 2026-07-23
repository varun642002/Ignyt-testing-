package com.varun.ignyt.share

import android.content.ContentValues
import android.content.Intent
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

/**
 * Minimal native sharing for the post-workout share cards. Hand-rolled like every other
 * IGNYT plugin (no third-party Capacitor plugins in this project; the official
 * @capacitor/filesystem ships Kotlin 2.1 code this project's pinned Kotlin 1.9.24 cannot
 * compile). Uses the FileProvider already declared in AndroidManifest (cache-path is
 * exported in res/xml/file_paths.xml).
 *
 * Same contract as the other plugins: resolves {"success": true|false, ...}, never rejects.
 */
@CapacitorPlugin(name = "IgnytShare")
class SharePlugin : com.getcapacitor.Plugin() {

    private fun decodePng(call: PluginCall): ByteArray? {
        val base64 = call.getString("base64")
        if (base64.isNullOrBlank()) {
            resolveError(call, "base64 image data is required.")
            return null
        }
        return try {
            Base64.decode(base64, Base64.DEFAULT)
        } catch (e: Exception) {
            resolveError(call, "Invalid image data.")
            null
        }
    }

    private fun safeFileName(call: PluginCall): String {
        val raw = call.getString("fileName") ?: "ignyt-workout.png"
        return raw.replace(Regex("[^A-Za-z0-9._-]"), "_")
    }

    /** Writes real text content (JSON/CSV export data) to the app cache and opens the system
     *  share sheet with it -- same hand-rolled approach as shareImage() above, generalized
     *  beyond PNGs so Settings > Export Data (backup JSON, workout/measurement/nutrition CSV)
     *  actually produces a file on-device instead of silently no-oping, which is what the
     *  browser-only <a download> blob trick did inside this native WebView. */
    @PluginMethod
    fun shareText(call: PluginCall) {
        try {
            val content = call.getString("content")
            if (content.isNullOrEmpty()) { resolveError(call, "content is required."); return }
            val mimeType = call.getString("mimeType") ?: "text/plain"
            val fileName = safeFileName(call)
            val dir = File(context.cacheDir, "share").apply { mkdirs() }
            val file = File(dir, fileName)
            file.writeText(content)

            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val send = Intent(Intent.ACTION_SEND).apply {
                type = mimeType
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.startActivity(Intent.createChooser(send, "Save or share $fileName"))
            resolveSuccess(call, JSObject().apply { put("shared", true) })
        } catch (e: Exception) {
            resolveError(call, "Share failed: ${e.message ?: "unknown error"}")
        }
    }

    /** Writes the PNG to the app cache and opens the system share sheet with it. */
    @PluginMethod
    fun shareImage(call: PluginCall) {
        try {
            val bytes = decodePng(call) ?: return
            val text = call.getString("text") ?: ""
            val dir = File(context.cacheDir, "share").apply { mkdirs() }
            val file = File(dir, safeFileName(call))
            file.writeBytes(bytes)

            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, uri)
                if (text.isNotBlank()) putExtra(Intent.EXTRA_TEXT, text)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.startActivity(Intent.createChooser(send, "Share workout"))
            resolveSuccess(call, JSObject().apply { put("shared", true) })
        } catch (e: Exception) {
            resolveError(call, "Share failed: ${e.message ?: "unknown error"}")
        }
    }

    /** Saves the PNG where the user can find it: MediaStore Downloads on API 29+ (no
     *  permission needed), the app's external pictures dir on API 26–28 (also permissionless). */
    @PluginMethod
    fun saveImage(call: PluginCall) {
        try {
            val bytes = decodePng(call) ?: return
            val fileName = safeFileName(call)
            val location: String
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                    put(MediaStore.Downloads.MIME_TYPE, "image/png")
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/IGNYT")
                }
                val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: throw IllegalStateException("MediaStore rejected the file")
                context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                    ?: throw IllegalStateException("Could not open output stream")
                location = "Downloads/IGNYT/$fileName"
            } else {
                val dir = File(context.getExternalFilesDir(Environment.DIRECTORY_PICTURES), "IGNYT").apply { mkdirs() }
                val file = File(dir, fileName)
                file.writeBytes(bytes)
                location = file.absolutePath
            }
            resolveSuccess(call, JSObject().apply { put("saved", true); put("location", location) })
        } catch (e: Exception) {
            resolveError(call, "Save failed: ${e.message ?: "unknown error"}")
        }
    }

    private fun resolveSuccess(call: PluginCall, data: JSObject) {
        call.resolve(JSObject().apply { put("success", true); put("data", data) })
    }

    private fun resolveError(call: PluginCall, message: String) {
        call.resolve(JSObject().apply { put("success", false); put("error", message) })
    }
}
