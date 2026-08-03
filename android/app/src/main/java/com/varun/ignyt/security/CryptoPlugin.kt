package com.varun.ignyt.security

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * AES-256-GCM, with the key held in the Android Keystore.
 *
 * WHAT THIS ACTUALLY PROTECTS AGAINST — and what it does not.
 * WebView localStorage already lives in app-private storage, which another app cannot read on
 * a non-rooted device. The threat this addresses is the one that gets past that: a rooted
 * handset, a device-level backup, an offline image of the filesystem, or a stolen phone with a
 * bypassed lockscreen. For health and fitness data that is a real threat, and it is the reason
 * to bother. It is NOT a defence against malware running as this app, which by definition can
 * ask this plugin to decrypt — no client-side scheme can be.
 *
 * THE KEY NEVER ENTERS THE APP PROCESS. It is generated inside the Keystore and referenced by
 * alias; on a device with a hardware-backed Keystore (or StrongBox) the raw bytes never leave
 * secure hardware, so dumping this app's memory does not yield it. Exporting the key is not
 * merely unimplemented here, it is impossible by construction — `setUserAuthenticationRequired`
 * is deliberately false so background writes work, but the key is still non-exportable.
 *
 * GCM AND THE IV. Every encrypt generates a fresh 12-byte IV from SecureRandom and prefixes it
 * to the ciphertext. Reusing an IV under the same key in GCM is catastrophic — it leaks the
 * XOR of two plaintexts and destroys the authentication guarantee — so the IV is never derived,
 * never counted, never stored separately from the message it belongs to. The 128-bit tag is
 * appended by the Cipher and verified on decrypt, so a modified blob fails loudly rather than
 * returning wrong plaintext.
 *
 * FAILURE IS EXPLICIT. Every method resolves {success:false, error} rather than throwing, and
 * decrypt distinguishes "wrong key / tampered" from "no key yet" — the caller needs to tell a
 * corrupted blob from a first run, because one of those means show an error and the other means
 * write a fresh one.
 */
@CapacitorPlugin(name = "IgnytCrypto")
class CryptoPlugin : com.getcapacitor.Plugin() {

    companion object {
        private const val TAG = "IgnytCrypto"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"

        /** One alias per purpose, so a key can be rotated or dropped without touching the others. */
        private const val ALIAS_STORE = "ignyt.datastore.v1"    // local app data at rest
        private const val ALIAS_FIELD = "ignyt.field.v1"        // Firestore field-level values
        private const val ALIAS_BACKUP = "ignyt.backup.v1"      // exported backup files

        private const val GCM_IV_BYTES = 12                     // 96 bits, the GCM standard
        private const val GCM_TAG_BITS = 128
        private const val KEY_BITS = 256

        private val ALLOWED_ALIASES = mapOf(
            "store" to ALIAS_STORE,
            "field" to ALIAS_FIELD,
            "backup" to ALIAS_BACKUP
        )
    }

    private val rng = SecureRandom()

    /** Resolve a caller-supplied purpose to a real alias. An unknown purpose is refused rather
     *  than passed through: the alias namespace is not something JS gets to invent. */
    private fun aliasFor(purpose: String?): String? = ALLOWED_ALIASES[purpose ?: "store"]

    /**
     * The key for an alias, created on first use.
     *
     * StrongBox (a discrete security chip) is requested where the device advertises it and
     * silently skipped where it does not — asking for it unconditionally throws
     * StrongBoxUnavailableException on most handsets, which would mean no encryption at all
     * rather than software-backed encryption.
     */
    private fun getOrCreateKey(alias: String): SecretKey {
        val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        (ks.getEntry(alias, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }

        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        val spec = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(KEY_BITS)
            /* The app writes in the background — a finished workout syncing, a reminder firing —
               so requiring user presence per operation would drop those writes. The key is still
               non-exportable and still bound to this app's signature by the Keystore. */
            .setUserAuthenticationRequired(false)
            /* Randomised encryption required: this is what stops a caller supplying its own IV
               and reusing one. It forces the Cipher to generate the IV itself. */
            .setRandomizedEncryptionRequired(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                val strongBox = KeyGenParameterSpec.Builder(
                    alias,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(KEY_BITS)
                    .setUserAuthenticationRequired(false)
                    .setRandomizedEncryptionRequired(true)
                    .setIsStrongBoxBacked(true)
                    .build()
                gen.init(strongBox)
                return gen.generateKey()
            } catch (e: Exception) {
                // No StrongBox on this device. Fall through to the standard Keystore, which is
                // still hardware-backed on the large majority of handsets.
                Log.i(TAG, "StrongBox unavailable, using standard Keystore for $alias")
            }
        }
        gen.init(spec)
        return gen.generateKey()
    }

    @PluginMethod
    fun encrypt(call: PluginCall) {
        val alias = aliasFor(call.getString("purpose"))
            ?: return resolveError(call, "Unknown key purpose.")
        val plaintext = call.getString("data")
            ?: return resolveError(call, "encrypt requires `data`.")
        try {
            val key = getOrCreateKey(alias)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, key)
            val iv = cipher.iv                      // generated by the Cipher, never by us
            val ct = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))

            /* IV || ciphertext || tag, one base64 blob. Keeping the IV with its own message is
               what makes "never reuse an IV" enforceable — there is no second place it could
               drift out of step with the data it belongs to. */
            val out = ByteArray(iv.size + ct.size)
            System.arraycopy(iv, 0, out, 0, iv.size)
            System.arraycopy(ct, 0, out, iv.size, ct.size)

            resolveSuccess(call, JSObject().apply {
                put("data", Base64.encodeToString(out, Base64.NO_WRAP))
                put("alg", "AES-256-GCM")
                put("v", 1)
            })
        } catch (e: Exception) {
            Log.w(TAG, "encrypt failed for $alias: ${e.javaClass.simpleName}")
            resolveError(call, "Could not encrypt data on this device.")
        }
    }

    @PluginMethod
    fun decrypt(call: PluginCall) {
        val alias = aliasFor(call.getString("purpose"))
            ?: return resolveError(call, "Unknown key purpose.")
        val blob = call.getString("data")
            ?: return resolveError(call, "decrypt requires `data`.")
        try {
            val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            val entry = ks.getEntry(alias, null) as? KeyStore.SecretKeyEntry
            if (entry == null) {
                /* No key means nothing was ever encrypted under it. Distinct from a decrypt
                   failure: the caller writes a fresh blob here, but must NOT overwrite data it
                   merely failed to read. */
                call.resolve(JSObject().apply {
                    put("success", false); put("reason", "no-key")
                    put("error", "No encryption key exists yet.")
                })
                return
            }
            val raw = Base64.decode(blob, Base64.NO_WRAP)
            if (raw.size <= GCM_IV_BYTES) return resolveError(call, "Encrypted data is truncated.")

            val iv = raw.copyOfRange(0, GCM_IV_BYTES)
            val ct = raw.copyOfRange(GCM_IV_BYTES, raw.size)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, entry.secretKey, GCMParameterSpec(GCM_TAG_BITS, iv))
            val pt = cipher.doFinal(ct)             // throws AEADBadTagException if tampered

            resolveSuccess(call, JSObject().apply { put("data", String(pt, Charsets.UTF_8)) })
        } catch (e: javax.crypto.AEADBadTagException) {
            /* The tag did not verify: the blob was modified, truncated, or written under a
               different key. Reported separately so the caller can say "this file has been
               altered" rather than "something went wrong". */
            Log.w(TAG, "decrypt: authentication tag failed for $alias")
            call.resolve(JSObject().apply {
                put("success", false); put("reason", "tampered")
                put("error", "This data failed its integrity check and was not accepted.")
            })
        } catch (e: Exception) {
            Log.w(TAG, "decrypt failed for $alias: ${e.javaClass.simpleName}")
            resolveError(call, "Could not decrypt data on this device.")
        }
    }

    /** True once a key exists for this purpose — lets JS tell "first run" from "key lost". */
    @PluginMethod
    fun hasKey(call: PluginCall) {
        val alias = aliasFor(call.getString("purpose"))
            ?: return resolveError(call, "Unknown key purpose.")
        try {
            val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            resolveSuccess(call, JSObject().apply { put("exists", ks.containsAlias(alias)) })
        } catch (e: Exception) {
            resolveError(call, "Could not read the keystore.")
        }
    }

    /**
     * A random passphrase for encrypting an export the user will carry off-device.
     *
     * Backups must NOT use the Keystore key: that key cannot leave the device, so a backup
     * encrypted with it could never be restored anywhere else — which is most of what a backup
     * is for. The user gets a passphrase they keep; we derive from it and never store it.
     */
    @PluginMethod
    fun randomPassphrase(call: PluginCall) {
        try {
            val bytes = ByteArray(24)
            rng.nextBytes(bytes)
            // Base32-ish alphabet: no 0/O/1/I/l, because this gets read off a screen and typed.
            val alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
            val sb = StringBuilder()
            for (i in bytes.indices) {
                if (i > 0 && i % 4 == 0) sb.append('-')
                sb.append(alphabet[(bytes[i].toInt() and 0xFF) % alphabet.length])
            }
            resolveSuccess(call, JSObject().apply { put("passphrase", sb.toString()) })
        } catch (e: Exception) {
            resolveError(call, "Could not generate a passphrase.")
        }
    }

    /** Diagnostics for the security screen: is the key hardware-backed on this device? */
    @PluginMethod
    fun keystoreInfo(call: PluginCall) {
        try {
            val alias = ALIAS_STORE
            val key = getOrCreateKey(alias)
            val factory = javax.crypto.SecretKeyFactory.getInstance(key.algorithm, ANDROID_KEYSTORE)
            val info = factory.getKeySpec(key, android.security.keystore.KeyInfo::class.java)
                    as android.security.keystore.KeyInfo
            val level = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                when (info.securityLevel) {
                    android.security.keystore.KeyProperties.SECURITY_LEVEL_STRONGBOX -> "strongbox"
                    android.security.keystore.KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT -> "tee"
                    android.security.keystore.KeyProperties.SECURITY_LEVEL_SOFTWARE -> "software"
                    else -> "unknown"
                }
            } else {
                @Suppress("DEPRECATION")
                if (info.isInsideSecureHardware) "hardware" else "software"
            }
            resolveSuccess(call, JSObject().apply {
                put("securityLevel", level)
                put("algorithm", "AES-256-GCM")
            })
        } catch (e: Exception) {
            resolveError(call, "Could not read key information.")
        }
    }

    private fun resolveSuccess(call: PluginCall, data: JSObject) {
        call.resolve(JSObject().apply { put("success", true); put("data", data) })
    }

    private fun resolveError(call: PluginCall, message: String) {
        call.resolve(JSObject().apply { put("success", false); put("error", message) })
    }
}
