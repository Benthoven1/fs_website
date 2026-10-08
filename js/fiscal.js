// fiscal.js — the Fiscal Sponsorship page's text motion (the opening scene is
// js/bowl.js): headings whose words rise, a rotating word in the headline,
// blocks and pictures revealed as they arrive, a timeline that fills as it is
// read, and plain-terms rows that open.
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

  // ── Headline: the last word turns over every few seconds, in a box as wide
  // as the widest word, so no turn moves a word to another line ──────────
  var rotor = document.querySelector(".fs-rotor");
  if (rotor && !still) {
    var words = rotor.querySelectorAll(".fs-rotor-word");
    function sizeRotor() {
      var w = 0;
      for (var i = 0; i < words.length; i++) w = Math.max(w, words[i].offsetWidth);
      rotor.style.width = Math.ceil(w) + "px";
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeRotor); else sizeRotor();
    window.addEventListener("resize", sizeRotor);
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
    }, 2600);
  }

  // ── The steps' timeline fills as it moves up through the view ────────────
  var steps = document.querySelector(".fs-steps");
  var stepItems = steps ? steps.querySelectorAll("li") : [];
  var ticking = false;

  function onScroll() {
    ticking = false;
    if (!steps) return;
    var vh = window.innerHeight;
    var r = steps.getBoundingClientRect();
    var f = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height + vh * 0.25)));
    steps.style.setProperty("--fill", f.toFixed(3));
    stepItems.forEach(function (li, i) {
      li.classList.toggle("is-reached", f >= (i + 0.5) / stepItems.length - 0.05);
    });
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  // ── In plain terms: rows that open ────────────────────────────────────────
  document.querySelectorAll(".fs-term button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      btn.closest(".fs-term").classList.toggle("is-open", open);
    });
  });

})();
