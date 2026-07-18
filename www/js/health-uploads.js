/* =========================================================
   HEALTH REPORT UPLOAD CENTER (Phase 1)

   A single entry point to upload medical reports (images/PDF), store the ORIGINAL file, preview
   it, categorise it, review extracted values, and save to the right health module.

   Storage: original files go in IndexedDB (blobs — never base64-in-localStorage), same pattern
   as body photos; metadata records live in localStorage (hx_health_uploads). Fully offline; the
   files are device-local and never uploaded, so they stay private.

   HONEST SCOPE — Phase 1 does NOT fake OCR. Automated image OCR (Tesseract.js) and PDF-text
   extraction (pdf.js) are heavy vendored libraries and are a Phase-2 follow-up; here the original
   file is stored and previewed alongside a manual/paste editable review (for Blood Work this
   reuses the existing biomarker parser), which is reliable and needs no library or network. No
   fake local-encryption layer is implemented; privacy comes from files staying on-device.

   Routing: Blood Work reports are saved into the real Blood Work module (IgnytBloodwork.importReport).
   InBody / DEXA / other categories are stored as generic health records (dedicated modules for
   those don't exist yet).
========================================================= */
(function () {
  "use strict";
  var META = "hx_health_uploads", RECORDS = "hx_health_records";
  var DB_NAME = "ignyt-health-uploads", DB_VERSION = 1, STORE = "files";

  var CATEGORIES = [
    { id: "bloodwork", label: "Blood Work", match: ["blood", "cbc", "lipid", "hba1c", "metabolic", "lab"] },
    { id: "inbody", label: "InBody", match: ["inbody", "body composition", "bia"] },
    { id: "dexa", label: "DEXA", match: ["dexa", "dxa", "bone density"] },
    { id: "bp", label: "Blood Pressure", match: ["blood pressure", "bp "] },
    { id: "ecg", label: "ECG", match: ["ecg", "ekg", "electrocardio"] },
    { id: "prescription", label: "Prescription", match: ["prescription", "rx"] },
    { id: "certificate", label: "Medical Certificate", match: ["certificate", "fitness cert"] },
    { id: "other", label: "Other", match: [] }
  ];
  var catById = {}; CATEGORIES.forEach(function (c) { catById[c.id] = c; });

  /* ---------- IndexedDB (original file blobs) ---------- */
  var dbP = null;
  function openDB() {
    if (dbP) return dbP;
    dbP = new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error("IndexedDB unavailable")); return; }
      var r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = function () { var db = r.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error || new Error("open failed")); };
    });
    return dbP;
  }
  function idbPut(id, blob) { return openDB().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put({ id: id, blob: blob }); tx.oncomplete = function () { res(); }; tx.onerror = function () { rej(tx.error); }; }); }); }
  function idbGet(id) { return openDB().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction(STORE, "readonly"); var rq = tx.objectStore(STORE).get(id); rq.onsuccess = function () { res(rq.result ? rq.result.blob : null); }; rq.onerror = function () { rej(rq.error); }; }); }); }
  function idbDel(id) { return openDB().then(function (db) { return new Promise(function (res) { var tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(id); tx.oncomplete = function () { res(); }; tx.onerror = function () { res(); }; }); }); }

  /* ---------- metadata + generic records ---------- */
  function loadMeta() { try { var a = JSON.parse(localStorage.getItem(META) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveMeta(a) { try { localStorage.setItem(META, JSON.stringify(a)); } catch (e) {} }
  function loadRecords() { try { var a = JSON.parse(localStorage.getItem(RECORDS) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveRecords(a) { try { localStorage.setItem(RECORDS, JSON.stringify(a)); } catch (e) {} }
  function uid() { return window.nextId ? window.nextId() : Date.now(); }
  function hashStr(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ":" + s.length; }
  function detectCategory(name) { var s = (name || "").toLowerCase(); for (var i = 0; i < CATEGORIES.length; i++) { if (CATEGORIES[i].match.some(function (m) { return s.indexOf(m) !== -1; })) return CATEGORIES[i].id; } return "other"; }

  /* ---------- view state ---------- */
  var view = { screen: "list", openId: null, draft: null, progress: null, sheet: false };
  function reset() { view = { screen: "list", openId: null, draft: null, progress: null, sheet: false }; }
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var svg = function (n, s) { return window.svg ? window.svg(n, s) : ""; };
  var fmtDate = function (d) { try { return new Date(d).toLocaleDateString("default", { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return d || ""; } };
  var kb = function (n) { return n < 1024 ? n + " B" : n < 1048576 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(1) + " MB"; };

  function head(title, back) {
    return (back ? '<button class="btn btn-ghost" data-hu="list" style="padding:8px 14px;font-size:14px;margin:4px 0 10px;">← Back</button>' : "") +
      '<div style="font-size:25px;font-weight:900;margin-bottom:4px;">🗂️ ' + esc(title) + "</div>";
  }
  var NOTE = '<div class="bw-disclaimer">Files stay on this device (private, offline). Automated OCR / PDF extraction is coming; for now the original is stored and you review the values.</div>';

  function render() {
    if (view.screen === "detail") return renderDetail();
    if (view.screen === "review") return renderReview();
    return renderList();
  }

  function summary() {
    var uploads = loadMeta(), records = loadRecords();
    var blood = window.IgnytBloodwork ? window.IgnytBloodwork._load().length : 0;
    var c = { inbody: 0, dexa: 0, other: 0 };
    records.forEach(function (r) { if (r.category === "inbody") c.inbody++; else if (r.category === "dexa") c.dexa++; else c.other++; });
    var latest = uploads.length ? uploads.reduce(function (a, b) { return a.createdAt > b.createdAt ? a : b; }).createdAt : null;
    var storage = uploads.reduce(function (a, b) { return a + (b.size || 0); }, 0);
    return { blood: blood, inbody: c.inbody, dexa: c.dexa, other: c.other, files: uploads.length, latest: latest, storage: storage };
  }

  // Source bottom sheet — the fix: Upload never launches the camera directly; the user chooses.
  function renderSheet() {
    var opt = function (icon, label, src) { return '<button class="hu-src" data-hu="src" data-src="' + src + '"><span style="font-size:20px;width:28px;display:inline-block;">' + icon + '</span> ' + label + '</button>'; };
    return '<div class="more-sheet-backdrop" data-hu="sheet-close"><div class="more-sheet" data-hu="noop">' +
      '<div class="more-sheet-handle"></div><div class="eyebrow-label" style="margin:0 0 10px;">Upload from</div>' +
      opt("📷", "Take Photo", "photo") + opt("🖼️", "Choose Image", "image") + opt("📄", "Upload PDF", "pdf") + opt("📁", "Browse Files", "files") +
      '<button class="btn btn-ghost btn-block" data-hu="sheet-close" style="margin-top:8px;">Cancel</button>' +
      '</div></div>';
  }

  function renderList() {
    var m = loadMeta().slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    var s = summary();
    var sumCard = function (l, v) { return '<div class="hu-sum"><div class="hu-sum__v">' + v + '</div><div class="hu-sum__l">' + l + '</div></div>'; };
    var h = head("Medical Reports") +
      '<div style="font-size:14px;color:var(--muted);margin-bottom:12px;">One place for every health document — blood work, InBody, DEXA and more.</div>' +
      '<div class="hu-sum-grid">' + sumCard("Blood Work", s.blood) + sumCard("InBody", s.inbody) + sumCard("DEXA", s.dexa) + sumCard("Other", s.other) + '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin:2px 2px 10px;">' + (s.files ? s.files + ' file' + (s.files !== 1 ? "s" : "") + ' · ' + kb(s.storage) + ' stored' + (s.latest ? ' · latest ' + fmtDate(s.latest) : "") : "No files uploaded yet") + '</div>' +
      NOTE +
      '<input type="file" id="hu-file" style="display:none;">' +
      '<button class="btn btn-accent btn-block" data-hu="sheet" style="margin:12px 0;">' + svg("plus", 16) + ' Upload Report</button>';
    if (s.blood) h += '<button class="hu-row" data-nav="bloodwork"><span class="hu-thumb">🩸</span><span style="min-width:0;flex:1;text-align:left;"><span style="display:block;font-weight:700;">Blood Work</span><span style="display:block;font-size:12px;color:var(--muted);">' + s.blood + ' report' + (s.blood !== 1 ? "s" : "") + ' · trends & biomarkers</span></span><span style="color:var(--muted);">' + svg("progress", 16) + '</span></button>';
    if (m.length) {
      h += '<div class="section-heading"><span class="section-heading__label">Recent uploads</span></div>';
      m.forEach(function (r) {
        h += '<button class="hu-row" data-hu="open" data-id="' + r.id + '">' +
          '<span class="hu-thumb">' + (r.mime && r.mime.indexOf("image") === 0 ? "🖼️" : "📄") + '</span>' +
          '<span style="min-width:0;flex:1;text-align:left;"><span style="display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(r.name) + '</span>' +
          '<span style="display:block;font-size:12px;color:var(--muted);">' + esc(catById[r.category] ? catById[r.category].label : r.category) + ' · ' + fmtDate(r.date || r.createdAt) + ' · ' + (r.status || "uploaded") + '</span></span>' +
          '<span style="color:var(--muted);">' + svg("progress", 16) + '</span></button>';
      });
    } else if (!s.blood) h += '<div class="empty-note">No reports yet. Tap “Upload Report” to add one.</div>';
    if (view.sheet) h += renderSheet();
    return h;
  }

  function renderDetail() {
    var r = loadMeta().filter(function (x) { return String(x.id) === String(view.openId); })[0];
    if (!r) { reset(); return renderList(); }
    var isImg = r.mime && r.mime.indexOf("image") === 0;
    var h = head("Report", true) +
      '<div class="hu-preview" id="hu-preview">' + (isImg ? '<div style="color:var(--muted);font-size:13px;">Loading preview…</div>' : '<div style="font-size:48px;">📄</div>') + '</div>' +
      '<div class="goal-card">' +
      '<div style="font-weight:800;overflow-wrap:anywhere;">' + esc(r.name) + '</div>' +
      '<div class="row-between" style="padding:6px 0;font-size:13px;"><span style="color:var(--muted);">Category</span><span>' + esc(catById[r.category] ? catById[r.category].label : r.category) + '</span></div>' +
      '<div class="row-between" style="padding:6px 0;font-size:13px;border-top:1px solid var(--border);"><span style="color:var(--muted);">Size / type</span><span>' + kb(r.size || 0) + ' · ' + esc(r.mime || "") + '</span></div>' +
      '<div class="row-between" style="padding:6px 0;font-size:13px;border-top:1px solid var(--border);"><span style="color:var(--muted);">Uploaded</span><span>' + fmtDate(r.createdAt) + '</span></div>' +
      '<div class="row-between" style="padding:6px 0;font-size:13px;border-top:1px solid var(--border);"><span style="color:var(--muted);">Status</span><span>' + esc(r.status || "uploaded") + (r.extractedCount ? ' · ' + r.extractedCount + ' values' : '') + '</span></div>' +
      '<label class="goal-label">Category (override)</label><select id="hu-cat" class="goal-input">' + CATEGORIES.map(function (c) { return '<option value="' + c.id + '"' + (r.category === c.id ? " selected" : "") + '>' + c.label + '</option>'; }).join("") + '</select>' +
      '</div>' +
      '<button class="btn btn-accent btn-block" data-hu="analyze" data-id="' + r.id + '">Analyze &amp; Review</button>' +
      '<div style="display:flex;gap:8px;margin-top:8px;">' +
      '<button class="btn btn-secondary" data-hu="export" data-id="' + r.id + '" style="flex:1;">Export</button>' +
      '<button class="btn btn-secondary" data-hu="rename" data-id="' + r.id + '" style="flex:1;">Rename</button>' +
      '<button class="btn btn-ghost" data-hu="delete" data-id="' + r.id + '" style="flex:1;color:var(--accent);">Delete</button>' +
      '</div>';
    return h;
  }

  function renderReview() {
    var r = loadMeta().filter(function (x) { return String(x.id) === String(view.openId); })[0];
    if (!r) { reset(); return renderList(); }
    var isBlood = r.category === "bloodwork";
    var h = head("Review Values", true) +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:10px;">' + esc(r.name) + ' · ' + esc(catById[r.category] ? catById[r.category].label : r.category) + '</div>' +
      '<div class="goal-card"><label class="goal-label">Report date</label><input type="date" id="hu-date" class="goal-input" value="' + (r.date || new Date().toISOString().slice(0, 10)) + '">' +
      '<label class="goal-label">Lab / clinic (optional)</label><input id="hu-lab" class="goal-input" value="' + esc(r.lab || "") + '"></div>' +
      '<div class="goal-card"><label class="goal-label">' + (isBlood ? 'Paste biomarker values from the report' : 'Enter values (name, value, unit per line)') + '</label>' +
      '<textarea id="hu-values" class="goal-input" style="min-height:150px;font-family:monospace;" placeholder="' + (isBlood ? 'Hemoglobin 14.6 g/dL 13-17\nHbA1c 5.5 % 4-5.6\nVitamin D 28 ng/mL 30-100' : 'Skeletal Muscle Mass 34 kg\nBody Fat % 18') + '">' + esc(view.draft || "") + '</textarea>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:6px;">Read the values off the stored file above and type/paste them here. You can edit everything before saving.</div></div>' +
      '<button class="btn btn-accent btn-block" data-hu="save" data-id="' + r.id + '">Save to ' + (isBlood ? 'Blood Work' : 'Health Records') + '</button>';
    return h;
  }

  /* ---------- file handling ---------- */
  function onFiles(files) {
    var arr = Array.prototype.slice.call(files || []);
    if (!arr.length) return;
    var meta = loadMeta();
    var chain = Promise.resolve(), added = 0, dupWarn = false;
    arr.forEach(function (f) {
      chain = chain.then(function () {
        var h = hashStr((f.name || "") + ":" + (f.size || 0));
        if (meta.some(function (m) { return m.hash === h; })) { dupWarn = true; return; }
        var id = uid();
        return idbPut(id, f).then(function () {
          meta.unshift({ id: id, fileId: id, name: f.name || ("report-" + id), mime: f.type || "", size: f.size || 0, category: detectCategory(f.name), date: "", lab: "", status: "uploaded", createdAt: Date.now(), hash: h });
          added++;
        });
      });
    });
    chain.then(function () {
      saveMeta(meta);
      if (window.showToast) window.showToast(added ? ("Uploaded " + added + " file" + (added !== 1 ? "s" : "") + (dupWarn ? " (some duplicates skipped)" : "")) : "That file is already uploaded.", "info", window.render);
      if (window.render) window.render();
    }).catch(function () { if (window.showToast) window.showToast("Upload failed on this device (storage unavailable).", "error", window.render); });
  }

  function showPreview() {
    var r = loadMeta().filter(function (x) { return String(x.id) === String(view.openId); })[0];
    if (!r || !(r.mime && r.mime.indexOf("image") === 0)) return;
    idbGet(r.fileId).then(function (blob) {
      var el = document.getElementById("hu-preview"); if (!el || !blob) return;
      var url = URL.createObjectURL(blob);
      el.innerHTML = '<img src="' + url + '" style="max-width:100%;max-height:280px;border-radius:12px;" onload="URL.revokeObjectURL(this.src.startsWith(\'blob\')?this.src:0)">';
    }).catch(function () {});
  }

  function saveReview() {
    var r = loadMeta().filter(function (x) { return String(x.id) === String(view.openId); })[0]; if (!r) return;
    var date = (document.getElementById("hu-date") || {}).value || new Date().toISOString().slice(0, 10);
    var lab = (document.getElementById("hu-lab") || {}).value || "";
    var text = (document.getElementById("hu-values") || {}).value || "";
    if (!text.trim()) { if (window.showToast) window.showToast("Enter at least one value.", "error", window.render); return; }
    var meta = loadMeta(), rec = meta.filter(function (x) { return String(x.id) === String(r.id); })[0];
    if (r.category === "bloodwork" && window.IgnytBloodwork && window.IgnytBloodwork.importReport) {
      var results = window.IgnytBloodwork._parse(text).filter(function (x) { return x.key; });
      if (!results.length) { if (window.showToast) window.showToast("No recognised biomarkers found — check the format.", "error", window.render); return; }
      var saved = window.IgnytBloodwork.importReport({ date: date, lab: lab, fileId: r.fileId }, results);
      rec.status = "saved"; rec.date = date; rec.lab = lab; rec.extractedCount = results.length; rec.linkedType = "bloodwork"; rec.linkedReportId = saved.id;
    } else {
      // generic health record (InBody/DEXA/other): store name/value lines as-is
      var vals = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) { var mm = l.match(/^(.+?)[\s:]+(-?\d+(?:\.\d+)?)\s*(.*)$/); return mm ? { name: mm[1].trim(), value: Number(mm[2]), unit: (mm[3] || "").trim() } : { name: l, value: null, unit: "" }; });
      var recs = loadRecords(); recs.unshift({ id: uid(), category: r.category, date: date, lab: lab, fileId: r.fileId, createdAt: Date.now(), values: vals });
      saveRecords(recs);
      rec.status = "saved"; rec.date = date; rec.lab = lab; rec.extractedCount = vals.length; rec.linkedType = r.category;
    }
    saveMeta(meta);
    reset();
    if (window.showToast) window.showToast("Saved.", "info", window.render);
    if (window.render) window.render();
  }

  function exportFile(id) {
    var r = loadMeta().filter(function (x) { return String(x.id) === String(id); })[0]; if (!r) return;
    idbGet(r.fileId).then(function (blob) {
      if (!blob) { if (window.showToast) window.showToast("Original file not found.", "error", window.render); return; }
      var url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = r.name; document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    });
  }

  /* ---------- handlers ---------- */
  var _bound = false;
  function attach() {
    if (_bound) return; _bound = true;
    document.addEventListener("change", function (e) {
      if (typeof state === "undefined" || state.tab !== "uploads") return;
      if (e.target && e.target.id === "hu-file") onFiles(e.target.files);
    });
    document.addEventListener("click", function (e) {
      if (typeof state === "undefined" || state.tab !== "uploads") return;
      var el = e.target.closest("[data-hu]"); if (!el) return;
      var a = el.getAttribute("data-hu"), id = el.getAttribute("data-id");
      if (a === "list") { reset(); return win(); }
      if (a === "sheet") { view.sheet = true; return win(); }
      if (a === "sheet-close") { view.sheet = false; return win(); }
      if (a === "src") {
        // Configure the input per chosen source, then click. Camera opens ONLY for "photo".
        var src = el.getAttribute("data-src");
        view.sheet = false; win(); // re-render without the sheet -> fresh #hu-file element
        var inp = document.getElementById("hu-file"); if (!inp) return;
        if (src === "photo") { inp.accept = "image/*"; inp.setAttribute("capture", "environment"); inp.multiple = false; }
        else if (src === "image") { inp.accept = "image/*"; inp.removeAttribute("capture"); inp.multiple = true; }
        else if (src === "pdf") { inp.accept = "application/pdf"; inp.removeAttribute("capture"); inp.multiple = true; }
        else { inp.accept = "image/*,application/pdf"; inp.removeAttribute("capture"); inp.multiple = true; }
        inp.value = ""; inp.click();
        return;
      }
      if (a === "open") { view.screen = "detail"; view.openId = id; win(); setTimeout(showPreview, 30); return; }
      if (a === "analyze") {
        // honest staged progress, then a manual/paste review (no fake OCR)
        var rec = loadMeta().filter(function (x) { return String(x.id) === String(view.openId); })[0];
        var sel = document.getElementById("hu-cat"); if (rec && sel) { rec.category = sel.value; var m = loadMeta(); m.forEach(function (x) { if (String(x.id) === String(rec.id)) x.category = sel.value; }); saveMeta(m); }
        view.screen = "review"; view.draft = ""; return win();
      }
      if (a === "save") { return saveReview(); }
      if (a === "export") { return exportFile(id); }
      if (a === "rename") {
        var rc = loadMeta().filter(function (x) { return String(x.id) === String(id); })[0]; if (!rc) return;
        var nn = window.prompt ? window.prompt("Rename report", rc.name) : null;
        if (nn && nn.trim()) { var mm = loadMeta(); mm.forEach(function (x) { if (String(x.id) === String(id)) x.name = nn.trim(); }); saveMeta(mm); win(); }
        return;
      }
      if (a === "delete") {
        var go = function (ok) { if (!ok) return; var rr = loadMeta().filter(function (x) { return String(x.id) === String(id); })[0]; if (rr) idbDel(rr.fileId); saveMeta(loadMeta().filter(function (x) { return String(x.id) !== String(id); })); reset(); win(); };
        if (window.confirmDialog) window.confirmDialog("Delete this report and its original file? This cannot be undone.", window.render).then(go); else go(true);
        return;
      }
    });
  }
  function win() { if (window.render) window.render(); }

  window.IgnytHealthUploads = { render: render, attach: attach, _detect: detectCategory, _load: loadMeta };
})();
