/* Applies the remembered theme before first paint (CSP: external, no inline JS). */
(function () {
  try {
    var ok = { golden_gallery: 1, noir_hive: 1 };
    var t = localStorage.getItem("arkham-theme") || localStorage.getItem("arkham-theme-published");
    document.documentElement.setAttribute("data-design", ok[t] ? t : "noir_hive");
  } catch (e) {}
})();
