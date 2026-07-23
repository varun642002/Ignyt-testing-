/* =========================================================
   HEALTH HUB DASHBOARD — the Health Management Platform's entry point.

   Foundation only: real navigation to every module (existing features
   opened directly, unbuilt ones opened as an honest stub), real summaries
   pulled from actual app data, no fake numbers. Follows the same
   {render, attach} module convention as bloodwork.js/goals.js/
   health-uploads.js so app.js only needs one dispatch line + one attach
   call, same as those.

   View state: state.healthHubDetail holds a stub module id, or null for
   the card grid. Reuse-kind cards never set this -- they navigate straight
   to the real screen (data-nav / the same open-personal-info action the
   real button uses).
========================================================= */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  var svg = function (n, s) { return window.svg ? window.svg(n, s) : ""; };

  var STATUS_META = {
    "active": { label: "Active", color: "var(--rh-green)", bg: "rgba(22,163,74,.12)" },
    "partial": { label: "Partial", color: "var(--rh-amber, #b45309)", bg: "rgba(217,119,6,.12)" },
    "not-started": { label: "Not set up", color: "var(--rh-muted)", bg: "rgba(148,163,184,.12)" }
  };

  function card(m, s) {
    var status = m.status ? m.status(s) : "not-started";
    var meta = STATUS_META[status] || STATUS_META["not-started"];
    var summary = m.summary ? m.summary(s) : "";
    var when = m.lastUpdated ? m.lastUpdated(s) : null;
    var actionAttr = m.kind === "reuse"
      ? (m.action ? 'data-hh-action="' + esc(m.action) + '"' : 'data-hh-nav="' + esc(m.id) + '"')
      : 'data-hh-detail="' + esc(m.id) + '"';
    return '<div class="pg-card hh-card" style="margin-bottom:10px;">' +
      '<div style="display:flex;align-items:flex-start;gap:10px;">' +
      '<span style="width:36px;height:36px;border-radius:10px;background:var(--rh-bg);display:flex;align-items:center;justify-content:center;flex:none;">' + svg(m.icon, 18) + '</span>' +
      '<div style="min-width:0;flex:1;">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
      '<span style="font-weight:800;font-size:14px;">' + esc(m.label) + '</span>' +
      '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;color:' + meta.color + ';background:' + meta.bg + ';">' + meta.label + '</span>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--rh-muted);margin-top:2px;">' + esc(summary) + '</div>' +
      (m.kind !== "info" ? '<div style="font-size:11px;color:var(--rh-muted);margin-top:2px;">Last updated: ' + esc(window.fmtHealthWhen ? window.fmtHealthWhen(when) : "Never") + '</div>' : '') +
      '</div>' +
      '</div>' +
      (m.kind !== "info" ? '<button class="rh-btn rh-btn--ghost" style="width:100%;margin-top:10px;font-size:12px;padding:8px;" ' + actionAttr + '>View Details</button>' : '') +
      '</div>';
  }

  function renderGrid() {
    var s = (typeof state === "undefined") ? null : state;
    if (!s) return "";
    var modules = window.HEALTH_MODULES || [];
    return '<div class="pg-light">' +
      '<button class="rh-btn rh-btn--ghost" style="flex:none;padding:8px 14px;font-size:13px;margin-bottom:6px;" data-action="close-settings">← Back</button>' +
      '<div style="font-size:22px;font-weight:800;">Health Hub</div>' +
      '<div style="font-size:12px;color:var(--rh-muted);margin-bottom:14px;">Your digital health vault — one place for everything medical and fitness.</div>' +
      modules.map(function (m) { return card(m, s); }).join("") +
      '</div>';
  }

  function render() {
    var s = (typeof state === "undefined") ? null : state;
    if (s && s.healthHubDetail) return window.IgnytHealthStub ? window.IgnytHealthStub.render(s.healthHubDetail) : renderGrid();
    return renderGrid();
  }

  var _bound = false;
  function attach() {
    if (_bound) return; _bound = true;
    document.addEventListener("click", function (e) {
      var s = (typeof state === "undefined") ? null : state;
      if (!s || s.tab !== "healthhub") return;
      var back = e.target.closest("[data-hh-back]");
      if (back) { s.healthHubDetail = null; return win(); }
      var detailBtn = e.target.closest("[data-hh-detail]");
      if (detailBtn) { s.healthHubDetail = detailBtn.getAttribute("data-hh-detail"); return win(); }
      var navBtn = e.target.closest("[data-hh-nav]");
      if (navBtn) {
        var id = navBtn.getAttribute("data-hh-nav");
        var m = (window.HEALTH_MODULES || []).filter(function (x) { return x.id === id; })[0];
        if (m && m.nav && m.nav.tab) { s.tab = m.nav.tab; return win(); }
        return;
      }
      var actionBtn = e.target.closest("[data-hh-action]");
      if (actionBtn) {
        var action = actionBtn.getAttribute("data-hh-action");
        // Mirrors the real button's own handler exactly (see app.js's
        // data-action="open-personal-info" wiring) rather than duplicating
        // logic that could drift out of sync with it.
        if (action === "open-personal-info") { s.tab = "body"; s.bodyView = "personal-info"; return win(); }
        return;
      }
    });
  }
  function win() { if (window.render) window.render(); }

  window.IgnytHealthDashboard = { render: render, attach: attach };
})();
