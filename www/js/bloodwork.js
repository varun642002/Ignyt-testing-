/* =========================================================
   BLOOD WORK ANALYSIS (Phase 1 — client-side, privacy-preserving)

   Self-contained module so it can't destabilise the rest of the app. It owns its own
   localStorage key (hx_blood_reports) and repaints by calling the app's global render().

   Phase 1 (this file): structured biomarker catalog, storage model, paste-text / CSV import ->
   mandatory review -> save, duplicate detection, per-biomarker history + trend sparkline,
   educational insights (never diagnostic), edit/delete, JSON/CSV export.

   NOT in phase 1 (flagged, not faked): OCR of scanned images (needs Tesseract.js) and PDF-text
   extraction (needs pdf.js). Those are heavier follow-ups; here the user pastes report text or
   imports CSV, which is reliable and needs no external library or cloud upload.

   Medical safety: this feature is educational only. It never diagnoses or prescribes; values
   outside a report's reference range are flagged with a "discuss with a healthcare professional"
   note. No health data ever leaves the device.
========================================================= */
(function () {
  "use strict";
  var STORE = "hx_blood_reports";

  /* ---- Biomarker catalog. `low`/`high` are GENERAL adult reference ranges shown only when a
     report doesn't carry its own range; a report's own parsed range always takes precedence. ---- */
  var CATALOG = [
    // CBC
    ["hemoglobin","Hemoglobin","CBC","g/dL",13.0,17.0,["hb","hgb","haemoglobin"]],
    ["hematocrit","Hematocrit","CBC","%",40,52,["hct","pcv"]],
    ["rbc","RBC","CBC","x10^6/uL",4.5,5.9,["red blood cell","red blood cells"]],
    ["wbc","WBC","CBC","x10^3/uL",4.0,11.0,["white blood cell","white blood cells","tlc","total leukocyte"]],
    ["platelets","Platelets","CBC","x10^3/uL",150,410,["plt","platelet count"]],
    ["mcv","MCV","CBC","fL",80,100,[]],
    ["mch","MCH","CBC","pg",27,33,[]],
    ["mchc","MCHC","CBC","g/dL",32,36,[]],
    ["rdw","RDW","CBC","%",11.5,14.5,[]],
    ["neutrophils","Neutrophils","CBC","%",40,75,["neutrophil"]],
    ["lymphocytes","Lymphocytes","CBC","%",20,45,["lymphocyte"]],
    ["monocytes","Monocytes","CBC","%",2,10,["monocyte"]],
    ["eosinophils","Eosinophils","CBC","%",1,6,["eosinophil"]],
    ["basophils","Basophils","CBC","%",0,2,["basophil"]],
    // Diabetes & glucose
    ["glucose_fasting","Fasting Glucose","Diabetes","mg/dL",70,99,["fasting blood glucose","fbs","glucose fasting","fasting sugar"]],
    ["hba1c","HbA1c","Diabetes","%",4.0,5.6,["a1c","glycated hemoglobin","glycosylated"]],
    ["insulin","Insulin (fasting)","Diabetes","uIU/mL",2.6,24.9,["fasting insulin"]],
    ["homa_ir","HOMA-IR","Diabetes","",0,2.0,["homa"]],
    // Lipids
    ["cholesterol_total","Total Cholesterol","Lipids","mg/dL",0,200,["total cholesterol","cholesterol total","tc"]],
    ["ldl","LDL","Lipids","mg/dL",0,100,["ldl cholesterol","ldl-c"]],
    ["hdl","HDL","Lipids","mg/dL",40,200,["hdl cholesterol","hdl-c"]],
    ["triglycerides","Triglycerides","Lipids","mg/dL",0,150,["tg","trigs"]],
    ["vldl","VLDL","Lipids","mg/dL",5,40,["vldl cholesterol"]],
    ["nonhdl","Non-HDL Cholesterol","Lipids","mg/dL",0,130,["non hdl","non-hdl"]],
    // Liver
    ["alt","ALT (SGPT)","Liver","U/L",0,50,["sgpt","alanine"]],
    ["ast","AST (SGOT)","Liver","U/L",0,50,["sgot","aspartate"]],
    ["alp","ALP","Liver","U/L",30,120,["alkaline phosphatase"]],
    ["ggt","GGT","Liver","U/L",0,55,["gamma gt","gamma-glutamyl"]],
    ["bilirubin","Bilirubin (total)","Liver","mg/dL",0.1,1.2,["total bilirubin"]],
    ["albumin","Albumin","Liver","g/dL",3.5,5.2,[]],
    ["total_protein","Total Protein","Liver","g/dL",6.0,8.3,["protein total"]],
    // Kidney
    ["creatinine","Creatinine","Kidney","mg/dL",0.7,1.3,["serum creatinine"]],
    ["egfr","eGFR","Kidney","mL/min/1.73m2",90,200,["gfr","estimated gfr"]],
    ["bun","BUN","Kidney","mg/dL",7,20,["blood urea nitrogen","urea nitrogen"]],
    ["uric_acid","Uric Acid","Kidney","mg/dL",3.5,7.2,["urate"]],
    // Electrolytes
    ["sodium","Sodium","Electrolytes","mmol/L",135,145,["na"]],
    ["potassium","Potassium","Electrolytes","mmol/L",3.5,5.1,["k"]],
    ["chloride","Chloride","Electrolytes","mmol/L",98,107,["cl"]],
    ["calcium","Calcium","Electrolytes","mg/dL",8.6,10.3,["ca"]],
    ["magnesium","Magnesium","Electrolytes","mg/dL",1.7,2.2,["mg"]],
    ["phosphorus","Phosphorus","Electrolytes","mg/dL",2.5,4.5,["phosphate"]],
    // Thyroid
    ["tsh","TSH","Thyroid","uIU/mL",0.4,4.0,["thyroid stimulating"]],
    ["ft3","Free T3","Thyroid","pg/mL",2.3,4.2,["free t3","ft3","triiodothyronine free"]],
    ["ft4","Free T4","Thyroid","ng/dL",0.8,1.8,["free t4","ft4","thyroxine free"]],
    // Hormones
    ["testosterone_total","Total Testosterone","Hormones","ng/dL",264,916,["total testosterone","testosterone total"]],
    ["testosterone_free","Free Testosterone","Hormones","pg/mL",8.7,25.1,["free testosterone"]],
    ["shbg","SHBG","Hormones","nmol/L",18,54,["sex hormone binding"]],
    ["estradiol","Estradiol","Hormones","pg/mL",10,40,["e2","oestradiol"]],
    ["cortisol","Cortisol","Hormones","ug/dL",6,23,[]],
    ["dheas","DHEA-S","Hormones","ug/dL",100,430,["dhea sulfate","dhea-s"]],
    // Vitamins
    ["vitamin_d","Vitamin D (25-OH)","Vitamins","ng/mL",30,100,["25-oh","25 hydroxy","vit d","vitamin d3"]],
    ["vitamin_b12","Vitamin B12","Vitamins","pg/mL",200,900,["b12","cobalamin"]],
    ["folate","Folate","Vitamins","ng/mL",3.0,20.0,["folic acid"]],
    // Iron studies
    ["ferritin","Ferritin","Iron","ng/mL",30,400,[]],
    ["iron","Iron","Iron","ug/dL",65,175,["serum iron"]],
    ["tibc","TIBC","Iron","ug/dL",250,450,["total iron binding"]],
    ["transferrin_sat","Transferrin Saturation","Iron","%",20,50,["transferrin saturation","tsat","% saturation"]],
    // Inflammation
    ["crp","CRP","Inflammation","mg/L",0,5,["c reactive protein","c-reactive"]],
    ["hscrp","hs-CRP","Inflammation","mg/L",0,3,["hs crp","high sensitivity crp"]],
    ["esr","ESR","Inflammation","mm/hr",0,20,["sed rate","sedimentation"]]
  ].map(function (r) {
    return { key: r[0], name: r[1], category: r[2], unit: r[3], low: r[4], high: r[5], aliases: r[6] };
  });

  var CATEGORY_ORDER = ["CBC","Diabetes","Lipids","Liver","Kidney","Electrolytes","Thyroid","Hormones","Vitamins","Iron","Inflammation","Other"];

  var byKey = {}; CATALOG.forEach(function (b) { byKey[b.key] = b; });

  // Match a free-text label to a catalog biomarker (longest alias/name first for specificity).
  var MATCHERS = [];
  function addMatcher(key, t) { t = (t || "").toLowerCase().trim(); if (t) MATCHERS.push({ key: key, t: t }); }
  CATALOG.forEach(function (b) {
    var full = b.name.toLowerCase();
    addMatcher(b.key, full);
    var base = full.replace(/\s*\(.*?\)\s*/g, " ").trim(); // "Vitamin D (25-OH)" -> "vitamin d", "ALT (SGPT)" -> "alt"
    if (base && base !== full) addMatcher(b.key, base);
    (b.aliases || []).forEach(function (a) { addMatcher(b.key, a); });
  });
  MATCHERS.sort(function (a, b) { return b.t.length - a.t.length; }); // longest / most-specific first
  function esc2(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  // Token-boundary match (not raw substring) so "ast" can't match inside "fasting" and "na"
  // can't match inside "alanine"; hyphens/spaces count as boundaries.
  MATCHERS.forEach(function (m) { m.re = new RegExp("(^|[^a-z0-9])" + esc2(m.t) + "([^a-z0-9]|$)"); });
  function matchBiomarker(label) {
    var s = (label || "").toLowerCase();
    for (var i = 0; i < MATCHERS.length; i++) { if (MATCHERS[i].re.test(s)) return MATCHERS[i].key; }
    return null;
  }

  /* ---------- storage ---------- */
  function load() { try { var a = JSON.parse(localStorage.getItem(STORE) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem(STORE, JSON.stringify(list)); } catch (e) {} }
  function uid() { return (window.nextId ? window.nextId() : Date.now()); }
  function hash(str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ":" + str.length; }

  /* ---------- parser (best-effort; the review step is mandatory) ---------- */
  // Extracts {label, value, unit, low, high} candidates from pasted lab text or CSV. Every line
  // that yields a number is kept; matched biomarkers are pre-selected, unknown labels are shown
  // but not saved unless the user maps them. Nothing is persisted without review.
  function parse(text) {
    var out = [], seen = {};
    (text || "").split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim(); if (!line) return;
      var label, value, unit = "", low = null, high = null;
      var parts = line.indexOf(",") !== -1 ? line.split(",").map(function (x) { return x.trim(); }) : null;
      if (parts && parts.length >= 2 && /-?\d/.test(parts[1])) {
        // CSV: name, value, [unit], [low], [high]  OR  name, value, [refLow-refHigh]
        label = parts[0]; value = parseFloat((parts[1] || "").replace(/[^\d.\-]/g, ""));
        unit = parts[2] || "";
        var rng = (parts[3] || "").match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
        if (rng) { low = parseFloat(rng[1]); high = parseFloat(rng[2]); }
        else { if (parts[3] != null && parts[3] !== "") low = parseFloat(parts[3]); if (parts[4] != null && parts[4] !== "") high = parseFloat(parts[4]); }
      } else {
        // Text line: "<label> <value> <unit> <low-high>"
        var m = line.match(/^(.+?)[\s:]+(-?\d+(?:\.\d+)?)\s*([a-zA-Z%\/^.\d]+)?\s*(?:\(?\s*(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)\s*\)?)?/);
        if (!m) return;
        label = m[1].trim(); value = parseFloat(m[2]); unit = (m[3] || "").trim();
        if (m[4] != null) low = parseFloat(m[4]); if (m[5] != null) high = parseFloat(m[5]);
      }
      if (label == null || isNaN(value)) return;
      var key = matchBiomarker(label);
      var dedupeKey = key || label.toLowerCase();
      if (seen[dedupeKey]) return; seen[dedupeKey] = 1;
      var cat = key ? byKey[key] : null;
      out.push({
        key: key, name: key ? cat.name : label, label: label,
        value: value, unit: unit || (cat ? cat.unit : ""),
        low: low != null ? low : (cat ? cat.low : null),
        high: high != null ? high : (cat ? cat.high : null),
        include: !!key
      });
    });
    return out;
  }

  function outOfRange(r) {
    if (r.value == null) return 0;
    if (r.low != null && r.value < r.low) return -1;
    if (r.high != null && r.value > r.high) return 1;
    return 0;
  }

  /* ---------- module view state (transient, not persisted) ---------- */
  var view = { screen: "dashboard", draft: null, meta: null, openId: null, trendKey: null, dupOf: null };

  function reset() { view = { screen: "dashboard", draft: null, meta: null, openId: null, trendKey: null, dupOf: null }; }

  /* ---------- rendering ---------- */
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var svg = function (n, s) { return (window.svg ? window.svg(n, s) : ""); };
  var fmtDate = function (d) { try { return new Date(d).toLocaleDateString("default", { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return d || ""; } };

  var DISCLAIMER = '<div class="bw-disclaimer">For education and personal tracking only — not a medical diagnosis. Discuss any out-of-range results with a qualified healthcare professional.</div>';

  function header(title, back) {
    return (back ? '<button class="btn btn-ghost" data-bw="back" style="padding:8px 14px;font-size:14px;margin:4px 0 10px;">← Back</button>' : "") +
      '<div style="font-size:25px;font-weight:900;margin-bottom:4px;">🩸 ' + esc(title) + "</div>";
  }

  function render() {
    if (view.screen === "add") return renderAdd();
    if (view.screen === "review") return renderReview();
    if (view.screen === "report") return renderReport();
    if (view.screen === "trend") return renderTrend();
    return renderDashboard();
  }

  function renderDashboard() {
    var reports = load().slice().sort(function (a, b) { return (new Date(b.date)) - (new Date(a.date)) || b.createdAt - a.createdAt; });
    var latest = reports[0];
    var h = header("Blood Work") +
      '<div style="font-size:14px;color:var(--muted);margin:0 0 14px;">Upload or paste lab reports, review, and track biomarkers over time.</div>' +
      DISCLAIMER +
      '<button class="btn btn-accent btn-block" data-bw="add" style="margin:12px 0;">' + svg("plus", 16) + ' Add Blood Report</button>';

    if (!reports.length) {
      return h + '<div class="empty-note">No blood reports yet. Tap “Add Blood Report”, paste your lab values or import a CSV, review, and save.</div>';
    }

    // latest-values-by-biomarker + previous for trend/insight
    var latestVal = {}, prevVal = {};
    reports.forEach(function (rep) {
      (rep.results || []).forEach(function (r) {
        if (!r.key) return;
        if (latestVal[r.key] === undefined) latestVal[r.key] = r;
        else if (prevVal[r.key] === undefined) prevVal[r.key] = r;
      });
    });

    // insights
    var oor = [], up = [], down = [];
    Object.keys(latestVal).forEach(function (k) {
      var r = latestVal[k]; if (outOfRange(r) !== 0) oor.push(r);
      var p = prevVal[k]; if (p && p.value != null && r.value != null && p.value !== r.value) (r.value > p.value ? up : down).push({ r: r, from: p.value });
    });

    h += '<div class="section-heading"><span class="section-heading__label">Latest Report</span><button class="btn btn-ghost" data-bw="open" data-id="' + latest.id + '" style="padding:5px 8px;font-size:12px;">Open</button></div>' +
      '<div class="bw-card"><div style="font-weight:800;font-size:16px;">' + esc(latest.lab || "Lab report") + '</div>' +
      '<div style="font-size:13px;color:var(--muted);margin-top:2px;">' + fmtDate(latest.date) + ' · ' + (latest.results || []).length + ' biomarkers' + (latest.reportId ? ' · ' + esc(latest.reportId) : "") + '</div></div>';

    h += '<div class="section-heading"><span class="section-heading__label">Insights</span></div>' +
      '<div class="bw-card">' +
      '<div class="row-between" style="padding:6px 0;"><span>Out of range (latest)</span><span class="mono" style="font-weight:800;color:' + (oor.length ? "var(--accent)" : "var(--mint)") + ';">' + oor.length + '</span></div>' +
      '<div class="row-between" style="padding:6px 0;border-top:1px solid var(--border);"><span>Increased vs previous</span><span class="mono" style="font-weight:800;">' + up.length + '</span></div>' +
      '<div class="row-between" style="padding:6px 0;border-top:1px solid var(--border);"><span>Decreased vs previous</span><span class="mono" style="font-weight:800;">' + down.length + '</span></div>' +
      (oor.length ? '<div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;">Out of range: ' + oor.slice(0, 6).map(function (r) { return esc(r.name); }).join(", ") + (oor.length > 6 ? " +" + (oor.length - 6) : "") + '. Discuss with your doctor.</div>' : "") +
      '</div>';

    // biomarker cards grouped by category
    var groups = {};
    Object.keys(latestVal).forEach(function (k) { var c = byKey[k] ? byKey[k].category : "Other"; (groups[c] = groups[c] || []).push(latestVal[k]); });
    CATEGORY_ORDER.forEach(function (cat) {
      var list = groups[cat]; if (!list || !list.length) return;
      h += '<div class="section-heading"><span class="section-heading__label">' + esc(cat) + '</span></div><div class="bw-grid">';
      list.forEach(function (r) {
        var st = outOfRange(r);
        var color = st === 0 ? "var(--mint)" : "var(--accent)";
        var rangeTxt = (r.low != null || r.high != null) ? ((r.low != null ? r.low : "") + "–" + (r.high != null ? r.high : "")) : "—";
        h += '<button class="bw-metric" data-bw="trend" data-key="' + r.key + '">' +
          '<div class="bw-metric__name">' + esc(r.name) + '</div>' +
          '<div class="bw-metric__val" style="color:' + color + ';">' + esc(r.value) + ' <span class="bw-metric__unit">' + esc(r.unit || "") + '</span></div>' +
          '<div class="bw-metric__range">ref ' + esc(rangeTxt) + (st === 1 ? ' · high' : st === -1 ? ' · low' : '') + '</div>' +
          '</button>';
      });
      h += '</div>';
    });

    h += '<div class="section-heading"><span class="section-heading__label">History (' + reports.length + ')</span></div>';
    reports.forEach(function (rep) {
      h += '<button class="bw-row" data-bw="open" data-id="' + rep.id + '">' +
        '<div style="min-width:0;"><div style="font-weight:700;">' + esc(rep.lab || "Lab report") + '</div>' +
        '<div style="font-size:12px;color:var(--muted);">' + fmtDate(rep.date) + ' · ' + (rep.results || []).length + ' biomarkers</div></div>' +
        '<span style="color:var(--muted);">' + svg("progress", 16) + '</span></button>';
    });

    h += '<div style="display:flex;gap:8px;margin-top:16px;">' +
      '<button class="btn btn-secondary" data-bw="export" data-fmt="json" style="flex:1;">Export JSON</button>' +
      '<button class="btn btn-secondary" data-bw="export" data-fmt="csv" style="flex:1;">Export CSV</button></div>';
    return h;
  }

  function renderAdd() {
    return header("Add Blood Report", true) + DISCLAIMER +
      '<div class="bw-card" style="margin-top:12px;">' +
      '<label class="bw-label">Report date</label><input type="date" id="bw-date" class="bw-input" value="' + new Date().toISOString().slice(0, 10) + '">' +
      '<label class="bw-label">Laboratory (optional)</label><input type="text" id="bw-lab" class="bw-input" placeholder="e.g. Quest, LabCorp">' +
      '<label class="bw-label">Report ID (optional)</label><input type="text" id="bw-report-id" class="bw-input" placeholder="e.g. R-12345">' +
      '</div>' +
      '<div class="bw-card" style="margin-top:12px;">' +
      '<label class="bw-label">Paste lab values or CSV</label>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:6px;line-height:1.5;">One biomarker per line, e.g. <span class="mono">Hemoglobin 14.2 g/dL 13-17</span> or CSV <span class="mono">HbA1c,5.4,%,4,5.6</span>. You’ll review everything before it’s saved.</div>' +
      '<textarea id="bw-paste" class="bw-input" style="min-height:150px;font-family:monospace;" placeholder="Hemoglobin 14.2 g/dL 13-17&#10;HbA1c 5.4 % 4-5.6&#10;LDL 96 mg/dL 0-100"></textarea>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:6px;">PDF and photo auto-extraction (OCR) is a planned enhancement; for now paste the values or import CSV.</div>' +
      '</div>' +
      '<button class="btn btn-accent btn-block" data-bw="parse" style="margin-top:12px;">' + svg("progress", 16) + ' Extract &amp; Review</button>';
  }

  function renderReview() {
    var d = view.draft || [];
    var h = header("Review Extracted Values", true) + DISCLAIMER +
      '<div style="font-size:13px;color:var(--muted);margin:10px 0;">' + d.length + ' value' + (d.length !== 1 ? "s" : "") + ' found. Untick anything wrong, fix values, then save. Only ticked, recognised biomarkers are saved.</div>';
    if (!d.length) h += '<div class="empty-note">Nothing could be extracted. Go back and check the format (one biomarker per line).</div>';
    d.forEach(function (r, i) {
      var st = outOfRange(r);
      h += '<div class="bw-review">' +
        '<label class="bw-check"><input type="checkbox" data-bw-inc="' + i + '"' + (r.include ? " checked" : "") + '></label>' +
        '<div style="min-width:0;flex:1;">' +
        '<div style="font-weight:700;">' + esc(r.name) + (r.key ? '' : ' <span style="color:var(--accent);font-size:10px;">UNMATCHED</span>') + '</div>' +
        '<div style="display:flex;gap:6px;margin-top:4px;align-items:center;">' +
        '<input class="bw-input bw-mini" data-bw-val="' + i + '" value="' + esc(r.value) + '" inputmode="decimal">' +
        '<input class="bw-input bw-mini" data-bw-unit="' + i + '" value="' + esc(r.unit || "") + '" placeholder="unit" style="width:70px;">' +
        '<span style="font-size:12px;color:var(--muted);white-space:nowrap;">ref ' + (r.low != null ? r.low : "—") + "–" + (r.high != null ? r.high : "—") + '</span>' +
        (st !== 0 ? '<span style="font-size:11px;font-weight:800;color:var(--accent);">' + (st === 1 ? "HIGH" : "LOW") + '</span>' : "") +
        '</div></div></div>';
    });
    if (view.dupOf) h += '<div class="bw-disclaimer" style="border-color:var(--accent);color:var(--accent);">This looks like a duplicate of a report already saved on ' + fmtDate(view.dupOf.date) + '. Saving will add it again.</div>';
    h += '<button class="btn btn-accent btn-block" data-bw="save" style="margin-top:14px;">Save Report</button>';
    return h;
  }

  function renderReport() {
    var rep = load().filter(function (r) { return String(r.id) === String(view.openId); })[0];
    if (!rep) { reset(); return renderDashboard(); }
    var h = header(rep.lab || "Lab report", true) +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">' + fmtDate(rep.date) + (rep.reportId ? ' · ' + esc(rep.reportId) : "") + '</div>';
    (rep.results || []).forEach(function (r) {
      var st = outOfRange(r), color = st === 0 ? "var(--text)" : "var(--accent)";
      h += '<div class="bw-row" style="cursor:default;"><div style="min-width:0;"><div style="font-weight:700;">' + esc(r.name) + '</div>' +
        '<div style="font-size:12px;color:var(--muted);">ref ' + (r.low != null ? r.low : "—") + "–" + (r.high != null ? r.high : "—") + " " + esc(r.unit || "") + '</div></div>' +
        '<span class="mono" style="font-weight:800;color:' + color + ';">' + esc(r.value) + " " + esc(r.unit || "") + (st !== 0 ? " " + (st === 1 ? "↑" : "↓") : "") + '</span></div>';
    });
    h += '<button class="btn btn-ghost btn-block" data-bw="delete" data-id="' + rep.id + '" style="margin-top:16px;color:var(--accent);">Delete this report</button>';
    return h;
  }

  function renderTrend() {
    var key = view.trendKey, b = byKey[key];
    var reports = load().slice().sort(function (a, b) { return (new Date(a.date)) - (new Date(b.date)); });
    var points = [];
    reports.forEach(function (rep) { (rep.results || []).forEach(function (r) { if (r.key === key && r.value != null) points.push({ date: rep.date, value: Number(r.value) }); }); });
    var h = header((b ? b.name : key) + " Trend", true);
    if (points.length < 1) return h + '<div class="empty-note">No data.</div>';
    var latest = points[points.length - 1];
    h += '<div class="bw-card"><div style="font-size:13px;color:var(--muted);">Latest</div>' +
      '<div class="mono" style="font-size:28px;font-weight:900;">' + esc(latest.value) + ' <span style="font-size:14px;color:var(--muted);">' + esc(b ? b.unit : "") + '</span></div>' +
      (b && (b.low != null || b.high != null) ? '<div style="font-size:12px;color:var(--muted);">general ref ' + b.low + "–" + b.high + '</div>' : "") + '</div>';
    if (window.sparklineChart && points.length > 1) h += '<div class="bw-card" style="margin-top:10px;">' + window.sparklineChart(points, { color: "var(--accent)", unit: (b ? b.unit : "") }) + '</div>';
    h += '<div class="section-heading"><span class="section-heading__label">All readings</span></div>';
    points.slice().reverse().forEach(function (p) {
      h += '<div class="bw-row" style="cursor:default;"><span style="color:var(--muted);">' + fmtDate(p.date) + '</span><span class="mono" style="font-weight:800;">' + esc(p.value) + '</span></div>';
    });
    return h;
  }

  /* ---------- export ---------- */
  function download(name, mime, content) {
    try {
      var blob = new Blob([content], { type: mime }), url = URL.createObjectURL(blob);
      var a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    } catch (e) { if (window.showToast) showToast("Export failed on this device.", "error", window.render); }
  }
  function exportData(fmt) {
    var reports = load();
    if (fmt === "json") return download("ignyt-bloodwork.json", "application/json", JSON.stringify(reports, null, 2));
    var rows = [["date", "lab", "reportId", "biomarker", "value", "unit", "refLow", "refHigh"]];
    reports.forEach(function (rep) { (rep.results || []).forEach(function (r) { rows.push([rep.date, rep.lab || "", rep.reportId || "", r.name, r.value, r.unit || "", r.low != null ? r.low : "", r.high != null ? r.high : ""]); }); });
    download("ignyt-bloodwork.csv", "text/csv", rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\n"));
  }

  /* ---------- one-time delegated handlers ---------- */
  var repaint = function () { if (window.render) window.render(); };
  function saveDraft() {
    var d = view.draft || [], meta = view.meta || {};
    var results = d.filter(function (r) { return r.include && r.key; }).map(function (r) {
      return { key: r.key, name: r.name, value: Number(r.value), unit: r.unit || "", low: r.low != null ? Number(r.low) : null, high: r.high != null ? Number(r.high) : null };
    });
    if (!results.length) { if (window.showToast) showToast("Tick at least one recognised biomarker to save.", "error", window.render); return; }
    var rep = { id: uid(), date: meta.date || new Date().toISOString().slice(0, 10), lab: meta.lab || "", reportId: meta.reportId || "", hash: meta.hash || hash(JSON.stringify(results) + (meta.date || "")), createdAt: Date.now(), results: results };
    var list = load(); list.unshift(rep); save(list);
    reset();
    if (window.showToast) showToast("Saved " + results.length + " biomarker" + (results.length !== 1 ? "s" : "") + ".", "info", window.render);
    repaint();
  }

  var _bound = false;
  function attach() {
    if (_bound) return; _bound = true;
    document.addEventListener("click", function (e) {
      if (typeof state === "undefined" || state.tab !== "bloodwork") return;
      var el = e.target.closest("[data-bw]"); if (!el) return;
      var act = el.getAttribute("data-bw");
      if (act === "back") { if (view.screen === "review") view.screen = "add"; else reset(); return repaint(); }
      if (act === "add") { view.screen = "add"; return repaint(); }
      if (act === "open") { view.screen = "report"; view.openId = el.getAttribute("data-id"); return repaint(); }
      if (act === "trend") { view.screen = "trend"; view.trendKey = el.getAttribute("data-key"); return repaint(); }
      if (act === "export") { return exportData(el.getAttribute("data-fmt")); }
      if (act === "delete") {
        var id = el.getAttribute("data-id");
        var go = function (ok) { if (!ok) return; save(load().filter(function (r) { return String(r.id) !== String(id); })); reset(); repaint(); };
        if (window.confirmDialog) window.confirmDialog("Delete this blood report? This cannot be undone.", window.render).then(go);
        else go(true);
        return;
      }
      if (act === "parse") {
        var meta = { date: (document.getElementById("bw-date") || {}).value || new Date().toISOString().slice(0, 10), lab: (document.getElementById("bw-lab") || {}).value || "", reportId: (document.getElementById("bw-report-id") || {}).value || "" };
        var txt = (document.getElementById("bw-paste") || {}).value || "";
        var draft = parse(txt);
        meta.hash = hash(txt + meta.date);
        view.meta = meta; view.draft = draft; view.screen = "review";
        view.dupOf = load().filter(function (r) { return r.hash === meta.hash || (r.date === meta.date && r.lab === meta.lab && meta.reportId && r.reportId === meta.reportId); })[0] || null;
        return repaint();
      }
      if (act === "save") { return saveDraft(); }
    });
    // review-table edits (change/input) — keep the draft in sync before save
    document.addEventListener("input", function (e) {
      if (typeof state === "undefined" || state.tab !== "bloodwork" || view.screen !== "review") return;
      var t = e.target, d = view.draft || [], i;
      if ((i = t.getAttribute("data-bw-val")) != null) d[i].value = t.value;
      else if ((i = t.getAttribute("data-bw-unit")) != null) d[i].unit = t.value;
      else if ((i = t.getAttribute("data-bw-inc")) != null) d[i].include = t.checked;
    });
  }

  // Public API for the Health Report Upload Center to route Blood Work results in. Accepts a
  // meta {date,lab,reportId,fileId} and an array of results (already keyed to the catalog);
  // reuses the same store, id and duplicate hash as the in-app flow. Returns the saved report.
  function importReport(meta, results) {
    meta = meta || {};
    var clean = (results || []).filter(function (r) { return r && r.key; }).map(function (r) {
      var cat = byKey[r.key];
      return { key: r.key, name: (cat ? cat.name : r.name || r.key), value: Number(r.value), unit: r.unit || (cat ? cat.unit : ""), low: r.low != null ? Number(r.low) : (cat ? cat.low : null), high: r.high != null ? Number(r.high) : (cat ? cat.high : null) };
    });
    var rep = { id: uid(), date: meta.date || new Date().toISOString().slice(0, 10), lab: meta.lab || "", reportId: meta.reportId || "", fileId: meta.fileId || null, hash: meta.hash || hash(JSON.stringify(clean) + (meta.date || "")), createdAt: Date.now(), results: clean };
    var list = load(); list.unshift(rep); save(list);
    return rep;
  }

  window.IgnytBloodwork = { render: render, attach: attach, CATALOG: CATALOG, _parse: parse, _load: load, importReport: importReport };
})();
