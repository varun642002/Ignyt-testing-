/* =========================================================
   FIREBASE AUTH FOR iOS — the same nine calls, over REST.

   WHY THIS EXISTS
   Android signs in through AuthPlugin.kt, the Firebase Android SDK behind a Capacitor
   bridge. iOS has no such plugin, and sign-in gates the whole app — render() refuses to
   show anything to a signed-out user — so without this iOS reaches its first screen and
   stops, showing "Sign-in is only available in the IGNYT Android app".

   WHY REST AND NOT THE FIREBASE JS SDK
   This app loads plain <script> tags with no bundler. The modular SDK is ESM and would need
   one; the compat build is roughly a megabyte, and www/ is shared with Android through a
   submodule, so every byte added here ships on both platforms to serve one. The Identity
   Toolkit REST API needs nothing but fetch and covers all nine methods in a couple of
   hundred lines.

   WHAT IT DELIBERATELY DOES NOT DO
   Nothing here runs on Android. auth.js routes to this only when the platform is ios; the
   Android path is untouched and cannot be affected by anything in this file.

   ON THE API KEY BEING IN THE SOURCE
   Firebase web API keys are public by design — they identify the project, they do not
   authorise anything. Every Firebase web app ships its key in plain JavaScript. Access is
   controlled by Firebase Auth rules and Firestore rules, not by hiding this string.
========================================================= */

window.IgnytFirebaseRestAuth = (function () {
  "use strict";

  /* Derived from android/app/google-services.json rather than kept as a second copy that can
     drift. appId is absent on purpose: it identifies a Firebase *web app* for Analytics and
     Installations, and Auth does not use it. */
  var CONFIG = {
    apiKey: "AIzaSyBf3Is97Tyg7Fv5nvX7W63iOC3O69ibhq0",
    projectId: "ignyt-fitness2",
    authDomain: "ignyt-fitness2.firebaseapp.com"
  };

  var IDENTITY = "https://identitytoolkit.googleapis.com/v1/accounts:";
  var SECURETOKEN = "https://securetoken.googleapis.com/v1/token";
  var STORE_KEY = "hx_ios_auth_tokens";

  /* ---- token storage -------------------------------------------------------------
     Firebase ID tokens last an hour; the refresh token is what keeps a session alive
     across launches, which is what the Android SDK does on disk for us there. */

  function loadTokens() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); }
    catch (e) { return null; }
  }

  function saveTokens(idToken, refreshToken, expiresInSeconds, uid) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        idToken: idToken,
        refreshToken: refreshToken,
        // 60s of slack so a token that expires mid-request is refreshed before it is sent.
        expiresAt: Date.now() + (Number(expiresInSeconds) || 3600) * 1000 - 60000,
        uid: uid || null
      }));
    } catch (e) { /* storage full — the session simply will not survive a relaunch */ }
  }

  function clearTokens() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* non-fatal */ }
  }

  /* ---- transport ----------------------------------------------------------------- */

  function fail(message) { return { success: false, error: message }; }
  function ok(data) { return { success: true, data: data || {} }; }

  /** Firebase returns machine-readable codes; these are what the user should read instead. */
  var MESSAGES = {
    EMAIL_EXISTS: "That email address is already registered. Try signing in instead.",
    EMAIL_NOT_FOUND: "No account found for that email address.",
    INVALID_PASSWORD: "Incorrect password.",
    INVALID_LOGIN_CREDENTIALS: "That email address and password do not match an account.",
    INVALID_EMAIL: "That email address is not valid.",
    MISSING_PASSWORD: "Enter a password.",
    WEAK_PASSWORD: "Password must be at least 6 characters.",
    USER_DISABLED: "This account has been disabled.",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Wait a few minutes and try again.",
    TOKEN_EXPIRED: "Your session has expired. Sign in again.",
    USER_NOT_FOUND: "Your session is no longer valid. Sign in again.",
    OPERATION_NOT_ALLOWED: "Email and password sign-in is not enabled for this project."
  };

  function friendly(code) {
    if (!code) return "Sign-in failed.";
    var key = String(code).split(" :")[0].trim();
    if (MESSAGES[key]) return MESSAGES[key];
    if (key.indexOf("WEAK_PASSWORD") === 0) return MESSAGES.WEAK_PASSWORD;
    return key.replace(/_/g, " ").toLowerCase();
  }

  async function post(url, body) {
    var response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } catch (e) {
      // Distinguished from a rejected credential on purpose: one is worth retrying, the
      // other is not, and "check your connection" is useless advice for a wrong password.
      return { networkError: true };
    }
    var json = null;
    try { json = await response.json(); } catch (e) { json = null; }
    if (!response.ok) {
      return { apiError: (json && json.error && json.error.message) || ("HTTP " + response.status) };
    }
    return { data: json || {} };
  }

  /* ---- the user shape auth.js stores ---------------------------------------------
     Must match what AuthPlugin.kt returns field for field, because saveAccount() reads
     exactly these keys and the rest of the app reads what it wrote. */

  function toUser(account) {
    return {
      uid: account.localId || account.user_id || "",
      displayName: account.displayName || "",
      email: account.email || "",
      photoUrl: account.photoUrl || "",
      provider: "password",
      emailVerified: account.emailVerified === true || account.emailVerified === "true"
    };
  }

  /** The signIn/signUp responses carry no emailVerified, so the profile is always read back. */
  async function lookup(idToken) {
    var res = await post(IDENTITY + "lookup?key=" + CONFIG.apiKey, { idToken: idToken });
    if (res.networkError || res.apiError) return null;
    var users = res.data && res.data.users;
    return (users && users.length) ? users[0] : null;
  }

  /** A valid, unexpired ID token, refreshing it if needed. null when signed out. */
  async function freshIdToken(forceRefresh) {
    var tokens = loadTokens();
    if (!tokens || !tokens.refreshToken) return null;
    if (!forceRefresh && tokens.idToken && Date.now() < tokens.expiresAt) return tokens.idToken;

    var res = await post(SECURETOKEN + "?key=" + CONFIG.apiKey, {
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken
    });
    if (res.networkError) return tokens.idToken || null;  // offline: the cached token may still be good
    if (res.apiError) { clearTokens(); return null; }     // revoked or expired refresh token
    saveTokens(res.data.id_token, res.data.refresh_token, res.data.expires_in, res.data.user_id);
    return res.data.id_token;
  }

  /* ---- the nine methods ----------------------------------------------------------- */

  async function signUpOrIn(endpoint, email, password) {
    if (!email || !password) return fail("Enter your email address and password.");
    var res = await post(IDENTITY + endpoint + "?key=" + CONFIG.apiKey, {
      email: email, password: password, returnSecureToken: true
    });
    if (res.networkError) return fail("No connection. Check your network and try again.");
    if (res.apiError) return fail(friendly(res.apiError));

    saveTokens(res.data.idToken, res.data.refreshToken, res.data.expiresIn, res.data.localId);
    var profile = await lookup(res.data.idToken);
    return ok({ user: toUser(profile || res.data) });
  }

  /**
   * Sign in with Apple. The native plugin has already run Apple's sheet and produced a signed
   * identity token; this exchanges it for a Firebase session, which is what the rest of the app
   * understands.
   *
   * THE NONCE IS THE RAW ONE. Apple was given its SHA-256 hash and put that in the token;
   * Firebase hashes what it is sent here and compares. Passing the hash instead produces
   * "INVALID_IDP_RESPONSE" with nothing to indicate which of the two values was wrong, so the
   * direction is stated at both ends of the trip.
   *
   * requestUri is required by the endpoint and unused for a native flow — Firebase validates
   * its presence, not its value.
   *
   * APPLE SENDS NAME AND EMAIL EXACTLY ONCE, on the first authorisation ever for this Apple ID
   * and app, and returns nulls forever after — including after a delete and reinstall. So when
   * they arrive they are written to the Firebase profile immediately, because there is no
   * second chance to ask. When they do not arrive, the existing profile is left alone rather
   * than being overwritten with blanks.
   */
  async function signInWithApple(o) {
    if (!o || !o.identityToken) return fail("Apple did not return an identity token.");

    var res = await post(IDENTITY + "signInWithIdp?key=" + CONFIG.apiKey, {
      postBody: "id_token=" + encodeURIComponent(o.identityToken) +
                "&providerId=apple.com" +
                (o.nonce ? "&nonce=" + encodeURIComponent(o.nonce) : ""),
      requestUri: "http://localhost",
      returnSecureToken: true
    });
    if (res.networkError) return fail("No connection. Check your network and try again.");
    if (res.apiError) return fail(friendly(res.apiError));

    saveTokens(res.data.idToken, res.data.refreshToken, res.data.expiresIn, res.data.localId);

    /* Only on the first sign-in, and only for values Apple actually sent. */
    if (o.displayName) {
      await post(IDENTITY + "update?key=" + CONFIG.apiKey, {
        idToken: res.data.idToken,
        displayName: o.displayName,
        returnSecureToken: false
      });
    }

    var profile = await lookup(res.data.idToken);
    return ok({ user: toUser(profile || res.data) });
  }

  var handlers = {
    signUpWithEmail: function (o) { return signUpOrIn("signUp", o.email, o.password); },
    signInWithEmail: function (o) { return signUpOrIn("signInWithPassword", o.email, o.password); },
    signInWithApple: signInWithApple,

    sendPasswordReset: async function (o) {
      if (!o.email) return fail("Enter your email address.");
      var res = await post(IDENTITY + "sendOobCode?key=" + CONFIG.apiKey, {
        requestType: "PASSWORD_RESET", email: o.email
      });
      if (res.networkError) return fail("No connection. Check your network and try again.");
      if (res.apiError) return fail(friendly(res.apiError));
      return ok({ sent: true });
    },

    sendEmailVerification: async function () {
      var token = await freshIdToken(false);
      if (!token) return fail("You are not signed in.");
      var res = await post(IDENTITY + "sendOobCode?key=" + CONFIG.apiKey, {
        requestType: "VERIFY_EMAIL", idToken: token
      });
      if (res.networkError) return fail("No connection. Check your network and try again.");
      if (res.apiError) return fail(friendly(res.apiError));
      return ok({ sent: true });
    },

    reloadUser: async function () {
      var token = await freshIdToken(true);
      if (!token) return ok({ signedIn: false, configured: true });
      var profile = await lookup(token);
      if (!profile) return fail("Could not refresh your account.");
      return ok({ signedIn: true, configured: true, user: toUser(profile) });
    },

    /* Sign-out is local. There is no REST call that ends a session — the Android SDK
       discards its tokens too. Anything already issued stays valid until it expires, which
       is why the refresh token is destroyed rather than merely forgotten. */
    signOut: async function () {
      clearTokens();
      return ok({ signedOut: true });
    },

    getCurrentUser: async function () {
      var tokens = loadTokens();
      if (!tokens || !tokens.refreshToken) return ok({ signedIn: false, configured: true });
      var token = await freshIdToken(false);
      if (!token) return ok({ signedIn: false, configured: true });
      var profile = await lookup(token);
      // A lookup that fails on the network must not be read as "signed out", or going
      // offline would silently log the user out of an app that works offline by design.
      if (!profile) return ok({ signedIn: true, configured: true, user: { uid: tokens.uid || "", displayName: "", email: "", photoUrl: "", provider: "password", emailVerified: false } });
      return ok({ signedIn: true, configured: true, user: toUser(profile) });
    },

    /* Signing fingerprints are an Android concept: the SHA-1/SHA-256 of the certificate the
       APK was signed with, checked against the Firebase Console. iOS has no equivalent, so
       this reports unavailable rather than inventing one. auth.js leaves _signing null. */
    checkSigning: async function () {
      return fail("Signing fingerprints are an Android concept and do not apply on iOS.");
    },

    getIdToken: async function (o) {
      var token = await freshIdToken(!!(o && o.forceRefresh));
      return token ? ok({ token: token }) : fail("Not signed in.");
    }
  };

  /** Drop-in for auth.js's callNative on iOS. Same names, same {success,data|error} shape. */
  async function call(methodName, options) {
    var handler = handlers[methodName];
    if (!handler) return fail("IgnytAuth." + methodName + " is not implemented on iOS.");
    try {
      return await handler(options || {});
    } catch (e) {
      return fail("Sign-in failed: " + (e && e.message ? e.message : String(e)));
    }
  }

  return { call: call, config: CONFIG };
})();
