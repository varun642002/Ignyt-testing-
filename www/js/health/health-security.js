/* =========================================================
   HEALTH SECURITY — placeholder interfaces (NOT enforced yet)

   Every health module reads/writes storage through SecureStorage and gates
   entry through AppLock rather than calling localStorage/IndexedDB directly.
   Today those calls simply pass through to LS/localStorage (identical
   behavior to the rest of the app -- private, on-device, unencrypted, same
   as workout/nutrition data). This file exists so that turning on real
   security later (PIN/biometric lock, AES-256 field encryption via Android
   Keystore) is a change in ONE place, not a refactor of every health module.

   TODO (future "Data Security" increment):
   - AppLock: PIN/biometric gate before entering any Health Hub screen.
     Wire to Android BiometricPrompt via a new native plugin (same pattern
     as NotifyPlugin/DriveBackupPlugin) for biometric; PIN can be pure JS.
   - EncryptionService: reuse the AES-256-GCM + PBKDF2 primitives already
     built in backup-encryption.js (IgnytBackupCrypto) for per-record
     encryption at rest, keyed by a passphrase held in Android Keystore
     instead of session memory (backup-encryption.js's model is
     session-only by design; health records need a persistent key).
   - SecureStorage: once EncryptionService is real, encrypt values here
     before LS.set and decrypt after LS.get, transparently to callers.
========================================================= */
(function () {
  "use strict";

  var AppLock = {
    isEnabled: function () { return false; },
    isUnlocked: function () { return true; }, // TODO: false until PIN/biometric passes
    unlock: function () { return Promise.resolve(true); }, // TODO: real PIN/biometric prompt
    setPin: function () { return Promise.resolve(false); } // TODO
  };

  var BiometricAuth = {
    isAvailable: function () { return false; }, // TODO: query native plugin
    authenticate: function () { return Promise.resolve(false); } // TODO
  };

  var EncryptionService = {
    isEnabled: function () { return false; },
    // Passthrough today; TODO wire to IgnytBackupCrypto once a persistent
    // (Keystore-backed) key exists instead of the session-only passphrase.
    encrypt: function (plaintext) { return Promise.resolve(plaintext); },
    decrypt: function (ciphertext) { return Promise.resolve(ciphertext); }
  };

  // SecureStorage: the interface every health module should use instead of
  // calling localStorage/window.LS directly. Passthrough to LS today.
  var SecureStorage = {
    get: function (key, fallback) {
      return (window.LS ? window.LS.get(key, fallback) : fallback);
    },
    set: function (key, value) {
      if (window.LS) window.LS.set(key, value);
    }
  };

  window.IgnytHealthSecurity = {
    AppLock: AppLock,
    BiometricAuth: BiometricAuth,
    EncryptionService: EncryptionService,
    SecureStorage: SecureStorage
  };
})();
