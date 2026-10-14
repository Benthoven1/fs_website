// pitch.js - the pitch inside the waitlist drawer (index.html #waitlist,
// css/pitch.css): each slide arrives as it scrolls into view, the rows of
// institutions drift, a slice of the M.SOS globe turns between "Your idea"
// and "Reality", the vision arrives a word at a time, and the arrow at the
// drawer's top slides it away. The forms are waitlist.js's.
(function () {
  "use strict";

  var drawer = document.getElementById("waitlist");
  if (!drawer) return;
  document.documentElement.classList.add("pt-js");
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body;

  // The arrow back up to the cosmos: main.js closes the drawer on Escape
  var up = drawer.querySelector(".pt-up");
  if (up) up.addEventListener("click", function () {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });

  // Each row of institutions, doubled so its drift loops without a seam
  if (!still) {
    drawer.querySelectorAll(".pt-track").forEach(function (track) {
      Array.prototype.slice.call(track.children).forEach(function (li) {
        var copy = li.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        track.appendChild(copy);
      });
    });
  }

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

  // -- A slice of the M.SOS globe -----------------------------------------
  // The words of js/fsos-cloud.js (where each sits on the M.SOS page's word
  // sphere), drawn on a canvas as the cap of that sphere rising between the
  // idea and reality, tipped toward the viewer and turning slowly. Each
  // agent's words share one of the cosmos's colors, deepened for paper.
  var canvas = drawer.querySelector(".pt-globe-canvas");
  if (!canvas || !("IntersectionObserver" in window)) return;
  var ctx = canvas.getContext("2d");
  var INK = ["#8f5a42", "#9c5370", "#4d6d96", "#4f7a45", "#3c7a74"];
  var FONTS = {
    agent: '500 40px "Cormorant SC", serif',
    focus: '500 40px "Cormorant Garamond", serif',
    work: 'italic 400 40px "Cormorant Garamond", serif'
  };
  var TILT = 0.55;
  var cosT = Math.cos(TILT), sinT = Math.sin(TILT);
  var cloud = null, dpr = 1, cw = 0, ch = 0, angle = 0.6, last = 0, inView = false, running = false;

  function load() {
    Promise.all([import("./fsos-cloud.js"), import("./fsos-words.js")]).then(function (mods) {
      var owner = {}, team = mods[1].WORKFORCE.concat(mods[1].AGENCY);
      team.forEach(function (a, i) {
        owner[a.agent] = i; owner[a.focus] = i;
        a.work.forEach(function (t) { if (!(t in owner)) owner[t] = i; });
      });
      cloud = mods[0].default.map(function (r) {
        var n = [r[2], r[3], r[4]], e = [r[5], r[6], r[7]];
        var u = [n[1] * e[2] - n[2] * e[1], n[2] * e[0] - n[0] * e[2], n[0] * e[1] - n[1] * e[0]];
        ctx.font = FONTS[r[0]];
        return { kind: r[0], text: r[1], n: n, e: e, u: u, w: r[8], h: r[9],
                 tw: ctx.measureText(r[1]).width, ink: INK[(owner[r[1]] || 0) % INK.length] };
      });
      var go = function () { size(); if (still) draw(); else start(); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
        cloud.forEach(function (c) { ctx.font = FONTS[c.kind]; c.tw = ctx.measureText(c.text).width; });
        go();
      }); else go();
    }).catch(function () { /* no globe, no harm */ });
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = canvas.clientWidth; ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  }
  window.addEventListener("resize", function () { if (cloud) { size(); if (still) draw(); } });

  // Spin about the vertical axis, then tip the north pole toward the viewer
  function turn(v, cs, sn) {
    var x = v[0] * cs + v[2] * sn, z = -v[0] * sn + v[2] * cs, y = v[1];
    return [x, y * cosT - z * sinT, y * sinT + z * cosT];
  }

  function draw() {
    if (!cloud || !cw) return;
    var R = Math.min(cw * 0.47, ch * 0.88), cx = cw / 2, cy = 24 + R;
    var cs = Math.cos(angle), sn = Math.sin(angle);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (var i = 0; i < cloud.length; i++) {
      var c = cloud[i], n = turn(c.n, cs, sn);
      if (n[2] < 0.08) continue;
      var X = cx + R * n[0], Y = cy - R * n[1];
      if (Y > ch + 20 || X < -80 || X > cw + 80) continue;
      var e = turn(c.e, cs, sn), u = turn(c.u, cs, sn);
      // The word's reading direction and its downward direction, on screen
      var sx = (c.w * R) / (c.tw + 8), sy = (c.h * R) / 50;
      var Ex = e[0] * sx, Ey = -e[1] * sx, Dx = -u[0] * sy, Dy = u[1] * sy;
      if (Ex * Dy - Ey * Dx < 0) { Dx = -Dx; Dy = -Dy; }
      ctx.globalAlpha = Math.min(1, (n[2] - 0.08) * 2.4) * (c.kind === "work" ? 0.72 : 1);
      ctx.fillStyle = c.kind === "work" ? "#3b332f" : c.ink;
      ctx.font = FONTS[c.kind];
      ctx.setTransform(Ex * dpr, Ey * dpr, Dx * dpr, Dy * dpr, X * dpr, Y * dpr);
      ctx.fillText(c.text, 0, 0);
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    if (!inView || !body.classList.contains("footer-open") && body.classList.contains("cosmos-only")) { running = false; return; }
    if (last) angle += Math.min(t - last, 50) * 0.00009;
    last = t;
    draw();
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || !cloud || still) return;
    running = true; last = 0;
    requestAnimationFrame(frame);
  }

  var loaded = false;
  new IntersectionObserver(function (entries) {
    inView = entries[0].isIntersecting;
    if (inView && !loaded) { loaded = true; load(); }
    if (inView) start();
  }, { rootMargin: "120px 0px" }).observe(canvas);
})();
