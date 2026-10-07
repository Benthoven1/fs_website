// ls.js — the loading screen. Four photographs open as slits one after
// another, a window opens inside them onto the page, the photographs converge
// into the window, and the window expands to the full viewport.
//
// Sub-pages play it on load and dispatch:
//   'mulvium:ls-hole' — the window first opens (start the scene's entrance)
//   'mulvium:ls-done' — overlay gone (page content may fade in)
// and add body.ls-hole and body.ls-done for CSS-gated reveals.
// A page with no scene to show through the window loads this with
// data-no-scene: the window doesn't hold open for an entrance, and the
// photographs close into it and it expands as soon as they have all opened.
// The home page loads this with data-manual and plays it itself through
// window.mulviumLS (js/main.js).
//
// The motion is compositor work only, so it holds its frame rate:
//  - the photographs are decoded, then rastered while still invisible, before
//    any of them shows; each sits in a fixed-size box whose transform alone
//    changes, so no frame re-rasters a photograph;
//  - the overlay's paper is four bands around the window, each a copy of the
//    paper that is painted once and only moved, so the window can change size
//    without repainting the paper (a clip-path cut through the paper would
//    repaint it, and its mask, on every frame the window moves);
//  - the window's outline is four solid edges, moved by transform.
(function () {
  var ls = document.getElementById('loading-screen');
  if (!ls) return;
  var script = document.currentScript;
  var manual = !!(script && script.hasAttribute('data-manual'));
  var noScene = !!(script && script.hasAttribute('data-no-scene'));

  var frames = ['ls-f1', 'ls-f2', 'ls-f3', 'ls-f4'].map(function (id) { return document.getElementById(id); });
  var imgs = frames.map(function (f) { return f.querySelector('.ls-img'); });
  function div(cls, parent, before) {
    var d = document.createElement('div');
    d.className = cls;
    parent.insertBefore(d, before || null);
    return d;
  }
  // Paper bands (top, bottom, left, right), under the photographs' pane,
  // under the outline
  var bands = [0, 1, 2, 3].map(function () {
    var b = div('ls-band', ls, frames[0]);
    div('ls-bg', b);
    return b;
  });
  var pane = div('ls-pane', ls, frames[0]);
  frames.forEach(function (f) { pane.appendChild(f); });
  var edges = [0, 1, 2, 3].map(function () { return div('ls-edge', ls); });

  // ── The photographs ────────────────────────────────────────────────────────
  // Each picture's natural size, once decoded: its box is the picture at
  // cover size for the frame's largest size, so the image never resizes.
  var nat = [null, null, null, null];
  var keep = []; // decoded images, held so the decodes stay cached
  var decoded = Promise.all(imgs.map(function (el, i) {
    var m = /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(el).backgroundImage);
    if (!m) return null;
    var im = new Image();
    im.src = m[1];
    keep.push(im);
    var done = function () {
      if (!im.naturalWidth) return;
      nat[i] = [im.naturalWidth, im.naturalHeight];
      sized = false;
    };
    return (im.decode ? im.decode() : new Promise(function (r) { im.onload = im.onerror = r; })).then(done, done);
  }));

  // ── Timing ─────────────────────────────────────────────────────────────────
  // Frame i opens at OPEN[i]: its width snaps over 0.06, its height reveals
  // until H_END[i], its photograph settles from 1.3x until Z_END[i] and then
  // drifts on until the end.
  var OPEN  = [0.08, 0.14, 0.20, 0.26];
  var H_END = [0.32, 0.38, 0.44, 0.46];
  var Z_END = [0.30, 0.32, 0.34, 0.38];
  var DRIFT = [[-7, 4, 14, -8], [6, -5, -12, 10], [5, 6, -10, -11], [-5, -7, 10, 14]];
  // Then the window: it opens (its width by winW, its height by winH), the
  // photographs converge into it from conv, it expands from exp to expEnd,
  // and the overlay fades from fade until the end. With a scene, the window
  // opens while the last photographs are still opening and holds, so the
  // scene's entrance plays inside it; without one, it opens as the
  // photographs converge, and everything after comes sooner.
  var P = noScene
    ? { win: 0.47, winW: 0.51, winH: 0.56, conv: 0.47, exp: 0.58, expEnd: 0.80, fade: 0.70, end: 0.90 }
    : { win: 0.30, winW: 0.36, winH: 0.48, conv: 0.54, exp: 0.67, expEnd: 0.90, fade: 0.78, end: 1 };
  var HIDDEN = '0.001'; // a frame waiting to open: drawn, so rastered, but unseen

  function eRise(t)     { return 1 - Math.pow(1 - t, 3); }
  function eSlit(t)     { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function eConverge(t) { return t * t * t * t; }
  function eExpand(t)   { return 1 - (1 - t) * (1 - t); }
  function eCubicInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function ph(t, a, b, efn) {
    return (efn || eCubicInOut)(Math.max(0, Math.min(1, (t - a) / (b - a))));
  }

  // ── Geometry ───────────────────────────────────────────────────────────────
  var vw = 0, vh = 0, sized = false;
  var EF = [], EWIN = [0, 0];
  var box = [];
  window.addEventListener('resize', function () { sized = false; });

  function measure() {
    var r = ls.getBoundingClientRect();
    vw = r.width; vh = r.height;
    var EFF = 0.92;
    EWIN = [vw * 0.68 * EFF, vh * 0.62 * EFF];
    EF = [[0.80, 0.71], [0.76, 0.68], [0.72, 0.65], [0.70, 0.635]].map(function (f) {
      return [vw * f[0] * EFF, vh * f[1] * EFF];
    });
    bands.forEach(function (b) {
      b.firstChild.style.width = vw + 'px';
      b.firstChild.style.height = vh + 'px';
    });
    imgs.forEach(function (el, i) {
      var w = EF[i][0], h = EF[i][1], n = nat[i];
      if (n) { var s = Math.max(w / n[0], h / n[1]); w = n[0] * s; h = n[1] * s; }
      box[i] = [w, h];
      el.style.width = w + 'px';
      el.style.height = h + 'px';
    });
    sized = true;
  }

  // Style writes go through here, so an unchanged value costs nothing
  var last = new Map();
  function set(el, prop, v) {
    var m = last.get(el);
    if (!m) { m = {}; last.set(el, m); }
    if (m[prop] === v) return;
    m[prop] = v;
    el.style[prop] = v;
  }

  function setFrame(i, w, h, cy) {
    set(frames[i], 'width', w + 'px');
    set(frames[i], 'height', h + 'px');
    set(frames[i], 'transform', 'translate(-50%, calc(-50% + ' + cy + 'px))');
  }

  // The photograph covers its frame (w x h) at every size, as
  // background-size: cover would, but by scaling a box that never changes
  // size. It is centred on the frame by its transform, not by layout, so the
  // frame's changing size never moves it by a fraction of a pixel (which
  // would re-raster it).
  function setPicture(i, t, w, h, cover) {
    var d = ph(t, OPEN[i], 1.0), D = DRIFT[i];
    if (cover == null) cover = Math.max(w / box[i][0], h / box[i][1]);
    var s = (1.3 - 0.3 * ph(t, OPEN[i], Z_END[i], eRise)) * cover;
    var x = (w - box[i][0]) / 2 + D[0] + D[2] * d, y = (h - box[i][1]) / 2 + D[1] + D[3] * d;
    set(imgs[i], 'transform', 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')');
  }

  // A band shows the part of the paper inside its rectangle
  function setBand(i, x, y, w, h, opacity) {
    var b = bands[i];
    set(b, 'visibility', 'visible');
    set(b, 'opacity', opacity || '1');
    set(b, 'width', Math.max(0, w) + 'px');
    set(b, 'height', Math.max(0, h) + 'px');
    set(b, 'transform', 'translate(' + x + 'px,' + y + 'px)');
    set(b.firstChild, 'transform', 'translate(' + (-x) + 'px,' + (-y) + 'px)');
  }

  // No window yet: the top band is the whole paper. The others wait, near-
  // invisible, over the largest area each will show, so they are rastered.
  function closedWindow() {
    setBand(0, 0, 0, vw, vh);
    setBand(1, 0, vh / 2 - 8, vw, vh / 2 + 8, HIDDEN);
    setBand(2, 0, 0, vw / 2 + 8, vh, HIDDEN);
    setBand(3, vw / 2 - 8, 0, vw / 2 + 8, vh, HIDDEN);
    set(pane, 'clipPath', '');
    hideOutline();
  }

  // The window onto the page, w x h centred at (vw/2, cy). While the
  // photographs still surround it, a clip-path cuts it through their pane: a
  // nonzero-winding polygon, outer rectangle (just around the largest frame)
  // clockwise, inner counter-clockwise. Its mask is the one thing repainted
  // as the window opens, so it is kept no larger than the frames.
  function setWindow(w, h, cy, cutPictures) {
    var x1 = vw / 2 - w / 2, y1 = cy - h / 2, x2 = x1 + w, y2 = y1 + h;
    setBand(0, 0, 0, vw, y1);
    setBand(1, 0, y2, vw, vh - y2);
    setBand(2, 0, y1, x1, h);
    setBand(3, x2, y1, vw - x2, h);
    var X1 = vw / 2 - EF[0][0] / 2 - 8, X2 = vw - X1, Y1 = cy - EF[0][1] / 2 - 8, Y2 = Y1 + EF[0][1] + 16;
    set(pane, 'clipPath', !cutPictures ? '' :
      'polygon(' + X1 + 'px ' + Y1 + 'px,' + X2 + 'px ' + Y1 + 'px,' + X2 + 'px ' + Y2 + 'px,' + X1 + 'px ' + Y2 + 'px,' +
      X1 + 'px ' + Y1 + 'px,' + x1 + 'px ' + y1 + 'px,' + x1 + 'px ' + y2 + 'px,' + x2 + 'px ' + y2 + 'px,' +
      x2 + 'px ' + y1 + 'px,' + x1 + 'px ' + y1 + 'px)');
    // The 3px outline, just outside the window: top and bottom span the
    // corners, the sides fit between them. Each edge is a 1px square scaled.
    var rects = [[x1 - 3, y1 - 3, w + 6, 3], [x1 - 3, y2, w + 6, 3], [x1 - 3, y1, 3, h], [x2, y1, 3, h]];
    edges.forEach(function (e, i) {
      var r = rects[i];
      set(e, 'visibility', 'visible');
      set(e, 'transform', 'translate(' + r[0] + 'px,' + r[1] + 'px) scale(' + r[2] + ',' + r[3] + ')');
    });
  }
  function hideOutline() { edges.forEach(function (e) { set(e, 'visibility', 'hidden'); }); }

  // ── States ─────────────────────────────────────────────────────────────────
  // Everything hidden and at rest: the overlay may be shown as a plain cover
  function reset() {
    last = new Map(); // other scripts may have written these styles directly
    ls.classList.remove('ls-banded');
    bands.forEach(function (b) { set(b, 'visibility', 'hidden'); });
    frames.forEach(function (f) {
      set(f, 'visibility', 'hidden'); set(f, 'opacity', ''); set(f, 'width', '0'); set(f, 'height', '0');
    });
    imgs.forEach(function (el) { set(el, 'transform', ''); });
    set(pane, 'clipPath', '');
    hideOutline();
  }

  function hide() {
    reset();
    set(ls, 'opacity', '0');
    ls.style.display = 'none';
    ls.style.pointerEvents = 'none';
    ls.setAttribute('aria-hidden', 'true');
  }

  function frame(t) {
    if (!sized) measure();
    set(ls, 'opacity', String(1 - ph(t, P.fade, P.end)));

    // The group rises from below and locks into the centre
    var holeCY = vh / 2 + vh * 0.5 * (1 - ph(t, 0.06, 0.28, eRise));
    var cy = holeCY - vh / 2;

    // The window, while it opens
    var winW = EWIN[0] * ph(t, P.win, P.winW, eRise);
    var winH = Math.max(3, EWIN[1] * ph(t, P.win, P.winH, eRise));

    if (t < P.conv) {
      // Phase 1: each frame opens as a slit. Until then it waits centred and
      // near-invisible, wide enough to show its whole picture at 1.3x, so
      // the picture is rastered before it is ever seen.
      for (var i = 0; i < 4; i++) {
        set(frames[i], 'visibility', 'visible');
        if (t < OPEN[i]) {
          set(frames[i], 'opacity', HIDDEN);
          var ww = Math.min(box[i][0] * 1.3, vw), wh = Math.min(box[i][1] * 1.3, vh);
          setFrame(i, ww, wh, 0);
          setPicture(i, t, ww, wh, 1);
          continue;
        }
        var w = Math.max(1, EF[i][0] * ph(t, OPEN[i], OPEN[i] + 0.06, eRise));
        var h = Math.max(3, EF[i][1] * ph(t, OPEN[i], H_END[i], eSlit));
        set(frames[i], 'opacity', '1');
        setFrame(i, w, h, cy);
        setPicture(i, t, w, h);
      }
      // The window opens as a slit too
      if (t >= P.win) setWindow(winW, winH, holeCY, true);
      else closedWindow();
    } else if (t < P.exp) {
      // Phase 2: a quartic pull — barely moves, then slams into the window
      // (which, without a scene, is still opening as the pull begins)
      var cp = ph(t, P.conv, P.exp, eConverge);
      for (var j = 0; j < 4; j++) {
        var fw = EF[j][0] + (EWIN[0] - EF[j][0]) * cp;
        var fh = EF[j][1] + (EWIN[1] - EF[j][1]) * cp;
        set(frames[j], 'opacity', '1');
        setFrame(j, fw, fh, 0);
        setPicture(j, t, fw, fh);
      }
      if (t >= P.win) setWindow(winW, winH, vh / 2, true);
      else closedWindow();
    } else {
      // Phase 3: the window expands to the viewport while the overlay fades.
      // The frames have all closed into the window's edge, so they rest.
      frames.forEach(function (f) { set(f, 'visibility', 'hidden'); });
      var ep = ph(t, P.exp, P.expEnd, eExpand);
      setWindow(EWIN[0] + (vw - EWIN[0]) * ep, EWIN[1] + (vh - EWIN[1]) * ep, vh / 2, false);
    }
  }

  // ── Playback ───────────────────────────────────────────────────────────────
  // The overlay, opaque, laid out at t=0: the frames wait near-invisible, so
  // their pictures (and the paper bands) raster before the clock starts
  function prepare() {
    reset();
    ls.classList.add('ls-banded');
    set(ls, 'opacity', '1');
    ls.style.display = 'block';
    ls.style.pointerEvents = 'all';
    ls.setAttribute('aria-hidden', 'false');
    frame(0);
  }

  // opts: duration (ms), onFrame(t), onHole(), onDone()
  var raf = null, waiting = null;
  function play(opts) {
    opts = opts || {};
    var dur = opts.duration || 4000;
    if (raf) cancelAnimationFrame(raf);
    if (waiting) clearTimeout(waiting);
    raf = waiting = null;

    prepare();
    document.documentElement.classList.remove('ls-instant-cover');

    var t0 = null, holed = false, token = {};
    function tick(ts) {
      try {
        if (t0 === null) t0 = ts;
        var t = Math.min(P.end, (ts - t0) / dur);
        frame(t);
        if (!holed && t >= P.win) { holed = true; if (opts.onHole) opts.onHole(); }
        if (opts.onFrame) opts.onFrame(t);
        if (t < P.end) { raf = requestAnimationFrame(tick); return; }
      } catch (err) {
        console.error('Loading screen animation error:', err);
        if (!holed && opts.onHole) opts.onHole();
      }
      raf = null;
      hide();
      if (opts.onDone) opts.onDone();
    }

    // The pictures were preloaded by the page. Once decoded (or after a
    // short wait, if the network is slow), lay out t=0 again at their natural
    // sizes, let three frames go by while the rasters get under way, and
    // start the clock. Nothing moves until the first frame opens 0.32 s in.
    var started = false;
    function start() {
      if (started || play.token !== token) return;
      started = true;
      if (waiting) clearTimeout(waiting);
      waiting = null;
      frame(0);
      var n = 0;
      raf = requestAnimationFrame(function settle(ts) {
        raf = ++n < 3 ? requestAnimationFrame(settle) : requestAnimationFrame(tick);
      });
    }
    play.token = token;
    decoded.then(start);
    waiting = setTimeout(start, 900);
    return {
      cancel: function () {
        if (play.token === token) play.token = null;
        if (raf) cancelAnimationFrame(raf);
        if (waiting) clearTimeout(waiting);
        raf = waiting = null;
      },
    };
  }

  window.mulviumLS = { play: play, reset: reset };
  if (manual) {
    // The page will play it once its scene has loaded; while the overlay
    // already covers the page, get the rasters done now
    if (document.documentElement.classList.contains('ls-instant-cover')) prepare();
    return;
  }

  // ── Sub-pages: play on load ────────────────────────────────────────────────
  function dispatch(name) {
    // Flag for late listeners — module scripts (the scene) may finish loading
    // after this event has already fired
    window['__' + name.replace(':', '_')] = true;
    document.dispatchEvent(new CustomEvent(name));
  }
  function hole() {
    document.body.classList.add('ls-hole');
    dispatch('mulvium:ls-hole');
  }
  function done() {
    document.body.classList.add('ls-done');
    dispatch('mulvium:ls-done');
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.remove('ls-instant-cover');
    hide();
    hole();
    done();
    return;
  }
  play({ duration: 4000, onHole: hole, onDone: done });
})();
