/* =========================================================
   HEALTH STUB — the detail screen shown for a "kind:stub" Health Hub card.

   Honest placeholder, not a fake feature: states plainly that the module
   isn't built yet, says which phase it ships in, and links back. No fake
   data, no fake charts (per project policy) -- just the real plan.
========================================================= */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  var svg = function (n, s) { return window.svg ? window.svg(n, s) : ""; };

  function render(moduleId) {
    var m = (window.HEALTH_MODULES || []).filter(function (x) { return x.id === moduleId; })[0];
    if (!m) return "";
    return '<div class="pg-light">' +
      '<button class="rh-btn rh-btn--ghost" style="flex:none;padding:8px 14px;font-size:13px;margin-bottom:10px;" data-hh-back>← Back</button>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">' +
      '<span style="width:40px;height:40px;border-radius:12px;background:var(--rh-card);display:flex;align-items:center;justify-content:center;flex:none;">' + svg(m.icon, 20) + '</span>' +
      '<div style="font-size:20px;font-weight:800;">' + esc(m.label) + '</div>' +
      '</div>' +
      '<div style="font-size:13px;color:var(--rh-muted);margin-bottom:16px;">' + esc(m.blurb) + '</div>' +
      '<div class="pg-card">' +
      '<div style="font-size:13px;font-weight:800;margin-bottom:6px;">Not built yet</div>' +
      '<div style="font-size:13px;color:var(--rh-muted);line-height:1.55;">This is part of the Health Hub build plan, shipping as “' + esc(m.phaseLabel || m.label) + '” (module ' + (m.phase || "?") + ' of the Health Management Platform rollout). Nothing is stored here yet — no placeholder numbers, no fake data.</div>' +
      (m.note ? '<div style="font-size:12px;color:var(--rh-blue);margin-top:10px;line-height:1.5;">' + esc(m.note) + '</div>' : '') +
      '</div>' +
      '</div>';
  }

  window.IgnytHealthStub = { render: render };
})();
