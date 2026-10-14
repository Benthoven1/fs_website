// pitch.js — the pitch inside the waitlist drawer (index.html #waitlist,
// css/pitch.css): each slide arrives as it scrolls into view, the vision
// arrives a word at a time, and the workforce turns through kinds of
// institution, each with its own roles. The forms are waitlist.js's.
(function () {
  "use strict";

  var drawer = document.getElementById("waitlist");
  if (!drawer) return;
  document.documentElement.classList.add("pt-js");
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── The vision, a word at a time ───────────────────────────────────────
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

  // ── Arrival ────────────────────────────────────────────────────────────
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

  // ── The workforce, by kind of institution ──────────────────────────────
  var ROLES = {
    orchestra: ["Season planning", "Musician contracts", "Venues & ticketing", "Program notes", "Patron circle", "Arts grants"],
    museum: ["Exhibitions", "Collections & loans", "Docent program", "Membership", "Conservation grants", "Press & reviews"],
    research: ["Grant pipeline", "Literature review", "Compliance & IRB", "Lab budget", "Publications", "Fellowships"],
    garden: ["Plant records", "Volunteer crews", "Seasonal programs", "Land & permits", "Friends of the garden", "School visits"],
    scholarship: ["Applications", "Selection committee", "Award disbursement", "Donor reports", "Alumni network", "Outreach"]
  };
  var tabs = Array.prototype.slice.call(drawer.querySelectorAll(".pt-tabs [role=tab]"));
  var crew = drawer.querySelector(".pt-crew");
  var list = drawer.querySelector(".pt-roles");
  if (!tabs.length || !crew || !list) return;

  var at = 0;
  function show(n, focus) {
    at = (n + tabs.length) % tabs.length;
    tabs.forEach(function (t, k) {
      t.setAttribute("aria-selected", String(k === at));
      t.setAttribute("aria-controls", "pt-crew");
      t.tabIndex = k === at ? 0 : -1;
    });
    if (focus) tabs[at].focus();
    crew.setAttribute("aria-label", tabs[at].textContent);
    list.textContent = "";
    ROLES[tabs[at].dataset.kind].forEach(function (role, i) {
      var li = document.createElement("li");
      li.style.setProperty("--i", i);
      li.textContent = role;
      list.appendChild(li);
    });
  }
  show(0);

  // A visitor's choice stops the turning for good
  var chosen = false;
  tabs.forEach(function (t, k) {
    t.addEventListener("click", function () { chosen = true; show(k); });
    t.addEventListener("keydown", function (e) {
      var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      chosen = true;
      show(at + step, true);
    });
  });

  // Otherwise it turns while in view, and holds while pointed at
  if (still || !("IntersectionObserver" in window)) return;
  var inView = false, held = false;
  new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; }, { threshold: 0.4 }).observe(crew);
  crew.parentNode.addEventListener("pointerenter", function () { held = true; });
  crew.parentNode.addEventListener("pointerleave", function () { held = false; });
  setInterval(function () {
    if (chosen || held || !inView || document.hidden) return;
    show(at + 1);
  }, 3800);
})();
