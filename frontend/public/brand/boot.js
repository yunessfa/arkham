/* Applies the remembered theme before first paint (CSP: external, no inline JS). */
(function () {
  try {
    var ok = { golden_gallery: 1, noir_hive: 1 };
    var t = localStorage.getItem("arkham-theme") || localStorage.getItem("arkham-theme-published");
    if (ok[t]) document.documentElement.setAttribute("data-design", t);
  } catch (e) {}
})();
