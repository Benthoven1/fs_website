// pitch.js - the pitch inside the waitlist drawer (index.html #waitlist,
// css/pitch.css): each slide arrives as it scrolls into view, and the
// vision arrives a word at a time. The forms are waitlist.js's.
(function () {
  "use strict";

  var drawer = document.getElementById("waitlist");
  if (!drawer) return;
  document.documentElement.classList.add("pt-js");
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The vision, a word at a time
  var vision = drawer.querySelector(".pt-vision");
  var w = 0;
  function words(el) {
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 1) return words(node);
      if (node.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(part));
        var s = document.createElement("span");
        s.className = "pt-w";
        s.style.setProperty("--w", w++);
        s.textContent = part;
        frag.appendChild(s);
      });
      el.replaceChild(frag, node);
    });
  }
  if (vision) words(vision);

  // Arrival
  var marked = drawer.querySelectorAll("[data-pt]");
  if ("IntersectionObserver" in window && !still) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        seen.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -14% 0px" });
    marked.forEach(function (el) { seen.observe(el); });
  } else {
    marked.forEach(function (el) { el.classList.add("is-in"); });
  }
})();
