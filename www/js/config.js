/* =========================================================
   IGNYT RUNTIME CONFIG

   Where the app finds its backend, and how it identifies itself during development.
   Loaded before every other script so anything can read it.

   WHY THIS FILE HAS TO EXIST
   ai-scan.js read `window.IGNYT_API_BASE` and nothing ever set it, so the base was "" and
   every request went to the WebView's own origin — `https://localhost` inside Capacitor.
   That origin serves the bundled app, not the API, so /v1/food/scan 404'd and the feature
   could not work on a device however correct the backend was.
========================================================= */
(function () {
  "use strict";

  var isCapacitor = /^capacitor:/.test(location.protocol) ||
                    (location.hostname === "localhost" && location.protocol === "https:");

  /* THE ANDROID EMULATOR CANNOT SEE 127.0.0.1.
     Inside the emulator, localhost is the emulated device itself. 10.0.2.2 is the special
     alias Android maps to the HOST machine's loopback — this is the single most common reason
     a local backend "works in the browser and not in the app".

     On a PHYSICAL device neither works: it needs your machine's LAN address, which nothing
     can detect from in here. Set IGNYT_API_BASE below (or in localStorage, see the override)
     to something like http://192.168.1.20:8001 and make sure the backend is bound to
     0.0.0.0 rather than 127.0.0.1, or the phone cannot reach it. */
  var DEFAULT_BASE = isCapacitor ? "http://10.0.2.2:8001" : "http://127.0.0.1:8001";

  /* localStorage wins, so a base can be changed on a running device without a rebuild —
     which matters because a LAN IP changes with the network and rebuilding an APK to chase
     a DHCP lease is not a workflow. */
  function stored(key) {
    try { return localStorage.getItem(key) || ""; } catch (e) { return ""; }
  }

  window.IGNYT_API_BASE = (stored("hx_api_base") || DEFAULT_BASE).replace(/\/+$/, "");

  /* DEV IDENTITY, for AUTH_MODE=insecure-uid only.

     The backend refuses this header outright when ENVIRONMENT=production, so it cannot become
     a production hole from this side. It is only ever sent when there is no Firebase token —
     see authHeaders() in ai-scan.js, where the real token always takes precedence. */
  window.IGNYT_DEV_UID = stored("hx_dev_uid") || "varun-dev";

  /* Console helpers. Point the app at a different backend from devtools or `adb shell`
     without editing a file or rebuilding. */
  window.IgnytConfig = Object.freeze({
    apiBase: function () { return window.IGNYT_API_BASE; },
    setApiBase: function (url) {
      try { localStorage.setItem("hx_api_base", String(url || "")); } catch (e) {}
      window.IGNYT_API_BASE = String(url || "").replace(/\/+$/, "");
      return window.IGNYT_API_BASE;
    },
    setDevUid: function (uid) {
      try { localStorage.setItem("hx_dev_uid", String(uid || "")); } catch (e) {}
      window.IGNYT_DEV_UID = String(uid || "");
      return window.IGNYT_DEV_UID;
    },
    isCapacitor: isCapacitor
  });
}());
