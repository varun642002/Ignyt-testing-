/* =========================================================
   IGNYT SECURITY LAYER

   Three things live here: a thin JS face over the native crypto plugin, an encrypted-backup
   format, and a security event log. Everything that needs a key talks to the Android Keystore
   through IgnytCrypto; nothing in this file ever holds key material.

   WHAT THIS LAYER CAN AND CANNOT DO — stated up front, because a security module that
   oversells itself is worse than none.

   It CAN protect data at rest against a rooted device, a device-level backup, a stolen handset
   and an offline filesystem image. Those are real threats to health data and they are the
   reason this exists.

   It CANNOT protect against code running as this app. Anything with JS execution here can ask
   the plugin to decrypt, by construction. No client-side scheme changes that, and claiming
   otherwise would be the dangerous kind of wrong. The defences that actually hold against a
   compromised client are all server-side: Firebase verifying the token, the backend verifying
   the Play purchase, Firestore rules deciding what a uid may read.

   ON THE WEB BUILD. There is no Keystore in a browser. Every function degrades to a clearly
   reported "unavailable" rather than to a fake-crypto path — a Base64 shuffle that looks
   encrypted is how people end up believing their data is protected when it is not.
========================================================= */
(function () {
  "use strict";

  var LOG_KEY = "hx_security_log";
  var LOG_MAX = 200;                 // rolling; a log that grows forever fills the quota

  function plugin(name) {
    try {
      return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) || null;
    } catch (e) { return null; }
  }

  function available() { return !!plugin("IgnytCrypto"); }

  /* ---- crypto ------------------------------------------------------------------------- */

  /**
   * @param {string} purpose "store" | "field" | "backup" — selects the Keystore alias.
   * Distinct aliases mean one key can be rotated or destroyed without invalidating the others.
   */
  async function encrypt(plaintext, purpose) {
    var p = plugin("IgnytCrypto");
    if (!p) return { ok: false, reason: "unavailable", error: "Encryption needs the Android app." };
    try {
      var r = await p.encrypt({ data: String(plaintext), purpose: purpose || "store" });
      if (!r || r.success === false) return { ok: false, reason: "failed", error: (r && r.error) || "Encryption failed." };
      return { ok: true, data: r.data.data, alg: r.data.alg, v: r.data.v };
    } catch (e) {
      return { ok: false, reason: "failed", error: "Encryption failed." };
    }
  }

  async function decrypt(blob, purpose) {
    var p = plugin("IgnytCrypto");
    if (!p) return { ok: false, reason: "unavailable", error: "Decryption needs the Android app." };
    try {
      var r = await p.decrypt({ data: String(blob), purpose: purpose || "store" });
      if (!r || r.success === false) {
        /* "no-key" and "tampered" are deliberately distinct. The first means nothing was ever
           written and the caller may safely write fresh; the second means data exists and
           failed its integrity check, and overwriting it would destroy evidence and possibly
           recoverable data. Collapsing them into one error is how a decrypt bug becomes a
           data-loss bug. */
        return { ok: false, reason: (r && r.reason) || "failed", error: (r && r.error) || "Decryption failed." };
      }
      return { ok: true, data: r.data.data };
    } catch (e) {
      return { ok: false, reason: "failed", error: "Decryption failed." };
    }
  }

  async function keystoreInfo() {
    var p = plugin("IgnytCrypto");
    if (!p) return { ok: false, securityLevel: "unavailable" };
    try {
      var r = await p.keystoreInfo();
      return r && r.success ? { ok: true, securityLevel: r.data.securityLevel, algorithm: r.data.algorithm }
                            : { ok: false, securityLevel: "unknown" };
    } catch (e) { return { ok: false, securityLevel: "unknown" }; }
  }

  /* ---- security event log -------------------------------------------------------------- */

  /**
   * Record a security-relevant event.
   *
   * NO USER DATA GOES IN HERE, EVER. Not an email, not a uid, not a weight, not a food name.
   * The log exists so a person can answer "what happened to this device" — "a sign-in failed
   * four times then succeeded" answers that; "varun@example.com failed" adds nothing and turns
   * a diagnostic into a second copy of the data everything else is busy encrypting.
   *
   * `detail` is therefore restricted to primitives the caller has chosen deliberately, and is
   * scrubbed below rather than trusted.
   */
  function logEvent(type, detail) {
    try {
      var entry = {
        t: Date.now(),
        type: String(type || "unknown").slice(0, 40),
        detail: scrub(detail)
      };
      var log = read();
      log.push(entry);
      if (log.length > LOG_MAX) log = log.slice(log.length - LOG_MAX);
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
      return entry;
    } catch (e) { return null; }
  }

  /* The only key names allowed into the log. Everything else is dropped.

     This started as a filter that tried to RECOGNISE user data — drop anything with an @ in
     it, anything with a long run of digits, anything too long. Testing it took about a minute
     to walk straight through: a 24-character Firebase uid has no @ and no digit run, so it
     was stored verbatim, and `weightKg: 72.5` is a finite number, so it sailed through the
     rule that let counters past. Both are exactly what this function exists to stop.

     The lesson generalises, so the design changed rather than the patterns: you cannot write a
     rule for what user data looks like, because the next field won't look like it. An
     allowlist inverts the default — a new call site that invents `bodyFatPct` gets it dropped
     silently instead of leaking it until someone reads the log and notices. */
  var ALLOWED_DETAIL_KEYS = {
    ok: 1, reason: 1, attempts: 1, count: 1, keys: 1, level: 1, code: 1,
    rootSignals: 1, testKeys: 1, debuggable: 1, emulator: 1, expectedInstaller: 1
  };

  /* Unknown keys are dropped WHOLE — name and value. Storing `hasDiabetes: "[redacted]"`
     redacts nothing: the key name is the disclosure. Only the count survives, so a call site
     quietly losing half its fields is still visible to whoever debugs it later. */
  function scrub(detail) {
    if (detail == null || typeof detail !== "object") return {};
    var out = {}, dropped = 0;
    Object.keys(detail).forEach(function (k) {
      if (!ALLOWED_DETAIL_KEYS[k]) { dropped++; return; }
      var v = detail[k];
      if (typeof v === "boolean") { out[k] = v; return; }
      // Counters only. Rounded and clamped so an allowlisted key can never smuggle a
      // measurement's precision through — 72.5 is data, 72 is a count.
      if (typeof v === "number" && isFinite(v)) { out[k] = Math.max(0, Math.min(9999, Math.round(v))); return; }
      // Short enum-ish strings ("no-key", "tampered", "warn"). Anything longer is prose.
      if (typeof v === "string" && v.length <= 16 && /^[a-z0-9_.-]+$/i.test(v)) { out[k] = v; return; }
      dropped++;
    });
    if (dropped) out._dropped = dropped;
    return out;
  }

  function read() {
    try {
      var raw = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(function (e) { return e && typeof e === "object"; }) : [];
    } catch (e) { return []; }
  }

  function clearLog() {
    try { localStorage.removeItem(LOG_KEY); return true; } catch (e) { return false; }
  }

  /* ---- device integrity ---------------------------------------------------------------- */

  /**
   * Device signals, logged once per launch.
   *
   * Returns the raw signals and NO verdict — see IntegrityPlugin's own note. Any check that
   * runs inside the process it is vetting can be defeated by whatever rooted that process, so
   * this informs the user and the log; it must not gate access to anything.
   */
  async function checkIntegrity() {
    var p = plugin("IgnytIntegrity");
    if (!p) return { ok: false, available: false };
    try {
      var r = await p.check();
      if (!r || r.success === false) return { ok: false, available: true };
      var s = r.data || {};
      // Booleans and a count only — the signature hash stays out of the log, it is for the
      // backend to compare, not for a local file to carry around.
      logEvent("device.integrity", {
        rootSignals: Number(s.rootSignalCount) || 0,
        testKeys: !!s.testKeysBuild,
        debuggable: !!s.debuggableBuild,
        emulator: !!s.emulator,
        expectedInstaller: !!s.expectedInstaller
      });
      return { ok: true, available: true, signals: s };
    } catch (e) { return { ok: false, available: true }; }
  }

  /* ---- encrypted backup ---------------------------------------------------------------- */

  /**
   * Wrap an export in an encrypted envelope the user can carry off-device.
   *
   * NOT the Keystore key. That key cannot leave the handset, so a backup encrypted with it
   * could never be restored to a new phone — which is most of what a backup is for. This
   * derives a key from a passphrase with PBKDF2-SHA256 via WebCrypto, and the passphrase is
   * the user's to keep; it is never stored, synced or logged. Losing it means losing the
   * backup, which is the honest trade and is said plainly in the UI.
   *
   * 210,000 iterations is OWASP's 2023 floor for PBKDF2-HMAC-SHA256. It is deliberately slow:
   * this runs once per export, and the cost is what makes a stolen backup file expensive to
   * brute-force offline.
   */
  var PBKDF2_ITERATIONS = 210000;

  async function deriveKey(passphrase, salt) {
    var enc = new TextEncoder();
    var base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  function b64(buf) {
    var bytes = new Uint8Array(buf), s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(str) {
    var bin = atob(str), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function encryptBackup(jsonText, passphrase) {
    if (!window.crypto || !crypto.subtle) return { ok: false, error: "This device cannot encrypt backups." };
    if (!passphrase || String(passphrase).length < 8) return { ok: false, error: "Use a passphrase of at least 8 characters." };
    try {
      var salt = crypto.getRandomValues(new Uint8Array(16));
      var iv = crypto.getRandomValues(new Uint8Array(12));   // fresh per file, never reused
      var key = await deriveKey(String(passphrase), salt);
      var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(jsonText));
      /* The envelope carries its own parameters. A backup that does not say how it was made
         cannot be opened by a future version that changed the defaults, and silently guessing
         is how a restore turns into "your file is corrupt". */
      return {
        ok: true,
        envelope: {
          app: "ignyt", format: "ignyt-encrypted-backup", v: 1,
          alg: "AES-256-GCM", kdf: "PBKDF2-SHA256", iterations: PBKDF2_ITERATIONS,
          salt: b64(salt), iv: b64(iv), data: b64(ct),
          createdAt: new Date().toISOString()
        }
      };
    } catch (e) {
      return { ok: false, error: "Could not encrypt the backup." };
    }
  }

  async function decryptBackup(envelope, passphrase) {
    if (!window.crypto || !crypto.subtle) return { ok: false, error: "This device cannot open encrypted backups." };
    if (!envelope || envelope.format !== "ignyt-encrypted-backup") {
      return { ok: false, error: "That is not an encrypted IGNYT backup." };
    }
    try {
      var salt = unb64(envelope.salt), iv = unb64(envelope.iv), data = unb64(envelope.data);
      var enc = new TextEncoder();
      var base = await crypto.subtle.importKey("raw", enc.encode(String(passphrase)), "PBKDF2", false, ["deriveKey"]);
      var key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: Number(envelope.iterations) || PBKDF2_ITERATIONS, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
      );
      var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
      return { ok: true, json: new TextDecoder().decode(pt) };
    } catch (e) {
      /* GCM cannot tell "wrong passphrase" from "modified file" — both fail the tag check, and
         that is by design. The message says both rather than guessing one. */
      logEvent("backup.decrypt.failed", {});
      return { ok: false, error: "Wrong passphrase, or the file has been altered." };
    }
  }

  window.IgnytSecurity = {
    available: available,
    encrypt: encrypt,
    decrypt: decrypt,
    keystoreInfo: keystoreInfo,
    checkIntegrity: checkIntegrity,
    encryptBackup: encryptBackup,
    decryptBackup: decryptBackup,
    logEvent: logEvent,
    readLog: read,
    clearLog: clearLog,
    PBKDF2_ITERATIONS: PBKDF2_ITERATIONS
  };
})();
