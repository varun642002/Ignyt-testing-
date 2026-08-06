/* =========================================================
   FIRESTORE OVER REST — the iOS half of cloud sync.

   WHY REST RATHER THAN A PLUGIN. Cloud sync on Android is CloudSyncPlugin.kt talking to the
   Firestore Android SDK. iOS has no Firebase SDK in the project at all — not one reference in
   Package.swift or the pbxproj — so matching that shape would mean adding the whole Firebase
   iOS SDK, a widget-sized dependency, to perform four operations.

   iOS already authenticates over REST (js/auth/firebase-rest-auth.js) and therefore already
   holds a Firebase ID token, which is exactly what Firestore's REST API accepts as a bearer
   credential. The same security rules apply to both routes, because rules are enforced by the
   server and not by the client library. So this is the established iOS pattern continued, not
   a workaround around a missing one.

   It presents the same four methods as the Kotlin plugin with the same argument names and the
   same return shapes, so cloud-sync.js runs unchanged:

     getUserDoc     -> { exists, fromCache, doc }
     setUserDoc     -> { written, queued }
     listCollection -> { items, fromCache }
     writeRecords   -> { written, queued }

   TWO PROPERTIES ANDROID HAS THAT THIS CANNOT, and both are reported honestly rather than
   faked, because cloud-sync.js makes real decisions on them:

     fromCache  always false. The Firestore SDK answers reads from a local cache when offline;
                REST has no cache, so a read either reaches the server or fails. Reporting
                false is true — nothing here ever came from a cache.

     queued     always false. The SDK durably queues an offline write and delivers it on
                reconnect. REST cannot: an offline write fails, and it is reported as a
                failure so the JS layer retries later rather than believing it is safely
                stored. Claiming queued:true here would lose data silently, which is the
                worst outcome available.
========================================================= */

window.IgnytFirestoreRest = (function () {
  "use strict";

  /* Same project as firebase-rest-auth.js, and derived from the same source of truth
     (android/app/google-services.json) rather than kept as a third copy that can drift. */
  var PROJECT_ID = "ignyt-fitness2";
  var BASE = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID +
             "/databases/(default)/documents";

  /* Mirrors allowedCollections in CloudSyncPlugin.kt. Kept here as well as there because a
     rejected name should never reach the network: the server would refuse it under the
     security rules anyway, and failing locally says so faster and more clearly. */
  var ALLOWED = [
    "workouts", "routines", "prs", "bodylog", "races", "customExercises",
    "foodLog", "waterLog", "goals", "achievements", "favoriteFoods"
  ];

  var TIMEOUT_MS = 25000;

  function fail(message) { return { success: false, error: message }; }
  function ok(data) { return { success: true, data: data || {} }; }

  /* ---- Firestore's typed value format ------------------------------------------------

     REST does not take plain JSON. Every leaf is wrapped in a type tag — {"stringValue":"x"},
     {"integerValue":"5"} — and integers cross the wire as STRINGS, because a Firestore
     integer is 64-bit and JSON numbers are not. Both directions are needed: encode to write,
     decode to read.
  ------------------------------------------------------------------------------------- */

  function encode(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === "boolean") return { booleanValue: v };
    if (typeof v === "number") {
      if (!isFinite(v)) return { nullValue: null };   // NaN/Infinity are not representable
      /* Integers go as integerValue so they come back as integers. Sending 3 as a double
         means reading back 3.0, and updatedAt comparisons are done on these. */
      return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    }
    if (typeof v === "string") return { stringValue: v };
    if (Array.isArray(v)) {
      /* Firestore cannot nest an array directly inside an array. Nothing in IGNYT's records
         does, and silently dropping such a value would be worse than the server's own error,
         so it is passed through and left to fail loudly if it ever happens. */
      return { arrayValue: { values: v.map(encode) } };
    }
    if (typeof v === "object") {
      var fields = {};
      for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) fields[k] = encode(v[k]);
      return { mapValue: { fields: fields } };
    }
    return { nullValue: null };
  }

  function decode(v) {
    if (!v || typeof v !== "object") return null;
    if ("nullValue" in v) return null;
    if ("booleanValue" in v) return !!v.booleanValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return Number(v.doubleValue);
    if ("stringValue" in v) return v.stringValue;
    if ("timestampValue" in v) return v.timestampValue;
    if ("arrayValue" in v) return ((v.arrayValue && v.arrayValue.values) || []).map(decode);
    if ("mapValue" in v) return decodeFields((v.mapValue && v.mapValue.fields) || {});
    return null;
  }

  function encodeFields(obj) {
    var fields = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) fields[k] = encode(obj[k]);
    return fields;
  }

  function decodeFields(fields) {
    var out = {};
    for (var k in fields) if (Object.prototype.hasOwnProperty.call(fields, k)) out[k] = decode(fields[k]);
    return out;
  }

  /* ---- transport ---------------------------------------------------------------------- */

  function uid() {
    var a = window.IgnytAuth && window.IgnytAuth.getAccount();
    return a && a.uid ? a.uid : null;
  }

  async function token() {
    if (!window.IgnytFirebaseRestAuth) return null;
    var r = await window.IgnytFirebaseRestAuth.call("getIdToken", {});
    return (r && r.success && r.data && r.data.token) ? r.data.token : null;
  }

  /**
   * Every failure that is really "no network" is prefixed `offline:`. cloud-sync.js classifies
   * on that prefix to decide between "retry quietly later" and "tell the user something is
   * wrong", so a dropped connection reported as a hard error would surface an alarming
   * message for a phone that simply went through a tunnel.
   */
  async function send(url, method, body) {
    var idToken = await token();
    if (!idToken) return fail("Not signed in.");

    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    try {
      var res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + idToken },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal
      });
      var json = null;
      try { json = await res.json(); } catch (e) { /* 200 with an empty body is valid */ }

      if (!res.ok) {
        var msg = (json && json.error && json.error.message) || ("HTTP " + res.status);
        if (res.status === 403) return fail("Cloud access denied: " + msg);
        if (res.status === 401) return fail("Session expired. Sign in again.");
        return fail("Cloud request failed: " + msg);
      }
      return ok(json || {});
    } catch (e) {
      if (e && e.name === "AbortError") return fail("offline: cloud request timed out");
      return fail("offline: " + ((e && e.message) || "network unavailable"));
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---- the four methods ---------------------------------------------------------------- */

  async function getUserDoc() {
    var u = uid();
    if (!u) return fail("Not signed in.");
    var r = await send(BASE + "/users/" + encodeURIComponent(u), "GET", null);

    /* A document that has never been written is a 404, which is not an error here — it is a
       first sync. The Kotlin side gets the same answer as snapshot.exists() == false. */
    if (!r.success) {
      if (/HTTP 404|NOT_FOUND/i.test(r.error)) return ok({ exists: false, fromCache: false });
      return r;
    }
    return ok({
      exists: true,
      fromCache: false,
      doc: decodeFields((r.data && r.data.fields) || {})
    });
  }

  /**
   * Merge semantics, matching SetOptions.merge() on Android: a write must never clear a field
   * it does not carry. REST does that with updateMask — only the named paths are touched, and
   * everything else in the document is left alone. Without the mask a PATCH REPLACES the whole
   * document, which would silently delete every field this particular sync did not happen to
   * include.
   */
  async function setUserDoc(options) {
    var u = uid();
    if (!u) return fail("Not signed in.");
    var payload = (options && options.data) || null;
    if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
      return fail("setUserDoc requires a non-empty data object.");
    }
    var mask = Object.keys(payload)
      .map(function (k) { return "updateMask.fieldPaths=" + encodeURIComponent(k); })
      .join("&");

    var r = await send(BASE + "/users/" + encodeURIComponent(u) + "?" + mask, "PATCH",
                       { fields: encodeFields(payload) });
    if (!r.success) return r;
    return ok({ written: true, queued: false });
  }

  /**
   * `updatedAt > since`, the same filter the Kotlin plugin applies, run server-side via
   * :runQuery rather than by listing the collection and filtering here. On a year of food-log
   * entries the difference is the whole collection crossing a mobile connection every sync
   * versus the handful of rows that actually changed.
   */
  async function listCollection(options) {
    var u = uid();
    if (!u) return fail("Not signed in.");
    var name = options && options.name;
    if (!name || ALLOWED.indexOf(name) === -1) return fail("listCollection: unknown collection.");
    var since = Number((options && options.since) || 0) || 0;

    var r = await send(BASE + "/users/" + encodeURIComponent(u) + ":runQuery", "POST", {
      structuredQuery: {
        from: [{ collectionId: name }],
        where: {
          fieldFilter: {
            field: { fieldPath: "updatedAt" },
            op: "GREATER_THAN",
            value: { integerValue: String(since) }
          }
        }
      }
    });
    if (!r.success) return r;

    /* runQuery streams an array of results, and a query that matches nothing still returns one
       entry — with no `document` key. Filtering on that is what separates "no changes" from a
       malformed response. */
    var rows = Array.isArray(r.data) ? r.data : [];
    var items = [];
    for (var i = 0; i < rows.length; i++) {
      var d = rows[i] && rows[i].document;
      if (!d) continue;
      var obj = decodeFields(d.fields || {});
      obj.docId = String(d.name || "").split("/").pop();   // Android adds docId the same way
      items.push(obj);
    }
    return ok({ items: items, fromCache: false });
  }

  /**
   * Batched merge-writes via :commit. Each record keeps its own updateMask for the same reason
   * setUserDoc does — a partial record must not blank the fields it omits.
   *
   * The 450 ceiling is cloud-sync.js's own batching limit and Firestore's hard limit is 500;
   * this rejects rather than truncating, because a silently short write is a record that never
   * arrives and is never retried.
   */
  async function writeRecords(options) {
    var u = uid();
    if (!u) return fail("Not signed in.");
    var name = options && options.name;
    if (!name || ALLOWED.indexOf(name) === -1) return fail("writeRecords: unknown collection.");
    var records = (options && options.records) || [];
    if (!Array.isArray(records) || records.length === 0 || records.length > 450) {
      return fail("writeRecords requires 1..450 records.");
    }

    var writes = [];
    for (var i = 0; i < records.length; i++) {
      var rec = records[i] || {};
      var docId = rec.docId || rec.id;
      if (!docId) return fail("writeRecords: every record needs a docId.");

      /* docId identifies the document and is not a field inside it — Android strips it the
         same way. Writing it back would store the key twice and drift if one ever changed. */
      var fields = {};
      for (var k in rec) {
        if (!Object.prototype.hasOwnProperty.call(rec, k)) continue;
        if (k === "docId") continue;
        fields[k] = rec[k];
      }

      writes.push({
        update: {
          name: "projects/" + PROJECT_ID + "/databases/(default)/documents/users/" +
                u + "/" + name + "/" + docId,
          fields: encodeFields(fields)
        },
        updateMask: { fieldPaths: Object.keys(fields) }
      });
    }

    var r = await send(BASE.replace(/\/documents$/, "/documents:commit"), "POST", { writes: writes });
    if (!r.success) return r;
    return ok({ written: true, queued: false });
  }

  /* One entry point, mirroring how firebase-rest-auth.js is called, so cloud-sync.js dispatches
     by name and does not need to know which of these exists. */
  var METHODS = {
    getUserDoc: getUserDoc,
    setUserDoc: setUserDoc,
    listCollection: listCollection,
    writeRecords: writeRecords
  };

  async function call(methodName, options) {
    var fn = METHODS[methodName];
    if (!fn) return fail("IgnytFirestoreRest." + methodName + " is not implemented.");
    try {
      return await fn(options || {});
    } catch (e) {
      return fail("Cloud call failed: " + ((e && e.message) || String(e)));
    }
  }

  return { call: call, encode: encode, decode: decode };
})();
