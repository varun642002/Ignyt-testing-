/* =========================================================
   IGNYT ACCOUNT — JS wrapper around the native IgnytAuth Capacitor
   plugin (Google Sign-In + Firebase Authentication session).

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

  const ACCOUNT_KEY = "hx_auth_account"; // {uid, displayName, email, photoUrl, signedInAt}

  let _busy = false;
  let _errorMsg = null;

  function isNative() {
    return typeof window.Capacitor !== "undefined"
      && typeof window.Capacitor.isNativePlatform === "function"
      && window.Capacitor.isNativePlatform()
      && window.Capacitor.getPlatform() === "android";
  }

  function bridge() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IgnytAuth;
  }

  async function callNative(methodName, options) {
    if (!isNative()) {
      return { success: false, error: "Sign-in is only available in the IGNYT Android app." };
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
        signedInAt: Date.now()
      }));
    } catch (e) { /* storage full/unavailable — non-fatal, UI just re-checks native next time */ }
  }
  function clearAccount() {
    try { localStorage.removeItem(ACCOUNT_KEY); } catch (e) { /* non-fatal */ }
  }

  /** Re-render the Settings tab if it's on screen (same pattern as
   *  HealthConnectIntegration.notifyDashboard). No-ops on any other tab. */
  function notifyUI() {
    if (typeof state === "undefined" || typeof render !== "function") return;
    if (state.tab === "settings") render();
  }

  async function signIn() {
    if (_busy) return;
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
    if (!isNative()) return;
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

  function boot() {
    // One reconciliation pass per launch; no polling, no retry loop.
    refreshFromNative();
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
    signIn,
    signOut,
    refreshFromNative
  };
})();

window.IgnytAuth = IgnytAuth;
