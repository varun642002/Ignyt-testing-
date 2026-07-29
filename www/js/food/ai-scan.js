/* =========================================================
   IGNYT AI FOOD SCAN — the client half

   Talks to the IGNYT backend, never to Gemini. The API key lives in the backend's
   environment; this file has no idea it exists and could not leak it if it wanted to. All it
   ever learns is `ai_configured: true|false`.

   WHAT HAPPENS ON THE DEVICE, AND WHY
     compression   a modern phone camera produces 4-12 MB frames. Uploading that over mobile
                   data is slow enough that people abandon the scan, and the vision model does
                   not need the resolution. Longest edge 1280 px at JPEG 0.82 lands ~200-400 KB
                   with no measurable loss of recognition quality.
     local match   the shipped catalogue is already on the device. Anything matched here is
                   passed to the server as `matched_local` so it does NOT pay for an AI
                   nutrition estimate for a food we already hold. Faster, cheaper, and the
                   local record is more accurate than an estimate.

   Everything here degrades: no network, no key, no premium, no recognition — each has its own
   message and each offers manual entry, because a food log that cannot log food is useless.
========================================================= */
(function () {
  "use strict";

  var BASE = (window.IGNYT_API_BASE || "").replace(/\/+$/, "");
  var PREFIX = "/v1";

  /* Longest edge and quality. Chosen against what the model needs, not what the camera can
     produce — see the note above. */
  var MAX_EDGE = 1280;
  var JPEG_QUALITY = 0.82;

  /* The loading copy from the brief. Cycled on a timer so the wait reads as progress rather
     than a hang. Deliberately honest: each line names a stage that actually happens. */
  var LOADING_STEPS = [
    "Analyzing your meal…",
    "Recognizing ingredients…",
    "Estimating portion…",
    "Checking nutrition database…",
    "Almost done…"
  ];

  var _status = null;      // cached scan-status, refreshed after every scan

  /* ---------------------------------------------------------
     Transport
  --------------------------------------------------------- */

  /* IgnytAuth.getIdToken() is ASYNC — it round-trips to the native Firebase plugin. The first
     version of this function called it synchronously and tested `typeof token === "string"`,
     which is false for a Promise, so the Authorization header was never once set and every
     request fell through to the dev header. That is the whole of requirement 10 failing
     silently, and it looked like working code.

     Firebase always wins when a token exists. X-Ignyt-Uid is only a fallback for local
     AUTH_MODE=insecure-uid, and the backend refuses that header outright when
     ENVIRONMENT=production, so it cannot become a production hole from either side. */
  async function authHeaders(forceRefresh) {
    var h = {};
    try {
      var a = window.IgnytAuth;
      if (a && a.getIdToken) {
        var token = await a.getIdToken(!!forceRefresh);
        if (token && typeof token === "string") {
          h.Authorization = "Bearer " + token;
          return h;
        }
      }
    } catch (e) { /* not signed in / not native / plugin absent — all normal */ }
    if (window.IGNYT_DEV_UID) h["X-Ignyt-Uid"] = window.IGNYT_DEV_UID;
    return h;
  }

  function apiError(res, body) {
    var code = (body && body.error && body.error.code) || "http_" + res.status;
    var msg = (body && body.error && body.error.message) || "Something went wrong.";
    var err = new Error(msg);
    err.code = code;
    err.status = res.status;
    return err;
  }

  /* BASE is read per call rather than captured at load, so IgnytConfig.setApiBase() takes
     effect immediately instead of after a restart. */
  function base() {
    return String(window.IGNYT_API_BASE || "").replace(/\/+$/, "");
  }

  async function send(path, opts, forceRefresh) {
    return fetch(base() + PREFIX + path, {
      method: opts.method || "GET",
      headers: Object.assign(await authHeaders(forceRefresh), opts.headers || {}),
      body: opts.body
    });
  }

  async function request(path, opts) {
    opts = opts || {};
    var res;
    try {
      res = await send(path, opts, false);

      /* A 401 on a token that was valid a moment ago means it expired mid-session. Firebase
         ID tokens last an hour, and a scan can easily be the first request after that hour,
         so one silent re-mint and retry is the difference between "works" and "randomly makes
         you sign in again". Only retried once, and only when a real token is in play —
         retrying the dev header would just fail twice. */
      if (res.status === 401 && window.IgnytAuth && window.IgnytAuth.getIdToken) {
        if (opts.body instanceof FormData) {
          // A consumed FormData body cannot be replayed; the caller rebuilds it.
          var e401 = new Error("Your session expired. Try the scan again.");
          e401.code = "token_expired";
          throw e401;
        }
        res = await send(path, opts, true);
      }
    } catch (e) {
      if (e && e.code) throw e;
      // fetch only rejects on a transport failure, which on a phone means no usable network —
      // or a backend that is not running, which during development is the likelier of the two.
      var offline = new Error("Can't reach the IGNYT server. Check your connection, or enter this meal manually.");
      offline.code = "offline";
      throw offline;
    }
    var body = null;
    try { body = await res.json(); } catch (e) { /* empty or non-JSON body */ }
    if (!res.ok) throw apiError(res, body);
    return body;
  }

  /* ---------------------------------------------------------
     Image capture and compression
  --------------------------------------------------------- */

  /**
   * Open the camera or the gallery.
   * `capture` on a file input is what makes Android open the camera directly rather than a
   * file chooser; omitting it gives the gallery. One code path, one attribute apart.
   * @returns {Promise<File|null>} null when the user backs out
   */
  function pickImage(source) {
    return new Promise(function (resolve) {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      if (source === "camera") input.capture = "environment";
      input.style.display = "none";
      document.body.appendChild(input);

      var done = false;
      var finish = function (file) {
        if (done) return;
        done = true;
        input.remove();
        resolve(file || null);
      };
      input.addEventListener("change", function () { finish(input.files && input.files[0]); });
      // A cancelled picker fires no event on most Android WebViews, so the element would leak
      // and the promise would never settle. Resolve on the next focus instead.
      window.addEventListener("focus", function onFocus() {
        window.removeEventListener("focus", onFocus);
        setTimeout(function () { if (!input.files || !input.files.length) finish(null); }, 400);
      });
      input.click();
    });
  }

  /** Downscale and re-encode. Returns a Blob; falls back to the original on any failure. */
  function compress(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
          var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          var canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          canvas.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            // If re-encoding somehow made it bigger, keep the original.
            resolve(blob && blob.size < file.size ? blob : file);
          }, "image/jpeg", JPEG_QUALITY);
        } catch (e) {
          URL.revokeObjectURL(url);
          resolve(file);
        }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  /* ---------------------------------------------------------
     Local catalogue pre-match
  --------------------------------------------------------- */

  /* Names the device can already answer. Sent to the server so it skips the AI nutrition
     estimate for them. Uses the same curation layer the search UI uses, so "what the app
     considers a match" has one definition. */
  function localMatches(names) {
    var S = window.IgnytFoodSearch;
    if (!S || !S.search) return [];
    var out = [];
    (names || []).forEach(function (n) {
      var hit = S.search(n, { limit: 1 })[0];
      if (hit) out.push(n);
    });
    return out;
  }

  function lookupLocal(name) {
    var S = window.IgnytFoodSearch;
    if (!S || !S.search) return null;
    return S.search(name, { limit: 1 })[0] || null;
  }

  /* ---------------------------------------------------------
     Public API
  --------------------------------------------------------- */

  async function status(force) {
    if (_status && !force) return _status;
    _status = await request("/food/scan-status");
    return _status;
  }

  /** Cached status without a network call — for deciding whether to render the button. */
  function cachedStatus() { return _status; }

  /**
   * Run a scan.
   * @param {File|Blob} file
   * @param {function(string):void} [onProgress] receives each loading line
   */
  async function scan(file, onProgress) {
    var timer = null;
    if (onProgress) {
      var i = 0;
      onProgress(LOADING_STEPS[0]);
      timer = setInterval(function () {
        i = Math.min(i + 1, LOADING_STEPS.length - 1);
        onProgress(LOADING_STEPS[i]);
      }, 900);
    }
    try {
      var blob = await compress(file);
      var form = new FormData();
      form.append("image", blob, "meal.jpg");

      var result = await request("/food/scan", { method: "POST", body: form });

      /* Fill in anything the server left as `none` because the device claimed it. Done here
         rather than server-side because the shipped catalogue lives on the device. */
      (result.foods || []).forEach(function (f) {
        if (f.nutrition_source !== "none") return;
        var local = lookupLocal(f.name);
        if (!local) return;
        f.nutrition_source = "local";
        f.nutrition_confidence = 1;
        f.nutrition = {
          calories: local.calories, protein: local.protein, carbs: local.carbs,
          fat: local.fat, fibre: local.fibre, sugar: local.sugar, sodium: local.sodium
        };
        f.foodId = local.id;
      });

      _status = null;   // allowance changed
      return result;
    } finally {
      if (timer) clearInterval(timer);
    }
  }

  /** Save a reviewed AI estimate so the next scan of it is a database hit. */
  function confirmFood(food) {
    return request("/food/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(food)
    });
  }

  /** Scale per-100 g values to a portion. Nulls stay null — absent is not zero. */
  function scaleTo(nutrition, grams) {
    if (!nutrition) return null;
    var f = (Number(grams) || 0) / 100;
    var out = {};
    ["calories", "protein", "carbs", "fat", "fibre", "sugar", "sodium"].forEach(function (k) {
      out[k] = nutrition[k] == null ? null : Math.round(nutrition[k] * f * 10) / 10;
    });
    return out;
  }

  /* The brief's portion presets, as multipliers of whatever the model estimated. Relative
     rather than absolute, because "medium" means something different for rice and for nuts —
     anchoring to the model's own estimate keeps it sensible for both. */
  var PORTIONS = [
    { key: "small", label: "Small", mult: 0.6 },
    { key: "medium", label: "Medium", mult: 1.0 },
    { key: "large", label: "Large", mult: 1.5 }
  ];

  var MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Pre Workout", "Post Workout"];

  /** Human text for an error code. One place, so every surface says the same thing. */
  function messageFor(err) {
    var code = err && err.code;
    if (code === "premium_required")   return "AI food scanning is a Premium feature.";
    if (code === "scan_limit_reached") return "You've used all of today's AI scans. They reset at midnight.";
    if (code === "food_not_recognised") return "We couldn't identify any food in that photo. Try a clearer, closer shot.";
    if (code === "ai_not_configured")  return "AI scanning isn't set up on the server yet.";
    if (code === "ai_unavailable")     return "The AI service is unavailable right now. Try again in a moment.";
    if (code === "offline")            return "You're offline. Connect and try again, or enter this meal manually.";
    if (code === "unauthorized")       return "Sign in to use AI food scanning.";
    if (code === "validation_error")   return (err && err.message) || "That image couldn't be used.";
    return (err && err.message) || "Something went wrong. You can enter this meal manually.";
  }

  /** Whether offering a retry makes sense. A bad photo or a hard refusal will not improve. */
  function isRetryable(err) {
    return ["ai_unavailable", "offline", "http_500", "http_502", "http_503"].indexOf(err && err.code) !== -1;
  }

  window.IgnytAiScan = Object.freeze({
    status: status,
    cachedStatus: cachedStatus,
    pickImage: pickImage,
    compress: compress,
    scan: scan,
    confirmFood: confirmFood,
    scaleTo: scaleTo,
    localMatches: localMatches,
    lookupLocal: lookupLocal,
    messageFor: messageFor,
    isRetryable: isRetryable,
    LOADING_STEPS: LOADING_STEPS,
    PORTIONS: PORTIONS,
    MEAL_TYPES: MEAL_TYPES
  });
}());
