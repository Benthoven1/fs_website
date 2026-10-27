// reel.js — The Polymath Founder: four one-minute reels for phones, one for
// each of Franklin, Addams, Nightingale and Schweitzer (?p=franklin, addams,
// nightingale, schweitzer). Each is a collage: archival scraps, torn and
// taped to a board, with cut paper, stamps and pencil, met by a camera moving
// across it. Midway, the past is torn in two to show the present beneath it;
// at the end the scraps fly, their circles find the landing page's orbits, and
// the wordmark turns through its many faces to its own (as the launch film
// closes, brand/film).
//
// As in the launch film, every frame is a function of time alone:
// reel.seek(t) draws the frame at t seconds, so render.js can capture it frame
// by frame, and the page plays itself, in time with its score, in a browser.
// The stories are data (stories/*.js, written with kit.js); score.py reads the
// same data, so every scrap that lands is heard landing.
import * as THREE from "three";

const PARAMS = new URLSearchParams(location.search);
const RENDER = PARAMS.has("render");
const ID = PARAMS.get("p") || "franklin";
const STORY = (await import(`./stories/${ID}.js`)).default;
const E = STORY.end;
const DURATION = E.duration, FPS = 30;
const W = 1080, H = 1920;
document.title = `${STORY.name} — The Polymath Founder`;

// ── Time helpers (as brand/film/film.js) ─────────────────────────────────────
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const cubicInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const expoIn = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
const backOut = (x) => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
function bezier(x1, y1, x2, y2) {
  const bx = (s) => 3 * x1 * s * (1 - s) ** 2 + 3 * x2 * s * s * (1 - s) + s ** 3;
  const by = (s) => 3 * y1 * s * (1 - s) ** 2 + 3 * y2 * s * s * (1 - s) + s ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, s = x;
    for (let i = 0; i < 24; i++) { s = (lo + hi) / 2; if (bx(s) < x) lo = s; else hi = s; }
    return by(s);
  };
}
const riseEase = bezier(0.16, 1, 0.3, 1);
// A smooth path through [time, value] keys that never overshoots them
function track(keys) {
  const n = keys.length, m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const d0 = (keys[i][1] - keys[i - 1][1]) / (keys[i][0] - keys[i - 1][0]);
    const d1 = (keys[i + 1][1] - keys[i][1]) / (keys[i + 1][0] - keys[i][0]);
    m[i] = d0 * d1 <= 0 ? 0 : 2 / (1 / d0 + 1 / d1);
  }
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0;
    while (t > keys[i + 1][0]) i++;
    const [t0, p0] = keys[i], [t1, p1] = keys[i + 1], h = t1 - t0;
    const s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * m[i + 1];
  };
}
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (n) => rng(n * 9973 + 17)();
// Collage moves on twos: a scrap's arrival is drawn fifteen times a second
const onTwos = (t) => Math.floor(t * 15 + 1e-6) / 15;

const stage = document.getElementById("stage");
const $ = (id) => document.getElementById(id);
const css = (el, prop, v) => { if (el.style[prop] !== v) el.style[prop] = v; };
const show = (el, on) => css(el, "display", on ? "" : "none");

// ── The cosmos: the landing page's hero (js/main.js), for the close ──────────
const PAPER = 0xeceae5, CREAM_DEEP = 0xcdbe96;
const PLANET_COLORS = [0xC4DDB8, 0xB8CAE0, 0xE0B8C8, 0xB8DDD8];
const canvas = $("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: RENDER });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);
// The landing page's camera, its field of view widened for the tall frame
const camera = new THREE.PerspectiveCamera((360 / Math.PI) * Math.atan(Math.tan((42 * Math.PI) / 360) * 1.75), W / H, 0.1, 200);
scene.add(new THREE.AmbientLight(0xfff7e8, 0.35));
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfb0, 0.75));
const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(6, 10, 8); scene.add(key);
const fill = new THREE.DirectionalLight(0xfff1d8, 0.5); fill.position.set(-8, 3, -4); scene.add(fill);
const rim = new THREE.DirectionalLight(0xf1e4bf, 0.55); rim.position.set(-2, -6, -8); scene.add(rim);
const porcelain = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0 });
const ORBITS = [
  { radius: 3.0, tilt: [0, 0, 0], speed: 0.36, phase: 0.0 },
  { radius: 3.8, tilt: [Math.PI / 2, 0, 0], speed: 0.26, phase: 1.1 },
  { radius: 4.5, tilt: [Math.PI / 3.2, Math.PI / 5 + Math.PI / 2, 0], speed: 0.22, phase: 2.4 },
  { radius: 5.0, tilt: [Math.PI / 3.2, Math.PI / 5, 0], speed: 0.18, phase: 3.8 },
];
const cosmos = new THREE.Group();
scene.add(cosmos);
const star = new THREE.Mesh(new THREE.SphereGeometry(1.25, 96, 96), porcelain(0xF0D5BB));
cosmos.add(star);
const orbits = ORBITS.map((def, i) => {
  const pivot = new THREE.Group();
  pivot.rotation.set(...def.tilt);
  cosmos.add(pivot);
  const ringMat = porcelain(CREAM_DEEP);
  ringMat.roughness = 0.35;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(def.radius, 0.045, 24, 256), ringMat);
  pivot.add(ring);
  const rotator = new THREE.Group();
  pivot.add(rotator);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 64, 64), porcelain(PLANET_COLORS[i]));
  planet.position.x = def.radius;
  rotator.add(planet);
  return { def, pivot, ring, rotator, planet };
});
// The rings draw themselves round as the board lifts away
const HERO_T0 = E.hero;
function poseCosmos(t) {
  const u = t - HERO_T0;
  for (const o of orbits) {
    o.rotator.rotation.z = o.def.phase + o.def.speed * (u + 2);
    o.planet.rotation.y = 0.08 * t;
    const s = lerp(0.82, 1, expoOut(seg(t, E.reveal[0] - 0.4, E.reveal[1] + 0.8)));
    o.pivot.scale.setScalar(s);
  }
  star.scale.setScalar(1 + Math.sin(t * 1.1) * 0.01);
  // The landing page's angle (CAM_3D), arrived at from a little above and back
  const k = expoOut(seg(t, HERO_T0, HERO_T0 + 5));
  const az = lerp(14, 0, k) * (Math.PI / 180), el = Math.atan2(2.6, 14.5) + lerp(0.16, 0, k);
  const dist = Math.hypot(2.6, 14.5) * lerp(1.14, 1, k) * (1 - 0.02 * seg(t, HERO_T0 + 5, E.wordmark + 1));
  camera.position.set(Math.cos(el) * Math.sin(az) * dist, Math.sin(el) * dist, Math.cos(el) * Math.cos(az) * dist);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  cosmos.updateMatrixWorld(true);
  camera.updateMatrixWorld();
}
const _v = new THREE.Vector3(), _u = new THREE.Vector3();
function toScreen(p) {
  _v.copy(p).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H };
}
function screenRadius(p, r) {
  const d = camera.position.distanceTo(p);
  return (r / (d * Math.tan((camera.fov * Math.PI) / 360))) * (H / 2);
}
// Where each orbit's planet (and the star) is drawn, for the circles to meet
function heroTargets() {
  const out = orbits.map((o) => {
    o.planet.getWorldPosition(_u);
    return { ...toScreen(_u), r: screenRadius(_u, 0.42) };
  });
  out.star = { ...toScreen(star.position), r: screenRadius(star.position, 1.25) };
  return out;
}

// ── The collage: paper, picture, ink ─────────────────────────────────────────
const board = $("collage"), ctx = board.getContext("2d");
board.width = W; board.height = H;
const offA = new OffscreenCanvas(W, H), offB = new OffscreenCanvas(W, H);
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };

// Paper's grain: a tile of fibres and specks, multiplied into every scrap
const GRAIN = (() => {
  const c = mk(256, 256), g = c.getContext("2d"), r = rng(5), img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 236 + (r() + r() - 1) * 26;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 140; i++) {
    g.strokeStyle = r() < 0.5 ? "rgba(120,100,70,0.16)" : "rgba(255,255,255,0.35)";
    g.lineWidth = 0.6 + r();
    g.beginPath();
    let x = r() * 256, y = r() * 256, a = r() * 6.3;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { a += (r() - 0.5) * 1.2; x += Math.cos(a) * 6; y += Math.sin(a) * 6; g.lineTo(x, y); }
    g.stroke();
  }
  return c;
})();
function grainOver(g, w, h, alpha = 0.55) {
  g.save();
  g.globalCompositeOperation = "multiply";
  g.globalAlpha = alpha;
  g.fillStyle = g.createPattern(GRAIN, "repeat");
  g.fillRect(0, 0, w, h);
  g.restore();
}

// A torn (or cut) edge: three octaves of noise along it
function edgeNoise(r) {
  const oct = [[26, 1], [9, 0.45], [3.2, 0.22]].map(([len, amp]) => ({ len, amp, v: Array.from({ length: 512 }, r) }));
  return (s) => oct.reduce((acc, o) => {
    const x = s / o.len, i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f);
    return acc + o.amp * (lerp(o.v[((i % 512) + 512) % 512], o.v[(((i + 1) % 512) + 512) % 512], k) * 2 - 1);
  }, 0);
}
// The outline of a w × h scrap, and the line inside it where the picture
// begins: on a torn side the paper's white core shows between the two. edges
// is four letters, top, right, bottom, left: t torn, c cut, d deckled.
function outline(w, h, edges, seed, amp = 8) {
  const r = rng(seed), n1 = edgeNoise(r), n2 = edgeNoise(r);
  const sides = [[0, 0, w, 0, 0, -1], [w, 0, w, h, 1, 0], [w, h, 0, h, 0, 1], [0, h, 0, 0, -1, 0]];
  const outer = [], inner = [];
  let s0 = 0;
  sides.forEach(([x0, y0, x1, y1, nx, ny], i) => {
    const kind = edges[i], len = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(2, Math.round(len / 3));
    const skew = (r() - 0.5) * (kind === "c" ? 4 : 0);
    for (let j = 0; j < steps; j++) {
      const s = j / steps, x = lerp(x0, x1, s), y = lerp(y0, y1, s), q = s0 + s * len;
      let o, n;
      if (kind === "t") {
        o = amp * n1(q) + (r() - 0.5) * 1.6;
        n = o - amp * 0.7 - amp * 0.55 * Math.abs(n2(q * 1.7));
      } else if (kind === "d") {
        o = 2.2 * Math.abs(Math.sin(q * 0.42)) + 1.2 * n1(q) + (r() - 0.5);
        n = o - 3;
      } else {
        o = skew * (s - 0.5) + 0.5 * n1(q * 0.3);
        n = o;
      }
      outer.push([x + nx * o, y + ny * o]);
      inner.push([x + nx * n, y + ny * n]);
    }
    s0 += len;
  });
  return { outer, inner };
}
const pathOf = (g, pts, ox, oy) => {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x + ox, y + oy) : g.moveTo(x + ox, y + oy)));
  g.closePath();
};
// A wobbly circle, as scissors cut one
function circlePts(rad, seed) {
  const r = rng(seed), n = edgeNoise(r), out = [];
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2, q = a * rad;
    const rr = rad + 1.6 * n(q * 0.4) + (i % 9 === 0 ? (r() - 0.5) * 1.5 : 0);
    out.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return out;
}

// A sprite: the scrap itself, and its shadow, a blurred silhouette (ink and
// handwriting, on the board itself, cast none; tape a faint one)
function sprite(w, h, m, paint, silhouette, shadow = 1) {
  const cv = mk(w + 2 * m, h + 2 * m), g = cv.getContext("2d");
  paint(g, m);
  if (!shadow) return { cv, sh: null, ax: w / 2 + m, ay: h / 2 + m, w, h };
  const sh = mk(w + 2 * m + 60, h + 2 * m + 60), s = sh.getContext("2d");
  s.filter = "blur(7px)";
  s.fillStyle = "#1a1007";
  s.translate(30, 30);
  silhouette(s, m);
  s.fill();
  return { cv, sh, shAlpha: shadow, ax: w / 2 + m, ay: h / 2 + m, w, h };
}
const FRINGE = "#f7f2e7";
function tornSprite(w, h, edges, seed, fillContent, { fringe = FRINGE, amp = 8, hairs = true, shadow = 1 } = {}) {
  const { outer, inner } = outline(w, h, edges, seed, amp);
  const m = 20;
  return sprite(w, h, m, (g) => {
    pathOf(g, outer, m, m);
    g.fillStyle = fringe;
    g.fill();
    if (hairs) {
      // Fibres where it tore
      const r = rng(seed + 3);
      g.strokeStyle = fringe;
      g.lineWidth = 0.8;
      for (let i = 0; i < outer.length; i += 2) {
        if (r() > 0.18) continue;
        const [x, y] = outer[i], [ix, iy] = inner[i];
        const dx = x - ix, dy = y - iy, L = Math.hypot(dx, dy);
        if (L < 2) continue;
        g.beginPath();
        g.moveTo(x + m, y + m);
        g.lineTo(x + m + (dx / L) * (2 + r() * 4) + (r() - 0.5) * 3, y + m + (dy / L) * (2 + r() * 4) + (r() - 0.5) * 3);
        g.stroke();
      }
    }
    g.save();
    pathOf(g, inner, m, m);
    g.clip();
    g.translate(m, m);
    fillContent(g, w, h);
    g.restore();
  }, (s, m) => pathOf(s, outer, m, m), shadow);
}
// A picture drawn to cover w × h, around a focus point (fx, fy in 0–1)
function cover(g, im, w, h, fx = 0.5, fy = 0.5, zoom = 1) {
  const s = Math.max(w / im.width, h / im.height) * zoom, iw = im.width * s, ih = im.height * s;
  g.drawImage(im, lerp(0, w - iw, fx), lerp(0, h - ih, fy), iw, ih);
}

// Cut-paper silhouettes, in a unit square (centre 0, 0; ±0.5)
const SHAPES = {
  kite: (p) => { p.moveTo(0, -0.5); p.lineTo(0.3, -0.12); p.lineTo(0, 0.5); p.lineTo(-0.3, -0.12); p.closePath(); },
  bolt: (p) => { p.moveTo(0.1, -0.5); p.lineTo(-0.22, 0.04); p.lineTo(0.02, 0.04); p.lineTo(-0.12, 0.5); p.lineTo(0.24, -0.08); p.lineTo(0.0, -0.08); p.lineTo(0.16, -0.5); p.closePath(); },
  key: (p) => { p.arc(0, -0.3, 0.17, 0, Math.PI * 2); p.moveTo(-0.045, -0.15); p.rect(-0.045, -0.15, 0.09, 0.62); p.rect(0.04, 0.26, 0.12, 0.07); p.rect(0.04, 0.38, 0.09, 0.07); },
  bucket: (p) => { p.moveTo(-0.32, -0.3); p.lineTo(0.32, -0.3); p.lineTo(0.24, 0.45); p.lineTo(-0.24, 0.45); p.closePath(); p.moveTo(-0.3, -0.32); p.ellipse(0, -0.32, 0.3, 0.2, 0, Math.PI, 0); p.lineTo(0.26, -0.32); p.ellipse(0, -0.32, 0.26, 0.16, 0, 0, Math.PI, true); p.closePath(); },
  book: (p) => { p.moveTo(-0.5, -0.32); p.quadraticCurveTo(-0.25, -0.4, 0, -0.3); p.quadraticCurveTo(0.25, -0.4, 0.5, -0.32); p.lineTo(0.5, 0.36); p.quadraticCurveTo(0.25, 0.28, 0, 0.38); p.quadraticCurveTo(-0.25, 0.28, -0.5, 0.36); p.closePath(); },
  lamp: (p) => { // a Turkish lantern: a cap, a pleated body, a base
    p.rect(-0.12, -0.5, 0.24, 0.06); p.rect(-0.2, -0.44, 0.4, 0.07);
    p.moveTo(-0.24, -0.36); p.lineTo(0.24, -0.36); p.quadraticCurveTo(0.3, 0.02, 0.24, 0.32); p.lineTo(-0.24, 0.32); p.quadraticCurveTo(-0.3, 0.02, -0.24, -0.36); p.closePath();
    p.rect(-0.2, 0.32, 0.4, 0.07); p.rect(-0.14, 0.39, 0.28, 0.06);
  },
  flame: (p) => { p.moveTo(0, -0.5); p.bezierCurveTo(0.34, -0.1, 0.36, 0.3, 0, 0.5); p.bezierCurveTo(-0.36, 0.3, -0.34, -0.1, 0, -0.5); p.closePath(); },
  house: (p) => { // a gabled front, its windows cut out
    p.moveTo(-0.5, 0.5); p.lineTo(-0.5, -0.1); p.lineTo(0, -0.5); p.lineTo(0.5, -0.1); p.lineTo(0.5, 0.5); p.closePath();
    for (const [x, y] of [[-0.3, 0.02], [0.1, 0.02], [-0.3, 0.26], [0.1, 0.26]]) p.rect(x, y, 0.2, 0.15);
    p.rect(-0.06, -0.24, 0.12, 0.14);
  },
  pipes: (p) => { // organ pipes, tallest at the middle
    const n = 9;
    for (let i = 0; i < n; i++) {
      const x = -0.5 + (i + 0.5) / n, hgt = 0.55 + 0.45 * Math.cos(((i - (n - 1) / 2) / n) * 2.4), w = 0.075;
      p.rect(x - w / 2, 0.5 - hgt, w, hgt - 0.12);
      p.moveTo(x - w / 2, 0.38); p.lineTo(x + w / 2, 0.38); p.lineTo(x, 0.5); p.closePath();
    }
  },
  note: (p) => { p.ellipse(-0.18, 0.32, 0.2, 0.14, -0.4, 0, Math.PI * 2); p.rect(-0.01, -0.5, 0.07, 0.82); p.moveTo(0.06, -0.5); p.quadraticCurveTo(0.42, -0.3, 0.3, 0.0); p.quadraticCurveTo(0.32, -0.24, 0.06, -0.3); p.closePath(); },
  cross: (p) => { p.rect(-0.14, -0.5, 0.28, 1); p.rect(-0.5, -0.14, 1, 0.28); },
  heart: (p) => { p.moveTo(0, 0.45); p.bezierCurveTo(-0.6, 0.0, -0.4, -0.55, 0, -0.22); p.bezierCurveTo(0.4, -0.55, 0.6, 0.0, 0, 0.45); p.closePath(); },
  hand: (p) => { // an open hand, palm up
    p.moveTo(-0.38, 0.5); p.lineTo(-0.38, 0.0); p.quadraticCurveTo(-0.5, -0.2, -0.36, -0.22); p.lineTo(-0.22, -0.05);
    for (const [x, top] of [[-0.2, -0.46], [-0.04, -0.5], [0.12, -0.46], [0.28, -0.36]]) { p.lineTo(x, top + 0.04); p.quadraticCurveTo(x + 0.07, top - 0.03, x + 0.14, top + 0.04); }
    p.lineTo(0.42, 0.0); p.quadraticCurveTo(0.42, 0.36, 0.2, 0.5); p.closePath();
  },
  columns: (p) => { // a portico: pediment, four columns, steps
    p.moveTo(-0.5, -0.24); p.lineTo(0, -0.5); p.lineTo(0.5, -0.24); p.closePath();
    p.rect(-0.46, -0.22, 0.92, 0.06);
    for (let i = 0; i < 4; i++) p.rect(-0.4 + i * 0.25, -0.14, 0.09, 0.5);
    p.rect(-0.48, 0.36, 0.96, 0.06); p.rect(-0.5, 0.44, 1.0, 0.06);
  },
  chart: (p) => { // bars on a ruled base
    p.rect(-0.5, 0.42, 1, 0.08);
    [[-0.42, 0.3], [-0.2, 0.55], [0.02, 0.4], [0.24, 0.8]].forEach(([x, hh]) => p.rect(x, 0.42 - hh, 0.16, hh));
  },
  star: (p) => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.2 : 0.5; i ? p.lineTo(Math.cos(a) * r, Math.sin(a) * r) : p.moveTo(Math.cos(a) * r, Math.sin(a) * r); } p.closePath(); },
};

// Faces for words cut letter by letter
const CUT_FACES = [
  ["Abril Fatface", 400], ["Bodoni Moda", 700], ["Playfair Display", 900], ["Bebas Neue", 400], ["Rye", 400],
  ["Zilla Slab", 700], ["Archivo Black", 400], ["IM Fell English", 400], ["Space Mono", 700], ["Cormorant Garamond", 600],
  ["Special Elite", 400], ["DM Serif Display", 400], ["Lora", 500], ["Yeseva One", 400],
];
const CUT_PAPERS = [["#f6f1e6", "#1b1613"], ["#1b1613", "#f6f1e6"], ["#b87758", "#fffaf2"], ["#e6d3a8", "#2a211b"],
  ["#B8CAE0", "#1b1613"], ["#E0B8C8", "#1b1613"], ["#C4DDB8", "#1b1613"], ["#fffdf7", "#a8432e"]];

const IMAGES = {};
function bake(p) {
  const r = rng(p.seed * 31 + 7);
  if (p.kind === "img") {
    const im = IMAGES[p.key];
    const h = p.h || (p.w * im.height) / im.width * (p.crop ? p.crop : 1);
    p.h = h;
    return tornSprite(p.w, h, p.edges, p.seed, (g, w, hh) => {
      g.fillStyle = "#efe9dc"; g.fillRect(0, 0, w, hh);
      cover(g, im, w, hh, p.fx ?? 0.5, p.fy ?? 0.5, p.zoom || 1);
      if (p.tint) { g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = p.tint; g.fillRect(0, 0, w, hh); g.restore(); }
      grainOver(g, w, hh, 0.3);
    }, { amp: p.amp || 8 });
  }
  if (p.kind === "paper") {
    return tornSprite(p.w, p.h, p.edges, p.seed, (g, w, h) => {
      g.fillStyle = p.color; g.fillRect(0, 0, w, h);
      if (p.lines) { // ruled, as a ledger or a notebook
        g.strokeStyle = p.lines; g.lineWidth = 1.5;
        for (let y = 40; y < h; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.strokeStyle = "rgba(168,67,46,0.45)"; g.beginPath(); g.moveTo(70, 0); g.lineTo(70, h); g.stroke();
      }
      if (p.dots) { // a halftone screen
        g.fillStyle = p.dots;
        for (let y = 0; y < h; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < w; x += 14) { g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }
      }
      grainOver(g, w, h, 0.6);
    }, { fringe: p.fringe || mixHex(p.color, "#ffffff", 0.55), amp: p.amp || 8 });
  }
  if (p.kind === "disc") {
    const pts = circlePts(p.r, p.seed), m = 12, w = p.r * 2;
    const im = p.key ? IMAGES[p.key] : null;
    return sprite(w, w, m, (g) => {
      g.save();
      g.translate(m + p.r, m + p.r);
      pathOf(g, pts, 0, 0);
      g.fillStyle = p.rim || "#fbf8f1";
      g.fill();
      const inset = p.rim === "none" ? 0 : 4;
      g.beginPath(); g.arc(0, 0, p.r - inset, 0, Math.PI * 2); g.clip();
      g.translate(-p.r, -p.r);
      if (im) cover(g, im, w, w, p.fx ?? 0.5, p.fy ?? 0.5, p.zoom || 1);
      else { g.fillStyle = p.color; g.fillRect(0, 0, w, w); }
      if (p.icon) { // a cut-paper sign of what it holds
        const u = new Path2D(), k = w * 0.5;
        SHAPES[p.icon](u);
        g.fillStyle = mixHex(p.color, "#1b1613", 0.42);
        g.globalAlpha = 0.85;
        g.setTransform(g.getTransform().translate(w / 2, w / 2).scale(k, k));
        g.fill(u, "evenodd");
        g.globalAlpha = 1;
      }
      if (p.tint) { g.globalCompositeOperation = "multiply"; g.fillStyle = p.tint; g.fillRect(0, 0, w, w); g.globalCompositeOperation = "source-over"; }
      grainOver(g, w, w, im ? 0.25 : 0.55);
      g.restore();
    }, (s, m) => { s.translate(m + p.r, m + p.r); pathOf(s, pts, 0, 0); });
  }
  if (p.kind === "label") {
    const font = `${p.italic ? "italic " : ""}${p.weight || 400} ${p.size}px "${p.font}"`;
    const c = mk(10, 10).getContext("2d");
    c.font = font;
    const tw = c.measureText(p.text).width, padX = p.padX ?? p.size * 0.5;
    const w = tw + padX * 2, h = p.size * (p.tall || 1.5);
    if (p.bg === "none") { // printed straight onto what lies beneath
      return sprite(w, h, 4, (g, m) => {
        g.font = font; g.fillStyle = p.color || "#1b1613"; g.textBaseline = "middle";
        g.fillText(p.text, m + padX, m + h / 2 + p.size * 0.04);
      }, () => {}, 0);
    }
    return tornSprite(w, h, p.edges || "ctct", p.seed, (g) => {
      g.fillStyle = p.bg || "#f7f3ea"; g.fillRect(0, 0, w, h);
      if (p.bg !== "none") grainOver(g, w, h, 0.45);
      g.font = font; g.fillStyle = p.color || "#1b1613"; g.textBaseline = "middle";
      if (p.tracking) g.letterSpacing = p.tracking + "px";
      g.fillText(p.text, padX, h / 2 + p.size * 0.04);
    }, { fringe: p.fringe || "#fbf8f1", amp: 5, hairs: false });
  }
  if (p.kind === "hand") {
    const font = `${p.weight || 600} ${p.size}px "Caveat"`;
    const c = mk(10, 10).getContext("2d");
    c.font = font;
    const w = c.measureText(p.text).width + 20, h = p.size * 1.4;
    return sprite(w, h, 4, (g, m) => {
      g.font = font; g.fillStyle = p.color; g.textBaseline = "middle";
      g.fillText(p.text, m + 10, m + h / 2);
    }, () => {}, false);
  }
  if (p.kind === "stamp") {
    const font = `400 ${p.size}px "Special Elite"`;
    const c = mk(10, 10).getContext("2d");
    c.font = font;
    const lines = p.text.split("\n");
    const tw = Math.max(...lines.map((l) => c.measureText(l).width));
    const w = tw + p.size * 1.3, h = p.size * (1.15 * lines.length + 0.75);
    return sprite(w, h, 8, (g, m) => {
      g.strokeStyle = g.fillStyle = p.color;
      g.lineWidth = p.size * 0.09;
      g.beginPath(); g.roundRect(m + 3, m + 3, w - 6, h - 6, p.size * 0.18); g.stroke();
      g.lineWidth = p.size * 0.035;
      g.beginPath(); g.roundRect(m + p.size * 0.2, m + p.size * 0.2, w - p.size * 0.4, h - p.size * 0.4, p.size * 0.1); g.stroke();
      g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
      lines.forEach((l, i) => g.fillText(l, m + w / 2, m + h / 2 + (i - (lines.length - 1) / 2) * p.size * 1.15 + p.size * 0.05));
      // Where the ink did not take
      g.globalCompositeOperation = "destination-out";
      for (let i = 0; i < (w * h) / 90; i++) {
        g.globalAlpha = 0.25 + r() * 0.75;
        g.beginPath(); g.arc(m + r() * w, m + r() * h, 0.5 + r() * 2.2, 0, 7); g.fill();
      }
      g.globalAlpha = 0.5;
      for (let i = 0; i < 5; i++) { g.fillRect(m + r() * w, m, 1 + r() * 3, h); }
    }, () => {}, false);
  }
  if (p.kind === "tape") {
    const w = p.w, h = p.h;
    return tornSprite(w, h, "czcz".replace(/z/g, "t"), p.seed, (g) => {
      g.fillStyle = p.color || "rgba(233,222,186,0.72)"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 1;
      for (let y = 6; y < h; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 2); g.stroke(); }
    }, { fringe: "rgba(240,232,205,0.5)", amp: 4, hairs: false, shadow: 0.25 });
  }
  if (p.kind === "shape") {
    const ar = p.aspect || 1, w = p.w, h = p.w * ar;
    const path = new Path2D();
    const unit = new Path2D();
    SHAPES[p.name](unit);
    path.addPath(unit, new DOMMatrix().translate(w / 2, h / 2).scale(w, h));
    return sprite(w, h, 14, (g, m) => {
      g.save();
      g.translate(m, m);
      g.clip(path, "evenodd");
      g.fillStyle = p.color; g.fillRect(0, 0, w, h);
      if (p.dots) { g.fillStyle = p.dots; for (let y = 0; y < h; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < w; x += 12) { g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); } }
      grainOver(g, w, h, 0.6);
      g.restore();
    }, (s, m) => { s.translate(m, m); s.fill(path, "evenodd"); s.beginPath(); });
  }
  if (p.kind === "ransom") {
    // Each letter on its own scrap, in its own face
    const chars = [...p.text], parts = [];
    let x = 0;
    const c = mk(10, 10).getContext("2d");
    chars.forEach((ch, i) => {
      if (ch === " ") { x += p.size * 0.35; return; }
      const [fam, wt] = p.faces ? p.faces[i % p.faces.length] : CUT_FACES[Math.floor(r() * CUT_FACES.length)];
      const [bg, fg] = p.papers ? p.papers[i % p.papers.length] : CUT_PAPERS[Math.floor(r() * CUT_PAPERS.length)];
      const size = p.size * (0.86 + r() * 0.22);
      const font = `${wt} ${size}px "${fam}"`;
      c.font = font;
      const m = c.measureText(ch), cw = m.width + size * 0.26, chh = size * 1.18;
      const sp = tornSprite(cw, chh, r() < 0.5 ? "cccc" : "tctc", p.seed * 13 + i, (g, w, h) => {
        g.fillStyle = bg; g.fillRect(0, 0, w, h); grainOver(g, w, h, 0.45);
        g.font = font; g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(ch, w / 2, h / 2 + size * 0.06);
      }, { amp: 4, hairs: false, fringe: "#fbf8f1" });
      parts.push({ sp, x: x + cw / 2, y: (r() - 0.5) * p.size * 0.12, rot: (r() - 0.5) * 9, i });
      x += cw + p.size * 0.04;
    });
    for (const q of parts) q.x -= x / 2;
    return { parts, w: x, h: p.size * 1.2 };
  }
  return null;
}
function mixHex(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, k));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// ── Scenes: the past, and the present beneath it ────────────────────────────
function boardTile(color, seed) {
  const c = mk(512, 512), g = c.getContext("2d"), r = rng(seed);
  g.fillStyle = color; g.fillRect(0, 0, 512, 512);
  g.globalCompositeOperation = "multiply";
  g.globalAlpha = 0.5;
  for (let k = 0; k < 4; k++) g.drawImage(GRAIN, (k % 2) * 256, Math.floor(k / 2) * 256);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  for (let i = 0; i < 40; i++) { // flecks in the board
    g.fillStyle = `rgba(${r() < 0.5 ? "90,70,40" : "255,255,255"},${0.06 + r() * 0.1})`;
    g.beginPath(); g.arc(r() * 512, r() * 512, 0.6 + r() * 1.6, 0, 7); g.fill();
  }
  return c;
}
function makeScene(def, name) {
  const keys = def.camera;
  const cam = ["x", "y", "z", "r"].map((_, j) => track(keys.map((k) => [k[0], k[j + 1]])));
  const pieces = def.pieces.map((p, i) => ({ ...p, order: p.z ?? i }));
  pieces.sort((a, b) => a.order - b.order);
  return { name, def, cam, pieces, tile: null, captions: (def.captions || []).map((c) => ({ ...c })), stamps: pieces.filter((p) => p.enter === "stamp").map((p) => p.at) };
}
const PAST = makeScene(STORY.past, "past"), NOW = makeScene(STORY.now, "now");
const SCENES = [PAST, NOW];

function camAt(sc, t) {
  const [x, y, z, r] = sc.cam.map((f) => f(t));
  // The board breathes a little, and jolts when a stamp comes down
  let jolt = 0;
  for (const s of sc.stamps) if (t >= s && t < s + 0.5) jolt += Math.exp(-(t - s) * 14) * Math.sin((t - s) * 70);
  return { x: x + Math.sin(t * 0.21) * 6, y: y + Math.cos(t * 0.17) * 5 + jolt * 5, z: z * (1 + 0.008 * Math.sin(t * 0.33 + 1) + jolt * 0.004), r };
}

// A scrap's arrival: lift (1 in the air, 0 down), offset, turn, scale, alpha
function arrival(p, t) {
  const s = { lift: 0, dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, a: 1, prog: 1 };
  const tq = p.enter === "draw" ? t : onTwos(t - p.at) + p.at;
  if (p.enter === "slap") {
    const k = seg(tq, p.at - 0.3, p.at);
    s.lift = (1 - k) ** 1.4;
    s.sx = s.sy = 1 + 0.16 * s.lift;
    s.rot = (hash(p.seed) < 0.5 ? -1 : 1) * 7 * s.lift;
    s.a = seg(tq, p.at - 0.3, p.at - 0.18);
  } else if (p.enter === "slide") {
    const k = expoOut(seg(tq, p.at - 0.6, p.at)), a = ((p.from ?? 0) * Math.PI) / 180;
    s.dx = Math.cos(a) * 1500 * (1 - k); s.dy = Math.sin(a) * 1500 * (1 - k);
    s.lift = 0.6 * (1 - k); s.rot = 10 * (1 - k);
  } else if (p.enter === "unfold") {
    const k = seg(tq, p.at - 0.4, p.at);
    s.sy = Math.max(0.02, expoOut(k)); s.lift = 0.35 * (1 - k); s.a = seg(tq, p.at - 0.4, p.at - 0.32);
  } else if (p.enter === "grow") {
    const k = seg(tq, p.at - 0.35, p.at);
    s.sx = s.sy = Math.max(0.001, backOut(k)); s.lift = 0.3 * (1 - k); s.a = seg(tq, p.at - 0.35, p.at - 0.3);
  } else if (p.enter === "stamp") {
    const k = seg(t, p.at - 0.1, p.at);
    s.sx = s.sy = 1 + 0.5 * (1 - k) ** 2; s.a = k > 0 ? 0.9 : 0;
  } else if (p.enter === "fade") {
    s.a = seg(t, p.at - 0.6, p.at);
  } else if (p.enter === "draw") {
    s.prog = seg(t, p.at, p.at + p.dur);
    s.a = s.prog > 0 ? 1 : 0;
  }
  // And its leaving: peeled off and away
  if (p.out !== undefined) {
    const k = seg(onTwos(t - p.out) + p.out, p.out, p.out + 0.35);
    s.lift += k * 1.2; s.a *= 1 - k; s.dy -= 60 * k; s.sx *= 1 + 0.1 * k; s.sy *= 1 + 0.1 * k;
  }
  return s;
}
function preroll(p) {
  return p.enter === "slide" ? 0.6 : p.enter === "draw" ? 0 : 0.4;
}

// Draw a sprite at (x, y) on the frame, turned and scaled, with its shadow
function put(g, sp, x, y, rot, sx, sy, lift, a, reveal = 1) {
  if (a <= 0.002) return;
  g.save();
  g.translate(x, y);
  g.rotate((rot * Math.PI) / 180);
  g.scale(sx, sy);
  if (reveal < 1) { g.beginPath(); g.rect(-sp.ax, -sp.ay - 40, sp.cv.width * reveal, sp.cv.height + 80); g.clip(); }
  if (sp.sh) {
    const off = 4 + 30 * lift;
    g.globalAlpha = a * (sp.shAlpha ?? 1) * (0.42 - 0.18 * lift);
    g.drawImage(sp.sh, -sp.ax - 30 + off * 0.6, -sp.ay - 30 + off);
  }
  g.globalAlpha = a;
  g.drawImage(sp.cv, -sp.ax, -sp.ay);
  g.restore();
}

// The hero: the scraps fly, the circles find their orbits
function flight(p, sx, sy, t) {
  if (t < E.hero) return null;
  const dx = sx - W / 2, dy = sy - H * 0.45, L = Math.hypot(dx, dy) || 1;
  const start = E.hero + 0.05 + 0.35 * hash(p.seed + 5) + (1 - Math.min(1, L / 1100)) * 0.25;
  const k = expoIn(seg(t, start, start + 0.85));
  return { dx: (dx / L) * 1700 * k, dy: (dy / L) * 1700 * k - 200 * k, rot: (hash(p.seed + 9) - 0.5) * 80 * k, lift: k * 1.5 };
}

function drawScene(g, sc, t, targets) {
  const cam = camAt(sc, t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!sc.tile) sc.tile = g.createPattern(boardTile(sc.def.board, sc.name === "past" ? 21 : 22), "repeat");
  // The board, moving with the camera
  const m = new DOMMatrix().translate(W / 2, H / 2).rotate(cam.r).scale(cam.z).translate(-cam.x, -cam.y);
  const boardA = sc === NOW && t >= E.reveal[0] ? 1 - easeInOut(seg(t, ...E.reveal)) : 1;
  if (boardA > 0.001) {
    sc.tile.setTransform(m);
    g.globalAlpha = boardA;
    g.fillStyle = sc.tile;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
  }
  const discs = [];
  for (const p of sc.pieces) {
    if (t < p.at - preroll(p) || (p.out !== undefined && t > p.out + 0.4) || (!p.sp && p.kind !== "ink" && p.kind !== "glow")) continue;
    const s = arrival(p, t);
    if (s.a <= 0.002) continue;
    // Depth: nearer pieces move further for the same camera move
    const par = p.d, z = cam.z * (1 + (par - 1) * 0.6);
    const wx = (p.x - cam.x) * par, wy = (p.y - cam.y) * par;
    const rr = (cam.r * Math.PI) / 180;
    let x = W / 2 + (wx * Math.cos(rr) - wy * Math.sin(rr)) * cam.z;
    let y = H / 2 + (wx * Math.sin(rr) + wy * Math.cos(rr)) * cam.z;
    let rot = p.rot + s.rot + cam.r, lift = s.lift, a = s.a, sx = s.sx * z, sy = s.sy * z;
    if (sc === NOW && p.orbit !== undefined && t >= E.hero) {
      discs.push({ p, x: x + s.dx * cam.z, y: y + s.dy * cam.z, rot, z: sx });
      continue;
    }
    const f = sc === NOW ? flight(p, x, y, t) : null;
    if (f) { x += f.dx; y += f.dy; rot += f.rot; lift += f.lift; }
    if (p.kind === "ink") { drawInk(g, p, x, y, z, rot, s.prog, t); continue; }
    if (p.kind === "glow") { // lamplight on the paper, flickering
      const fl = 1 + 0.05 * Math.sin(t * 13.1 + p.seed) + 0.04 * Math.sin(t * 7.3);
      const rad = p.r * z * fl, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(255,214,140,${(0.55 * a).toFixed(3)})`);
      gr.addColorStop(0.35, `rgba(250,196,120,${(0.25 * a).toFixed(3)})`);
      gr.addColorStop(1, "rgba(250,190,110,0)");
      g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore();
      continue;
    }
    if (p.kind === "hand") { put(g, p.sp, x, y, rot, sx, sy, 0, a, s.prog); continue; } // written on, left to right
    if (p.kind === "ransom") {
      p.sp.parts.forEach((q) => {
        const sub = arrival({ ...p, at: p.at + q.i * (p.stagger ?? 0.06), seed: p.seed + q.i }, t);
        const cr = Math.cos((rot * Math.PI) / 180), sr = Math.sin((rot * Math.PI) / 180);
        put(g, q.sp, x + (q.x * cr - q.y * sr) * sx, y + (q.x * sr + q.y * cr) * sx, rot + q.rot + sub.rot, sx * sub.sx, sy * sub.sy, lift + sub.lift, a * sub.a);
      });
      continue;
    }
    if (p.kind === "stamp") {
      g.save();
      g.globalCompositeOperation = "multiply";
      put(g, p.sp, x, y, rot, sx, sy, 0, a * 0.92);
      g.restore();
      continue;
    }
    put(g, p.sp, x, y, rot, sx, sy, lift, a);
  }
  // The circles on their way to the orbits, drawn over everything
  for (const d of discs) {
    const k = cubicInOut(seg(t, E.hero, E.hero + 1.7));
    const tg = d.p.orbit === "star" ? targets.star : targets[d.p.orbit];
    const sc2 = lerp(1, tg.r / d.p.r, k) * lerp(d.z, 1, k);
    const x = lerp(d.x, tg.x, k), y = lerp(d.y, tg.y, k) - Math.sin(Math.PI * k) * 90;
    const a = 1 - seg(t, E.hero + 1.75, E.hero + 2.5);
    put(g, d.p.sp, x, y, lerp(d.rot, 0, k), sc2, sc2, Math.sin(Math.PI * k) * 0.8, a);
  }
  drawCaptions(g, sc, t);
}

function drawInk(g, p, x, y, z, rot, prog, t) {
  if (prog <= 0) return;
  // The line boils, as a drawn line does, redrawn eight times a second
  const boil = Math.floor(t * 8), r = rng(p.seed * 101 + boil);
  const pts = p.pts;
  const total = pts.filter(Boolean).length, upto = prog * total;
  g.save();
  g.translate(x, y);
  g.rotate((rot * Math.PI) / 180);
  g.scale(z, z);
  g.strokeStyle = p.color;
  g.lineWidth = p.width;
  g.lineCap = g.lineJoin = "round";
  g.globalAlpha = p.alpha ?? 0.92;
  g.beginPath();
  let n = 0, pen = false;
  for (const q of pts) {
    if (!q) { pen = false; continue; }
    if (n > upto) break;
    const jx = q[0] + (r() - 0.5) * 2.2, jy = q[1] + (r() - 0.5) * 2.2;
    if (pen) g.lineTo(jx, jy); else { g.moveTo(jx, jy); pen = true; }
    n++;
  }
  g.stroke();
  g.restore();
}

// Captions: each line a strip of paper, slapped down in turn
const CAPTION_DEF = { size: 50, gap: 1.62 };
function bakeCaptions() {
  for (const sc of SCENES) for (const c of sc.captions) {
    c.strips = c.lines.map((l, i) => {
      const size = l.size || c.size || CAPTION_DEF.size;
      const p = { kind: "label", text: l.text, size, font: l.font || "Lora", italic: l.it, weight: l.weight || (l.font === "Major Mono Display" ? 400 : 500),
        bg: l.bg || c.bg || "#f8f4ec", color: l.color || c.color || "#1b1613", seed: (c.t[0] * 100 + i) | 0, edges: l.edges || "ctct", padX: l.padX ?? Math.max(24, size * 0.55), tracking: l.tracking };
      return { sp: bake(p), size, l, i };
    });
  }
}
function drawCaptions(g, sc, t) {
  for (const c of sc.captions) {
    const [t0, t1] = c.t;
    if (t < t0 - 0.35 || t > t1 + 0.4) continue;
    let y = c.y;
    c.strips.forEach((s, i) => {
      const at = t0 + i * (c.stagger ?? 0.22);
      const h = s.size * (s.l.size ? 1.62 : CAPTION_DEF.gap);
      const st = arrival({ enter: "slap", at, seed: (t0 * 10 + i) | 0, out: t1 + i * 0.05 }, t);
      const side = hash(((t0 * 10) | 0) + i * 7) - 0.5;
      const x = (c.x ?? W / 2) + (c.align === "left" ? s.sp.w / 2 : 0) + side * 36 + (s.l.dx || 0);
      put(g, s.sp, x, y + h / 2 + st.dy, (s.l.rot ?? side * 2.2) + st.rot, st.sx, st.sy, st.lift, st.a);
      y += h + (s.l.space || 0);
    });
  }
}

// The past torn in two, the present beneath
const TEAR = STORY.tear, TEAR_DUR = 1.25;
const tearLine = (() => {
  const r = rng(404), n = edgeNoise(r), pts = [];
  for (let i = 0; i <= 160; i++) {
    const s = i / 160, y = lerp(-80, H + 80, s);
    pts.push([lerp(W * 0.66, W * 0.3, s) + 70 * Math.sin(s * 5.1 + 1) + 16 * n(y), y]);
  }
  return pts;
})();
function tearHalf(g, src, left, k, tug) {
  const sign = left ? -1 : 1;
  const poly = left ? [[-600, -600], ...tearLine, [-600, H + 600]] : [[W + 600, -600], ...tearLine, [W + 600, H + 600]];
  const ex = expoIn(Math.min(1, k * 1.05));
  const dx = sign * (1300 * ex + 7 * tug), dy = 260 * ex * ex + (left ? 90 : -40) * ex, rot = sign * 11 * ex;
  const pivot = left ? [0, H] : [W, 0];
  g.save();
  g.translate(dx + pivot[0], dy + pivot[1]);
  g.rotate((rot * Math.PI) / 180);
  g.translate(-pivot[0], -pivot[1]);
  // Its shadow on the present
  g.save();
  g.filter = "blur(14px)";
  g.globalAlpha = 0.35 * Math.min(1, k * 6 + tug);
  pathOf(g, poly, 14, 22);
  g.fillStyle = "#1a1007";
  g.fill();
  g.restore();
  // The white core of the paper, along the tear
  pathOf(g, poly.map(([x, y], i) => (i > 0 && i <= tearLine.length ? [x + sign * (5 + 3 * Math.sin(i * 1.9)), y] : [x, y])), 0, 0);
  g.fillStyle = "#f8f3e8";
  g.fill();
  g.save();
  pathOf(g, poly, 0, 0);
  g.clip();
  g.drawImage(src, 0, 0);
  g.restore();
  g.restore();
}

// ── The close in words: the hero's rising words over the cosmos ─────────────
const DUR = [1.05, 1.3, 0.95, 1.4, 1.15, 0.9, 1.35, 1.0, 1.25];
function maskWords(el, text) {
  el.textContent = "";
  return text.split(/\s+/).map((w, i) => {
    const mask = document.createElement("span");
    mask.className = "hw";
    const inner = document.createElement("span");
    inner.textContent = w;
    mask.appendChild(inner);
    el.append(mask, " ");
    return { el: inner, d: 0.08 * i + 0.05 * ((i * 7) % 3), dur: DUR[i % DUR.length] };
  });
}
function goo(el, f, maxBlur = 60) {
  if (f <= 0.001) { css(el, "opacity", "0"); css(el, "filter", "none"); return; }
  if (f >= 0.999) { css(el, "opacity", "1"); css(el, "filter", "none"); return; }
  css(el, "opacity", Math.pow(f, 0.4).toFixed(3));
  css(el, "filter", `blur(${Math.min(6 / f - 6, maxBlur).toFixed(2)}px)`);
}
const HERO_LINES = [
  { t: E.ask, cls: "ink sm", y: 300, text: "Who starts a" },
  { t: E.ask + 0.3, cls: "ink sm", y: 372, text: "single-person institution?" },
  { t: E.answer, cls: "clay it xl", y: 1452, text: "A polymath." },
].map((c) => {
  const el = document.createElement("div");
  el.className = "cap c " + c.cls;
  el.style.left = W / 2 + "px";
  el.style.top = c.y + "px";
  $("captions").appendChild(el);
  return { ...c, el, words: maskWords(el, c.text) };
});
function drawHeroWords(t) {
  for (const c of HERO_LINES) {
    const on = t >= c.t && t < E.wordmark + 0.8;
    show(c.el, on);
    if (!on) continue;
    for (const w of c.words) {
      const p = riseEase(seg(t, c.t + w.d, c.t + w.d + w.dur));
      css(w.el, "transform", p >= 1 ? "none" : `translateY(${((1 - p) * 115).toFixed(2)}%)`);
    }
    goo(c.el, 1 - seg(t, E.wordmark - 0.2, E.wordmark + 0.55));
  }
}

// ── The wordmark: the navbar's faces, many more, then its own ───────────────
// (brand/film/film.js's close; here each passing face is cut on its own scrap)
const brand = $("brand"), mark = brand.querySelector(".mark"), brandCta = brand.querySelector(".cta");
const MARK_PX = 118, MARK_Y = 0.47;
const NAV_FACES = [
  ["M", "Cinzel", 500], ["U", "Playfair Display", 500], ["L", "Cinzel", 400], ["V", "Italiana", 400, "normal", true],
  ["i", "Inter", 900], ["u", "Cormorant SC", 500, "normal", false, 1.22], ["M", "Cinzel", 500],
];
const FACES = [
  ["Abril Fatface", 400], ["Bodoni Moda", 700], ["DM Serif Display", 400], ["DM Serif Display", 400, "italic"],
  ["Fraunces", 300], ["Fraunces", 900], ["Space Mono", 700], ["Syne", 800], ["Unbounded", 700], ["Bebas Neue", 400],
  ["Monoton", 400], ["Rubik Mono One", 400], ["Josefin Sans", 100], ["UnifrakturMaguntia", 400], ["Orbitron", 900],
  ["Archivo Black", 400], ["Caveat", 700], ["Poiret One", 400], ["Limelight", 400], ["Yeseva One", 400],
  ["Zilla Slab", 700], ["Righteous", 400], ["Lobster", 400], ["Shrikhand", 400], ["Rye", 400], ["Syncopate", 700],
  ["Cormorant Garamond", 300, "italic"], ["IBM Plex Mono", 300], ["Bungee", 400], ["Pirata One", 400], ["Gloock", 400],
  ["Playfair Display", 900], ["Playfair Display", 400, "italic"], ["Cinzel", 400], ["Italiana", 400], ["Inter", 900],
  ["Cormorant SC", 500], ["Major Mono Display", 400],
];
const FINAL = "MULVIUM";
const markLetters = [...FINAL].map((ch, j) => {
  const el = document.createElement("span");
  mark.appendChild(el);
  return { el, j, key: "" };
});
function sizeCells() {
  const c = mk(10, 10).getContext("2d");
  c.font = `400 ${MARK_PX}px Lora`;
  for (const l of markLetters) l.el.style.width = (c.measureText(FINAL[l.j]).width + MARK_PX * 0.3).toFixed(1) + "px";
  mark.style.top = (H * MARK_Y - MARK_PX * 0.5).toFixed(0) + "px";
  brandCta.dataset.top = (H * MARK_Y + MARK_PX * 0.62 + 40).toFixed(0);
}
// A scrap behind a passing face: a torn polygon, in one of the papers
function scrapClip(seed) {
  const r = rng(seed), pts = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const sq = Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
    const k = (0.5 / sq) * (0.9 + r() * 0.12);
    pts.push(`${(50 + Math.cos(a) * k * 100).toFixed(1)}% ${(50 + Math.sin(a) * k * 100).toFixed(1)}%`);
  }
  return `polygon(${pts.join(",")})`;
}
function setFace(l, key, ch, family, weight, style = "normal", outline = false, size = 1, tile = null) {
  if (l.key === key) return;
  l.key = key;
  l.el.textContent = ch;
  l.el.style.fontFamily = `"${family}"`;
  l.el.style.fontWeight = String(weight);
  l.el.style.fontStyle = style;
  l.el.style.fontSize = size === 1 ? "" : size + "em";
  l.el.style.color = tile ? tile[1] : outline ? "transparent" : "";
  l.el.style.webkitTextStroke = outline ? `${(MARK_PX * 0.012).toFixed(1)}px #1b1613` : "";
  l.el.style.background = tile ? tile[0] : "";
  l.el.style.clipPath = tile ? scrapClip(tile[2]) : "";
}
function drawBrand(t) {
  const on = t >= E.wordmark;
  show(brand, on);
  if (!on) return;
  const [c0, c1] = E.cycle, [s0] = E.settle;
  goo(mark, seg(t, E.wordmark, E.wordmark + 0.9), 40);
  for (const l of markLetters) {
    const j = l.j, start = c0 + j * 0.05, land = s0 + j * 0.14;
    let pop = 1, tilt = 0;
    if (t < start) {
      const [ch, fam, wt, st, outline, size] = NAV_FACES[j];
      setFace(l, "nav", ch, fam, wt, st, outline, size);
    } else if (t < land) {
      const dur = c1 - c0, u = clamp01((t - start) / dur);
      const step = Math.floor(3 * (t - start) + (9 * dur / Math.PI) * (1 - Math.cos(Math.PI * u)));
      const [fam, wt, st = "normal"] = FACES[Math.floor(hash(j * 977 + step * 31) * FACES.length)];
      const ch = hash(j * 131 + step * 7) < 0.3 ? FINAL[j].toLowerCase() : FINAL[j];
      // Most faces come on a scrap of their own, as if cut from a page
      const paper = hash(j * 53 + step * 11) < 0.72 ? CUT_PAPERS[Math.floor(hash(j * 17 + step * 5) * CUT_PAPERS.length)] : null;
      setFace(l, `c${step}`, ch, fam, wt, st, false, 1, paper ? [paper[0], paper[1], j * 1000 + step] : null);
      tilt = paper ? (hash(j * 29 + step * 3) - 0.5) * 9 : 0;
    } else {
      setFace(l, "final", FINAL[j], "Lora", 400);
      pop = 1 + 0.1 * (1 - expoOut(seg(t, land, land + 0.45)));
    }
    css(l.el, "transform", pop === 1 && !tilt ? "none" : `rotate(${tilt.toFixed(2)}deg) scale(${pop.toFixed(3)})`);
  }
  css(mark, "transform", `scale(${lerp(0.72, 1, expoOut(seg(t, E.wordmark, E.wordmark + 1.2))).toFixed(4)})`);
  const c = expoOut(seg(t, E.cta, E.cta + 0.9));
  css(brandCta, "top", (Number(brandCta.dataset.top) + (1 - c) * 24).toFixed(0) + "px");
  css(brandCta, "opacity", c.toFixed(3));
}

// ── The lens: grain and vignette ─────────────────────────────────────────────
const grain = $("grain"), gctx = grain.getContext("2d");
grain.width = W / 2; grain.height = H / 2;
const grainFrames = (() => {
  const r = rng(99), out = [];
  for (let k = 0; k < 8; k++) {
    const img = gctx.createImageData(W / 2, H / 2);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (r() + r() + r() - 1.5) * 70;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    out.push(img);
  }
  return out;
})();
let lastGrain = -1;
const veil = $("veil"), black = $("black");

// ── One frame ────────────────────────────────────────────────────────────────
function seek(t) {
  t = Math.max(0, Math.min(DURATION, t));
  const cosmosOn = t >= E.hero;
  canvas.style.visibility = cosmosOn ? "visible" : "hidden";
  let targets = null;
  if (cosmosOn) {
    poseCosmos(t);
    targets = heroTargets();
    renderer.render(scene, camera);
  }
  const collageOn = t < E.reveal[1] + 1.0;
  show(board, collageOn);
  if (collageOn) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (t < TEAR) drawScene(ctx, PAST, t);
    else if (t < TEAR + TEAR_DUR) {
      const a = offA.getContext("2d"), b = offB.getContext("2d");
      drawScene(a, PAST, t);
      drawScene(b, NOW, t);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(offB, 0, 0);
      const k = seg(t, TEAR + 0.16, TEAR + TEAR_DUR), tug = Math.sin(seg(t, TEAR, TEAR + 0.16) * Math.PI);
      tearHalf(ctx, offA, true, k, tug);
      tearHalf(ctx, offA, false, k, tug);
    } else {
      if (t >= E.reveal[0]) ctx.clearRect(0, 0, W, H);
      drawScene(ctx, NOW, t, targets);
    }
  }
  drawHeroWords(t);
  // Paper over the cosmos as the wordmark comes
  css(veil, "opacity", easeInOut(seg(t, E.wordmark - 0.5, E.wordmark + 0.5)).toFixed(3));
  drawBrand(t);
  // In from black, out to it
  css(black, "opacity", Math.max(1 - seg(t, 0, 0.5), seg(t, DURATION - 0.45, DURATION)).toFixed(3));
  const gi = Math.floor(t * FPS) % grainFrames.length;
  if (gi !== lastGrain) { gctx.putImageData(grainFrames[gi], 0, 0); lastGrain = gi; }
}

// ── Ready, and playing ───────────────────────────────────────────────────────
const fontsReady = Promise.all([
  "400 62px Lora", "italic 400 62px Lora", "500 62px Lora", "italic 500 62px Lora", "600 62px Lora",
  "400 40px 'Major Mono Display'", "500 30px 'IBM Plex Sans'", "400 40px 'Special Elite'", "600 60px Caveat", "700 60px Caveat",
  "400 60px 'IM Fell English'", "italic 400 60px 'IM Fell English'",
  ...CUT_FACES.map(([f, w]) => `${w} 100px "${f}"`),
  ...[...NAV_FACES.map(([, f, w, st]) => [f, w, st]), ...FACES].map(([f, w, st = "normal"]) => `${st} ${w} 100px "${f}"`),
].map((f) => document.fonts.load(f, "MULVIUMmulviumAa1"))).then(() => document.fonts.ready);
const imagesReady = Promise.all(Object.entries(STORY.images).map(([k, src]) => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => { IMAGES[k] = im; res(); };
  im.onerror = () => rej(new Error("missing " + src));
  im.src = "assets/" + src;
})));
const ready = Promise.all([fontsReady, imagesReady]).then(() => {
  for (const sc of SCENES) for (const p of sc.pieces) if (p.kind !== "ink" && p.kind !== "glow") p.sp = bake(p);
  bakeCaptions();
  sizeCells();
  for (const t of [E.hero + 2, 1, 0]) seek(t);
});
window.reel = { seek, ready, duration: DURATION, fps: FPS, width: W, height: H };

if (!RENDER) {
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`;
  };
  fit();
  addEventListener("resize", fit);
  const audio = $("score"), play = $("play");
  audio.src = `score-${ID}.m4a`;
  const from = parseFloat(PARAMS.get("t")) || 0;
  const scoreReady = fetch(audio.src).then((r) => (r.ok ? r.blob() : Promise.reject()))
    .then((b) => { audio.src = URL.createObjectURL(b); }, () => {});
  Promise.all([ready, scoreReady]).then(() => {
    seek(from);
    play.hidden = false;
    let clock = null;
    const loop = () => {
      const t = clock !== null ? from + (performance.now() - clock) / 1000 : audio.currentTime;
      seek(t);
      if (t < DURATION) requestAnimationFrame(loop);
    };
    const silent = () => { if (clock === null) clock = performance.now(); };
    play.addEventListener("click", () => {
      play.hidden = true;
      const start = () => { audio.currentTime = from; audio.play().catch(silent); requestAnimationFrame(loop); };
      if (audio.readyState >= 1) start();
      else {
        audio.addEventListener("loadedmetadata", start, { once: true });
        audio.addEventListener("error", () => { silent(); requestAnimationFrame(loop); }, { once: true });
        audio.load();
      }
    });
  });
}
