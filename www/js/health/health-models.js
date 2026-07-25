/* =========================================================
   HEALTH HUB — module catalog (the "database structure" for the dashboard)

   Every card on the Health Hub comes from this one list. Two kinds:

   - kind:"reuse"  -> the feature already exists elsewhere in IGNYT (body
     measurements/photos, medical report uploads, personal info, Health
     Connect insights, hydration). "View Details" navigates straight there.
     No duplicate storage, no duplicate UI -- exactly the existing screen.

   - kind:"stub"   -> genuinely new to the app. Storage/UI for these ships
     in the phase noted below (matches the build order that was agreed).
     Until then the card shows an honest "not built yet" status -- never a
     fabricated number.

   summary()/status()/lastUpdated() are called with the live `state` object
   at render time, so cards always reflect real data, never placeholders
   dressed up as data.
========================================================= */
(function () {
  "use strict";

  function fmtWhen(ts) {
    if (!ts) return "Never";
    try { return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }); }
    catch (e) { return ""; }
  }

  var HEALTH_MODULES = [
    {
      id: "overview", label: "Health Overview", icon: "health",
      blurb: "A single snapshot of everything below.",
      kind: "info",
      summary: function (s) {
        var set = HEALTH_MODULES.filter(function (m) { return m.id !== "overview" && m.status(s) !== "not-started"; }).length;
        return set + " of " + (HEALTH_MODULES.length - 1) + " modules have data";
      },
      status: function () { return "active"; },
      lastUpdated: function () { return Date.now(); }
    },
    {
      id: "measurements", label: "Body Measurements", icon: "ruler",
      blurb: "Weight, waist, chest, body fat and more.",
      kind: "reuse", nav: { tab: "body" },
      summary: function (s) {
        var log = s.bodylog || [];
        if (!log.length) return "No entries yet";
        return log.length + " entr" + (log.length === 1 ? "y" : "ies") + " logged";
      },
      status: function (s) { return (s.bodylog || []).length ? "active" : "not-started"; },
      lastUpdated: function (s) { var log = s.bodylog || []; return log.length ? Math.max.apply(null, log.map(function (e) { return e.id || 0; })) : null; }
    },
    {
      id: "bodyscan", label: "Body Scan Archive", icon: "body",
      blurb: "Progress photos — front, side, back and more.",
      kind: "reuse", nav: { tab: "body" },
      summary: function (s) {
        var n = (s.bodyPhotos || []).length;
        return n ? n + " photo" + (n === 1 ? "" : "s") + " stored" : "No photos yet";
      },
      status: function (s) { return (s.bodyPhotos || []).length ? "active" : "not-started"; },
      lastUpdated: function (s) { var p = s.bodyPhotos || []; return p.length ? Math.max.apply(null, p.map(function (x) { return x.createdAt || 0; })) : null; }
    },
    {
      id: "reports", label: "Medical Reports", icon: "flask",
      blurb: "Blood work, InBody, DEXA and other uploaded reports.",
      kind: "reuse", nav: { tab: "uploads" },
      summary: function () {
        var u = window.IgnytHealthUploads;
        if (!u) return "Module not loaded";
        var n = u._load().length;
        return n ? n + " file" + (n === 1 ? "" : "s") + " uploaded" : "No reports yet";
      },
      status: function () { var u = window.IgnytHealthUploads; return u && u._load().length ? "active" : "not-started"; },
      lastUpdated: function () { var u = window.IgnytHealthUploads; if (!u) return null; var m = u._load(); return m.length ? Math.max.apply(null, m.map(function (x) { return x.createdAt || 0; })) : null; }
    },
    {
      id: "aiinsights", label: "AI Health Insights", icon: "bolt",
      blurb: "Automated reading of your uploaded reports.",
      kind: "stub", phase: 4, phaseLabel: "Report Intelligence"
    },
    {
      id: "prescriptions", label: "Prescriptions", icon: "pencil",
      blurb: "Doctor, medicine, dosage, schedule and refill dates.",
      kind: "stub", phase: 6, phaseLabel: "Prescription Manager"
    },
    {
      id: "medications", label: "Medication Tracker", icon: "flask",
      blurb: "Taken / skipped / missed, with adherence stats.",
      kind: "stub", phase: 7, phaseLabel: "Medication Tracker"
    },
    {
      id: "vaccinations", label: "Vaccination Records", icon: "shield",
      blurb: "Dates, next-due reminders and certificates.",
      kind: "stub", phase: 8, phaseLabel: "Vaccination Records"
    },
    {
      id: "appointments", label: "Doctor Appointments", icon: "calendar",
      blurb: "Upcoming and past visits, with reminders.",
      kind: "stub", phase: 9, phaseLabel: "Doctor Appointments"
    },
    {
      id: "history", label: "Medical History", icon: "book",
      blurb: "Surgeries, hospitalisations, chronic conditions, family history.",
      kind: "stub", phase: 10, phaseLabel: "Medical History"
    },
    {
      id: "allergies", label: "Allergies", icon: "shield",
      blurb: "Anything you're allergic to.",
      kind: "reuse", action: "open-personal-info",
      summary: function (s) { var n = (s.profile.allergies || []).length; return n ? n + " recorded" : "None recorded"; },
      status: function (s) { return (s.profile.allergies || []).length ? "active" : "not-started"; },
      lastUpdated: function () { return null; }
    },
    {
      id: "bloodgroup", label: "Blood Group", icon: "heart",
      blurb: "Shown on your Emergency Profile.",
      kind: "reuse", action: "open-personal-info",
      summary: function (s) { return s.profile.bloodGroup ? s.profile.bloodGroup : "Not set"; },
      status: function (s) { return s.profile.bloodGroup ? "active" : "not-started"; },
      lastUpdated: function () { return null; }
    },
    {
      id: "emergency", label: "Emergency Profile", icon: "shield",
      blurb: "Blood group, allergies, conditions & emergency contacts in one card for first responders.",
      kind: "stub", phase: 11, phaseLabel: "Emergency Profile",
      note: "Blood group, allergies and conditions are already editable in Personal Information — contacts, offline card and QR code are coming."
    },
    {
      id: "insurance", label: "Insurance", icon: "shield",
      blurb: "Policy details, coverage and claim documents.",
      kind: "stub", phase: 12, phaseLabel: "Insurance"
    },
    {
      id: "timeline", label: "Health Timeline", icon: "trend",
      blurb: "Every workout, meal, weigh-in and record in one feed.",
      kind: "stub", phase: 5, phaseLabel: "Health Timeline"
    },
    {
      id: "symptoms", label: "Symptoms Journal", icon: "pencil",
      blurb: "Symptoms, pain, mood, energy and notes over time.",
      kind: "stub", phase: 13, phaseLabel: "Symptom Journal"
    },
    {
      id: "sleep", label: "Sleep", icon: "moon",
      blurb: "Duration and quality via Health Connect.",
      kind: "reuse", nav: { tab: "insights" },
      summary: function () {
        var hc = window.HealthConnectIntegration;
        var connected = hc && hc.loadState && hc.loadState().connected;
        return connected ? "Synced via Health Connect" : "Connect Health Connect to see sleep data";
      },
      status: function () { var hc = window.HealthConnectIntegration; return (hc && hc.loadState && hc.loadState().connected) ? "active" : "not-started"; },
      lastUpdated: function () { return null; }
    },
    {
      id: "recovery", label: "Recovery", icon: "bolt",
      blurb: "Readiness score, muscle soreness, training fatigue.",
      kind: "stub", phase: 15, phaseLabel: "Recovery Engine"
    },
    {
      id: "hydration", label: "Hydration", icon: "droplet",
      blurb: "Daily water intake, tracked on Home.",
      kind: "reuse", nav: { tab: "home" },
      summary: function (s) {
        var today = (window.todayStr ? window.todayStr() : new Date().toISOString().slice(0, 10));
        var ml = (s.waterLog || []).filter(function (w) { return w.date === today; }).reduce(function (a, w) { return a + (w.ml || 0); }, 0);
        return ml ? ml + " ml today" : "Nothing logged today";
      },
      status: function (s) { return (s.waterLog || []).length ? "active" : "not-started"; },
      lastUpdated: function (s) { var w = s.waterLog || []; return w.length ? Math.max.apply(null, w.map(function (x) { return x.id || 0; })) : null; }
    },
    {
      id: "score", label: "Health Score", icon: "trophy",
      blurb: "One number combining activity, nutrition, recovery & more.",
      kind: "stub", phase: 17, phaseLabel: "Health Score"
    },
    {
      id: "assistant", label: "AI Health Assistant", icon: "bolt",
      blurb: "Insights and reminders — never a diagnosis. Always consult a qualified healthcare professional for medical concerns.",
      kind: "stub", phase: 18, phaseLabel: "AI Health Assistant"
    }
  ];

  // Every stub-kind entry gets the same honest defaults so callers (the dashboard
  // card grid, the overview's "modules with data" count) can call status()/summary()/
  // lastUpdated() on any module without a per-entry null check.
  HEALTH_MODULES.forEach(function (m) {
    if (m.kind !== "stub") return;
    if (!m.status) m.status = function () { return "not-started"; };
    if (!m.summary) m.summary = function () { return "Not built yet"; };
    if (!m.lastUpdated) m.lastUpdated = function () { return null; };
  });

  window.HEALTH_MODULES = HEALTH_MODULES;
  window.fmtHealthWhen = fmtWhen;
})();
