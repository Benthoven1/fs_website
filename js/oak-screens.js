// oak-screens.js — the Oak page's phones: Oak's own screens (the tree, an
// opened acorn, the chickadee's article, the forest), rebuilt in HTML and SVG
// from the app's stills rather than shown as pictures. This draws their
// trees the way the app grows them: a trunk that flares at the roots and
// splits into stems, limbs forking toward the light, clumps of leaves at the
// tips (a darker layer beneath, a lighter one over it) and golden acorns,
// which grow in when the screen arrives (css/oak.css). Seeded, so a tree is
// the same on every visit.
(function () {
  var NS = "http://www.w3.org/2000/svg";
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function f(n) { return n.toFixed(1); }
  var SHADE = ["#2f5222", "#36592a", "#3d6430"];
  var LEAF = ["#457131", "#4f7c37", "#5a883c", "#679444", "#76a24d", "#87b05a"];

  // kind: "small" (a young tree on the hill), "near" (close up, full of
  // acorns), "forest" (one of a row). Sizes are in each SVG's own units.
  var KINDS = {
    small:  { vb: [200, 250], bx: 128, by: 246, h: 66, w: 15, lean: -0.3, stems: 3, len: 52, depth: 3, spread: 0.5, clump: 17, per: 26, size: 4.4, wide: 0.6, acorns: 12, acornS: 1, acornTop: 0.45 },
    near:   { vb: [320, 600], bx: 285, by: 610, h: 190, w: 46, lean: -0.42, stems: 3, len: 120, depth: 4, spread: 0.46, clump: 30, per: 22, size: 8.5, wide: 0.8, acorns: 16, acornS: 2.2, acornTop: 0.5 },
    forest: { vb: [230, 260], bx: 115, by: 252, h: 58, w: 28, lean: 0, stems: 3, len: 60, depth: 3, spread: 0.6, clump: 22, per: 30, size: 5.2, wide: 0.6, acorns: 5, acornS: 1.1, acornTop: 0.6 }
  };

  function drawTree(svg) {
    var o = KINDS[svg.dataset.tree], R = rng(Number(svg.dataset.seed || 5));
    var r = function (a, b) { return a + (b - a) * R(); };
    svg.setAttribute("viewBox", "0 0 " + o.vb[0] + " " + o.vb[1]);
    var wood = el("g", {}, svg);
    var tips = [];

    // One limb as a tapered, slightly bent shape, with a lit edge on its left
    function limb(x, y, ang, len, w0, w1) {
      var bend = r(-0.18, 0.18);
      var ex = x + Math.sin(ang) * len, ey = y - Math.cos(ang) * len;
      var mx = x + Math.sin(ang + bend) * len * 0.5, my = y - Math.cos(ang + bend) * len * 0.5;
      var px = Math.cos(ang), py = Math.sin(ang);
      el("path", { d: "M" + f(x - px * w0 / 2) + " " + f(y - py * w0 / 2) +
        " Q" + f(mx - px * (w0 + w1) / 4) + " " + f(my - py * (w0 + w1) / 4) + " " + f(ex - px * w1 / 2) + " " + f(ey - py * w1 / 2) +
        " L" + f(ex + px * w1 / 2) + " " + f(ey + py * w1 / 2) +
        " Q" + f(mx + px * (w0 + w1) / 4) + " " + f(my + py * (w0 + w1) / 4) + " " + f(x + px * w0 / 2) + " " + f(y + py * w0 / 2) + "Z",
        fill: "#7c6553" }, wood);
      if (w0 > 3) el("path", { d: "M" + f(x - px * w0 * 0.22) + " " + f(y - py * w0 * 0.22) + " Q" + f(mx - px * w0 * 0.2) + " " + f(my - py * w0 * 0.2) + " " + f(ex - px * w1 * 0.2) + " " + f(ey - py * w1 * 0.2),
        fill: "none", stroke: "#9a8370", "stroke-width": f(Math.max(1, w0 * 0.22)), "stroke-linecap": "round" }, wood);
      return [ex, ey];
    }
    function grow(x, y, ang, len, w, depth) {
      var end = limb(x, y, ang, len, w, w * 0.62);
      if (depth === 0) { tips.push([end[0], end[1]]); return; }
      if (depth <= 1) tips.push([(x + end[0]) / 2, (y + end[1]) / 2]);
      var n = R() < 0.35 ? 3 : 2;
      for (var i = 0; i < n; i++) {
        var a = ang * 0.82 + o.spread * (i - (n - 1) / 2) * r(0.8, 1.4) + r(-0.18, 0.18);
        grow(end[0], end[1], a, len * r(0.62, 0.8), w * 0.62, depth - 1);
      }
    }

    // The trunk, flared into roots, then the stems it splits into
    var top = limb(o.bx, o.by, o.lean * 0.5, o.h, o.w, o.w * 0.8);
    var rw = o.w * 1.05;
    el("path", { d: "M" + f(o.bx - rw) + " " + o.by + " Q" + f(o.bx - o.w * 0.45) + " " + f(o.by - o.w * 0.15) + " " + f(o.bx - o.w * 0.45) + " " + f(o.by - o.w * 1.2) +
      " L" + f(o.bx + o.w * 0.45) + " " + f(o.by - o.w * 1.2) + " Q" + f(o.bx + o.w * 0.45) + " " + f(o.by - o.w * 0.15) + " " + f(o.bx + rw) + " " + o.by + "Z", fill: "#7c6553" }, wood);
    for (var s = 0; s < o.stems; s++) {
      var sa = o.lean + o.spread * 0.75 * (s - (o.stems - 1) / 2) + r(-0.12, 0.12);
      grow(top[0], top[1], sa, o.len * r(0.85, 1.1), o.w * 0.62, o.depth - 1);
    }

    // The leaves sway a little about the top of the trunk
    var crown = el("g", { class: "ph-crown", style: "transform-origin:" + f(top[0]) + "px " + f(top[1]) + "px" }, svg);
    var ys = tips.map(function (t) { return t[1]; });
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    function leaf(x, y, s, fill) {
      el("path", { d: "M0 -1Q" + o.wide + " 0 0 1Q-" + o.wide + " 0 0 -1Z", fill: fill,
        transform: "translate(" + f(x) + " " + f(y) + ") rotate(" + Math.round(r(0, 180)) + ") scale(" + f(s) + ")" }, crown);
    }
    // Shadow layer, then the lit leaves (lighter toward the top and left)
    tips.forEach(function (t) {
      for (var i = 0; i < o.per * 0.6; i++) {
        var a = R() * Math.PI * 2, d = o.clump * Math.sqrt(R());
        leaf(t[0] + Math.cos(a) * d + o.clump * 0.2, t[1] + Math.sin(a) * d * 0.85 + o.clump * 0.25, o.size * r(0.9, 1.3), SHADE[(R() * 3) | 0]);
      }
    });
    tips.forEach(function (t) {
      var lift = 1 - (t[1] - minY) / Math.max(1, maxY - minY);
      for (var i = 0; i < o.per; i++) {
        var a = R() * Math.PI * 2, d = o.clump * Math.sqrt(R());
        var x = t[0] + Math.cos(a) * d, y = t[1] + Math.sin(a) * d * 0.85;
        var tone = Math.round(lift * 3 + (Math.sin(a) < 0 ? 1 : -1) + (Math.cos(a) < 0 ? 0.6 : -0.6) + r(-1.2, 1.4));
        leaf(x, y, o.size * r(0.75, 1.15), LEAF[Math.max(0, Math.min(LEAF.length - 1, tone))]);
      }
    });

    // Acorns, mostly up among the higher tips
    var hi = tips.filter(function (t) { return t[1] < minY + (maxY - minY) * (1 - o.acornTop) + o.clump; });
    for (var k = 0; k < o.acorns; k++) {
      var t = hi[(R() * hi.length) | 0];
      var ax = t[0] + r(-1, 1) * o.clump * 0.8, ay = t[1] + r(-0.6, 0.8) * o.clump * 0.8, z = o.acornS;
      var g = el("g", { class: "ph-acorn", style: "--i:" + k + ";transform-origin:" + f(ax) + "px " + f(ay) + "px" }, crown);
      el("ellipse", { cx: f(ax), cy: f(ay + 0.6 * z), rx: f(3.1 * z), ry: f(3.5 * z), fill: "#dfa93d" }, g);
      el("ellipse", { cx: f(ax - 1 * z), cy: f(ay - 0.2 * z), rx: f(1.3 * z), ry: f(1.6 * z), fill: "#f1cd6c" }, g);
      el("path", { d: "M" + f(ax - 2.6 * z) + " " + f(ay - 1.6 * z) + "a" + f(2.6 * z) + " " + f(1.1 * z) + " 0 0 1 " + f(5.2 * z) + " 0Z", fill: "#b98a3a" }, g);
    }
  }
  Array.prototype.forEach.call(document.querySelectorAll("svg[data-tree]"), drawTree);
})();
