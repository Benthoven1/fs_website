// fiscal.js — the Fiscal Sponsorship page's text motion and navigation:
// headings whose words rise, a rotating word in the headline, reveals, a
// section index and reading progress that follow the scroll, a timeline that
// fills as it is read, the "on your own / with Mulvium" switch, plain-terms
// rows that open, and the projects as animated tabs.
(function () {
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  // ── Headings: each word rises out of its own mask, at its own pace ────────
  var DUR = [0.95, 1.2, 1.05, 1.3, 0.9, 1.15];
  document.querySelectorAll(".fs-words").forEach(function (el) {
    var text = el.textContent.trim();
    el.textContent = "";
    var spoken = document.createElement("span");
    spoken.className = "hidden-text";
    spoken.textContent = text;
    el.appendChild(spoken);
    text.split(/\s+/).forEach(function (word, i) {
      var mask = document.createElement("span");
      mask.className = "fs-w";
      mask.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.textContent = word;
      inner.style.setProperty("--d", (0.07 * i).toFixed(2) + "s");
      inner.style.setProperty("--dur", DUR[i % DUR.length] + "s");
      mask.appendChild(inner);
      el.appendChild(mask);
      el.appendChild(document.createTextNode(" "));
    });
  });

  // ── Reveals ───────────────────────────────────────────────────────────────
  var revealEls = document.querySelectorAll(".fs-reveal, .fs-words");
  if (still) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  // ── Headline: the last word turns over every few seconds ───────────────────
  var rotor = document.querySelector(".fs-rotor");
  if (rotor && !still) {
    var words = rotor.querySelectorAll(".fs-rotor-word");
    function sizeRotor() { rotor.style.width = rotor.querySelector(".is-on").offsetWidth + "px"; }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeRotor); else sizeRotor();
    var at = 0;
    setInterval(function () {
      if (document.hidden) return;
      var out = words[at];
      at = (at + 1) % words.length;
      var next = words[at];
      out.classList.remove("is-on");
      out.classList.add("is-out");
      setTimeout(function () { out.classList.remove("is-out"); }, 700);
      next.classList.add("is-on");
      rotor.style.width = next.offsetWidth + "px";
    }, 2600);
  }

  // ── Section index and reading progress ────────────────────────────────────
  var rail = document.querySelector(".fs-rail");
  var railLinks = rail ? Array.prototype.slice.call(rail.querySelectorAll("a")) : [];
  var sections = railLinks.map(function (a) { return document.getElementById(a.dataset.spy); });
  var progress = document.querySelector(".fs-progress span");
  var steps = document.querySelector(".fs-steps");
  var stepItems = steps ? steps.querySelectorAll("li") : [];
  var ticking = false;

  function onScroll() {
    ticking = false;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (progress) progress.style.transform = "scaleX(" + p.toFixed(4) + ")";

    // The current section is the last one whose top has passed 40% of the view
    var current = 0;
    sections.forEach(function (sec, i) {
      if (sec && sec.getBoundingClientRect().top <= vh * 0.4) current = i;
    });
    if (window.scrollY >= max - 2) current = sections.length - 1;
    railLinks.forEach(function (a, i) {
      if (i === current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    if (rail) rail.style.setProperty("--rail", (current / Math.max(1, railLinks.length - 1)).toFixed(3));

    // The timeline fills as it moves up through the view
    if (steps) {
      var r = steps.getBoundingClientRect();
      var f = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height + vh * 0.25)));
      steps.style.setProperty("--fill", f.toFixed(3));
      stepItems.forEach(function (li, i) {
        li.classList.toggle("is-reached", f >= (i + 0.5) / stepItems.length - 0.05);
      });
    }
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  // ── On your own / with Mulvium ────────────────────────────────────────────
  document.querySelectorAll(".fs-compare").forEach(function (box) {
    var buttons = box.querySelectorAll(".fs-switch button");
    function setView(view) {
      box.dataset.view = view;
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.view === view)); });
      box.querySelectorAll(".fs-own").forEach(function (s) { s.setAttribute("aria-hidden", String(view !== "own")); });
      box.querySelectorAll(".fs-with").forEach(function (s) { s.setAttribute("aria-hidden", String(view !== "with")); });
    }
    buttons.forEach(function (b) { b.addEventListener("click", function () { setView(b.dataset.view); }); });
    setView(box.dataset.view || "with");
  });

  // ── In plain terms: rows that open ────────────────────────────────────────
  document.querySelectorAll(".fs-term button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      btn.closest(".fs-term").classList.toggle("is-open", open);
    });
  });

  // ── Projects as tabs ──────────────────────────────────────────────────────
  var tablist = document.querySelector(".fs-tablist");
  if (!tablist) return;
  var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });
  var ink = tablist.querySelector(".fs-tab-ink");
  var now = document.querySelector(".fs-pager-now");
  var active = 0;

  function placeInk() {
    var t = tabs[active];
    ink.style.width = t.offsetWidth + "px";
    ink.style.transform = "translateX(" + t.offsetLeft + "px)";
    ink.style.background = getComputedStyle(panels[active]).getPropertyValue("--dom-ink");
  }

  function select(i, focus) {
    i = (i + tabs.length) % tabs.length;
    if (i === active && panels[i].classList.contains("is-on")) { if (focus) tabs[i].focus(); return; }
    var dir = i > active ? 1 : -1;
    var from = panels[active], to = panels[i];
    tabs.forEach(function (t, k) {
      t.setAttribute("aria-selected", String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    from.classList.remove("is-on");
    from.classList.add(dir > 0 ? "is-leaving-left" : "is-leaving-right");
    setTimeout(function () { from.classList.remove("is-leaving-left", "is-leaving-right"); }, still ? 0 : 420);
    to.classList.add("is-arriving");
    to.style.setProperty("--enter", dir > 0 ? "40px" : "-40px");
    void to.offsetWidth; // start the entrance from its offset
    to.classList.remove("is-arriving");
    to.classList.add("is-on");
    active = i;
    placeInk();
    if (now) now.textContent = String(i + 1);
    tabs[i].scrollIntoView({ block: "nearest", inline: "center", behavior: still ? "auto" : "smooth" });
    if (focus) tabs[i].focus();
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(i); });
    t.addEventListener("keydown", function (e) {
      var k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select(active + k, true); }
      else if (e.key === "Home") { e.preventDefault(); select(0, true); }
      else if (e.key === "End") { e.preventDefault(); select(tabs.length - 1, true); }
    });
  });
  document.querySelectorAll(".fs-pager-btn").forEach(function (b) {
    b.addEventListener("click", function () { select(active + Number(b.dataset.step)); });
  });

  // Swipe between projects on touch screens
  var panelsBox = document.querySelector(".fs-panels");
  var sx = null, sy = null;
  panelsBox.addEventListener("touchstart", function (e) {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  panelsBox.addEventListener("touchend", function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) select(active + (dx < 0 ? 1 : -1));
    sx = sy = null;
  }, { passive: true });

  // Links straight to a project (#project-sci) open its tab
  function fromHash() {
    var i = panels.findIndex(function (p) { return "#" + p.id === location.hash; });
    if (i >= 0) {
      select(i);
      document.getElementById("projects").scrollIntoView({ behavior: still ? "auto" : "smooth" });
    }
  }
  window.addEventListener("hashchange", fromHash);
  window.addEventListener("resize", placeInk);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeInk);
  placeInk();
  fromHash();
})();
