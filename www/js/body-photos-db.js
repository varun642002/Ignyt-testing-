/* Body-progress photo storage. Uses IndexedDB (not base64-in-localStorage) so photo blobs
   never bloat the localStorage-backed app state or get serialized through JSON.stringify on
   every persist() call. Standard web API, no native Capacitor plugin required -- avoids the
   @capacitor/filesystem + pinned-Kotlin-1.9.24 conflict a prior session in this branch's
   history already hit and had to back out of. Every method resolves/rejects a Promise and
   never throws synchronously, so a missing/broken IndexedDB (some embedded WebViews, private
   browsing) degrades to "feature unavailable" rather than crashing the app.

   v2 (Body Scan Archive increment): every record also stores a small pre-downscaled `thumb`
   blob alongside the full-res `blob`, generated once at upload time -- grids/timelines load
   the thumb (a few KB) instead of decoding the full photo, which is the real perf win for a
   screen that can show dozens of photos at once. Existing v1 records have no `thumb`; callers
   fall back to the full blob for those (getThumbBlob does this automatically), so nothing
   needs a migration pass. Also added: weight/bodyfat/goal/tags/milestone/rotation metadata. */
(function () {
  const DB_NAME = "ignyt-body-photos";
  const DB_VERSION = 2;
  const STORE = "photos";
  const THUMB_MAX = 480; // px, longest side
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
        // v1 -> v2 has no structural change (thumb/tags/etc. are just new fields on the same
        // record shape) -- nothing to do here beyond bumping the version.
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

  /* Best-effort downscale to a small JPEG thumb. Resolves null (never rejects) on any failure
     -- callers fall back to the full blob, so a thumb failure never blocks saving the photo. */
  function makeThumb(blob) {
    if (!window.createImageBitmap || !document.createElement) return Promise.resolve(null);
    return createImageBitmap(blob).then(bmp => {
      const scale = Math.min(1, THUMB_MAX / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      return new Promise(resolve => {
        canvas.toBlob(b => resolve(b || null), "image/jpeg", 0.72);
      });
    }).catch(() => null);
  }

  /* Adds a photo. Returns the new record's id. blob must be a real Blob/File -- callers are
     responsible for validating the picked file before calling this (see attachHandlers).
     meta: { weight, bodyfat, goal, tags (array), milestone } -- all optional, all honest
     (no field is filled with a fabricated value; omitted ones are simply absent). */
  function addPhoto({ date, category, note, blob, weight, bodyfat, goal, tags }) {
    return makeThumb(blob).then(thumb => {
      const record = {
        id: Date.now(), date, category: category || "Other", note: note || "", blob, thumb,
        weight: weight != null ? weight : null, bodyfat: bodyfat != null ? bodyfat : null,
        goal: goal || "", tags: Array.isArray(tags) ? tags : [], milestone: false, rotation: 0,
        createdAt: Date.now()
      };
      return withStore("readwrite", store => { store.put(record); return record.id; });
    });
  }

  /* Metadata only (no blobs) -- cheap to load in full at boot for the photo list/grid. */
  function getAllMeta() {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result || []).map(r => ({
          id: r.id, date: r.date, category: r.category, note: r.note, createdAt: r.createdAt,
          hasThumb: !!r.thumb, weight: r.weight != null ? r.weight : null, bodyfat: r.bodyfat != null ? r.bodyfat : null,
          goal: r.goal || "", tags: r.tags || [], milestone: !!r.milestone, rotation: r.rotation || 0
        }));
        rows.sort((a, b) => b.createdAt - a.createdAt);
        resolve(rows);
      };
      req.onerror = () => reject(req.error || new Error("IndexedDB read failed"));
    }));
  }

  /* Fetches the actual full-res image blob for one photo, on demand (full view / before-after). */
  function getBlob(id) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error || new Error("IndexedDB read failed"));
    }));
  }

  /* Fetches the small thumb blob for grid/timeline rendering; falls back to the full blob for
     records saved before thumbnails existed (v1 records, or a failed makeThumb at save time). */
  function getThumbBlob(id) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => { const r = req.result; resolve(r ? (r.thumb || r.blob) : null); };
      req.onerror = () => reject(req.error || new Error("IndexedDB read failed"));
    }));
  }

  /* Patches editable metadata (rotation/milestone/tags/note/goal) without touching the blobs. */
  function updatePhoto(id, patch) {
    return withStore("readwrite", store => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const r = getReq.result;
        if (r) store.put(Object.assign({}, r, patch));
      };
      return true;
    });
  }

  function deletePhoto(id) {
    return withStore("readwrite", store => { store.delete(id); return true; });
  }

  window.IgnytBodyPhotosDB = { addPhoto, getAllMeta, getBlob, getThumbBlob, updatePhoto, deletePhoto };
})();
