/* Shared presentation utilities for small Health Hub modules. */
(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (character) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character];
    });
  }

  window.IgnytHealthUtils = Object.freeze({ escapeHtml: escapeHtml });
}());
