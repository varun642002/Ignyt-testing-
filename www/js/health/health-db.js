/* =========================================================
   HEALTH DB — shared IndexedDB blob store, reused by every health module
   that stores files/photos (Body Scan Archive, Medical Reports, Prescription
   images, Vaccination certificates, etc.) instead of each module hand-rolling
   its own IndexedDB open/put/get/delete boilerplate (the pattern that was
   duplicated between body-photos-db.js and health-uploads.js).

   One shared database, one object store per "bucket" (created lazily on
   first use via a versioned upgrade), keyed by caller-supplied id.
========================================================= */
(function () {
  "use strict";
  var DB_NAME = "ignyt-health-db";
  var BUCKETS = ["bodyscan", "reports", "documents"]; // add new buckets here as modules need them

  var dbP = null;
  function openDB() {
    if (dbP) return dbP;
    dbP = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("IndexedDB unavailable")); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        BUCKETS.forEach(function (b) {
          if (!db.objectStoreNames.contains(b)) db.createObjectStore(b, { keyPath: "id" });
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("open failed")); };
    });
    return dbP;
  }

  function put(bucket, id, blob) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(bucket, "readwrite");
        tx.objectStore(bucket).put({ id: id, blob: blob, storedAt: Date.now() });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function get(bucket, id) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(bucket, "readonly");
        var rq = tx.objectStore(bucket).get(id);
        rq.onsuccess = function () { resolve(rq.result ? rq.result.blob : null); };
        rq.onerror = function () { reject(rq.error); };
      });
    });
  }
  function del(bucket, id) {
    return openDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(bucket, "readwrite");
        tx.objectStore(bucket).delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      });
    });
  }
  function all(bucket) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(bucket, "readonly");
        var rq = tx.objectStore(bucket).getAll();
        rq.onsuccess = function () { resolve(rq.result || []); };
        rq.onerror = function () { reject(rq.error); };
      });
    });
  }

  window.IgnytHealthDB = { put: put, get: get, delete: del, all: all, BUCKETS: BUCKETS };
})();
