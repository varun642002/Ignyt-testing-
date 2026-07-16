/* Body-progress photo storage. Uses IndexedDB (not base64-in-localStorage) so photo blobs
   never bloat the localStorage-backed app state or get serialized through JSON.stringify on
   every persist() call. Standard web API, no native Capacitor plugin required -- avoids the
   @capacitor/filesystem + pinned-Kotlin-1.9.24 conflict a prior session in this branch's
   history already hit and had to back out of. Every method resolves/rejects a Promise and
   never throws synchronously, so a missing/broken IndexedDB (some embedded WebViews, private
   browsing) degrades to "feature unavailable" rather than crashing the app. */
(function () {
  const DB_NAME = "ignyt-body-photos";
  const DB_VERSION = 1;
  const STORE = "photos";
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error("IndexedDB not available")); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("date", "date", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
    });
    return dbPromise;
  }

  function withStore(mode, fn) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const result = fn(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
    }));
  }

  /* Adds a photo. Returns the new record's id. blob must be a real Blob/File -- callers are
     responsible for validating the picked file before calling this (see attachHandlers). */
  function addPhoto({ date, category, note, blob }) {
    const record = { id: Date.now(), date, category: category || "Other", note: note || "", blob, createdAt: Date.now() };
    return withStore("readwrite", store => { store.put(record); return record.id; });
  }

  /* Metadata only (no blob) -- cheap to load in full at boot for the photo list/grid. */
  function getAllMeta() {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result || []).map(r => ({ id: r.id, date: r.date, category: r.category, note: r.note, createdAt: r.createdAt }));
        rows.sort((a, b) => b.createdAt - a.createdAt);
        resolve(rows);
      };
      req.onerror = () => reject(req.error || new Error("IndexedDB read failed"));
    }));
  }

  /* Fetches the actual image blob for one photo, on demand (thumbnail lazy-load / full view). */
  function getBlob(id) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error || new Error("IndexedDB read failed"));
    }));
  }

  function deletePhoto(id) {
    return withStore("readwrite", store => { store.delete(id); return true; });
  }

  window.IgnytBodyPhotosDB = { addPhoto, getAllMeta, getBlob, deletePhoto };
})();
