/* =========================================================
   IGNYT ACCOUNT — JS wrapper around the native IgnytAuth Capacitor
   plugin (email/password Firebase Authentication session).

   Phase 2A scope: account identity only. Sign-in establishes WHO the
   user is; it never touches the local fitness data (hx_* keys), never
   uploads anything, and the app stays fully usable signed out. Cloud
   sync is a later phase.

   Same dual-environment contract as health-connect.js: on the web
   build (no window.Capacitor) every call returns a clean
   {success:false, error:"..."} instead of throwing.

   A minimal account snapshot (uid/name/email/photo — never any token)
   is cached in localStorage under hx_auth_account so the Settings UI
   renders the signed-in state instantly and offline; the native
   Firebase session remains the source of truth and is re-checked on
   every app start (getCurrentUser works offline too — Firebase
   persists the session on disk).
========================================================= */

const IgnytAuth = (() => {

  const ACCOUNT_KEY = "hx_auth_account"; // {uid, displayName, email, photoUrl, provider, emailVerified, signedInAt}

  let _busy = false;
  let _errorMsg = null;

  function platform() {
    return (typeof window.Capacitor !== "undefined"
      && typeof window.Capacitor.isNativePlatform === "function"
      && window.Capacitor.isNativePlatform()
      && typeof window.Capacitor.getPlatform === "function")
      ? window.Capacitor.getPlatform() : "web";
  }

  /* Android only, and it stays that way: this is what the exported isNativeAndroid reports
     and what the signing-fingerprint diagnostic keys off, neither of which means anything
     on iOS. Use canSignIn() for "is sign-in possible here". */
  function isNative() {
    return platform() === "android";
  }

  /** The platforms that have a sign-in implementation at all. */
  function canSignIn() {
    return platform() === "android" || platform() === "ios";
  }

  function bridge() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IgnytAuth;
  }

  /* Two implementations behind one call, chosen by platform and sharing nothing.
   *
   *   android — AuthPlugin.kt over the Capacitor bridge, the Firebase Android SDK. Every
   *             line below the ios branch is exactly as it was; nothing about the iOS work
   *             can reach it.
   *   ios     — js/auth/firebase-rest-auth.js, the Identity Toolkit REST API. No native
   *             plugin, because there is no Swift AuthPlugin and sign-in gates the whole
   *             app, so iOS could not get past its first screen without this.
   *
   * Both return the same {success, data|error} shape, so everything above this line is
   * unaware of which one answered. */
  async function callNative(methodName, options) {
    if (platform() === "ios") {
      if (!window.IgnytFirebaseRestAuth) {
        return { success: false, error: "Sign-in is unavailable (auth module failed to load)." };
      }
      return await window.IgnytFirebaseRestAuth.call(methodName, options || {});
    }
    if (!isNative()) {
      return { success: false, error: "Sign-in is only available in the IGNYT mobile app." };
    }
    const plugin = bridge();
    if (!plugin || typeof plugin[methodName] !== "function") {
      return { success: false, error: `IgnytAuth.${methodName} is not available (native plugin not registered).` };
    }
    try {
      return await plugin[methodName](options || {});
    } catch (e) {
      return { success: false, error: "Native call failed: " + (e && e.message ? e.message : String(e)) };
    }
  }

  function loadAccount() {
    try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null"); }
    catch (e) { return null; }
  }
  function saveAccount(user) {
    try {
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify({
        uid: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoUrl: user.photoUrl || "",
        provider: user.provider || "password",
        emailVerified: !!user.emailVerified,
        signedInAt: Date.now()
      }));
    } catch (e) { /* storage full/unavailable — non-fatal, UI just re-checks native next time */ }
    notifyAuthChanged(true);
  }
  function clearAccount() {
    try { localStorage.removeItem(ACCOUNT_KEY); } catch (e) { /* non-fatal */ }
    notifyAuthChanged(false);
  }

  /** Fired on sign-in, per-launch session restore, and sign-out. Cloud sync (cloud-sync.js)
   *  keys its triggers off this — auth.js itself stays sync-agnostic. */
  function notifyAuthChanged(signedIn) {
    try {
      window.dispatchEvent(new CustomEvent("ignyt:auth-changed", { detail: { signedIn: signedIn } }));
    } catch (e) { /* never let an event listener error break auth */ }
  }

  /** Re-render whatever is on screen after busy/error/account state changes.
   *
   *  This used to re-render ONLY when state.tab === "settings", which was true when the
   *  account card lived exclusively in Settings. It no longer does: there is a sign-in entry
   *  on Tools and the whole first-run Sign In screen, and on those a button that flipped to a
   *  busy label had no way to flip back — the state changed and nothing repainted, so it read
   *  as a permanent "Signing in…". Re-render unconditionally; render() is already the app's
   *  normal repaint path and is called far more often than this. */
  function notifyUI() {
    if (typeof state === "undefined" || typeof render !== "function") return;
    render();
  }

  /* Google Sign-In. The native side shows the account picker and does the token-for-session
     exchange; this only records the result and tells the UI. No timeout is imposed here --
     the picker is system UI and legitimately waits on the user, and a cancellation comes back
     as an ordinary error result rather than a rejection. */
  async function signIn() {
    if (_busy) return { success: false, error: "Already in progress." };
    _busy = true; _errorMsg = null; notifyUI();
    const result = await callNative("signIn");
    _busy = false;
    if (result.success && result.data && result.data.user) {
      saveAccount(result.data.user);
      _errorMsg = null;
    } else {
      _errorMsg = result.error || "Sign-in failed.";
    }
    notifyUI();
    return result;
  }

  async function signUpWithEmail(email, password) {
    if (_busy) return { success: false, error: "Already in progress." };
    _busy = true; _errorMsg = null; notifyUI();
    const result = await callNative("signUpWithEmail", { email: email, password: password });
    _busy = false;
    if (result.success && result.data && result.data.user) {
      saveAccount(result.data.user);
      _errorMsg = null;
    } else {
      _errorMsg = result.error || "Sign-up failed.";
    }
    notifyUI();
    return result;
  }

  async function signInWithEmail(email, password) {
    if (_busy) return { success: false, error: "Already in progress." };
    _busy = true; _errorMsg = null; notifyUI();
    const result = await callNative("signInWithEmail", { email: email, password: password });
    _busy = false;
    if (result.success && result.data && result.data.user) {
      saveAccount(result.data.user);
      _errorMsg = null;
    } else {
      _errorMsg = result.error || "Sign-in failed.";
    }
    notifyUI();
    return result;
  }

  /** Does not touch busy/account state -- this can be called while signed out, and never
   *  signs anyone in itself. Caller decides how to surface success (e.g. a toast). */
  async function sendPasswordReset(email) {
    return await callNative("sendPasswordReset", { email: email });
  }

  /** Resends the verification email to the current user. */
  async function resendVerificationEmail() {
    return await callNative("sendEmailVerification");
  }

  /** Network refresh of emailVerified (and other fields) for the current user -- e.g. after
   *  the user taps the link in their inbox and comes back to check. Updates the cached
   *  snapshot on success so the UI reflects it immediately. */
  async function reloadUser() {
    const result = await callNative("reloadUser");
    if (result.success && result.data && result.data.signedIn && result.data.user) {
      saveAccount(result.data.user);
    }
    return result;
  }

  async function signOut() {
    if (_busy) return;
    _busy = true; _errorMsg = null; notifyUI();
    const result = await callNative("signOut");
    // Local sign-out always completes from the user's point of view: the cached snapshot is
    // cleared even if the native call failed, so the UI can never get stuck "signed in" with
    // no way out. A native failure is surfaced as a non-blocking message.
    clearAccount();
    _busy = false;
    if (!result.success) _errorMsg = result.error || "Sign-out reported an error (you are signed out locally).";
    notifyUI();
    return result;
  }

  /** Called once on startup: reconciles the cached snapshot with the real persisted Firebase
   *  session. Offline-safe (Firebase restores the session from disk). Never signs anyone in
   *  or out by itself — it only reads. */
  async function refreshFromNative() {
    if (!canSignIn()) return;
    const result = await callNative("getCurrentUser");
    if (!result.success || !result.data) return; // transient native issue: keep the cache, don't churn state
    if (result.data.signedIn && result.data.user) {
      saveAccount(result.data.user);
    } else if (result.data.configured) {
      // Firebase is configured and definitively says "nobody is signed in" (e.g. session
      // expired/revoked server-side) — drop a stale cached snapshot.
      clearAccount();
    }
    notifyUI();
  }

  /** Returns a short-lived Firebase ID token for backend calls (IGNYT Integration Service),
   *  or null if unavailable (not native, not signed in, not configured, or plugin too old).
   *  The token is NEVER cached in JS — it is fetched on demand and handed straight to the
   *  single request that needs it. `forceRefresh` re-mints after a 401. */
  /** The running build's signing fingerprints, for checking against the Firebase Console.
   *  Public values (derived from the certificate inside every copy of the APK), so they are
   *  safe to log and to show on screen. */
  async function checkSigning() {
    const result = await callNative("checkSigning");
    _signing = (result && result.success && result.data) ? result.data : null;
    return _signing;
  }

  async function getIdToken(forceRefresh) {
    const result = await callNative("getIdToken", { forceRefresh: !!forceRefresh });
    if (result && result.success && result.data && result.data.token) return result.data.token;
    return null;
  }

  function boot() {
    // One reconciliation pass per launch; no polling, no retry loop.
    refreshFromNative();
    // Fingerprints to logcat once per launch, so `adb logcat -s chromium` answers "is the
    // right certificate registered?" without needing to reproduce a failed sign-in first.
    if (isNative()) {
      checkSigning().then(info => {
        if (!info) return;
        // Only a debug build receives the values, and only a debug build logs them. logcat is
        // readable over adb, so a release build printing its own certificate hashes on every
        // launch is diagnostics leaking into a shipped product.
        if (info.debug) {
          console.log("[auth] package " + info.packageName +
                      " | SHA-1 " + (info.sha1 || "unreadable") +
                      " | SHA-256 " + (info.sha256 || "unreadable"));
        }
        if (!info.firebaseInitialised) {
          console.warn("[auth] Firebase is NOT initialised — google-services.json missing at build time.");
        }
      }).catch(function (e) {
        /* Boot diagnostics must never become an unhandled rejection. checkSigning() itself
           returns an object rather than throwing, so this only fires if the callback above
           throws on an unexpected shape — but at boot that would surface as a console error on
           every launch of a shipped app, for a log line nobody needs. */
        console.warn("[auth] could not read signing info:", e);
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  return {
    isNativeAndroid: isNative,
    getAccount: loadAccount,   // cached snapshot: instant + offline
    isBusy: () => _busy,
    getError: () => _errorMsg,
    clearError: () => { _errorMsg = null; },
    checkSigning,
    getSigningInfo: () => _signing,   // sync, cached — null until boot's checkSigning resolves
    signUpWithEmail,
    signIn,
    signInWithEmail,
    sendPasswordReset,
    resendVerificationEmail,
    reloadUser,
    signOut,
    refreshFromNative,
    getIdToken   // short-lived Firebase ID token for backend (Integration Service) calls
  };
})();

window.IgnytAuth = IgnytAuth;
