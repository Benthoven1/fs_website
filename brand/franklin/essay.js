// essay.js — "Benjamin Franklin, institution builder": a narrated video essay
// for phones (1080 × 1920), in flat, colourful motion graphics with archival
// plates, cut to its narration (narrate.py writes timing.json: every line's,
// and every word's, time). It closes on the landing page's cosmos and the
// many-faced wordmark, as the launch film does.
//
// As with the launch film, every frame is a function of time alone:
// essay.seek(t) draws the frame at t seconds, so render.js can capture it,
// and the page plays itself, with its soundtrack, when opened in a browser.
import * as THREE from "three";

const PARAMS = new URLSearchParams(location.search);
const RENDER = PARAMS.has("render");
const W = 1080, H = 1920, FPS = 30;
const TIMING = await (await fetch("timing.json")).json();
const L = Object.fromEntries(TIMING.lines.map((l) => [l.id, l]));
const NARR = TIMING.duration;
// A line's start, or the time a word of it is spoken (by index, or by its first letters)
function at(id, word) {
  const l = L[id];
  if (word === undefined) return l.t0;
  if (typeof word === "number") return l.words[word][1];
  const i = l.words.findIndex(([w]) => w.toLowerCase().replace(/[^a-z0-9£]/g, "").startsWith(word));
  if (i < 0) throw new Error(`no "${word}" in ${id}`);
  return l.words[i][1];
}
const end = (id) => L[id].t1;
const E = {};
E.cosmos = at("end1") - 0.3;
E.wordmark = NARR + 0.5;
E.cycle = [E.wordmark + 0.6, E.wordmark + 4.0];
E.settle = [E.cycle[1], E.cycle[1] + 1.0];
E.cta = E.settle[0] + 1.5;
const DURATION = E.cta + 2.8;

// ── Time ─────────────────────────────────────────────────────────────────────
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const expoIn = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
const smooth = (a, b, x) => { const k = seg(x, a, b); return k * k * (3 - 2 * k); };
// A spring: overshoots a little, then settles (the pop of every arrival)
const spring = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-6.5 * x) * Math.cos(10.5 * x));
const pop = (t, t0, d = 0.55) => spring(seg(t, t0, t0 + d));
// In over d, out over d: 0 → 1 → 0
const life = (t, a, b, d = 0.45) => Math.min(ease(seg(t, a, a + d)), 1 - ease(seg(t, b - d, b)));
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (n) => rng(n * 9973 + 17)();
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

// Sounds the picture makes, for the score: a pop as a thing arrives, a whoosh
// as a scene turns, a coin, a stamp, a tick
const SFX = [];
const sfx = (t, kind, gain = 1) => { SFX.push({ t: +t.toFixed(3), kind, gain }); return t; };

// ── Colour ───────────────────────────────────────────────────────────────────
const C = {
  ink: "#1b1633", cream: "#fff4e2", paper: "#eceae5", white: "#ffffff",
  orange: "#ff9f1c", yellow: "#ffd166", coral: "#ef476f", teal: "#06d6a0", blue: "#118ab2", sky: "#4cc9f0",
  violet: "#7b6cff", plum: "#5a2a6e", brick: "#c8553d", wood: "#8c5a3c", leather: "#7d3b2c", gold: "#f4b942",
  clay: "#b87758", green: "#C4DDB8", castles: "#B8CAE0", pink: "#E0B8C8", zones: "#B8DDD8", star: "#F0D5BB",
};
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, k) {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(",")})`;
}
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

// ── The stage ────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const css = (el, prop, v) => { if (el.style[prop] !== v) el.style[prop] = v; };
const show = (el, on) => css(el, "display", on ? "" : "none");
const stage = $("stage");
const art = $("art"), g = art.getContext("2d", { willReadFrequently: true });
art.width = W; art.height = H;
const IMG = {};

// ── Drawing: shapes, icons, people, plates, words ────────────────────────────
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
// Icons in a unit square (centre 0, 0; ±0.5), filled even-odd
const ICON = {
  book: (p) => { p.moveTo(-0.46, -0.3); p.quadraticCurveTo(-0.23, -0.4, 0, -0.3); p.quadraticCurveTo(0.23, -0.4, 0.46, -0.3); p.lineTo(0.46, 0.36); p.quadraticCurveTo(0.23, 0.27, 0, 0.37); p.quadraticCurveTo(-0.23, 0.27, -0.46, 0.36); p.closePath(); p.rect(-0.02, -0.29, 0.04, 0.64); },
  flame: (p) => { p.moveTo(0, -0.48); p.bezierCurveTo(0.3, -0.18, 0.4, 0.12, 0.26, 0.32); p.bezierCurveTo(0.14, 0.5, -0.14, 0.5, -0.26, 0.32); p.bezierCurveTo(-0.4, 0.12, -0.2, -0.1, -0.06, -0.06); p.bezierCurveTo(-0.08, -0.25, 0, -0.38, 0, -0.48); p.closePath(); },
  bucket: (p) => { p.moveTo(-0.32, -0.22); p.lineTo(0.32, -0.22); p.lineTo(0.24, 0.42); p.lineTo(-0.24, 0.42); p.closePath(); p.moveTo(-0.3, -0.26); p.ellipse(0, -0.26, 0.3, 0.22, 0, Math.PI, 0); p.lineTo(0.24, -0.26); p.ellipse(0, -0.26, 0.24, 0.16, 0, 0, Math.PI, true); p.closePath(); },
  cross: (p) => { p.roundRect(-0.13, -0.42, 0.26, 0.84, 0.05); p.roundRect(-0.42, -0.13, 0.84, 0.26, 0.05); },
  columns: (p) => {
    p.moveTo(-0.48, -0.2); p.lineTo(0, -0.46); p.lineTo(0.48, -0.2); p.closePath();
    p.rect(-0.44, -0.17, 0.88, 0.06);
    for (let i = 0; i < 4; i++) p.rect(-0.38 + i * 0.24, -0.08, 0.09, 0.42);
    p.rect(-0.46, 0.36, 0.92, 0.06); p.rect(-0.5, 0.44, 1, 0.06);
  },
  quill: (p) => { p.moveTo(0.42, -0.46); p.bezierCurveTo(0.1, -0.36, -0.2, -0.05, -0.3, 0.32); p.lineTo(-0.38, 0.46); p.lineTo(-0.24, 0.36); p.bezierCurveTo(0.08, 0.18, 0.34, -0.12, 0.42, -0.46); p.closePath(); },
  bolt: (p) => { p.moveTo(0.1, -0.5); p.lineTo(-0.24, 0.06); p.lineTo(0.0, 0.06); p.lineTo(-0.12, 0.5); p.lineTo(0.26, -0.1); p.lineTo(0.02, -0.1); p.lineTo(0.18, -0.5); p.closePath(); },
  gear: (p) => {
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 0.36 : 0.48; i ? p.lineTo(Math.cos(a) * r, Math.sin(a) * r) : p.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    p.closePath(); p.moveTo(0.15, 0); p.arc(0, 0, 0.15, 0, Math.PI * 2);
  },
  scroll: (p) => { p.roundRect(-0.36, -0.4, 0.72, 0.8, 0.08); p.moveTo(-0.22, -0.2); p.rect(-0.22, -0.22, 0.44, 0.06); p.rect(-0.22, -0.04, 0.44, 0.06); p.rect(-0.22, 0.14, 0.3, 0.06); },
  press: (p) => { p.rect(-0.42, -0.46, 0.1, 0.92); p.rect(0.32, -0.46, 0.1, 0.92); p.rect(-0.42, -0.46, 0.84, 0.1); p.rect(-0.08, -0.36, 0.16, 0.26); p.rect(-0.3, -0.1, 0.6, 0.1); p.rect(-0.5, 0.18, 1.0, 0.1); },
  doc: (p) => { p.moveTo(-0.34, -0.46); p.lineTo(0.14, -0.46); p.lineTo(0.34, -0.26); p.lineTo(0.34, 0.46); p.lineTo(-0.34, 0.46); p.closePath(); for (let i = 0; i < 4; i++) p.rect(-0.22, -0.18 + i * 0.15, 0.44 - (i === 3 ? 0.16 : 0), 0.05); },
  check: (p) => { p.moveTo(-0.42, 0.02); p.lineTo(-0.28, -0.12); p.lineTo(-0.1, 0.06); p.lineTo(0.3, -0.34); p.lineTo(0.44, -0.2); p.lineTo(-0.1, 0.34); p.closePath(); },
  lock: (p) => { p.roundRect(-0.34, -0.06, 0.68, 0.52, 0.08); p.moveTo(-0.22, -0.06); p.lineTo(-0.22, -0.2); p.arc(0, -0.2, 0.22, Math.PI, 0); p.lineTo(0.22, -0.06); p.lineTo(0.12, -0.06); p.lineTo(0.12, -0.2); p.arc(0, -0.2, 0.12, 0, Math.PI, true); p.lineTo(-0.12, -0.06); p.closePath(); },
  bulb: (p) => { p.arc(0, -0.12, 0.32, Math.PI * 0.8, Math.PI * 0.2); p.lineTo(0.14, 0.28); p.lineTo(-0.14, 0.28); p.closePath(); p.rect(-0.13, 0.32, 0.26, 0.07); p.rect(-0.1, 0.42, 0.2, 0.06); },
  kite: (p) => { p.moveTo(0, -0.5); p.lineTo(0.3, -0.1); p.lineTo(0, 0.42); p.lineTo(-0.3, -0.1); p.closePath(); },
  seal: (p) => { for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 0.42 : 0.48; i ? p.lineTo(Math.cos(a) * r, Math.sin(a) * r) : p.moveTo(Math.cos(a) * r, Math.sin(a) * r); } p.closePath(); p.moveTo(0.3, 0); p.arc(0, 0, 0.3, 0, Math.PI * 2); },
  house: (p) => { p.moveTo(-0.46, 0.46); p.lineTo(-0.46, -0.06); p.lineTo(0, -0.46); p.lineTo(0.46, -0.06); p.lineTo(0.46, 0.46); p.closePath(); p.rect(-0.1, 0.12, 0.2, 0.34); },
  heart: (p) => { p.moveTo(0, 0.42); p.bezierCurveTo(-0.6, 0.0, -0.4, -0.55, 0, -0.2); p.bezierCurveTo(0.4, -0.55, 0.6, 0.0, 0, 0.42); p.closePath(); },
  sprout: (p) => { p.rect(-0.03, -0.1, 0.06, 0.56); p.moveTo(0, -0.08); p.bezierCurveTo(-0.1, -0.4, -0.42, -0.42, -0.44, -0.28); p.bezierCurveTo(-0.36, -0.06, -0.12, -0.02, 0, -0.08); p.moveTo(0.02, 0.06); p.bezierCurveTo(0.12, -0.24, 0.4, -0.26, 0.44, -0.14); p.bezierCurveTo(0.36, 0.06, 0.14, 0.1, 0.02, 0.06); },
};
const iconPaths = {};
function iconPath(name) { if (!iconPaths[name]) { const p = new Path2D(); ICON[name](p); iconPaths[name] = p; } return iconPaths[name]; }
function icon(name, x, y, s, fill, { rot = 0, alpha = 1, dashed = false, stroke = null, lw = 3 } = {}) {
  if (alpha <= 0.002 || s <= 0.01) return;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y); g.rotate(rot); g.scale(s, s);
  if (dashed) {
    g.setLineDash([8 / s, 7 / s]);
    g.lineWidth = lw / s; g.strokeStyle = fill; g.stroke(iconPath(name));
  } else {
    g.fillStyle = fill; g.fill(iconPath(name), "evenodd");
    if (stroke) { g.lineWidth = lw / s; g.strokeStyle = stroke; g.stroke(iconPath(name)); }
  }
  g.restore();
}
// A disc with an icon in it: an institution, a role, a program
function badge(name, x, y, r, fill, iconFill, { alpha = 1, dashed = false, scale = 1, glow = 0, rot = 0 } = {}) {
  if (alpha <= 0.002 || scale <= 0.01) return;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y); g.scale(scale, scale); g.rotate(rot);
  if (glow > 0) {
    const gr = g.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.1);
    gr.addColorStop(0, rgba(fill === "none" ? C.yellow : fill, 0.45 * glow)); gr.addColorStop(1, rgba(fill === "none" ? C.yellow : fill, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 2.1, 0, Math.PI * 2); g.fill();
  }
  if (dashed) {
    g.setLineDash([12, 10]); g.lineWidth = 4; g.strokeStyle = iconFill;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    icon(name, 0, 0, r * 1.1, iconFill, { dashed: true, lw: 4 });
  } else {
    g.shadowColor = "rgba(10,6,30,0.28)"; g.shadowBlur = 24; g.shadowOffsetY = 10;
    g.fillStyle = fill; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.shadowColor = "transparent";
    // A soft highlight, as on a sphere
    const hl = g.createRadialGradient(-r * 0.35, -r * 0.4, 0, -r * 0.35, -r * 0.4, r * 1.2);
    hl.addColorStop(0, "rgba(255,255,255,0.35)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hl; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    icon(name, 0, 0, r * 1.05, iconFill);
  }
  g.restore();
}
// People: a rounded body, a round head, no face (and Franklin: brown coat,
// grey hair at the sides, round spectacles)
function person(x, y, s, body, { head = "#f2c6a0", walk = 0, alpha = 1, franklin = false, arm = 0, hat = null } = {}) {
  if (alpha <= 0.002) return;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y); g.scale(s / 100, s / 100);
  const bob = Math.abs(Math.sin(walk * Math.PI)) * 4;
  g.translate(0, -bob);
  // legs
  g.fillStyle = mix(body, C.ink, 0.45);
  const sw = Math.sin(walk * Math.PI * 2) * 8;
  rr(-18 + sw * 0.3, 20, 14, 40, 7); g.fill();
  rr(4 - sw * 0.3, 20, 14, 40, 7); g.fill();
  // body
  g.fillStyle = body; rr(-30, -46, 60, 76, 26); g.fill();
  if (franklin) { g.fillStyle = mix(body, "#000", 0.2); rr(-4, -44, 8, 70, 4); g.fill(); g.fillStyle = C.cream; g.beginPath(); g.moveTo(-10, -46); g.lineTo(0, -28); g.lineTo(10, -46); g.closePath(); g.fill(); }
  // arm
  if (arm) { g.save(); g.translate(24, -30); g.rotate(-arm); g.fillStyle = mix(body, C.ink, 0.15); rr(-7, -4, 14, 44, 7); g.fill(); g.restore(); }
  // head
  if (franklin) { g.fillStyle = "#e9e4dc"; g.beginPath(); g.ellipse(-26, -78, 14, 22, 0.2, 0, Math.PI * 2); g.ellipse(26, -78, 14, 22, -0.2, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = head; g.beginPath(); g.arc(0, -82, 26, 0, Math.PI * 2); g.fill();
  if (franklin) {
    g.strokeStyle = "#3b2a1e"; g.lineWidth = 3;
    g.beginPath(); g.arc(-10, -80, 8, 0, Math.PI * 2); g.moveTo(18, -80); g.arc(10, -80, 8, 0, Math.PI * 2); g.moveTo(-2, -80); g.lineTo(2, -80); g.stroke();
  }
  if (hat) { g.fillStyle = hat; rr(-30, -112, 60, 12, 6); g.fill(); rr(-18, -132, 36, 24, 6); g.fill(); }
  g.restore();
}
// An archival plate: a picture in a white rounded frame, with a soft shadow,
// pushing in slowly (the Ken Burns move)
function plate(key, x, y, w, h, { rot = 0, alpha = 1, zoom = 1, fx = 0.5, fy = 0.5, scale = 1, border = 12 } = {}) {
  if (alpha <= 0.002 || scale <= 0.01) return;
  const im = IMG[key];
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y); g.rotate(rot); g.scale(scale, scale);
  g.shadowColor = "rgba(10,6,30,0.4)"; g.shadowBlur = 40; g.shadowOffsetY = 18;
  g.fillStyle = "#fbf8f2"; rr(-w / 2, -h / 2, w, h, 22); g.fill();
  g.shadowColor = "transparent";
  rr(-w / 2 + border, -h / 2 + border, w - 2 * border, h - 2 * border, 14); g.clip();
  const iw = w - 2 * border, ih = h - 2 * border;
  const s = Math.max(iw / im.width, ih / im.height) * zoom, dw = im.width * s, dh = im.height * s;
  g.drawImage(im, -iw / 2 + (iw - dw) * fx, -ih / 2 + (ih - dh) * fy, dw, dh);
  g.restore();
}
function text(str, x, y, { size = 60, weight = 800, font = "Inter", color = C.cream, align = "center", alpha = 1, italic = false, track = 0, scale = 1, rot = 0, baseline = "middle", shadow = false } = {}) {
  if (alpha <= 0.002 || scale <= 0.01) return;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y); g.rotate(rot); g.scale(scale, scale);
  g.font = `${italic ? "italic " : ""}${weight} ${size}px "${font}"`;
  g.textAlign = align; g.textBaseline = baseline; g.fillStyle = color;
  if (track) g.letterSpacing = track + "px";
  if (shadow) { g.shadowColor = "rgba(10,6,30,0.35)"; g.shadowBlur = 18; g.shadowOffsetY = 6; }
  g.fillText(str, 0, 0);
  g.restore();
}
// A pill with an icon and a word: a role, a fact
function chip(label, iconName, x, y, fill, { alpha = 1, scale = 1, ink = C.ink, size = 40 } = {}) {
  if (alpha <= 0.002 || scale <= 0.01) return;
  g.save();
  g.font = `800 ${size}px "Inter"`; g.letterSpacing = "2px";
  const w = g.measureText(label).width + (iconName ? size * 2.4 : size * 1.4), h = size * 2;
  g.restore();
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y); g.scale(scale, scale);
  g.shadowColor = "rgba(10,6,30,0.3)"; g.shadowBlur = 20; g.shadowOffsetY = 8;
  g.fillStyle = fill; rr(-w / 2, -h / 2, w, h, h / 2); g.fill();
  g.shadowColor = "transparent";
  if (iconName) icon(iconName, -w / 2 + size * 1.15, 0, size * 1.15, ink);
  g.restore();
  text(label, x + (iconName ? size * 0.5 : 0) * scale, y + 2 * scale, { size, color: ink, alpha, scale, track: 2 });
}
function coin(x, y, r, { alpha = 1, spin = 0 } = {}) {
  if (alpha <= 0.002) return;
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.scale(Math.max(0.15, Math.abs(Math.cos(spin))), 1);
  g.fillStyle = "#e0a12c"; g.beginPath(); g.arc(0, 2, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.gold; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = r * 0.12; g.beginPath(); g.arc(0, 0, r * 0.68, 0, Math.PI * 2); g.stroke();
  g.restore();
}
// A flame that flickers, in three tongues
function fire(x, y, s, t, alpha = 1) {
  if (alpha <= 0.002 || s <= 0.01) return;
  g.save(); g.globalAlpha *= alpha;
  const gl = g.createRadialGradient(x, y - s * 0.4, 0, x, y - s * 0.4, s * 1.6);
  gl.addColorStop(0, "rgba(255,160,60,0.55)"); gl.addColorStop(1, "rgba(255,120,40,0)");
  g.fillStyle = gl; g.beginPath(); g.arc(x, y - s * 0.4, s * 1.6, 0, Math.PI * 2); g.fill();
  [["#ef476f", 1.0, 0], ["#ff9f1c", 0.78, 1.7], ["#ffd166", 0.5, 3.1]].forEach(([c, k, ph]) => {
    const fl = 1 + 0.07 * Math.sin(t * 11 + ph) + 0.05 * Math.sin(t * 17.3 + ph * 2);
    const lean = 0.08 * Math.sin(t * 5.3 + ph);
    g.save(); g.translate(x, y); g.rotate(lean); g.scale(s * k, s * k * fl);
    g.fillStyle = c; g.translate(0, -0.42); g.fill(iconPath("flame")); g.restore();
  });
  g.restore();
}
// A colonial house: brick, a gable, a chimney, windows (lit at night)
function townhouse(x, y, w, h, color, lit = 0, seed = 1) {
  const r = rng(seed);
  g.fillStyle = color; g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle = mix(color, C.ink, 0.35);
  g.beginPath(); g.moveTo(x - w / 2 - 8, y - h); g.lineTo(x, y - h - w * 0.32); g.lineTo(x + w / 2 + 8, y - h); g.closePath(); g.fill();
  g.fillRect(x + w * 0.2, y - h - w * 0.36, w * 0.12, w * 0.3);
  const rows = Math.max(1, Math.floor(h / 70)), cols = 2;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const on = r() < 0.75;
    g.fillStyle = on ? mix("#3a2f55", C.yellow, lit) : "#2f2747";
    g.fillRect(x - w / 2 + w * (0.18 + j * 0.42), y - h + 22 + i * 66, w * 0.22, 38);
  }
}

// Soft clouds drifting across a daytime sky
function clouds(t, alpha, y0 = 110) {
  if (alpha <= 0.01) return;
  g.save(); g.globalAlpha *= alpha; g.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 5; i++) {
    const r = rng(i + 70), x = ((r() * 1400 + t * (14 + r() * 16)) % 1500) - 200, y = y0 + r() * 170, s = 0.6 + r() * 0.6;
    g.beginPath(); g.ellipse(x, y, 110 * s, 46 * s, 0, 0, Math.PI * 2); g.ellipse(x + 70 * s, y - 26 * s, 70 * s, 54 * s, 0, 0, Math.PI * 2); g.ellipse(x - 60 * s, y - 14 * s, 56 * s, 40 * s, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// ── The backgrounds: one gradient that travels from scene to scene ───────────
// [time, top colour, bottom colour, stars]
const SKY = [
  [0, "#0f0c2e", "#2a1f5e", 1], [at("who1") - 0.6, "#0f0c2e", "#2a1f5e", 1],
  [at("who1") + 0.4, "#2b1240", "#7a2e5f", 0.3], [at("lib1") - 0.5, "#2b1240", "#7a2e5f", 0.3],
  [at("lib1") + 0.5, "#0b3a5a", "#1f7a8c", 0.15], [at("fire1") - 0.6, "#0b3a5a", "#1f7a8c", 0.15],
  [at("fire1") + 0.3, "#120a26", "#4b1638", 0.6], [at("hosp1") - 0.8, "#120a26", "#4b1638", 0.6],
  [at("hosp1") + 0.6, "#5bb8f0", "#ffe0b0", 0], [at("acad1") - 0.4, "#5bb8f0", "#ffe0b0", 0],
  [at("acad1") + 0.4, "#3d5a80", "#98c1d9", 0], [at("turn1") - 0.1, "#3d5a80", "#98c1d9", 0],
  [at("turn1") + 0.25, "#16141f", "#2e2b45", 0.2], [at("now1") - 0.5, "#16141f", "#2e2b45", 0.2],
  [at("now1") + 0.5, "#f7f3ea", "#eceae5", 0], [DURATION, "#f7f3ea", "#eceae5", 0],
];
const STARS = (() => { const r = rng(3); return Array.from({ length: 160 }, () => [r() * W, r() * H * 0.8, 0.6 + r() * 2.2, r() * 6.28]); })();
function sky(t) {
  let i = 0;
  while (i < SKY.length - 2 && t > SKY[i + 1][0]) i++;
  const [t0, a0, b0, s0] = SKY[i], [t1, a1, b1, s1] = SKY[i + 1];
  const k = ease(seg(t, t0, t1));
  const top = mix(a0, a1, k), bot = mix(b0, b1, k), stars = lerp(s0, s1, k);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, top); gr.addColorStop(1, bot);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // Slow, soft blobs of light
  for (let j = 0; j < 3; j++) {
    const bx = W * (0.2 + 0.6 * hash(j + 1)) + Math.sin(t * 0.13 + j * 2) * 120, by = H * (0.25 + 0.5 * hash(j + 9)) + Math.cos(t * 0.11 + j) * 140;
    const bl = g.createRadialGradient(bx, by, 0, bx, by, 520);
    bl.addColorStop(0, "rgba(255,255,255,0.07)"); bl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = bl; g.fillRect(0, 0, W, H);
  }
  if (stars > 0.01) {
    g.fillStyle = "#fff";
    for (const [x, y, r, ph] of STARS) {
      g.globalAlpha = stars * (0.45 + 0.4 * Math.sin(t * 1.4 + ph));
      g.beginPath(); g.arc(x, (y + t * 4) % (H * 0.8), r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }
}

// ── Scenes ───────────────────────────────────────────────────────────────────
// Four institutions, the essay's through-line: their icon, colour and slot
const INST = [
  { name: "book", fill: C.teal, label: "LIBRARY", word: "lending" },
  { name: "flame", fill: C.orange, label: "FIRE COMPANY", word: "fire" },
  { name: "cross", fill: C.coral, label: "HOSPITAL", word: "hospital" },
  { name: "columns", fill: C.violet, label: "COLLEGE", word: "college" },
];
const SLOTS = [[300, 720], [780, 720], [300, 1080], [780, 1080]];

// I — 1731: the city without them
const HOOK = {
  year: sfx(at("hook1", "1731"), "pop"),
  empties: [sfx(at("hook1", "lending"), "pop"), sfx(at("hook2", "fire"), "pop"), sfx(at("hook2", "hospital"), "pop"), sfx(at("hook2", "college"), "pop")],
  roll: [at("hook3", "twenty"), at("hook3", "later") + 0.25],
  fills: [0, 1, 2, 3].map((i) => sfx(at("hook3", "all") + i * 0.22, "chime", 0.8)),
  man: sfx(at("hook3", "one"), "whoosh"),
};
function drawHook(t) {
  const out = 1 - ease(seg(t, at("who1") - 0.7, at("who1")));
  if (out <= 0) return;
  g.save(); g.globalAlpha = out;
  // The skyline, rising
  const rise = expoOut(seg(t, 0.2, 2.2));
  g.save(); g.translate(0, (1 - rise) * 500);
  const lit = 0.4 + 0.6 * ease(seg(t, 2, 5));
  [[120, 1500, 150, 300, "#3b2f6a"], [260, 1500, 130, 380, "#463873"], [400, 1500, 160, 260, "#3b2f6a"], [700, 1500, 150, 340, "#463873"],
   [850, 1500, 130, 280, "#3b2f6a"], [990, 1500, 150, 360, "#463873"]].forEach(([x, y, w, h, c], i) => townhouse(x, y, w, h, c, lit, i + 3));
  // Christ Church's steeple
  g.fillStyle = "#2f2560"; g.fillRect(500, 1060, 80, 440); g.beginPath(); g.moveTo(490, 1062); g.lineTo(540, 860); g.lineTo(590, 1062); g.closePath(); g.fill();
  g.fillStyle = "#231c4a"; g.fillRect(0, 1500, W, 420);
  g.restore();
  // The year: big, then up to the top; it rolls from 1731 to 1751
  const y0 = pop(t, HOOK.year), up = ease(seg(t, HOOK.year + 1.6, HOOK.year + 2.4));
  const roll = seg(t, ...HOOK.roll), year = Math.round(lerp(1731, 1751, ease(roll)));
  text(String(year), W / 2, lerp(500, 330, up), { size: lerp(250, 130, up), color: roll > 0 ? mix(C.cream, C.yellow, roll) : C.cream, scale: y0, alpha: y0 });
  // Four empty places, then four institutions
  INST.forEach((it, i) => {
    const [x, y] = SLOTS[i];
    const e = pop(t, HOOK.empties[i]), f = pop(t, HOOK.fills[i], 0.6);
    const toMan = ease(seg(t, at("who1") - 1.4, at("who1") - 0.4));
    const cx = lerp(x, W / 2, toMan * 0.35), cy = lerp(y, 900, toMan * 0.35);
    if (f < 0.02) badge(it.name, cx, cy, 120, "none", "rgba(255,244,226,0.7)", { dashed: true, scale: e, alpha: e });
    else badge(it.name, cx, cy, 120, it.fill, C.cream, { scale: 0.85 + 0.15 * f, alpha: 1, glow: f * (1 - seg(t, HOOK.fills[i] + 1, HOOK.fills[i] + 2.5)) });
    text(it.label, cx, cy + 165, { size: 30, weight: 700, color: C.cream, alpha: e * 0.85, track: 4 });
  });
  // One man: threads to each, from the middle
  const m = pop(t, HOOK.man, 0.7);
  if (m > 0) {
    INST.forEach((it, i) => {
      const [x, y] = SLOTS[i], k = ease(seg(t, HOOK.man + 0.2 + i * 0.12, HOOK.man + 0.9 + i * 0.12));
      g.strokeStyle = rgba(C.yellow, 0.75); g.lineWidth = 5; g.setLineDash([]);
      g.beginPath(); g.moveTo(W / 2, 900); g.lineTo(lerp(W / 2, x, k), lerp(900, y, k)); g.stroke();
    });
    const gl = g.createRadialGradient(W / 2, 880, 0, W / 2, 880, 200);
    gl.addColorStop(0, rgba(C.yellow, 0.5 * m)); gl.addColorStop(1, rgba(C.yellow, 0));
    g.fillStyle = gl; g.beginPath(); g.arc(W / 2, 880, 200, 0, Math.PI * 2); g.fill();
    // Into him, as the plate of his portrait comes
    const zoom = expoIn(seg(t, at("who1") - 0.8, at("who1")));
    person(W / 2, 960, 150 * m * (1 + zoom * 4), "#7a4a2c", { franklin: true, walk: 0 });
  }
  g.restore();
}

// II — who he was
const WHO = {
  plate: sfx(at("who1") - 0.15, "whoosh"),
  printer: sfx(at("who1", "printer"), "pop"),
  roles: [["WRITER", "quill", C.teal, "writer"], ["SCIENTIST", "bolt", C.yellow, "scientist"], ["INVENTOR", "gear", C.sky, "inventor"], ["DIPLOMAT", "seal", C.coral, "diplomat"]]
    .map(([l, ic, c, w]) => ({ l, ic, c, at: sfx(at("who2", w), "pop") })),
  poly: sfx(at("who3", "polymath"), "whoosh"),
  good: sfx(at("who3", "public"), "chime", 0.7),
};
function drawWho(t) {
  const a = seg(t, at("who1") - 0.6, at("who1")), b = 1 - ease(seg(t, at("lib1") - 0.8, at("lib1") - 0.1));
  if (a <= 0 || b <= 0) return;
  g.save(); g.globalAlpha = b;
  // The portrait: in, then up to make room for the word
  const pin = expoOut(seg(t, WHO.plate, WHO.plate + 0.9));
  const shrink = ease(seg(t, WHO.poly - 0.3, WHO.poly + 0.6));
  const px = W / 2, py = lerp(lerp(1500, 760, pin), 600, shrink), ps = lerp(1, 0.62, shrink);
  plate("portrait", px, py, 600 * ps, 700 * ps, { rot: -0.03 + 0.02 * pin, zoom: 1 + 0.06 * seg(t, at("who1"), at("lib1")), fy: 0.25, alpha: pin });
  text("Benjamin Franklin", px, py + 400 * ps + 20, { size: 58, weight: 500, font: "Lora", color: C.cream, alpha: pin * (1 - shrink) });
  text("1706 – 1790", px, py + 400 * ps + 88, { size: 28, weight: 600, color: rgba(C.cream, 0.7), track: 6, alpha: pin * (1 - shrink) });
  // Printer, then the rest of him: chips that orbit him once he is a polymath
  const all = [{ l: "PRINTER", ic: "press", c: C.orange, at: WHO.printer }, ...WHO.roles];
  const home = [[250, 380], [840, 450], [215, 1020], [865, 1090], [540, 1290]];
  all.forEach((r, i) => {
    const s = pop(t, r.at);
    const orbit = ease(seg(t, WHO.poly, WHO.poly + 1.0));
    const ang = -Math.PI / 2 + (i / all.length) * Math.PI * 2 + (t - WHO.poly) * 0.35 * orbit;
    const ox = px + Math.cos(ang) * 360, oy = py + Math.sin(ang) * 330;
    const [hx, hy] = home[i];
    chip(r.l, r.ic, lerp(hx, ox, orbit), lerp(hy, oy, orbit), r.c, { scale: s * lerp(1, 0.78, orbit), alpha: s });
  });
  // The word
  const wd = pop(t, WHO.poly + 0.2, 0.7);
  text("polymath", W / 2, 1070, { size: 120, weight: 500, font: "Lora", color: C.cream, alpha: wd, scale: 0.9 + 0.1 * wd });
  text("from the Greek polymathēs: ‘having learned much’", W / 2, 1160, { size: 30, weight: 500, font: "Lora", italic: true, color: rgba(C.cream, 0.8), alpha: ease(seg(t, WHO.poly + 0.6, WHO.poly + 1.2)) });
  // Pointed at the public good: an arrow, and a town that lights
  const gd = ease(seg(t, WHO.good - 0.2, WHO.good + 0.6));
  if (gd > 0) {
    g.strokeStyle = C.yellow; g.lineWidth = 8; g.lineCap = "round";
    const ay = 1215 + 110 * gd;
    g.beginPath(); g.moveTo(W / 2, 1215); g.lineTo(W / 2, ay); g.stroke();
    g.beginPath(); g.moveTo(W / 2 - 24, ay - 26); g.lineTo(W / 2, ay); g.lineTo(W / 2 + 24, ay - 26); g.stroke();
    text("the public good", W / 2, 1390, { size: 46, weight: 800, color: C.yellow, alpha: gd, scale: 0.9 + 0.1 * pop(t, WHO.good) });
  }
  g.restore();
}

// III — the library
const LIB = {
  shelf: sfx(at("lib1", "simple"), "pop"),
  rare: sfx(at("lib1", "rare"), "pop"), dear: sfx(at("lib1", "expensive"), "pop"),
  year: sfx(at("lib2", "1731"), "pop"),
  people: at("lib2", "persuaded"),
  coins: [at("lib2", "forty"), at("lib2", "each") + 0.6],
  books: sfx(at("lib2", "buy"), "chime"),
  building: sfx(at("lib3"), "whoosh"),
  today: sfx(at("lib3", "today"), "chime", 0.8),
};
for (let i = 0; i < 12; i++) sfx(LIB.coins[0] + i * ((LIB.coins[1] - LIB.coins[0]) / 12), "coin", 0.5);
const SUBSCRIBERS = (() => { const r = rng(31), cols = [C.teal, C.coral, C.yellow, C.sky, C.violet, C.orange]; return Array.from({ length: 50 }, (_, i) => ({ col: cols[i % 6], x: 150 + (i % 10) * 87, y: 560 + Math.floor(i / 10) * 92, d: r() * 0.9, side: r() < 0.5 ? -1 : 1 })); })();
function drawLibrary(t) {
  const a = seg(t, at("lib1") - 0.7, at("lib1")), b = 1 - ease(seg(t, at("fire1") - 0.8, at("fire1") - 0.1));
  if (a <= 0 || b <= 0) return;
  g.save(); g.globalAlpha = Math.min(ease(a), b);
  const phase2 = ease(seg(t, LIB.year - 0.5, LIB.year + 0.3));
  // A near-empty shelf, and a price tag that swings
  const sh = pop(t, LIB.shelf, 0.7) * (1 - phase2);
  if (sh > 0.01) {
    g.save(); g.globalAlpha *= sh; g.translate(W / 2, 980); g.scale(0.9 + 0.1 * sh, 0.9 + 0.1 * sh);
    g.fillStyle = C.wood; rr(-380, -320, 760, 640, 26); g.fill();
    g.fillStyle = "#5e3a26"; for (const y of [-280, -60, 160]) { rr(-340, y, 680, 190, 10); g.fill(); }
    g.fillStyle = C.coral; rr(-300, -255, 52, 165, 8); g.fill(); g.fillStyle = C.yellow; rr(-240, -240, 46, 150, 8); g.fill();
    const sw = Math.sin(t * 2.4) * 0.2;
    g.save(); g.translate(-220, -260); g.rotate(sw); g.strokeStyle = C.cream; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(60, 80); g.stroke();
    g.translate(60, 80); g.rotate(0.3); g.fillStyle = C.cream; rr(-6, -6, 150, 76, 14); g.fill();
    text("£ £ £", 69, 32, { size: 36, color: C.brick }); g.restore();
    g.restore();
    text("RARE", 300, 520, { size: 92, color: C.yellow, scale: pop(t, LIB.rare), alpha: sh, rot: -0.06 });
    text("EXPENSIVE", 690, 610, { size: 92, color: C.coral, scale: pop(t, LIB.dear), alpha: sh, rot: 0.04 });
  }
  // 1731: fifty subscribers, forty shillings each, into one chest
  if (phase2 > 0 && t < LIB.building + 0.6) {
    const out = 1 - ease(seg(t, LIB.building - 0.3, LIB.building + 0.4));
    g.save(); g.globalAlpha *= out;
    text("1731", W / 2, 330, { size: 120, color: C.cream, scale: pop(t, LIB.year), alpha: phase2 });
    SUBSCRIBERS.forEach((p, i) => {
      const ti = LIB.people + p.d * 1.6, k = expoOut(seg(t, ti, ti + 0.8));
      const x = lerp(p.x + p.side * 700, p.x, k), walk = (1 - k) * t * 2.2;
      person(x, p.y, 62, p.col, { walk, alpha: seg(t, ti, ti + 0.2) });
    });
    text("50 subscribers", W / 2, 1060, { size: 54, color: C.cream, alpha: ease(seg(t, LIB.people + 1.6, LIB.people + 2.1)) });
    // Each a coin, arcing down into the chest
    const [c0, c1] = LIB.coins;
    const chestOpen = 1 - ease(seg(t, LIB.books - 0.1, LIB.books + 0.4));
    SUBSCRIBERS.forEach((p, i) => {
      const ti = c0 + (i / 50) * (c1 - c0), k = seg(t, ti, ti + 0.7);
      if (k <= 0 || k >= 1) return;
      const x = lerp(p.x, W / 2, k), y = lerp(p.y - 60, 1300, k) - Math.sin(Math.PI * k) * 220;
      coin(x, y, 18, { spin: k * 9 });
    });
    text("× 40 shillings each", W / 2, 1130, { size: 44, weight: 700, color: C.yellow, alpha: ease(seg(t, c0, c0 + 0.5)) });
    // The chest
    g.save(); g.translate(W / 2, 1320);
    g.fillStyle = C.wood; rr(-150, -60, 300, 140, 18); g.fill();
    g.fillStyle = "#5e3a26"; g.save(); g.translate(-150, -60); g.rotate(-1.1 * (1 - chestOpen)); rr(0, -40, 300, 50, 16); g.fill(); g.restore();
    g.fillStyle = C.gold; rr(-24, -10, 48, 40, 8); g.fill();
    g.restore();
    // Bursting into books
    const bk = expoOut(seg(t, LIB.books, LIB.books + 1.2));
    if (bk > 0) {
      const cols = [C.teal, C.coral, C.yellow, C.violet, C.sky, C.orange, C.cream];
      for (let i = 0; i < 18; i++) {
        const r = rng(i * 7 + 1), ang = -Math.PI * (0.1 + 0.8 * r()), dist = 260 + r() * 260;
        const x = W / 2 + Math.cos(ang) * dist * bk, y = 1270 + Math.sin(ang) * dist * bk;
        g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 1.4 * bk); g.fillStyle = cols[i % cols.length];
        rr(-22, -60, 44, 120, 8); g.fill(); g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(-22, -36, 44, 6); g.restore();
      }
    }
    g.restore();
  }
  // The Library Company, still open
  const bd = expoOut(seg(t, LIB.building, LIB.building + 1.0));
  if (bd > 0) {
    g.save(); g.translate(W / 2, 1120 + (1 - bd) * 400); g.globalAlpha *= bd;
    g.fillStyle = C.brick; g.fillRect(-300, -420, 600, 420);
    g.fillStyle = mix(C.brick, C.ink, 0.3); g.beginPath(); g.moveTo(-330, -420); g.lineTo(0, -560); g.lineTo(330, -420); g.closePath(); g.fill();
    g.fillStyle = C.cream; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { rr(-230 + i * 170, -360 + j * 150, 120, 100, 10); g.fill(); }
    g.fillStyle = "#5e3a26"; rr(-55, -130, 110, 130, 14); g.fill();
    g.fillStyle = C.teal; rr(-260, -490, 520, 64, 32); g.fill();
    text("LIBRARY COMPANY", 0, -456, { size: 34, color: C.cream, track: 4 });
    g.restore();
    // A line from 1731 to today
    const tl = ease(seg(t, LIB.today - 1.2, LIB.today + 0.2));
    g.strokeStyle = rgba(C.cream, 0.8); g.lineWidth = 6; g.lineCap = "round";
    g.beginPath(); g.moveTo(170, 1310); g.lineTo(lerp(170, 910, tl), 1310); g.stroke();
    text("1731", 170, 1360, { size: 34, color: C.cream, alpha: bd });
    text("TODAY", 910, 1360, { size: 34, color: C.yellow, alpha: tl });
    badge("check", lerp(170, 910, tl), 1310, 30, C.teal, C.cream, { scale: pop(t, LIB.today) });
  }
  g.restore();
}

// IV — the fire company
const FIRE = {
  flame: sfx(at("fire1", "fire"), "whoosh"),
  quote: sfx(at("fire2", "ounce") - 0.3, "pop"),
  company: sfx(at("fire2", "union"), "pop"),
  brigade: at("fire2", "volunteers"),
  out: end("fire2") + 0.2,
};
function drawFire(t) {
  const a = seg(t, at("fire1") - 0.6, at("fire1")), b = 1 - ease(seg(t, at("hosp1") - 0.7, at("hosp1")));
  if (a <= 0 || b <= 0) return;
  g.save(); g.globalAlpha = Math.min(ease(a), b);
  // A street at night
  const street = [[100, 1420, 150, 360, "#47306b"], [270, 1420, 160, 300, "#563a7a"], [460, 1420, 170, 420, "#47306b"], [660, 1420, 150, 330, "#563a7a"], [850, 1420, 170, 390, "#47306b"]];
  street.forEach(([x, y, w, h, c], i) => townhouse(x, y, w, h, c, 0.6, i + 20));
  g.fillStyle = "#1e1236"; g.fillRect(0, 1420, W, 500);
  // One house burns, until the brigade puts it out
  const burn = pop(t, FIRE.flame, 0.8) * (1 - ease(seg(t, FIRE.out - 2.2, FIRE.out)));
  fire(660, 1090, 250 * burn, t);
  // Embers
  if (burn > 0.05) for (let i = 0; i < 26; i++) {
    const r = rng(i + 50), life2 = (t * (0.3 + r() * 0.4) + r()) % 1;
    g.fillStyle = rgba(i % 2 ? C.yellow : C.orange, (1 - life2) * burn);
    g.beginPath(); g.arc(660 + (r() - 0.5) * 220 + Math.sin(t * 3 + i) * 30, 1080 - life2 * 600, 3 + r() * 4, 0, Math.PI * 2); g.fill();
  }
  // Smoke as it dies
  const smoke = seg(t, FIRE.out - 2.0, FIRE.out + 0.8) * (1 - seg(t, FIRE.out + 0.4, FIRE.out + 1.5));
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(200,200,215,${0.18 * smoke})`; g.beginPath(); g.arc(660 + Math.sin(t + i) * 50, 1000 - i * 70 - smoke * 120, 60 + i * 12, 0, Math.PI * 2); g.fill(); }
  // The Gazette's warning
  const q = pop(t, FIRE.quote, 0.6) * (1 - ease(seg(t, FIRE.company - 0.4, FIRE.company + 0.2)));
  if (q > 0.01) {
    g.save(); g.translate(W / 2, 560); g.rotate(-0.04); g.scale(q, q);
    g.shadowColor = "rgba(0,0,0,0.4)"; g.shadowBlur = 30; g.shadowOffsetY = 12;
    g.fillStyle = "#f3ead6"; rr(-430, -190, 860, 380, 10); g.fill(); g.shadowColor = "transparent";
    text("THE PENNSYLVANIA GAZETTE · 1735", 0, -140, { size: 26, weight: 700, color: "#6b5a44", track: 5 });
    g.fillStyle = "#c9b994"; g.fillRect(-380, -112, 760, 3);
    text("“An ounce of prevention", 0, -30, { size: 58, weight: 400, font: "IM Fell English", italic: true, color: "#2b2118" });
    text("is worth a pound of cure.”", 0, 50, { size: 58, weight: 400, font: "IM Fell English", italic: true, color: "#2b2118" });
    // The highlighter, Nerdwriter's
    const hl = ease(seg(t, at("fire2", "prevention"), at("fire2", "cure") + 0.3));
    g.fillStyle = rgba(C.yellow, 0.45); g.fillRect(-300, -66, 600 * hl, 70);
    text("— Benjamin Franklin, on fire", 0, 130, { size: 30, weight: 500, font: "Lora", italic: true, color: "#6b5a44" });
    g.restore();
  }
  // The Union Fire Company: a line of volunteers passing buckets
  const co = pop(t, FIRE.company, 0.6);
  chip("UNION FIRE COMPANY · 1736", null, W / 2, 470, C.orange, { scale: co, alpha: co, size: 36 });
  const br = ease(seg(t, FIRE.brigade - 0.3, FIRE.brigade + 0.9));
  if (br > 0) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const x = 70 + i * 96, y = 1385;
      person(lerp(-100, x, br), y, 104, [C.teal, C.sky, C.yellow, C.coral, C.violet, C.teal][i], { arm: 0.6 + 0.5 * Math.sin(t * 6 + i * 1.3), alpha: br });
    }
    // Buckets travelling along the line
    for (let k = 0; k < 4; k++) {
      const u = ((t - FIRE.brigade) * 0.9 + k / 4) % 1;
      const x = lerp(70, 560, u), y = 1250 - Math.abs(Math.sin(u * Math.PI * 5)) * 36;
      icon("bucket", x, y, 72, C.leather, { alpha: br });
    }
    // And water at the fire
    const w = br * (burn > 0.05 ? 1 : 0);
    for (let k = 0; k < 10; k++) {
      const u = ((t * 1.6 + k / 10) % 1);
      g.fillStyle = rgba(C.sky, 0.8 * w * (1 - u));
      g.beginPath(); g.arc(lerp(580, 650, u), 1250 - Math.sin(u * Math.PI) * 300 - u * 80, 11, 0, Math.PI * 2); g.fill();
    }
  }
  const lb = pop(t, at("fire2", "leather"), 0.5) * (1 - seg(t, FIRE.out, FIRE.out + 0.5));
  chip("LEATHER BUCKETS", "bucket", 300, 1120, C.cream, { scale: lb, alpha: lb, size: 34 });
  g.restore();
}

// V — the hospital, on a match
const HOSP = {
  building: at("hosp1"),
  bond: sfx(at("hosp1", "thomas"), "pop"),
  poor: sfx(at("hosp1", "sick"), "pop"),
  idea: sfx(at("hosp1", "clever"), "chime"),
  assembly: sfx(at("hosp2", "assembly"), "pop"),
  lock: sfx(at("hosp2", "only"), "pop"),
  donors: [at("hosp2", "private"), at("hosp2", "own") + 0.2],
  unlock: sfx(end("hosp2") - 0.1, "chime"),
  stamp: sfx(at("hosp3", "matching"), "stamp"),
};
for (let i = 0; i < 10; i++) sfx(HOSP.donors[0] + i * ((HOSP.donors[1] - HOSP.donors[0]) / 10), "coin", 0.5);
// A pile of coins, three columns high, filling in from the bottom
function stack(x, y, n, filled) {
  for (let c = 0; c < 3; c++) for (let i = 0; i < n; i++) {
    const idx = i * 3 + c, k = clamp01(filled * n * 3 - idx);
    if (k <= 0) continue;
    coin(x + (c - 1) * 92 + (i % 2) * 6, y - i * 30 - (1 - k) * 220 + (c === 1 ? -10 : 0), 50, { alpha: k });
  }
}
function drawHospital(t) {
  const a = seg(t, at("hosp1") - 0.6, at("hosp1")), b = 1 - ease(seg(t, at("acad1") - 0.5, at("acad1") + 0.2));
  if (a <= 0 || b <= 0) return;
  g.save(); g.globalAlpha = Math.min(ease(a), b);
  // The hospital: walls rise, then its roof and cupola come with the match
  const done = expoOut(seg(t, HOSP.stamp - 0.4, HOSP.stamp + 0.6));
  const walls = expoOut(seg(t, HOSP.building, HOSP.building + 1.4));
  const bx = W / 2, by = 1430;
  clouds(t, 1);
  g.save(); g.translate(bx, by);
  g.fillStyle = "#e9d6b9"; g.fillRect(-460, -260 * walls, 240, 260 * walls); g.fillRect(220, -260 * walls, 240, 260 * walls);
  g.fillStyle = C.brick; g.fillRect(-220, -380 * walls, 440, 380 * walls);
  g.fillStyle = C.cream; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) if (walls > 0.6) { rr(-170 + i * 120, -330 + j * 140, 80, 90, 8); g.fill(); }
  if (done > 0) {
    g.fillStyle = mix(C.brick, C.ink, 0.35);
    g.beginPath(); g.moveTo(-250, -380); g.lineTo(0, -380 - 150 * done); g.lineTo(250, -380); g.closePath(); g.fill();
    g.fillStyle = C.cream; g.fillRect(-30, -380 - 150 * done - 70 * done, 60, 80 * done);
    g.beginPath(); g.arc(0, -380 - 150 * done - 70 * done, 34 * done, Math.PI, 0); g.fill();
  }
  g.fillStyle = "#6fa36a"; g.fillRect(-W / 2, 0, W, 500);
  g.restore();
  badge("cross", bx, by - 200, 60, C.coral, C.cream, { scale: walls * (1 - done * 0.0) });
  // Dr Bond, and the sick poor
  person(150, 1500, 110, C.white, { head: "#e8b48f", alpha: pop(t, HOSP.bond) * (1 - seg(t, HOSP.assembly - 0.3, HOSP.assembly)) });
  text("Dr Thomas Bond", 150, 1280, { size: 34, weight: 700, color: C.ink, alpha: pop(t, HOSP.bond) * (1 - seg(t, HOSP.assembly - 0.3, HOSP.assembly)) });
  [[860, 1500, C.sky], [950, 1520, C.violet]].forEach(([x, y, c], i) => person(x, y, 90, c, { alpha: pop(t, HOSP.poor + i * 0.15) * (1 - seg(t, HOSP.assembly - 0.3, HOSP.assembly)) }));
  // Franklin's idea
  const idea = pop(t, HOSP.idea) * (1 - seg(t, HOSP.assembly - 0.3, HOSP.assembly));
  person(W / 2, 1530, 120, "#7a4a2c", { franklin: true, alpha: idea });
  badge("bulb", W / 2, 1250, 52, C.yellow, C.ink, { scale: idea, glow: idea });
  // The match: the Assembly's £2,000, locked until donors raise theirs
  const m = ease(seg(t, HOSP.assembly - 0.2, HOSP.assembly + 0.5)) * (1 - ease(seg(t, HOSP.stamp - 0.3, HOSP.stamp + 0.3)));
  if (m > 0.01) {
    g.save(); g.globalAlpha *= m;
    const dfill = seg(t, ...HOSP.donors), unlocked = ease(seg(t, HOSP.unlock, HOSP.unlock + 0.5));
    text("ASSEMBLY", 270, 380, { size: 38, color: C.ink, track: 4 });
    text("DONORS", 810, 380, { size: 38, color: C.ink, track: 4 });
    stack(270, 880, 7, 1);
    stack(810, 880, 7, dfill);
    text("£2,000", 270, 950, { size: 64, color: C.ink });
    text("£2,000", 810, 950, { size: 64, color: C.ink, alpha: dfill > 0.95 ? 1 : 0.25 });
    badge("lock", 270, 620, 56, unlocked > 0.5 ? C.teal : C.coral, C.cream, { scale: pop(t, HOSP.lock), rot: unlocked * 0.3 });
    text("only if", W / 2, 640, { size: 70, weight: 700, font: "Caveat", color: C.coral, alpha: pop(t, HOSP.lock) * (1 - unlocked) });
    // = arrows into the middle
    g.strokeStyle = rgba(C.ink, 0.6 * unlocked); g.lineWidth = 7; g.lineCap = "round";
    g.beginPath(); g.moveTo(330, 1000); g.quadraticCurveTo(540, 1100, 540, 1180); g.moveTo(750, 1000); g.quadraticCurveTo(540, 1100, 540, 1180); g.stroke();
    g.restore();
  }
  // Matched
  const st = seg(t, HOSP.stamp - 0.08, HOSP.stamp + 0.1);
  if (st > 0) {
    g.save(); g.translate(W / 2, 520); g.rotate(-0.12); g.scale(lerp(1.6, 1, st), lerp(1.6, 1, st)); g.globalAlpha = st * (1 - seg(t, at("acad1") - 0.6, at("acad1")));
    g.strokeStyle = C.coral; g.lineWidth = 10; rr(-250, -70, 500, 140, 16); g.stroke();
    text("MATCHED", 0, 4, { size: 92, color: C.coral, track: 8 });
    g.restore();
    text("one of America’s first matching grants", W / 2, 680, { size: 40, weight: 500, font: "Lora", italic: true, color: C.ink, alpha: ease(seg(t, HOSP.stamp + 0.3, HOSP.stamp + 0.8)) * (1 - seg(t, at("acad1") - 0.6, at("acad1"))) });
  }
  g.restore();
}

// VI — the academy
const ACAD = { in: sfx(at("acad1", "academy"), "pop"), penn: sfx(at("acad1", "university"), "chime") };
function drawAcademy(t) {
  const a = seg(t, at("acad1") - 0.4, at("acad1") + 0.2), b = 1 - ease(seg(t, at("turn1") - 0.15, at("turn1") + 0.25));
  if (a <= 0 || b <= 0) return;
  g.save(); g.globalAlpha = Math.min(ease(a), b);
  const c = pop(t, ACAD.in, 0.7);
  clouds(t, 0.8);
  g.save(); g.translate(W / 2, 980); g.scale(c, c);
  icon("columns", 0, 0, 560, C.cream);
  g.restore();
  text("THE ACADEMY OF PHILADELPHIA", W / 2, 1340, { size: 36, color: C.cream, track: 4, alpha: c });
  text("1751", W / 2, 520, { size: 110, color: C.cream, alpha: c });
  const u = pop(t, ACAD.penn, 0.7);
  // A campus grows around it
  for (let i = 0; i < 6; i++) {
    const k = pop(t, ACAD.penn + i * 0.08, 0.5), side = i % 2 ? 1 : -1, x = W / 2 + side * (290 + Math.floor(i / 2) * 70), y = 1240 - Math.floor(i / 2) * 140;
    icon(i % 3 ? "house" : "columns", x, y, 130 * k, rgba(C.white, 0.85));
  }
  chip("→ UNIVERSITY OF PENNSYLVANIA", null, W / 2, 1440, C.yellow, { scale: u, alpha: u, size: 32 });
  g.restore();
}

// VII — the turn: four times from scratch
const TURN = {
  freeze: sfx(at("turn1"), "whoosh"),
  docs: ["agreements", "subscriptions", "fundraising", "books"].map((w) => sfx(at("turn2", w), "pop")),
  four: sfx(at("turn3", "four"), "stamp"),
  juggle: at("turn3", "alongside"),
  items: ["printing", "almanac", "lightning"].map((w) => sfx(at("turn3", w), "pop")),
};
function drawTurn(t) {
  const a = seg(t, at("turn1"), at("turn1") + 0.4), b = 1 - ease(seg(t, at("now1") - 0.6, at("now1")));
  if (a <= 0 || b <= 0) return;
  g.save(); g.globalAlpha = Math.min(ease(a), b);
  // The four, in a row
  INST.forEach((it, i) => {
    const x = 150 + i * 260, y = 1250 - ease(seg(t, TURN.juggle - 0.3, TURN.juggle + 0.6)) * 110;
    const s = pop(t, TURN.freeze + i * 0.1);
    badge(it.name, x, y, 104, it.fill, C.cream, { scale: s });
    // Paperwork, piling up on each
    TURN.docs.forEach((d, j) => {
      const k = pop(t, d + i * 0.07, 0.45);
      if (k <= 0) return;
      for (let d2 = 0; d2 < 2; d2++) icon("doc", x + (d2 ? 30 : -30) + Math.sin(i + j) * 10, y - 160 - j * 92 - d2 * 30, 118 * k, (j + d2) % 2 ? C.cream : "#e9e1d0", { rot: Math.sin(i * 3 + j + d2) * 0.25 });
    });
  });
  TURN.docs.forEach((d, j) => text(["agreements", "subscriptions", "fundraising", "books"][j], W / 2, 330 + j * 74, { size: 54, weight: 700, color: rgba(C.cream, 0.9), alpha: pop(t, d) * (1 - seg(t, TURN.juggle - 0.4, TURN.juggle)) }));
  const four = pop(t, TURN.four, 0.6);
  text("× 4", W / 2, 1420, { size: 150, color: C.yellow, scale: four, alpha: four * (1 - seg(t, TURN.juggle, TURN.juggle + 0.4)) });
  // Franklin, juggling a press, an almanac, a kite in a storm
  const jg = ease(seg(t, TURN.juggle - 0.2, TURN.juggle + 0.5));
  if (jg > 0) {
    person(W / 2, 1360, 150, "#7a4a2c", { franklin: true, alpha: jg, arm: 0.9 + 0.4 * Math.sin(t * 7) });
    const items = [["press", 0], ["almanac", 1], ["kite", 2]];
    items.forEach(([key, i]) => {
      const k = pop(t, TURN.items[i], 0.6);
      const ang = -Math.PI / 2 + (i - 1) * 0.9 + Math.sin(t * 2.2 + i) * 0.15;
      const x = W / 2 + Math.cos(ang) * 330, y = 820 + Math.sin(ang) * 300 + Math.sin(t * 3 + i * 2) * 26;
      plate(key, x, y, key === "press" ? 300 : 260, key === "press" ? 300 : 340, { scale: k * jg, rot: Math.sin(t * 1.5 + i) * 0.08, fy: key === "kite" ? 0.2 : 0.5 });
    });
    if (pop(t, TURN.items[2]) > 0.5) icon("bolt", W / 2 + 330 * Math.cos(-Math.PI / 2 + 0.9) + 110, 560, 110, C.yellow, { alpha: 0.5 + 0.5 * Math.abs(Math.sin(t * 9)) });
  }
  g.restore();
}

// VIII — today
const NOW = {
  today: sfx(at("now1", "today"), "whoosh"),
  zero: sfx(at("now1", "zero"), "pop"),
  home: sfx(at("now2", "fiscal"), "pop"),
  seed: sfx(at("now2", "new"), "pop"),
  checks: [["accept", "ACCEPT GIFTS"], ["win", "WIN GRANTS"], ["sign", "SIGN CONTRACTS"]].map(([w, l]) => ({ l, at: sfx(at("now2", w), "chime", 0.6) })),
  work: sfx(at("now2", "founder"), "pop"),
};
function drawNow(t) {
  const a = seg(t, at("now1") - 0.5, at("now1") + 0.2), b = 1 - ease(seg(t, E.cosmos + 0.8, E.cosmos + 1.6));
  if (a <= 0 || b <= 0) return;
  g.save(); g.globalAlpha = Math.min(ease(a), b);
  const ink = C.ink;
  text("TODAY", W / 2, 330, { size: 120, color: ink, scale: pop(t, NOW.today), track: 10, alpha: 1 - seg(t, NOW.home - 0.3, NOW.home + 0.2) });
  // Not from zero
  const z = pop(t, NOW.zero) * (1 - seg(t, NOW.home - 0.3, NOW.home + 0.2));
  if (z > 0.01) {
    text("0", W / 2, 860, { size: 420, color: rgba(ink, 0.85), scale: z });
    g.strokeStyle = C.coral; g.lineWidth = 26; g.lineCap = "round";
    const k = ease(seg(t, NOW.zero + 0.2, NOW.zero + 0.6));
    g.beginPath(); g.moveTo(W / 2 - 170, 1060); g.lineTo(W / 2 - 170 + 340 * k, 1060 - 400 * k); g.stroke();
  }
  // A home: the fiscal sponsor, and the project inside it
  const h = pop(t, NOW.home, 0.7);
  const toStar = ease(seg(t, E.cosmos - 0.4, E.cosmos + 0.8));
  if (h > 0.01) {
    g.save(); g.translate(W / 2, lerp(760, 900, toStar)); g.scale(h, h);
    g.globalAlpha *= 1 - toStar;
    g.shadowColor = "rgba(60,40,30,0.18)"; g.shadowBlur = 40; g.shadowOffsetY = 18;
    g.fillStyle = C.star; g.beginPath(); g.moveTo(-300, 300); g.lineTo(-300, -30); g.quadraticCurveTo(-300, -60, -270, -80); g.lineTo(-30, -280); g.quadraticCurveTo(0, -300, 30, -280); g.lineTo(270, -80); g.quadraticCurveTo(300, -60, 300, -30); g.lineTo(300, 270); g.quadraticCurveTo(300, 300, 270, 300); g.closePath(); g.fill();
    g.shadowColor = "transparent";
    g.restore();
    text("FISCAL SPONSOR", W / 2, 470, { size: 44, color: C.clay, track: 6, alpha: h * (1 - toStar) });
    const sd = pop(t, NOW.seed, 0.7) * (1 - toStar);
    badge("sprout", W / 2, 820, 110, C.green, "#3e6b3a", { scale: sd, glow: sd * (0.6 + 0.4 * Math.sin(t * 3)) });
    text("a new project", W / 2, 990, { size: 40, weight: 500, font: "Lora", italic: true, color: ink, alpha: sd });
  }
  // What the home lets it do
  NOW.checks.forEach((c, i) => {
    const k = pop(t, c.at, 0.5) * (1 - toStar);
    chip(c.l, "check", W / 2, 1110 + i * 112, [C.teal, C.sky, C.violet][i], { scale: k, alpha: k, ink: C.white, size: 40 });
  });
  // And the founder, off to the work
  const f = pop(t, NOW.work, 0.6) * (1 - toStar);
  const walk = seg(t, NOW.work + 0.3, NOW.work + 3);
  person(lerp(170, 120, walk), 1390, 120, C.clay, { walk: walk * 6, alpha: f });
  text("the founder", 170, 1215, { size: 34, weight: 700, color: C.clay, alpha: f });
  g.restore();
}

// ── The close: the four become the cosmos ───────────────────────────────────
const PLANET = [0xC4DDB8, 0xB8CAE0, 0xE0B8C8, 0xB8DDD8];
const canvas = $("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: RENDER });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeceae5);
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
const cosmos = new THREE.Group(); scene.add(cosmos);
const star = new THREE.Mesh(new THREE.SphereGeometry(1.25, 96, 96), porcelain(0xF0D5BB)); cosmos.add(star);
const orbits = ORBITS.map((def, i) => {
  const pivot = new THREE.Group(); pivot.rotation.set(...def.tilt); cosmos.add(pivot);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(def.radius, 0.045, 24, 256), porcelain(0xcdbe96)); pivot.add(ring);
  const rotator = new THREE.Group(); pivot.add(rotator);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 64, 64), porcelain(PLANET[i])); planet.position.x = def.radius; rotator.add(planet);
  return { def, pivot, rotator, planet };
});
function poseCosmos(t) {
  const u = t - E.cosmos;
  for (const o of orbits) {
    o.rotator.rotation.z = o.def.phase + o.def.speed * (u + 2);
    o.planet.rotation.y = 0.08 * t;
    o.pivot.scale.setScalar(lerp(0.82, 1, expoOut(seg(t, E.cosmos + 0.4, E.cosmos + 2.6))));
  }
  star.scale.setScalar(1 + Math.sin(t * 1.1) * 0.01);
  const k = expoOut(seg(t, E.cosmos, E.cosmos + 5));
  const az = lerp(14, 0, k) * (Math.PI / 180), el = Math.atan2(2.6, 14.5) + lerp(0.16, 0, k);
  const dist = Math.hypot(2.6, 14.5) * lerp(1.14, 1, k);
  camera.position.set(Math.cos(el) * Math.sin(az) * dist, Math.sin(el) * dist, Math.cos(el) * Math.cos(az) * dist);
  camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  cosmos.updateMatrixWorld(true); camera.updateMatrixWorld();
}
const _v = new THREE.Vector3(), _u = new THREE.Vector3();
function toScreen(p) { _v.copy(p).project(camera); return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H }; }
function screenR(p, r) { return (r / (camera.position.distanceTo(p) * Math.tan((camera.fov * Math.PI) / 360))) * (H / 2); }
// The four institutions, as four circles, fly to the four planets; the home
// becomes the star
const CLOSE = { fly: sfx(E.cosmos, "whoosh"), land: sfx(E.cosmos + 1.4, "chime") };
function drawClose(t) {
  if (t < E.cosmos - 0.5) return;
  const k = ease(seg(t, E.cosmos - 0.2, E.cosmos + 1.4));
  const fade = 1 - seg(t, E.cosmos + 1.4, E.cosmos + 2.2);
  if (fade <= 0) return;
  const tg = orbits.map((o) => { o.planet.getWorldPosition(_u); return { ...toScreen(_u), r: screenR(_u, 0.42) }; });
  const st = { ...toScreen(star.position), r: screenR(star.position, 1.25) };
  g.save(); g.globalAlpha = fade * seg(t, E.cosmos - 0.5, E.cosmos - 0.1);
  g.fillStyle = C.star; g.beginPath(); g.arc(lerp(W / 2, st.x, k), lerp(760, st.y, k), lerp(240, st.r, k), 0, Math.PI * 2); g.fill();
  INST.forEach((it, i) => {
    const sx = [230, 850, 230, 850][i], sy = [600, 600, 1250, 1250][i];
    const x = lerp(sx, tg[i].x, k), y = lerp(sy, tg[i].y, k) - Math.sin(Math.PI * k) * 80;
    badge(it.name, x, y, lerp(70, tg[i].r, k), "#" + PLANET[i].toString(16), mix("#" + PLANET[i].toString(16), C.ink, 0.45), { scale: pop(t, E.cosmos - 0.45 + i * 0.06) });
  });
  g.restore();
}

// ── Words over the cosmos, and the wordmark (as brand/film) ─────────────────
const DUR = [1.05, 1.3, 0.95, 1.4, 1.15, 0.9, 1.35, 1.0, 1.25];
function maskWords(el, str) {
  el.textContent = "";
  return str.split(/\s+/).map((w, i) => {
    const mask = document.createElement("span"); mask.className = "hw";
    const inner = document.createElement("span"); inner.textContent = w;
    mask.appendChild(inner); el.append(mask, " ");
    return { el: inner, d: 0.08 * i + 0.05 * ((i * 7) % 3), dur: DUR[i % DUR.length] };
  });
}
function goo(el, f, maxBlur = 60) {
  if (f <= 0.001) { css(el, "opacity", "0"); css(el, "filter", "none"); return; }
  if (f >= 0.999) { css(el, "opacity", "1"); css(el, "filter", "none"); return; }
  css(el, "opacity", Math.pow(f, 0.4).toFixed(3));
  css(el, "filter", `blur(${Math.min(6 / f - 6, maxBlur).toFixed(2)}px)`);
}
const WORDS = [
  { t: at("end1", "home"), cls: "ink sm it", y: 250, str: "a home for the next Franklin." },
  { t: at("end2", "next"), cls: "ink xs", y: 1360, str: "The next great expansion of human creativity" },
  { t: at("end2", "will"), cls: "ink xs", y: 1424, str: "will come from making it easier to create" },
  { t: at("end2", "institutions") - 0.1, cls: "clay it xl", y: 1500, str: "institutions." },
].map((c) => {
  const el = document.createElement("div");
  el.className = "cap c " + c.cls; el.style.left = W / 2 + "px"; el.style.top = c.y + "px";
  $("words").appendChild(el);
  return { ...c, el, words: maskWords(el, c.str) };
});
function drawWords(t) {
  for (const c of WORDS) {
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
const markLetters = [...FINAL].map((ch, j) => { const el = document.createElement("span"); mark.appendChild(el); return { el, j, key: "" }; });
function sizeCells() {
  const c = document.createElement("canvas").getContext("2d");
  c.font = `400 ${MARK_PX}px Lora`;
  for (const l of markLetters) l.el.style.width = (c.measureText(FINAL[l.j]).width + MARK_PX * 0.3).toFixed(1) + "px";
  mark.style.top = (H * MARK_Y - MARK_PX * 0.5).toFixed(0) + "px";
  brandCta.dataset.top = (H * MARK_Y + MARK_PX * 0.62 + 40).toFixed(0);
}
function setFace(l, k, ch, family, weight, style = "normal", outline = false, size = 1) {
  if (l.key === k) return;
  l.key = k; l.el.textContent = ch;
  l.el.style.fontFamily = `"${family}"`; l.el.style.fontWeight = String(weight); l.el.style.fontStyle = style;
  l.el.style.fontSize = size === 1 ? "" : size + "em";
  l.el.style.color = outline ? "transparent" : "";
  l.el.style.webkitTextStroke = outline ? `${(MARK_PX * 0.012).toFixed(1)}px #1b1613` : "";
}
function drawBrand(t) {
  const on = t >= E.wordmark;
  show(brand, on);
  if (!on) return;
  const [c0, c1] = E.cycle, [s0] = E.settle;
  goo(mark, seg(t, E.wordmark, E.wordmark + 0.9), 40);
  for (const l of markLetters) {
    const j = l.j, start = c0 + j * 0.05, land = s0 + j * 0.14;
    let popS = 1;
    if (t < start) { const [ch, fam, wt, st, ol, sz] = NAV_FACES[j]; setFace(l, "nav", ch, fam, wt, st, ol, sz); }
    else if (t < land) {
      const dur = c1 - c0, u = clamp01((t - start) / dur);
      const step = Math.floor(3 * (t - start) + (9 * dur / Math.PI) * (1 - Math.cos(Math.PI * u)));
      const [fam, wt, st = "normal"] = FACES[Math.floor(hash(j * 977 + step * 31) * FACES.length)];
      setFace(l, `c${step}`, hash(j * 131 + step * 7) < 0.3 ? FINAL[j].toLowerCase() : FINAL[j], fam, wt, st);
    } else { setFace(l, "final", FINAL[j], "Lora", 400); popS = 1 + 0.1 * (1 - expoOut(seg(t, land, land + 0.45))); }
    css(l.el, "transform", popS === 1 ? "none" : `scale(${popS.toFixed(3)})`);
  }
  css(mark, "transform", `scale(${lerp(0.72, 1, expoOut(seg(t, E.wordmark, E.wordmark + 1.2))).toFixed(4)})`);
  const c = expoOut(seg(t, E.cta, E.cta + 0.9));
  css(brandCta, "top", (Number(brandCta.dataset.top) + (1 - c) * 24).toFixed(0) + "px");
  css(brandCta, "opacity", c.toFixed(3));
}
for (let j = 0; j < 7; j++) sfx(E.settle[0] + j * 0.14, "settle", 0.6);

// ── Captions: the narration, a phrase at a time ──────────────────────────────
const PHRASES = [];
for (const l of TIMING.lines) {
  if (l.t0 >= E.cosmos - 0.5) continue; // over the close, the words are set large
  let cur = [];
  const flush = (tEnd) => { if (cur.length) PHRASES.push({ t0: cur[0][1], t1: tEnd, str: cur.map((w) => w[0]).join(" ") }); cur = []; };
  l.words.forEach((w, i) => {
    cur.push(w);
    const len = cur.map((x) => x[0]).join(" ").length, next = l.words[i + 1];
    if (!next || len > 22 || /[.,:;!?]$/.test(w[0]) && len > 8) flush(next ? next[1] : l.t1 + 0.25);
  });
}
const cap = $("caption");
let capKey = -1;
function drawCaption(t) {
  const i = PHRASES.findIndex((p) => t >= p.t0 - 0.05 && t < p.t1);
  show(cap, i >= 0);
  if (i < 0) return;
  if (i !== capKey) { cap.textContent = PHRASES[i].str; capKey = i; }
  // Dark text on today's paper, light text on the past's colour
  const light = t >= at("now1") - 0.3 || (t >= at("hosp1") && t < at("acad1"));
  cap.classList.toggle("on-light", light);
}

// ── Grain ────────────────────────────────────────────────────────────────────
const grain = $("grain"), gctx = grain.getContext("2d");
grain.width = W / 2; grain.height = H / 2;
const grainFrames = (() => {
  const r = rng(99), out = [];
  for (let k = 0; k < 6; k++) {
    const img = gctx.createImageData(W / 2, H / 2);
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 60; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    out.push(img);
  }
  return out;
})();
let lastGrain = -1;

// ── One frame ────────────────────────────────────────────────────────────────
function seek(t) {
  t = Math.max(0, Math.min(DURATION, t));
  const cosmosOn = t >= E.cosmos - 0.6;
  canvas.style.visibility = cosmosOn ? "visible" : "hidden";
  if (cosmosOn) { poseCosmos(t); renderer.render(scene, camera); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  // The painted world gives way to the cosmos beneath it
  const reveal = 1 - ease(seg(t, E.cosmos + 0.6, E.cosmos + 1.8));
  if (reveal > 0) {
    g.globalAlpha = reveal;
    sky(t);
    g.globalAlpha = 1;
    // The camera breathes
    const z = 1 + 0.012 * Math.sin(t * 0.4);
    g.setTransform(z, 0, 0, z, (W - W * z) / 2, (H - H * z) / 2);
    drawHook(t); drawWho(t); drawLibrary(t); drawFire(t); drawHospital(t); drawAcademy(t); drawTurn(t); drawNow(t);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  drawClose(t);
  drawWords(t);
  drawCaption(t);
  css($("veil"), "opacity", ease(seg(t, E.wordmark - 0.5, E.wordmark + 0.5)).toFixed(3));
  drawBrand(t);
  css($("black"), "opacity", Math.max(1 - seg(t, 0, 0.6), seg(t, DURATION - 0.5, DURATION)).toFixed(3));
  const gi = Math.floor(t * FPS) % grainFrames.length;
  if (gi !== lastGrain) { gctx.putImageData(grainFrames[gi], 0, 0); lastGrain = gi; }
}

// ── Ready, and playing ───────────────────────────────────────────────────────
const fontsReady = Promise.all([
  "800 60px Inter", "700 60px Inter", "600 60px Inter", "500 60px Inter", "400 62px Lora", "italic 400 62px Lora", "500 62px Lora", "italic 500 62px Lora",
  "400 60px 'IM Fell English'", "italic 400 60px 'IM Fell English'", "700 60px Caveat", "400 40px 'Major Mono Display'", "500 30px 'IBM Plex Sans'",
  ...[...NAV_FACES.map(([, f, w, st]) => [f, w, st]), ...FACES].map(([f, w, st = "normal"]) => `${st} ${w} 100px "${f}"`),
].map((f) => document.fonts.load(f, "MULVIUMmulviumAa1£’"))).then(() => document.fonts.ready);
const imagesReady = Promise.all(["portrait", "kite", "almanac", "press"].map((k) => new Promise((res, rej) => {
  const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => rej(new Error("missing " + k)); im.src = `assets/${k}.jpg`;
})));
const ready = Promise.all([fontsReady, imagesReady]).then(() => { sizeCells(); for (const t of [E.cosmos + 2, 1, 0]) seek(t); });
SFX.sort((a, b) => a.t - b.t);
window.essay = { seek, ready, duration: DURATION, fps: FPS, width: W, height: H, sfx: SFX, cues: E };

if (!RENDER) {
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`;
  };
  fit(); addEventListener("resize", fit);
  const audio = $("sound"), play = $("play");
  const from = parseFloat(PARAMS.get("t")) || 0;
  const soundReady = fetch(audio.getAttribute("src")).then((r) => (r.ok ? r.blob() : Promise.reject())).then((b) => { audio.src = URL.createObjectURL(b); }, () => {});
  Promise.all([ready, soundReady]).then(() => {
    seek(from); play.hidden = false;
    let clock = null;
    const loop = () => { const t = clock !== null ? from + (performance.now() - clock) / 1000 : audio.currentTime; seek(t); if (t < DURATION) requestAnimationFrame(loop); };
    const silent = () => { if (clock === null) clock = performance.now(); };
    play.addEventListener("click", () => {
      play.hidden = true;
      const start = () => { audio.currentTime = from; audio.play().catch(silent); requestAnimationFrame(loop); };
      if (audio.readyState >= 1) start();
      else { audio.addEventListener("loadedmetadata", start, { once: true }); audio.addEventListener("error", () => { silent(); requestAnimationFrame(loop); }, { once: true }); audio.load(); }
    });
  });
}
