package com.varun.ignyt.security

import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.security.MessageDigest

/**
 * Root and tamper signals.
 *
 * READ THIS BEFORE TRUSTING ANY OF IT.
 * Every check below runs inside the process it is trying to vet, which means anything with
 * root can defeat all of them — Magisk's DenyList exists specifically to hide from this class
 * of check, and Frida can patch the results on the way out. Treating these as a security
 * boundary would be a mistake. What they are actually good for:
 *
 *   - telling an ordinary user their device looks compromised, so they can decide
 *   - a signal to attach to a SECURITY EVENT, so a pattern shows up in aggregate
 *   - raising the effort required from "install an APK" to "install an APK and hide from this"
 *
 * They are NOT good for gating access to data, and this plugin deliberately exposes no
 * "isSafe" boolean that a caller might branch security decisions on. It reports what it saw
 * and lets the app decide. The only real integrity boundary is server-side: the backend
 * verifying a Firebase token and a Play purchase, which no amount of client patching reaches.
 *
 * Play Integrity API is the supported answer for attestation and is deliberately NOT
 * reimplemented here badly. Wiring it needs a Cloud project and a server-side verdict check;
 * this plugin is the local, offline-capable signal that sits alongside it.
 */
@CapacitorPlugin(name = "IgnytIntegrity")
class IntegrityPlugin : com.getcapacitor.Plugin() {

    companion object {
        private const val TAG = "IgnytIntegrity"

        /* Paths that exist on a rooted device. Presence is suggestive, not proof: a few of
           these can appear on legitimately-unlocked developer devices too. */
        private val SU_PATHS = arrayOf(
            "/system/app/Superuser.apk", "/sbin/su", "/system/bin/su", "/system/xbin/su",
            "/data/local/xbin/su", "/data/local/bin/su", "/system/sd/xbin/su",
            "/system/bin/failsafe/su", "/data/local/su", "/su/bin/su",
            "/system/xbin/daemonsu", "/system/etc/init.d/99SuperSUDaemon"
        )

        /* Package names of root managers and hooking frameworks. Checked by package rather
           than by file, because these move their binaries around and their identity does not. */
        private val ROOT_PACKAGES = arrayOf(
            "com.topjohnwu.magisk", "eu.chainfire.supersu", "com.noshufou.android.su",
            "com.koushikdutta.superuser", "com.thirdparty.superuser", "com.yellowes.su",
            "de.robv.android.xposed.installer", "com.saurik.substrate",
            "io.va.exposed", "com.formyhm.hideroot"
        )
    }

    /**
     * Everything we can observe, as separate named signals rather than one verdict.
     *
     * Separate signals matter: "the build is a userdebug ROM" and "a root manager is installed"
     * are very different facts, and collapsing them into `rooted: true` throws away the
     * distinction the person reading the log actually needs.
     */
    @PluginMethod
    fun check(call: PluginCall) {
        val signals = JSObject()
        try {
            signals.put("suBinaryPresent", suBinaryPresent())
            signals.put("rootPackageInstalled", rootPackageInstalled())
            signals.put("testKeysBuild", testKeysBuild())
            signals.put("debuggerAttached", android.os.Debug.isDebuggerConnected())
            signals.put("debuggableBuild", debuggableBuild())
            signals.put("emulator", looksLikeEmulator())
            signals.put("installer", installerPackage() ?: "unknown")
            signals.put("expectedInstaller", isExpectedInstaller())
            signals.put("signatureSha256", signatureSha256() ?: "")

            /* A count, not a verdict. The app decides what to do with it, and the number is
               what makes "one weak signal" distinguishable from "several at once". */
            var n = 0
            for (k in arrayOf("suBinaryPresent", "rootPackageInstalled", "testKeysBuild")) {
                if (signals.getBoolean(k, false) == true) n++
            }
            signals.put("rootSignalCount", n)

            call.resolve(JSObject().apply { put("success", true); put("data", signals) })
        } catch (e: Exception) {
            Log.w(TAG, "integrity check failed: ${e.javaClass.simpleName}")
            call.resolve(JSObject().apply {
                put("success", false); put("error", "Could not complete the device check.")
            })
        }
    }

    private fun suBinaryPresent(): Boolean = SU_PATHS.any {
        try { File(it).exists() } catch (e: Exception) { false }
    }

    private fun rootPackageInstalled(): Boolean {
        val pm = context.packageManager
        return ROOT_PACKAGES.any {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    pm.getPackageInfo(it, PackageManager.PackageInfoFlags.of(0)); true
                } else {
                    @Suppress("DEPRECATION") pm.getPackageInfo(it, 0); true
                }
            } catch (e: PackageManager.NameNotFoundException) { false } catch (e: Exception) { false }
        }
    }

    /** A production Android build is signed with release-keys. test-keys means a custom ROM. */
    private fun testKeysBuild(): Boolean =
        Build.TAGS?.contains("test-keys") == true

    private fun debuggableBuild(): Boolean =
        (context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0

    private fun looksLikeEmulator(): Boolean =
        Build.FINGERPRINT.startsWith("generic") || Build.FINGERPRINT.contains("vbox") ||
        Build.FINGERPRINT.contains("test-keys") && Build.MODEL.contains("Emulator") ||
        Build.MODEL.contains("google_sdk") || Build.MODEL.contains("Android SDK built for") ||
        Build.MANUFACTURER.contains("Genymotion") || Build.PRODUCT == "google_sdk"

    private fun installerPackage(): String? = try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            context.packageManager.getInstallSourceInfo(context.packageName).installingPackageName
        } else {
            @Suppress("DEPRECATION")
            context.packageManager.getInstallerPackageName(context.packageName)
        }
    } catch (e: Exception) { null }

    /** Installed by Play, or sideloaded. Not a verdict — sideloading is legitimate for a
     *  debug build and for anyone testing an AAB locally. */
    private fun isExpectedInstaller(): Boolean {
        val i = installerPackage() ?: return false
        return i == "com.android.vending" || i == "com.google.android.feedback"
    }

    /**
     * SHA-256 of the signing certificate.
     *
     * Reported, not compared. A hardcoded expected value here would be checked by the same
     * process an attacker has already patched, so it buys nothing locally — its value is that
     * the BACKEND can compare it against the known-good fingerprint and refuse a repacked
     * client. That comparison belongs on the server, which is why this only reports.
     */
    private fun signatureSha256(): String? = try {
        val pm = context.packageManager
        val sigs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val info = pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
            info.signingInfo?.apkContentsSigners
        } else {
            @Suppress("DEPRECATION")
            pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES).signatures
        }
        sigs?.firstOrNull()?.let {
            MessageDigest.getInstance("SHA-256").digest(it.toByteArray())
                .joinToString(":") { b -> "%02X".format(b) }
        }
    } catch (e: Exception) { null }
}
