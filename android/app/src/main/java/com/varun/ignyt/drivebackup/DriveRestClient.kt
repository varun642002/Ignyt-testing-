package com.varun.ignyt.drivebackup

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Minimal Drive v3 REST client over plain HttpURLConnection -- deliberately NOT the
 * google-api-services-drive client library (heavy, and this project avoids adding
 * dependencies beyond what's strictly needed after the @capacitor/filesystem Kotlin-version
 * incident; see DriveBackupPlugin's header). Every call takes a fresh OAuth access token
 * (drive.file scope, short-lived ~1hr) obtained by the caller via the Authorization API.
 *
 * All methods are blocking network I/O -- callers must run them off the main thread
 * (DriveBackupPlugin does this via Dispatchers.IO).
 */
object DriveRestClient {
    private const val FILES_URL = "https://www.googleapis.com/drive/v3/files"
    private const val UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"
    private const val FOLDER_MIME = "application/vnd.google-apps.folder"
    const val BACKUP_FOLDER_NAME = "IGNYT Backups"

    private fun conn(urlStr: String, method: String, accessToken: String): HttpURLConnection {
        val c = URL(urlStr).openConnection() as HttpURLConnection
        c.requestMethod = method
        c.setRequestProperty("Authorization", "Bearer $accessToken")
        c.connectTimeout = 15000
        c.readTimeout = 20000
        return c
    }

    private fun readBody(c: HttpURLConnection): String {
        val stream = if (c.responseCode in 200..299) c.inputStream else c.errorStream
        return stream?.bufferedReader()?.use { it.readText() } ?: ""
    }

    private fun escapeForQuery(s: String) = s.replace("\\", "\\\\").replace("'", "\\'")

    /** Finds the "IGNYT Backups" folder (created by this app, drive.file-scope visible),
     *  creating it on first use. */
    fun ensureBackupFolder(accessToken: String): String {
        val query = URLEncoder.encode(
            "name='${escapeForQuery(BACKUP_FOLDER_NAME)}' and mimeType='$FOLDER_MIME' and trashed=false", "UTF-8"
        )
        val c = conn("$FILES_URL?q=$query&fields=files(id,name)&spaces=drive", "GET", accessToken)
        val body = readBody(c)
        val code = c.responseCode
        c.disconnect()
        if (code !in 200..299) throw RuntimeException("Drive folder lookup failed ($code): $body")
        val files = JSONObject(body).optJSONArray("files") ?: JSONArray()
        if (files.length() > 0) return files.getJSONObject(0).getString("id")

        val createConn = conn(FILES_URL, "POST", accessToken)
        createConn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
        createConn.doOutput = true
        val meta = JSONObject().apply { put("name", BACKUP_FOLDER_NAME); put("mimeType", FOLDER_MIME) }
        createConn.outputStream.use { it.write(meta.toString().toByteArray(Charsets.UTF_8)) }
        val createBody = readBody(createConn)
        val createCode = createConn.responseCode
        createConn.disconnect()
        if (createCode !in 200..299) throw RuntimeException("Drive folder create failed ($createCode): $createBody")
        return JSONObject(createBody).getString("id")
    }

    /** Standard Drive v3 multipart upload (JSON metadata part + JSON media part). */
    fun uploadFile(accessToken: String, folderId: String, fileName: String, content: String): JSONObject {
        val boundary = "ignyt-backup-" + System.currentTimeMillis()
        val metadata = JSONObject().apply { put("name", fileName); put("parents", JSONArray().put(folderId)) }
        val body = buildString {
            append("--").append(boundary).append("\r\n")
            append("Content-Type: application/json; charset=UTF-8\r\n\r\n")
            append(metadata.toString())
            append("\r\n--").append(boundary).append("\r\n")
            append("Content-Type: application/json\r\n\r\n")
            append(content)
            append("\r\n--").append(boundary).append("--")
        }
        val c = conn("$UPLOAD_URL?uploadType=multipart&fields=id,name,size,createdTime", "POST", accessToken)
        c.setRequestProperty("Content-Type", "multipart/related; boundary=$boundary")
        c.doOutput = true
        c.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
        val respBody = readBody(c)
        val code = c.responseCode
        c.disconnect()
        if (code !in 200..299) throw RuntimeException("Drive upload failed ($code): $respBody")
        return JSONObject(respBody)
    }

    /** Newest-first, so callers can prune everything past index 9 for "keep last 10". */
    fun listFilesInFolder(accessToken: String, folderId: String): JSONArray {
        val query = URLEncoder.encode("'$folderId' in parents and trashed=false", "UTF-8")
        val fields = URLEncoder.encode("files(id,name,size,createdTime)", "UTF-8")
        val c = conn("$FILES_URL?q=$query&fields=$fields&orderBy=createdTime desc&pageSize=100", "GET", accessToken)
        val body = readBody(c)
        val code = c.responseCode
        c.disconnect()
        if (code !in 200..299) throw RuntimeException("Drive list failed ($code): $body")
        return JSONObject(body).optJSONArray("files") ?: JSONArray()
    }

    fun downloadFile(accessToken: String, fileId: String): String {
        val c = conn("$FILES_URL/$fileId?alt=media", "GET", accessToken)
        val code = c.responseCode
        if (code !in 200..299) {
            val err = readBody(c); c.disconnect()
            throw RuntimeException("Drive download failed ($code): $err")
        }
        val content = c.inputStream.bufferedReader().use { it.readText() }
        c.disconnect()
        return content
    }

    fun deleteFile(accessToken: String, fileId: String) {
        val c = conn("$FILES_URL/$fileId", "DELETE", accessToken)
        val code = c.responseCode
        val body = if (code !in 200..299) readBody(c) else ""
        c.disconnect()
        if (code !in 200..299 && code != 404) throw RuntimeException("Drive delete failed ($code): $body")
    }
}
