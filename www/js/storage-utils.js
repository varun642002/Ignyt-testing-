/* Shared, behavior-neutral storage helpers for feature modules.
   The core app retains its LS wrapper; these helpers remove repeated
   try/JSON.parse/localStorage boilerplate from independently loaded modules. */
(function () {
  "use strict";

  function readJson(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value == null ? fallback : JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }

  function readArray(key) {
    var value = readJson(key, []);
    return Array.isArray(value) ? value : [];
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  window.IgnytStorageUtils = Object.freeze({ readJson: readJson, readArray: readArray, writeJson: writeJson });
}());
