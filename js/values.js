// values.js — the Values page's patron, artist and citizen: three spheres, as
// in the deck the page is drawn from; choosing one brings it forward and
// shows what it is asked for. Arrow keys move between them.
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".vl-orb"));
  if (!tabs.length) return;
  function choose(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { choose(t); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); choose(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });
  choose(tabs[0]);
})();
