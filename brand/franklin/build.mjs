// build.mjs — writes the Franklin essay as a HyperFrames project: index.html
// (the root: scene hosts, captions, voice, music and sound) and one file per
// section in compositions/. Every time in them is a literal number, taken
// from timing.json, where the narration's words were measured; so a re-voiced
// line, or a re-timed one, means running this again, not editing by hand.
//
//   node build.mjs            # then: npx hyperframes check / snapshot / render
//
// The film is one story in one place: a 3D model of an eighteenth-century
// commons (assets/lib/world.js, three.js) runs under every scene, and on it
// Franklin's four institutions are built part by part, then a fifth plot with
// one foundation shared. The archive's pictures and documents (assets/img/,
// prep.py) float over it on cards. Type is the Mulvium site's: Lora, Major
// Mono Display and IBM Plex Sans.
import fs from "fs";
import path from "path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const W = 1080, H = 1920;
const C = { paper: "#ECEAE5", surface: "#F9F8F5", ink: "#1B1613", soft: "#3B332F", muted: "#5C544E", rule: "#D9D4CA", clay: "#B87758" };
const A = { library: "#4D6D96", fire: "#A8603F", hospital: "#357F77", academy: "#55804A", mulvium: "#9A5571" };
const SIZES = JSON.parse(fs.readFileSync(path.join(HERE, "assets/img/sizes.json"), "utf8"));
const SCRIPT = JSON.parse(fs.readFileSync(path.join(HERE, "script.json"), "utf8"));

// ── The clock: every word of the narration ─────────────────────────────────
let T = JSON.parse(fs.readFileSync(path.join(HERE, "timing.json"), "utf8"));
if (SCRIPT.lines.some((l, i) => !T.lines[i] || T.lines[i].text !== l.text)) {
  // The narration is behind the script: lay the words out at a reading pace
  // so the scenes can be worked on, and say so
  console.warn("timing.json does not match script.json: using estimated times");
  let t = 0, prev = null;
  T = { lines: SCRIPT.lines.map((l) => {
    const sec = l.id.replace(/\d+$/, "");
    if (prev) t += (sec === prev ? 0.32 : 0.75) + (l.pause_before || 0);
    prev = sec;
    const t0 = t, words = l.text.split(" ").map((w) => {
      const d = 0.16 + 0.055 * w.replace(/\W/g, "").length + (/[,.:]$/.test(w) ? 0.18 : 0);
      const r = [w, +t.toFixed(3), +(t + d).toFixed(3)]; t += d; return r;
    });
    return { id: l.id, text: l.text, t0, t1: +t.toFixed(3), words };
  }) };
  T.duration = t;
}
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9£]/g, "");
const L = (id) => T.lines.find((l) => l.id === id) || (() => { throw new Error("no line " + id); })();
// The time a word starts (or ends): at("hook1", "library"), at("who2", "and", 2)
function word(id, w, nth = 1) {
  const l = L(id);
  if (typeof w === "number") return l.words[w];
  let n = 0;
  for (const x of l.words) if (norm(x[0]) === norm(w) && ++n === nth) return x;
  throw new Error(`no word "${w}" in ${id}`);
}
const at = (id, w, nth) => (w === undefined ? L(id).t0 : word(id, w, nth)[1]);
const after = (id, w, nth) => (w === undefined ? L(id).t1 : word(id, w, nth)[2]);
const VOICE_END = T.lines[T.lines.length - 1].t1;

// ── Scenes ──────────────────────────────────────────────────────────────────
const r3 = (x) => Math.round(x * 1000) / 1000;
const js = (o) => JSON.stringify(o, (k, v) => (typeof v === "number" ? r3(v) : v));
const isHex = (s) => /^[0-9a-f]{3,8}$/i.test(s);
class Scene {
  constructor(id, t0, t1, z) { Object.assign(this, { id, t0, t1, z, html: [], css: [], raw: [], tl: [], sfx: [], scripts: [] }); }
  local(t) { return r3(Math.max(0, t - this.t0)); }
  $(sel) { return sel.replace(/#([a-z][\w-]*)/g, (m, s) => (isHex(s) ? m : `#${this.id}-${s}`)); }
  fromTo(sel, a, b, t) { this.tl.push(`tl.fromTo(${js(this.$(sel))}, ${js(a)}, ${js(b)}, ${this.local(t)});`); return this; }
  to(sel, b, t) { this.tl.push(`tl.to(${js(this.$(sel))}, ${js(b)}, ${this.local(t)});`); return this; }
  set(sel, b, t) { this.tl.push(`tl.set(${js(this.$(sel))}, ${js(b)}, ${this.local(t)});`); return this; }
  add(html) { this.html.push(html.replace(/id="([a-z])/g, `id="${this.id}-$1`)); return this; }
  style(css) { this.css.push(css.replace(/#([a-z][\w-]*)/g, (m, s) => (s === "root" || isHex(s) ? m : `#${this.id}-${s}`))); return this; }
  sound(name, t, vol = 0.5) { this.sfx.push({ name, t: r3(t), vol }); return this; }
  // A card arrives: up from below, from a side, or out of a slight zoom
  enter(sel, t, { from = "up", dur = 0.6, stagger = 0 } = {}) {
    const a = { opacity: 0, filter: "blur(6px)", ...(from === "up" ? { y: 70 } : from === "right" ? { x: 120 } : from === "left" ? { x: -120 } : { scale: 0.94 }) };
    const b = { opacity: 1, filter: "blur(0px)", x: 0, y: 0, scale: 1, duration: dur, ease: "expo.out", stagger };
    return this.fromTo(sel, a, b, t);
  }
  leave(sel, t, dur = 0.25) {
    return this.to(sel, { opacity: 0, filter: "blur(8px)", duration: dur, ease: "power2.in" }, t);
  }
  // Words blur in one by one (motion.md's per-word entrance)
  words(sel, t, { stagger = 0.067, dur = 0.16 } = {}) {
    const parent = sel.replace(/ \.w$/, "");
    if (parent !== sel) this.set(parent, { opacity: 1 }, t);
    return this.fromTo(sel, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: dur, ease: "power2.out", stagger }, t);
  }
  // A number counting to its value; fmt is a JS expression of v
  count(sel, t, dur, from, to, fmt = "Math.round(v)") {
    this.tl.push(`{ const o = { v: ${from} }, el = document.querySelector(${js(this.$(sel))}); tl.fromTo(o, { v: ${from} }, { v: ${to}, duration: ${r3(dur)}, ease: "power2.out", onUpdate: () => { const v = o.v; el.textContent = ${fmt}; } }, ${this.local(t)}); }`);
    return this;
  }
  // Move a picture's camera over [t, t + dur]
  cam(sel, from, to, t, dur, ease = "power2.inOut") {
    return this.fromTo(sel, from, { ...to, duration: dur, ease }, t);
  }
  file() {
    return `<template>
  <style>
${FONTS}
    #root { position: absolute; inset: 0; overflow: hidden; }
${BASE}
${this.css.join("\n")}
${this.raw.join("\n")}
  </style>
  <div id="root" data-composition-id="${this.id}" data-width="${W}" data-height="${H}" data-duration="${r3(this.t1 - this.t0)}">
${this.html.join("\n")}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${this.tl.join("\n    ")}
    window.__timelines["${this.id}"] = tl;
  </script>
${this.scripts.join("\n")}
</template>
`;
  }
}

// The site's type: Lora for titles and figures, Major Mono Display (lower
// case) for kickers and labels, IBM Plex Sans for small text and subtitles
const FONTS = [
  ["IBM Plex Sans", "IBMPlexSans-400", 400, "normal"], ["IBM Plex Sans", "IBMPlexSans-500", 500, "normal"], ["IBM Plex Sans", "IBMPlexSans-600", 600, "normal"],
  ["Lora", "Lora-500", 500, "normal"], ["Lora", "Lora-600", 600, "normal"], ["Lora", "Lora-400i", 400, "italic"], ["Lora", "Lora-500i", 500, "italic"],
  ["Major Mono Display", "MajorMonoDisplay-400", 400, "normal"],
  // subtitles: Caslon, the face Franklin's shop set and the Declaration was first printed in
  ["Libre Caslon Text", "LibreCaslonText-400", 400, "normal"], ["Libre Caslon Text", "LibreCaslonText-400i", 400, "italic"],
].map(([f, file, w, s]) => `    @font-face { font-family: "${f}"; src: url(assets/fonts/${file}.woff2) format("woff2"); font-weight: ${w}; font-style: ${s}; font-display: block; }`).join("\n");

const BASE = `
    .abs { position: absolute; }
    .full { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
    .disp { font-family: "Lora", serif; font-weight: 600; color: ${C.ink}; }
    .small { font-family: "IBM Plex Sans", sans-serif; color: ${C.muted}; }
    .serif { font-family: "Lora", serif; color: ${C.ink}; }
    .kicker { font-family: "Major Mono Display", monospace; font-size: 30px; letter-spacing: 0.06em; text-transform: lowercase; color: ${C.muted}; }
    .w { display: inline-block; white-space: pre; }
    .card { position: absolute; background: ${C.surface}; border: 1px solid ${C.rule}; border-radius: 28px; overflow: hidden;
      box-shadow: inset 0 1px 0 #FFFFFF, 0 2px 4px rgba(27,22,19,0.04), 0 18px 48px rgba(27,22,19,0.10); }
    .card .cap { position: absolute; left: 0; bottom: 0; width: 100%; height: 64px; overflow: hidden; padding: 0 28px; display: flex; align-items: center; gap: 18px;
      background: ${C.surface}; border-top: 1px solid ${C.rule}; font-family: "IBM Plex Sans", sans-serif; font-size: 28px; color: ${C.muted}; white-space: nowrap; }
    .card .cap b { font-weight: 500; color: ${C.ink}; }
    .pic { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
    .pic img { display: block; width: 100%; height: 100%; }
    .tag { position: absolute; padding: 10px 18px 11px; border-radius: 10px; background: ${C.surface}; border: 1px solid ${C.rule};
      font-family: "Major Mono Display", monospace; font-size: 30px; letter-spacing: 0.04em; text-transform: lowercase; color: ${C.ink}; white-space: nowrap; }
    .bar { position: absolute; border-radius: 4px; }
`;
const words = (text, cls = "w") => text.split(" ").map((w) => `<span class="${cls}">${w} </span>`).join("");
const picEl = (id, name, inner = "") => `<div id="${id}" class="pic" style="width:${SIZES[name].w}px;height:${SIZES[name].h}px"><img src="assets/img/${name}.jpg" alt="">${inner}</div>`;
// A camera framing in a w x h window: point (fx, fy) of the picture at the
// window's centre, at k times the scale that covers the window
function frame(name, w, h, fx, fy, k = 1) {
  const { w: iw, h: ih } = SIZES[name];
  const s = Math.max(w / iw, h / ih) * k;
  const x = Math.min(0, Math.max(w - s * iw, w / 2 - fx * iw * s)), y = Math.min(0, Math.max(h - s * ih, h / 2 - fy * ih * s));
  return { x: r3(x), y: r3(y), scale: r3(s) };
}
const scenes = [];
const SECTION = (id) => T.lines.filter((l) => l.id.startsWith(id));
const start = (id) => SECTION(id)[0].t0;
const LOW = 1400; // type set over the model: the open ground under it
// The type scale: every set word is one of these sizes
const TS = { display: 180, head: 120, title: 80, body: 60, kick: 38 };

// ── Cinematic devices ──────────────────────────────────────────────────────
// A plate: an archival picture filling the screen, a slow camera move across
// it, a scrim where type sits on it, and a quiet source line
function plate(s, id, name, { t0, t1, from, to, scrim = "low", credit = "", enter = "cut", exit = "cut", z = 1, pan = null, keep = false, inner = "" }) {
  // the picture fills the screen, on its centre, never far in (at most 1.1x);
  // a pan (the opening's panorama, the move to a signature) keeps its framing
  if (!pan && !keep) { from = [0.5, 0.5, Math.min(from[2], 1.06)]; to = [0.5, 0.5, Math.min(to[2], 1.1)]; }
  const F = frame;
  const sc = scrim === "low" ? "linear-gradient(180deg, rgba(14,10,8,0) 40%, rgba(14,10,8,0.6) 62%, rgba(14,10,8,0.85) 100%)"
    : scrim === "high" ? "linear-gradient(0deg, rgba(14,10,8,0) 55%, rgba(14,10,8,0.7) 100%)"
    : scrim === "deep" ? "linear-gradient(180deg, rgba(14,10,8,0) 48%, rgba(14,10,8,0.88) 64%, rgba(14,10,8,0.92) 100%)"
    : scrim === "both" ? "linear-gradient(180deg, rgba(14,10,8,0.82) 0%, rgba(14,10,8,0.6) 28%, rgba(14,10,8,0) 40%, rgba(14,10,8,0) 45%, rgba(14,10,8,0.6) 62%, rgba(14,10,8,0.85) 100%)" : "none";
  s.add(`<div id="${id}" class="full plate" style="z-index:${z};opacity:0">
    <div class="full" style="overflow:hidden">${picEl(`${id}-pic`, name, inner)}</div>
    <div class="full" style="background:${sc}"></div>
    ${credit ? `<div class="credit">${credit}</div>` : ""}</div>`);
  // a slow move across the whole shot, or (pan) a quick move to a detail that then holds still
  if (pan) s.cam(`#${id}-pic`, F(name, W, H, ...from), F(name, W, H, ...to), pan.t, pan.dur, pan.ease || "expo.inOut");
  else s.cam(`#${id}-pic`, F(name, W, H, ...from), F(name, W, H, ...to), t0 - 0.3, t1 - t0 + 0.6, "power1.inOut");
  // in
  if (enter === "cut") s.set(`#${id}`, { opacity: 1 }, t0);
  else if (enter === "fade") s.fromTo(`#${id}`, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out" }, t0);
  else if (enter === "wipe") s.set(`#${id}`, { opacity: 1 }, t0).fromTo(`#${id}`, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.55, ease: "expo.out" }, t0);
  else if (enter === "wipeRight") s.set(`#${id}`, { opacity: 1 }, t0).fromTo(`#${id}`, { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.55, ease: "expo.out" }, t0);
  else if (enter === "dive") s.fromTo(`#${id}`, { opacity: 0, scale: 1.22, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "expo.out" }, t0);
  else if (enter === "punch") s.set(`#${id}`, { opacity: 1 }, t0).fromTo(`#${id}`, { scale: 1.08 }, { scale: 1, duration: 0.45, ease: "expo.out", immediateRender: false }, t0);
  // out
  if (exit === "cut") s.set(`#${id}`, { opacity: 0 }, t1);
  else if (exit === "wipeUp") s.to(`#${id}`, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.5, ease: "expo.in" }, t1 - 0.5).set(`#${id}`, { opacity: 0 }, t1);
  else if (exit === "fade") s.to(`#${id}`, { opacity: 0, duration: 0.5, ease: "power1.in" }, t1 - 0.5);
  else if (exit === "rise") s.to(`#${id}`, { opacity: 0, scale: 1.12, filter: "blur(8px)", duration: 0.45, ease: "power2.in" }, t1 - 0.45);
}
// Type that lands: from below with a blur, on its word
function land(s, sel, t, { dy = 40, dur = 0.5 } = {}) {
  return s.fromTo(sel, { opacity: 0, y: dy, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: dur, ease: "expo.out" }, t);
}
function slam(s, sel, t) {
  return s.fromTo(sel, { opacity: 0, scale: 1.35, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.42, ease: "expo.out" }, t);
}
const KT = `
    .plate { overflow: hidden; transform-origin: 50% 50%; }
    .credit { position: absolute; right: 48px; bottom: 120px; font-family: "IBM Plex Sans", sans-serif; font-size: 28px; color: rgba(255,255,255,0.72); text-shadow: 0 1px 6px rgba(0,0,0,0.5); }
    .kt { position: absolute; z-index: 5; font-family: "Lora", serif; font-weight: 600; letter-spacing: -0.01em; line-height: 1.04; opacity: 0; }
    .kt.white { color: #FFFFFF; text-shadow: 0 1px 3px rgba(0,0,0,0.55), 0 3px 14px rgba(0,0,0,0.5), 0 6px 40px rgba(0,0,0,0.45); }
    .kt.ink { color: ${C.ink}; }
    .kt i { font-style: italic; font-weight: 500; }
    .kk { position: absolute; z-index: 5; font-family: "Major Mono Display", monospace; font-size: ${TS.kick}px; letter-spacing: 0.06em; text-transform: lowercase; opacity: 0; }
    .kk.white { color: #FFFFFF; text-shadow: 0 1px 3px rgba(0,0,0,0.7), 0 2px 16px rgba(0,0,0,0.6); }
    .kk.ink { color: ${C.muted}; }
    .flash { position: absolute; inset: 0; background: #FFFFFF; opacity: 0; }`;
const kt = (id, html, { x = 72, y, size = 96, cls = "white", w = 936, align = "left", extra = "" }) =>
  `<div id="${id}" class="kt ${cls}" style="left:${x}px;top:${y}px;width:${w}px;font-size:${size}px;text-align:${align};${extra}">${html}</div>`;
const kk = (id, text, { x = 72, y, cls = "white", w = 936, align = "left" }) =>
  `<div id="${id}" class="kk ${cls}" style="left:${x}px;top:${y}px;width:${w}px;text-align:${align}">${text}</div>`;

// ── THE WORLD: the four institutions in 3D, under the whole film ───────────
// Its schedule: when each plot is built, what moves when, where the camera
// goes, which names stand on the model. Every number is a word's time.
const WORLD = (() => {
  const plotBuild = {
    library: [after("lib1") + 0.15, at("lib2", "fifty") - 0.25],
    fire: [after("fire1") + 0.2, after("fire2", "buckets") + 0.2],
    hospital: [after("hosp1") + 0.15, at("hosp2", "only") + 0.2],
    academy: [at("acad1") - 0.85, after("acad1") + 0.2],
  };
  // the opening: the finished model, then taken apart behind the portrait
  const p0 = at("hook2") - 0.05, p1 = at("hook2", "benjamin") + 0.35, p2 = p1 + 1.6;
  const plinths = { library: p0 - 1, fire: p0 - 1, hospital: p0 - 1, academy: p0 - 1 };
  const ORDERS = { library: [1, 6 + 49 * 0.02], fire: [1, 5 + 29 * 0.04], hospital: [1, 5.8], academy: [1, 6.4] };
  const arrive = (plot, order) => { const [a, b] = plotBuild[plot], [lo, hi] = ORDERS[plot]; return a + (b - a) * (order - lo) / (hi - lo); };
  const d0 = at("hosp2", "private"), d1 = Math.max(after("hosp2"), at("hosp3", "target"));
  const events = {
    libCoins: [at("lib2", "fifty"), after("lib2", "each")],
    libBooks: [after("lib2", "each") + 0.4, Math.min(after("lib2") + 0.8, start("lib3") + 0.2)],
    hospDonors: [d0, d1], hospTrip: d1 + 0.12,
    turn: { rules: at("turn1", "rules") - 0.05, members: at("turn1", "members") - 0.05, money: at("turn1", "money") - 0.05 },
    turnEnd: at("now1", "founder") + 0.4,
    cosmos: {
      // star: when the rings draw (the project, the centre, arrives later)
      rise: [at("now1", "founder"), after("now1") + 0.9], star: at("now1", "from") - 0.1,
      project: at("now2", "new") - 0.15, wire: at("now2", "existing") - 0.1,
      pulses: [at("now2", "tax-deductible"), at("now2", "grants"), at("now2", "contracts")],
      grow: [at("now2", "while"), after("now2") + 0.6],
    },
  };
  // the cosmos's callouts, named as the planets arrive and gone by "From day one"
  const named = [after("now1") + 0.3, at("now2", "from") - 0.3];
  events.cosmos.named = (named[0] + named[1]) / 2;
  const callouts = [
    { id: "members", name: "members", status: "a board and community", q: [-1, -1], t0: named[0] },
    { id: "rules", name: "rules", status: "governance, in place", q: [1, -1], t0: named[0] + 0.2 },
    { id: "money", name: "money", status: "tax-exempt accounts", q: [-1, 1], t0: named[0] + 0.4 },
    { id: "project", name: "a new project", status: "your idea", q: [1, 1], t0: events.cosmos.project + 0.8 },
  ].map((c) => ({ ...c, t1: named[1] }));
  const cam = [
    { t: 0, dur: 0, shot: "sweepA" },
    { t: p0, dur: 3.8, shot: "sweepB" },
    { t: p2, dur: 0.1, shot: "all4" },
    { t: after("lib1") - 0.5, dur: 1.6, shot: "plot:library" },
    { t: at("lib2", "fifty") - 0.4, dur: 1.1, shot: "mid:library" },
    { t: after("lib2", "each") + 0.1, dur: 1.2, shot: "close:library:case" },
    { t: start("fire"), dur: 0.1, shot: "plot:fire" },
    { t: at("fire2", "thirty") - 0.2, dur: 1.4, shot: "mid:fire" },
    { t: start("hosp"), dur: 0.1, shot: "plot:hospital" },
    { t: d0 - 0.2, dur: 1.2, shot: "mid:hospital" },
    { t: d1 + 0.5, dur: 1.4, shot: "close:hospital:rules" },
    { t: at("acad1") - 1.3, dur: 0.1, shot: "plot:academy" },
    { t: start("acad3") - 0.3, dur: 0.1, shot: "close:academy:members" },
    { t: at("acad3", "bought") - 0.4, dur: 1.4, shot: "mid:academy" },
    { t: start("turn") - 0.9, dur: 0.1, shot: "all4" },
    { t: at("now1", "founder") - 0.2, dur: 3.0, shot: "cosmos" },
    { t: at("now2", "while") - 0.3, dur: 2.2, shot: "cosmosClose" },
  ];
  const labels = []; // (the model carries no tags: "rules, members, money" are named at the turn)
  const tints = [
    ["library", "#1F3F6B", "#4E73A3", after("lib1") - 0.4], ["fire", "#7A2817", "#B4583A", after("fire1") - 0.4], ["hospital", "#13514A", "#3F8A80", after("hosp1") - 0.4],
    ["academy", "#264F22", "#5E8A4E", at("acad1") - 1.2], ["neutral", "#E6E1D8", C.paper, start("turn") - 0.9], ["mulvium", "#24122A", "#5A2E4E", at("now1", "founder") - 0.2],
  ];
  return { plinths, preview: [p0, p1, p2], build: plotBuild, events, cam, labels, tints, callouts };
})();
{
  const s = new Scene("world", 0, start("end") + 0.6, 0);
  s.add(`<div id="bg" class="full" style="background:linear-gradient(180deg, #F3F1EC 0%, ${C.paper} 100%)"></div>
    ${WORLD.tints.map(([n, c1, c2]) => `<div id="tint-${n}" class="full" style="opacity:0;background:linear-gradient(180deg, ${c1} 0%, ${c2} 100%)"></div>`).join("")}`);
  WORLD.tints.forEach(([n, , , t], i) => {
    s.set(`#tint-${n}`, { opacity: 0 }, 0).to(`#tint-${n}`, { opacity: 1, duration: 1.2, ease: "power1.inOut" }, t);
    const next = WORLD.tints[i + 1];
    if (next) s.to(`#tint-${n}`, { opacity: 0, duration: 1.2, ease: "power1.inOut" }, next[3] + 1.2);
  });
  s.add(`<canvas id="cv" class="full" width="${W}" height="${H}" data-layout-ignore></canvas>
    <div id="lab" class="full" data-layout-ignore></div>`);
  s.style(`
    .wl { position: absolute; left: 0; top: 0; width: 0; height: 0; opacity: 0; }
    .wl-d { position: absolute; left: -6px; top: -6px; width: 12px; height: 12px; border-radius: 6px; background: #FFFFFF; border: 2px solid rgba(0,0,0,0.25); }
    .wl-l { position: absolute; left: -1px; top: -64px; width: 2px; height: 58px; background: rgba(255,255,255,0.85); }
    .co { position: absolute; left: 0; top: 0; width: 500px; margin-left: -250px; text-align: center; opacity: 0; color: #FFFFFF; text-shadow: 0 1px 10px rgba(0,0,0,0.45); }
    .co b { display: block; font-family: "Major Mono Display", monospace; font-weight: 400; text-transform: lowercase; font-size: ${TS.kick}px; letter-spacing: 0.04em; line-height: 1.1; }
    .co em { display: block; margin-top: 8px; font-family: "Lora", serif; font-style: italic; font-size: ${TS.kick}px; color: rgba(255,255,255,0.85); }
    #lab line { stroke: rgba(255,255,255,0.6); stroke-width: 2; }
    #lab circle { fill: rgba(255,255,255,0.85); }
    .wl-t { position: absolute; bottom: 66px; left: -300px; width: 600px; text-align: center; font-family: "Major Mono Display", monospace; font-size: ${TS.kick}px;
      letter-spacing: 0.04em; color: #FFFFFF; white-space: nowrap; text-shadow: 0 1px 12px rgba(0,0,0,0.55); }`);
  s.tl.push(`tl.to({}, { duration: ${r3(s.t1 - s.t0)} }, 0);`);
  s.scripts.push(`  <script>
    window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
    window.__hf.buildReady["world"] = new Promise((r) => (window.__worldReady = r));
  </script>
  <script type="module">
    import { createWorld } from "../assets/lib/world.js";
    let world = null, last = 0;
    window.addEventListener("hf-seek", (e) => { last = e.detail.time; if (world) world.renderAt(last); });
    createWorld(document.getElementById("world-cv"), document.getElementById("world-lab"), ${JSON.stringify(WORLD, (k, v) => (typeof v === "number" ? r3(v) : v))})
      .then((w) => { world = w; w.renderAt(last); window.__worldReady(); });
  </script>`);
  scenes.push(s);
}

// ── HOOK: a city with none of the four; the payoff shown first; the founder ─
{
  const tB = at("hook2"), tBen = at("hook2", "benjamin");
  const s = new Scene("hook", 0, tBen + 0.6, 10);
  s.raw.push(KT);
  plate(s, "pros", "prospect", { t0: 0, t1: tB, from: [0.16, 0.52, 1.05], to: [0.58, 0.5, 1.12], keep: true, scrim: "both", credit: "Scull &amp; Heap, East Prospect of Philadelphia, 1754", enter: "punch" });
  s.add(kt("y1731", "1731.", { y: 250, size: TS.display }));
  s.add(kk("phl", "philadelphia", { y: 520 }));
  s.fromTo("#y1731", { opacity: 1, scale: 1.18, filter: "blur(6px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.7, ease: "expo.out" }, 0);
  land(s, "#phl", at("hook1", "philadelphia") - 0.1);
  const NONE = [["no1", "No lending library.", "library"], ["no2", "No fire company.", "fire"], ["no3", "No hospital.", "hospital"], ["no4", "No college.", "college"]];
  NONE.forEach(([id, text, w], i) => {
    s.add(kt(id, text, { y: 1330 + i * 96, size: TS.title }));
    slam(s, `#${id}`, at("hook1", "no", i + 1) - 0.05);
    s.sound("impact-bass-2", at("hook1", "no", i + 1) - 0.02, 0.12);
  });
  // "By 1751": a white flash, and the payoff: Nicholas Scull's plan of the city
  // (Scull was one of the Junto), turned north up, and the four lighting in
  // the order they were founded; the fire company had no house, so it lights
  // the built town it served
  const MAP = "philadelphia-1762", MW = SIZES[MAP].w, MH = SIZES[MAP].h, inv = 1 / (W / MW); // labels keep their size inside the scaled picture
  const SITES = [
    ["library", "library company", [0.3947, 0.5548], "#4E73A3", 0.35, "right"], ["fire", "union fire company", [0.8316, 0.463], "#B4583A", 0.75, "glow"],
    ["hospital", "pennsylvania hospital", [0.0632, 0.8034], "#3F8A80", 1.15, "right"], ["academy", "academy", [0.5342, 0.3771], "#5E8A4E", 1.55, "right"],
  ];
  const lights = SITES.map(([id, name, [fx, fy], c, , kind]) => {
    const x = fx * MW, y = fy * MH;
    const mark = kind === "glow"
      ? `<div id="lg-${id}" class="abs" style="left:${x - 360}px;top:${y - 280}px;width:720px;height:560px;border-radius:50%;opacity:0;background:radial-gradient(closest-side, rgba(214,104,50,0.72), rgba(214,104,50,0.32) 60%, rgba(214,104,50,0) 100%)"></div>`
      : `<div id="lr-${id}" class="abs" style="left:${x - 44}px;top:${y - 44}px;width:88px;height:88px;border-radius:44px;border:${4 * inv}px solid ${c};opacity:0"></div>
         <div id="ld-${id}" class="abs" style="left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:22px;background:${c};box-shadow:0 0 0 ${5 * inv}px #F6EEDF,0 3px 12px rgba(0,0,0,0.35);opacity:0"></div>`;
    // a paper tag beside the light: to its right, its left, or under the glow
    const pos = kind === "glow" ? `left:${x + 170}px;top:${y - 30}px;transform:translateX(-100%)` : kind === "left" ? `left:${x - 40}px;top:${y - 30}px;transform:translateX(-100%)` : `left:${x + 40}px;top:${y - 30}px`;
    return `${mark}<div class="abs" style="${pos}"><div id="ll-${id}" class="maplab" style="font-size:${TS.kick * inv}px;opacity:0">${name}</div></div>`;
  }).join("");
  plate(s, "map", MAP, { t0: tB, t1: tBen + 0.6, from: [0.5, 0.5, 1.0], to: [0.5, 0.5, 1.06], scrim: "high", credit: "Nicholas Scull, plan of Philadelphia, 1762 · Library of Congress", enter: "cut", inner: lights });
  s.style(`.maplab { font-family: "Major Mono Display", monospace; text-transform: lowercase; letter-spacing: 0.04em; color: #1B1613; white-space: nowrap;
    background: rgba(246,238,223,0.94); padding: 6px 16px 9px; border-radius: 6px; box-shadow: 0 2px 10px rgba(40,25,10,0.25); }`);
  SITES.forEach(([id, , , , dt, kind]) => {
    const t = tB + dt;
    if (kind === "glow") s.fromTo(`#lg-${id}`, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }, t);
    else {
      s.fromTo(`#ld-${id}`, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, t);
      s.fromTo(`#lr-${id}`, { opacity: 0.9, scale: 0.5 }, { opacity: 0, scale: 2.6, duration: 0.9, ease: "power2.out" }, t);
    }
    land(s, `#ll-${id}`, t + 0.1, { dy: 10, dur: 0.4 });
    s.sound("click-soft", t, 0.22);
  });
  s.add(`<div id="fl" class="flash"></div>`);
  s.fromTo("#fl", { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power1.in" }, tB - 0.12).to("#fl", { opacity: 0, duration: 0.5, ease: "power2.out" }, tB);
  s.set("#y1731, #phl, #no1, #no2, #no3, #no4", { opacity: 0 }, tB);
  s.sound("riser", tB - 1.9, 0.12).sound("impact-bass-1", tB, 0.22);
  s.add(kt("y1751", "1751", { y: 200, size: TS.display, extra: "z-index:6" }));
  s.add(kt("all4", "<i>All four.</i>", { y: 400, size: TS.head, extra: "z-index:6" }));
  slam(s, "#y1751", at("hook2", "1751") - 0.05);
  land(s, "#all4", at("hook2", "all") - 0.1);
  s.to("#y1751, #all4", { opacity: 0, filter: "blur(8px)", duration: 0.25 }, tBen - 0.1);
  scenes.push(s);
}

// ── WHO: the founder, in quick cuts; two signatures; one method ────────────
{
  const tBen = at("hook2", "benjamin");
  const s = new Scene("who", tBen - 0.05, start("lib") + 0.3, 11); // until the Junto's plate has wiped in over it
  s.raw.push(KT);
  plate(s, "por", "portrait", { t0: tBen, t1: at("who1", "printer"), from: [0.53, 0.42, 1.0], to: [0.53, 0.33, 1.25], credit: "Joseph-Siffred Duplessis, c. 1785", enter: "wipe" });
  s.add(kt("name", "Benjamin<br>Franklin", { y: 1060, size: TS.head }));
  land(s, "#name", tBen + 0.05, { dy: 60, dur: 0.7 });
  s.to("#name", { opacity: 0, duration: 0.2 }, at("who1", "printer") - 0.05);
  // printer, writer, scientist, inventor: a cut on every word
  const ROLES = [["printer", "press", "Printer.", [0.5, 0.5, 1.05], [0.5, 0.46, 1.18]], ["writer", "martin", "Writer.", [0.5, 0.36, 1.05], [0.5, 0.32, 1.2]],
    ["scientist", "kite", "Scientist.", [0.5, 0.32, 1.0], [0.5, 0.28, 1.15]], ["inventor", "stove", "Inventor.", [0.36, 0.52, 1.0], [0.4, 0.5, 1.12]]];
  ROLES.forEach(([w, img, word, a, b], i) => {
    const t0 = at("who1", w) - 0.04, t1 = i < 3 ? at("who1", ROLES[i + 1][0]) - 0.04 : at("who2") - 0.1;
    plate(s, `r${i}`, img, { t0, t1, from: a, to: b, enter: "punch" });
    s.add(kt(`rw${i}`, word, { y: 1560, size: TS.head, extra: "z-index:5" }));
    slam(s, `#rw${i}`, t0);
    s.set(`#rw${i}`, { opacity: 0 }, t1);
    s.sound("whoosh-short", t0, 0.14);
  });
  // two signatures: Trumbull's Declaration, then Franklin's name on the Constitution
  const tC = at("who2", "constitution") - 0.1;
  plate(s, "trum", "trumbull", { t0: at("who2") - 0.1, t1: tC, from: [0.3, 0.5, 1.0], to: [0.66, 0.48, 1.05], credit: "John Trumbull, Declaration of Independence, 1818", enter: "wipeRight" });
  // the page, then a quick pan onto "B Franklin" (x 2900-3290, y 3600-3700 on
  // the scan), held still and ringed
  const SIG = { x: 2900, y: 3600, w: 390, h: 100 }, iw = SIZES.constitution4.w, ih = SIZES.constitution4.h;
  const CF = [(SIG.x + SIG.w / 2) / iw, (SIG.y + SIG.h / 2) / ih, 4.4], pan = { t: tC + 0.2, dur: 0.75 };
  plate(s, "con", "constitution4", { t0: tC, t1: at("who3") - 0.15, from: [0.62, 0.66, 1.2], to: CF, pan, credit: "Constitution, p. 4, 1787 · National Archives", scrim: "low", enter: "dive", exit: "rise" });
  const cf = frame("constitution4", W, H, ...CF);
  const RX = cf.x + (SIG.x + SIG.w / 2) * cf.scale, RY = cf.y + (SIG.y + SIG.h / 2) * cf.scale, rx = (SIG.w * cf.scale) / 2 + 50, ry = (SIG.h * cf.scale) / 2 + 42;
  s.add(`<svg id="ring" class="abs" style="left:${r3(RX - rx - 20)}px;top:${r3(RY - ry - 20)}px;width:${r3(2 * rx + 40)}px;height:${r3(2 * ry + 40)}px;overflow:visible;z-index:6" viewBox="0 0 ${r3(2 * rx + 40)} ${r3(2 * ry + 40)}"><ellipse cx="${r3(rx + 20)}" cy="${r3(ry + 20)}" rx="${r3(rx)}" ry="${r3(ry)}" fill="none" stroke="${C.clay}" stroke-width="9" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110" stroke-linecap="round"/></svg>`);
  s.fromTo("#ring ellipse", { strokeDashoffset: 110 }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" }, Math.max(pan.t + pan.dur, at("who2", "one") - 0.5));
  s.set("#ring", { opacity: 0 }, at("who3") - 0.15);
  s.add(kt("one6", `1 <i style="font-size:0.5em">of</i> 6`, { y: 1330, size: TS.display, align: "center", extra: "z-index:6" }));
  slam(s, "#one6", at("who2", "six") - 0.05);
  s.set("#one6", { opacity: 0 }, at("who3") - 0.15);
  // the method, drawn: a public need (an empty ring), then contributions from
  // many members streaming in from every side until the ring is full
  const tNeed = at("who3", "identify") - 0.1, tPool = at("who3", "pooling") - 0.1, tMany = after("who3", "members");
  s.add(`<div id="mg" class="full" style="opacity:0;background:radial-gradient(120% 80% at 50% 38%, #3A2A22 0%, #1E1612 60%, #120D0B 100%)"></div>`);
  s.set("#mg", { opacity: 1 }, at("who3") - 0.4);
  const RC = { x: 540, y: 880, r: 210 };
  s.add(`<svg id="need" class="abs" style="left:0;top:0;width:${W}px;height:${H}px;overflow:visible" viewBox="0 0 ${W} ${H}">
    <circle id="needfill" cx="${RC.x}" cy="${RC.y}" r="${RC.r}" fill="#F0D5BB" opacity="0"/>
    <circle id="needring" cx="${RC.x}" cy="${RC.y}" r="${RC.r}" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="5" stroke-dasharray="14 12" pathLength="1000" transform="rotate(-90 ${RC.x} ${RC.y})"/></svg>`);
  s.fromTo("#needring", { strokeDashoffset: 1000, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: 0.9, ease: "power2.inOut" }, tNeed);
  // one label under the ring, which changes as the need is met
  s.add(kk("needk", "a public need", { y: RC.y + RC.r + 44, align: "center" }));
  s.add(kk("metk", "met by many members", { y: RC.y + RC.r + 44, align: "center" }));
  land(s, "#needk", at("who3", "need") - 0.1, { dy: 16 });
  // members: small spheres in the cosmos's pastels, scattered round the ring
  // from the start of the line, then pooled into places packed inside it (a
  // sunflower spiral)
  const PAST = ["#C4DDB8", "#B8CAE0", "#E0B8C8", "#F0D5BB"], N = 42, dots = [];
  for (let i = 0; i < N; i++) {
    const a = i * 2.39996, rr = (RC.r - 26) * Math.sqrt((i + 0.5) / N);
    const e = (i * 137.5 * Math.PI) / 180 + 0.6, far = 330 + ((i * 53) % 170);
    const sx = Math.min(1020, Math.max(60, RC.x + far * Math.cos(e))), sy = Math.min(1420, Math.max(400, RC.y + far * 1.25 * Math.sin(e)));
    dots.push({ id: `dt${i}`, c: PAST[i % 4], tx: RC.x + rr * Math.cos(a), ty: RC.y + rr * Math.sin(a), sx, sy });
  }
  s.add(dots.map((d) => `<div id="${d.id}" class="abs" style="left:-13px;top:-13px;width:26px;height:26px;border-radius:13px;opacity:0;background:radial-gradient(circle at 35% 30%, #FFFFFF 0%, ${d.c} 45%, ${d.c} 100%);box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`).join(""));
  dots.forEach((d, i) => {
    const t = tPool + (tMany - tPool) * (i / N);
    s.set(`#${d.id}`, { x: d.sx, y: d.sy, opacity: 0 }, 0);
    s.to(`#${d.id}`, { opacity: 0.55, duration: 0.6, ease: "power1.out" }, at("who3") - 0.35 + (i % 12) * 0.04);
    s.to(`#${d.id}`, { y: d.sy - 18, duration: t - at("who3") + 0.35, ease: "none" }, at("who3") - 0.35);
    s.to(`#${d.id}`, { x: d.tx, y: d.ty, opacity: 1, duration: 0.9, ease: "power3.inOut" }, t);
  });
  // full: the need is met
  s.to("#needfill", { opacity: 0.22, duration: 0.6, ease: "power1.out" }, tMany + 0.5);
  s.to("#needring", { strokeDasharray: "1000 0", duration: 0.5, ease: "power1.out" }, tMany + 0.5);
  s.to("#needk", { opacity: 0, filter: "blur(6px)", duration: 0.3 }, at("who3", "many") - 0.2);
  land(s, "#metk", at("who3", "many"), { dy: 16 });
  s.sound("click-soft", tNeed + 0.1, 0.2);
  s.add(kt("mk", "One method", { y: 330, size: TS.title, align: "center" }));
  land(s, "#mk", at("who3", "one") - 0.1);
  s.to("#mk, #metk", { opacity: 0, filter: "blur(8px)", duration: 0.3 }, start("lib") - 0.5);
  scenes.push(s);
}

// ── LIB: the Junto; the library built and paid for; the Library Company today
{
  const s = new Scene("lib", start("lib") - 0.4, start("fire") - 0.1, 12);
  s.raw.push(KT);
  // the Junto's members, from Franklin's own list, over the city they worked in
  plate(s, "jun", "statehouse", { t0: start("lib") - 0.35, t1: after("lib1") + 0.15, from: [0.5, 0.5, 1.0], to: [0.45, 0.55, 1.2], scrim: "both", credit: "The State House, from Scull &amp; Heap, 1754", enter: "wipe", exit: "wipeUp" });
  s.add(kk("jk", "the junto, 1727", { y: 250 }));
  land(s, "#jk", at("lib1", "junto") - 0.1);
  const ROSTER = [["Joseph Breintnal", "scrivener"], ["Thomas Godfrey", "glazier"], ["Nicholas Scull", "surveyor"], ["William Parsons", "shoemaker"], ["William Maugridge", "joiner"], ["Hugh Meredith", "printer"]];
  ROSTER.forEach(([n, t], i) => {
    s.add(`<div id="ro${i}" class="abs" style="left:72px;top:${1260 + i * 84}px;width:936px;opacity:0;z-index:5">
      <span class="serif" style="font-size:${TS.body}px;font-weight:600;color:#FFF;text-shadow:0 1px 3px rgba(0,0,0,.6),0 3px 16px rgba(0,0,0,.55)">${n}</span>
      <span class="kk" style="position:relative;opacity:1;font-size:${TS.kick}px;margin-left:18px;color:#F6C9A8;text-shadow:0 1px 3px rgba(0,0,0,.7),0 2px 14px rgba(0,0,0,.6)">${t}</span></div>`);
    land(s, `#ro${i}`, at("lib1", "tradesmen") - 0.25 + i * 0.22, { dy: 24 });
  });
  s.set("#jk, #ro0, #ro1, #ro2, #ro3, #ro4, #ro5", { opacity: 0 }, after("lib1") - 0.3);
  s.sound("whoosh", after("lib1") - 0.3, 0.16);
  // the arithmetic, a step at a time, set on the ground under the model as the
  // subscriptions run in: 50 x 40 shillings = 2,000 shillings = £100 (20s to
  // the pound); then 50 x 10s = 500s = £25 a year
  const c0 = at("lib2", "fifty"), c1 = after("lib2", "each");
  const NUM = "font-weight:600;color:#FFFFFF", LBL = "font-size:${TS.body}px;font-style:italic;color:rgba(255,255,255,0.85)";
  s.add(`<div id="sumbg" class="full" style="opacity:0;background:linear-gradient(180deg, rgba(8,14,32,0) 58%, rgba(8,14,32,0.7) 70%, rgba(8,14,32,0.82) 100%)"></div>`);
  s.fromTo("#sumbg", { opacity: 0 }, { opacity: 1, duration: 0.4 }, c0 - 0.3).to("#sumbg", { opacity: 0, duration: 0.3 }, start("lib3") - 0.35);
  s.add(`<div id="sumK" class="kk white" style="left:72px;top:${LOW - 110}px;width:936px">subscribers × shillings each</div>
    <div id="sumA" class="kt white abs" style="left:72px;top:${LOW - 60}px;width:936px;font-size:${TS.head}px"><span id="n50" style="${NUM}">0</span> <span id="x40" style="opacity:0">× 40s</span></div>
    <div id="sumB" class="kt white abs" style="left:72px;top:${LOW + 90}px;width:936px;font-size:${TS.title}px"><span style="${LBL}">= </span><span id="s2k">2,000s</span><span style="${LBL}"> = </span><span id="fund" style="color:#F6C9A8">£100</span></div>
    <div id="sumC" class="kt white abs" style="left:72px;top:${LOW + 210}px;width:936px;font-size:${TS.body}px;font-weight:500"><i>then 10s a year each</i> = £25 a year</div>`);
  land(s, "#sumK", c0 - 0.2, { dy: 12 });
  s.set("#sumA", { opacity: 1 }, c0 - 0.1).count("#n50", c0, at("lib2", "forty") - c0, 0, 50);
  s.fromTo("#sumA", { filter: "blur(8px)", y: 30 }, { filter: "blur(0px)", y: 0, duration: 0.5, ease: "expo.out" }, c0 - 0.1);
  land(s, "#x40", at("lib2", "forty") - 0.1, { dy: 0 });
  land(s, "#sumB", at("lib2", "each") - 0.15);
  land(s, "#sumC", at("lib2", "ten") - 0.1);
  s.to("#sumK, #sumA, #sumB, #sumC", { opacity: 0, filter: "blur(8px)", duration: 0.25 }, start("lib3") - 0.35);
  s.sound("typing", c0, 0.12);
  // through the bookcase into the Library Company's hall
  plate(s, "hall", "library-hall", { t0: start("lib3") - 0.3, t1: start("fire") - 0.1, from: [0.42, 0.45, 1.25], to: [0.34, 0.42, 1.55], credit: "William Birch, Library and Surgeons Hall, 1799", enter: "dive", exit: "cut" });
  s.add(kt("today", "1731 <i>→ today</i>", { y: 250, size: TS.head }));
  land(s, "#today", at("lib3", "today") - 0.2);
  scenes.push(s);
}

// ── FIRE: the proverb, set large; the company and its thirty buckets ───────
{
  const s = new Scene("fire", start("fire") - 0.1, start("hosp") - 0.1, 13);
  s.raw.push(KT);
  plate(s, "buck", "bucket", { t0: start("fire") - 0.1, t1: start("fire2") - 0.1, from: [0.5, 0.55, 1.05], to: [0.5, 0.45, 1.3], scrim: "both", credit: "Leather fire bucket, Dedham Historical Society", enter: "cut", exit: "wipeUp" });
  s.add(kk("gz", "pennsylvania gazette · 1735", { y: 250 }));
  land(s, "#gz", at("fire1", "newspaper") - 0.1);
  s.add(kt("q", words("An ounce of prevention is worth a pound of cure."), { y: 420, size: TS.head, extra: "font-style:italic;font-weight:500" }));
  s.set("#q", { opacity: 1 }, at("fire1", "an") - 0.1);
  s.fromTo("#q .w", { opacity: 0, y: 20, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.25, ease: "power2.out", stagger: (at("fire1", "cure") - at("fire1", "an")) / 10 }, at("fire1", "an") - 0.1);
  s.to("#gz, #q", { opacity: 0, duration: 0.3 }, start("fire2") - 0.45);
  s.sound("whoosh", start("fire2") - 0.45, 0.16);
  // on the model: the count of volunteers, then of buckets
  s.add(kt("v30", `<span id="n30">0</span> <i style="font-size:0.42em;opacity:0.8">volunteers</i>`, { y: LOW - 20, size: TS.display }));
  land(s, "#v30", at("fire2", "thirty") - 0.15).count("#n30", at("fire2", "thirty") - 0.1, 0.9, 0, 30);
  s.add(kt("b30", `30 <i style="font-size:0.42em;opacity:0.8">leather buckets</i>`, { y: LOW + 190, size: TS.head }));
  land(s, "#b30", at("fire2", "buckets") - 0.2);
  scenes.push(s);
}

// ── HOSP: Dr Bond's proposal; the matching grant, run; the Act itself ──────
{
  const s = new Scene("hosp", start("hosp") - 0.1, start("acad") - 0.1, 14);
  s.raw.push(KT);
  plate(s, "bond", "bond", { t0: start("hosp") - 0.1, t1: at("hosp1", "hospital") - 0.05, from: [0.5, 0.36, 1.0], to: [0.5, 0.3, 1.2], scrim: "both", credit: "Thomas Bond", enter: "wipeRight" });
  plate(s, "hos", "hospital-wing", { t0: at("hosp1", "hospital") - 0.05, t1: after("hosp1") + 0.2, from: [0.5, 0.45, 1.0], to: [0.56, 0.5, 1.2], scrim: "both", credit: "Pennsylvania Hospital · HABS, Library of Congress", enter: "punch", exit: "wipeUp" });
  s.add(kk("bk", "1751", { y: 250 }));
  land(s, "#bk", at("hosp1", "1751") - 0.1);
  s.set("#bk", { opacity: 0 }, after("hosp1") - 0.3);
  // the condition, in large type on the model
  const d0 = at("hosp2", "private"), d1 = Math.max(after("hosp2"), at("hosp3", "target")), tT = d1 + 0.12;
  s.add(kk("ak", "the assembly", { y: 250 }));
  s.add(kt("an", "£2,000", { y: 300, size: TS.display, extra: "color:rgba(255,255,255,0.7)" }));
  land(s, "#ak", at("hosp2", "assembly") - 0.1);
  land(s, "#an", at("hosp2", "two") - 0.1);
  s.add(kt("oif", "<i>only if</i>", { y: 470, size: TS.head, extra: "color:#F6C9A8" }));
  slam(s, "#oif", at("hosp2", "only") - 0.05);
  s.add(kk("dk", "private donors", { y: LOW }));
  s.add(kt("dn", "£0", { y: LOW + 50, size: TS.display, extra: "color:#F6C9A8" }));
  land(s, "#dk", d0 - 0.2); land(s, "#dn", d0 - 0.2);
  s.count("#dn", d0, d1 - d0 + 0.1, 0, 2000, "'£' + (Math.round(v / 100) * 100).toLocaleString('en-GB')");
  s.fromTo("#an", { color: "rgba(255,255,255,0.7)" }, { color: "#FFFFFF", duration: 0.3 }, tT + 0.45);
  s.sound("impact-bass-1", tT + 0.47, 0.22);
  s.to("#ak, #an, #oif, #dk, #dn", { opacity: 0, filter: "blur(8px)", duration: 0.3 }, d1 + 1.0);
  // out of the lectern, to the hospital itself: the Pine Building, still standing
  plate(s, "act", "hospital-pine", { t0: at("hosp3", 5) - 0.2, t1: start("acad") - 0.1, from: [0.5, 0.42, 1.0], to: [0.5, 0.36, 1.12], scrim: "low", credit: "Pennsylvania Hospital, Pine Building · HABS, Library of Congress", enter: "dive", exit: "fade" });
  scenes.push(s);
}

// ── ACAD: the hall rises; the 1749 plan; the trustees; the university ──────
{
  const s = new Scene("acad", start("acad") - 0.1, start("turn") - 0.2, 15);
  s.raw.push(KT);
  s.add(kt("ac", `Academy <i>1751</i>`, { y: 250, size: TS.head }));
  land(s, "#ac", at("acad1", "academy") - 0.1);
  s.to("#ac", { opacity: 0, filter: "blur(8px)", duration: 0.25 }, start("acad2") - 0.3);
  // the plan, in Franklin's own printing, and what it asked for
  plate(s, "prop", "proposals", { t0: start("acad2") - 0.2, t1: start("acad3") - 0.1, from: [0.5, 0.36, 1.12], to: [0.5, 0.4, 1.02], scrim: "deep", credit: "Franklin, Proposals Relating to the Education of Youth in Pensilvania, 1749", enter: "wipe", exit: "wipeUp" });
  s.add(kt("y1749", "1749", { y: 1270, size: TS.display, extra: "z-index:5" }));
  land(s, "#y1749", at("acad2", "1749") - 0.15);
  const AIMS = [["a1", "A school for <i>useful</i> subjects,", "useful"], ["a2", "taught in English,", "english"], ["a3", "alongside Latin and Greek.", "alongside"]];
  AIMS.forEach(([id, text, w], i) => { s.add(kt(id, text, { y: 1450 + i * 82, size: TS.body, extra: "z-index:5" })); land(s, `#${id}`, at("acad2", w) - 0.1); });
  s.to("#y1749, #a1, #a2, #a3", { opacity: 0, filter: "blur(8px)", duration: 0.25 }, start("acad3") - 0.3);
  // the trustees, on the model: their bench and their subscription box; a
  // shade at the top of the frame keeps the type off the model
  s.add(`<div id="trbg" class="full" style="opacity:0;background:linear-gradient(180deg, rgba(10,24,10,0.78) 0%, rgba(10,24,10,0.55) 22%, rgba(10,24,10,0) 36%)"></div>`);
  s.fromTo("#trbg", { opacity: 0 }, { opacity: 1, duration: 0.35 }, at("acad3", "twenty-four") - 0.3).to("#trbg", { opacity: 0, duration: 0.3 }, start("acad4") - 0.3);
  s.add(kt("tr24", `24 <i style="font-size:0.42em;opacity:0.85">trustees</i>`, { y: 250, size: TS.display }));
  slam(s, "#tr24", at("acad3", "twenty-four") - 0.05);
  s.add(kt("pres", "<i>Franklin, president</i>", { y: 470, size: TS.title }));
  land(s, "#pres", at("acad3", "president") - 0.1);
  s.to("#tr24, #pres", { opacity: 0, filter: "blur(8px)", duration: 0.3 }, start("acad4") - 0.3);
  // what it became
  plate(s, "pen", "penn", { t0: start("acad4") - 0.1, t1: start("turn") - 0.2, from: [0.5, 0.5, 1.15], to: [0.48, 0.42, 1.0], credit: "College Hall, University of Pennsylvania", enter: "wipe", exit: "wipeUp" });
  s.add(kt("upenn", "University<br>of Pennsylvania", { y: 1400, size: TS.head, extra: "z-index:5" }));
  land(s, "#upenn", at("acad4", "university") - 0.1, { dy: 50, dur: 0.6 });
  s.to("#upenn", { opacity: 0, duration: 0.3 }, start("turn") - 0.7); // before the plate wipes away
  scenes.push(s);
}

// ── TURN: four foundations, built four times, beside everything else ──────
{
  const s = new Scene("turn", start("turn") - 0.2, start("now") - 0.2, 16);
  s.raw.push(KT);
  const RMM = [["rw", "Rules written.", "rules"], ["mr", "Members recruited.", "members"], ["mo", "Money raised.", "money"]];
  RMM.forEach(([id, text, w], i) => {
    s.add(kt(id, text, { y: LOW - 40 + i * 98, size: TS.title, cls: "ink" }));
    land(s, `#${id}`, at("turn1", w) - 0.1);
    s.sound("click-soft", at("turn1", w) - 0.05, 0.22);
  });
  s.to("#rw, #mr, #mo", { opacity: 0, filter: "blur(8px)", duration: 0.25 }, at("turn2", "four") - 0.35);
  s.add(kt("x4", `<i>Four times.</i>`, { y: 260, size: TS.display, cls: "ink", extra: `color:${C.clay}` }));
  slam(s, "#x4", at("turn2", "four") - 0.05);
  s.sound("impact-bass-2", at("turn2", "four"), 0.18);
  s.set("#x4", { opacity: 0 }, at("turn2", "printing") - 0.05);
  // beside a printing business, an almanac and his experiments: a cut each
  const SIDE = [["printing", "press", "a printing business", [0.5, 0.5, 1.1], [0.5, 0.45, 1.25]], ["almanac", "almanac", "an almanac", [0.5, 0.3, 1.0], [0.5, 0.36, 1.15]], ["experiments", "kite", "experiments<br>with electricity", [0.5, 0.25, 1.1], [0.5, 0.22, 1.3]]];
  SIDE.forEach(([w, img, text, a, b], i) => {
    const t0 = at("turn2", w) - 0.05, t1 = i < 2 ? at("turn2", SIDE[i + 1][0]) - 0.05 : start("now") - 0.6;
    plate(s, `sd${i}`, img, { t0, t1, from: a, to: b, enter: "punch", exit: i < 2 ? "cut" : "fade" });
    s.add(kt(`st${i}`, `<i>${text}</i>`, { y: 1560, size: TS.head, extra: "z-index:5" }));
    slam(s, `#st${i}`, t0);
    s.set(`#st${i}`, { opacity: 0 }, t1);
    s.sound("whoosh-short", t0, 0.14);
  });
  scenes.push(s);
}

// ── NOW: the foundations rise and become Mulvium's cosmos; a new project ───
{
  const s = new Scene("now", start("now") - 0.6, start("end") - 0.35, 17);
  s.raw.push(KT);
  const L1 = [["f1", "A founder today", "founder"], ["f2", "does not have to start", "does"], ["f3", "<i>from nothing.</i>", "from"]];
  L1.forEach(([id, text, w], i) => { s.add(kt(id, text, { y: 240 + i * 100, size: TS.title })); land(s, `#${id}`, at("now1", w) - 0.1); });
  s.sound("riser", at("now1") - 0.4, 0.14).sound("impact-bass-1", at("now2", "sponsor"), 0.22);
  s.to("#f1, #f2, #f3", { opacity: 0, filter: "blur(8px)", duration: 0.3 }, at("now2") - 0.2);
  s.add(kk("fs", "fiscal sponsorship", { y: 250 }));
  land(s, "#fs", at("now2", "fiscal") - 0.1);
  s.sound("whoosh", at("now2", "new") - 0.3, 0.16);
  s.add(kt("d1", "From day one:", { y: 300, size: TS.title }));
  land(s, "#d1", at("now2", "from") - 0.1);
  const CAN = [["c1", "tax-deductible gifts", "tax-deductible"], ["c2", "grants", "grants"], ["c3", "contracts", "contracts"]];
  CAN.forEach(([id, text, w], i) => {
    s.add(kt(id, `<span style="color:#F2B8CF">✓</span> ${text}`, { y: LOW - 30 + i * 92, size: TS.title }));
    land(s, `#${id}`, at("now2", w) - 0.1);
    s.sound("click-soft", at("now2", w) - 0.05, 0.25);
  });
  s.add(kt("work", "<i>while the founder does the work.</i>", { y: LOW + 270, size: TS.body, extra: "opacity:0;color:rgba(255,255,255,0.8)" }));
  land(s, "#work", at("now2", "while") - 0.1);
  scenes.push(s);
}

// ── END: the launch film's network, from its point outward; the wordmark ───
// cosmos-close.mp4 is the launch film from 64.6 s on, without its words.
// endcut.sh edits it into cosmos-close-held.mp4 for the last lines: the
// network gathers to its point (frames 21-51), breathes there for HOLD seconds
// under "Mulvium is building…", which sits below it, opens out on "The next
// great expansion", then gathers straight into the wordmark, its typefaces
// run at 2.5x. The hold is set so the network opens as "expansion" is said.
const PLATE = { file: "cosmos-close-held.mp4", hold: 2.86, length: 14.3 };
{
  const t0 = start("end") - 0.35;
  const want = at("end2", "expansion") - 0.2 - (t0 + 31 / 30);
  if (Math.abs(want - PLATE.hold) > 0.05) console.warn(`the network's hold should be ${want.toFixed(2)} s: run ./endcut.sh ${want.toFixed(2)}`);
  const t1 = t0 + PLATE.length;
  const s = new Scene("end", t0, t1, 9);
  s.add(`<div id="pw" class="full" style="opacity:0"><video id="plate" class="full" src="assets/${PLATE.file}" muted playsinline style="object-fit:cover"></video></div>`);
  s.fromTo("#pw", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power1.out" }, t0);
  s.mediaStart = 0;
  s.add(`<div id="build" class="serif abs" style="left:90px;top:1250px;width:900px;text-align:center;font-size:${TS.body}px;line-height:1.25">${words("Mulvium is building that structure for the next Franklin.")}</div>`);
  s.words("#build .w", at("end1") - 0.05, { stagger: (after("end1") - at("end1") - 0.3) / 9 });
  s.leave("#build", at("end2") - 0.15, 0.25);
  s.add(`<div id="close" class="serif abs" style="left:90px;top:720px;width:900px;text-align:center;font-size:${TS.body}px;line-height:1.25">${words("The next great expansion of human creativity will come from making it easier to create")}<br><span style="font-size:${TS.head}px;color:${C.clay};font-style:italic">${words("institutions.")}</span></div>`);
  s.words("#close .w", at("end2", "the") - 0.05, { stagger: (at("end2", "institutions") - at("end2", "the")) / 15 });
  s.leave("#close", after("end2") + 0.3, 0.3); // gone before the wordmark forms where it sits
  s.sound("riser", at("end2", "institutions") - 1.6, 0.2);
  s.sound("impact-bass-1", t0 + 1.033 + PLATE.hold + 140 / 30 - 0.4 + 66 / 30, 0.16); // the wordmark forms
  scenes.push(s);
}

// ── Captions: only where the screen does not already say it ────────────────
// Each line is subtitled over a span of its words, [from, to): the rest of it
// is set on screen in type, or carried by the picture alone.
const SPAN = {
  hook2: [9], who2: [0, 11], who3: [0, 6], lib1: [0, 4], lib2: [0, 12], lib3: [0], fire1: [0, 13], fire2: [0, 9],
  hosp1: [0], hosp3: [5], acad2: [0, 6], acad3: [10], turn1: [0, 8], now2: [0, 13],
};
const groups = [];
for (const l of T.lines) {
  const [from, to = Infinity] = SPAN[l.id] || [Infinity];
  let g = [];
  l.words.forEach((w, i) => {
    if (i < from || i >= to) return;
    g.push(w);
    const next = l.words[i + 1], len = g.map((x) => x[0]).join(" ").length;
    if (!next || i + 1 >= to || /[.:;]$/.test(w[0]) || (/,$/.test(w[0]) && g.length >= 3) || g.length >= 6 || len > 34 || next[1] - w[2] > 0.15) { groups.push(g); g = []; }
  });
}
const caps = new Scene("captions", 0, T.duration || VOICE_END + 8, 50);
groups.forEach((g, i) => {
  const t0 = g[0][1] - 0.05, t1 = Math.min(g[g.length - 1][2] + 0.25, groups[i + 1] ? groups[i + 1][0][1] - 0.06 : 1e9);
  caps.add(`<div id="g${i}" class="cap"><span>${g.map((w) => w[0]).join(" ")}</span></div>`);
  caps.set(`#g${i}`, { opacity: 1, visibility: "visible" }, t0).set(`#g${i}`, { opacity: 0, visibility: "hidden" }, t1);
});
caps.style(`
    #root { background: none; }
    .cap { position: absolute; left: 0; top: 1440px; width: ${W}px; height: 130px; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; }
    .cap span { max-width: 900px; text-align: center; font-family: "Libre Caslon Text", serif; font-weight: 400; font-size: 46px; line-height: 1.3; color: #F6EEDF;
      background: rgba(24, 17, 12, 0.84); border-radius: 6px; padding: 8px 26px 12px; box-decoration-break: clone; -webkit-box-decoration-break: clone; }`);
const content = scenes.filter((s) => s.id !== "chrome" && s.id !== "world");
caps.t1 = content[content.length - 1].t0;

// ── The root: scenes, captions, voice, music, sound ────────────────────────
const DUR = r3(content[content.length - 1].t1);
fs.mkdirSync(path.join(HERE, "compositions"), { recursive: true });
for (const f of fs.readdirSync(path.join(HERE, "compositions"))) fs.unlinkSync(path.join(HERE, "compositions", f));
for (const s of [...scenes, caps]) fs.writeFileSync(path.join(HERE, "compositions", `${s.id}.html`), s.file());
// Each scene runs until the next one is on top of it; the chrome over all of them
const hosts = scenes.map((s, i) => {
  const next = content[content.indexOf(s) + 1];
  const end = s.id === "chrome" || s.id === "world" ? s.t1 : next ? Math.max(s.t1, next.t0 + 0.05) : s.t1;
  return `      <div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${r3(s.t0)}" data-duration="${r3(end - s.t0)}" data-track-index="${i % 2 + 1}" data-track-kind="graphics" data-width="${W}" data-height="${H}" style="z-index:${s.z}"></div>`;
});
const end = scenes[scenes.length - 1];
// Each effect on the first lane that is free when it starts
const SFX_LEN = { "click-soft": 0.37, "impact-bass-1": 2.12, "impact-bass-2": 2.59, "key-press": 0.43, riser: 10.03, typing: 1.54, "whoosh-short": 0.57, whoosh: 0.57 };
const lanes = [];
const sfx = scenes.flatMap((s) => s.sfx).sort((a, b) => a.t - b.t).map((x, i) => {
  const len = SFX_LEN[x.name];
  let k = lanes.findIndex((free) => free <= x.t);
  if (k < 0) k = lanes.push(0) - 1;
  lanes[k] = x.t + len + 0.05;
  return `      <audio id="sfx${i}" class="clip" src="assets/sfx/${x.name}.mp3" data-start="${x.t}" data-duration="${len}" data-track-index="${12 + k}" data-volume="${x.vol}"></audio>`;
});
const index = `<!doctype html>
<html lang="en" data-resolution="portrait" data-composition-variables='[
  {"id":"color-paper","type":"color","label":"Ground","default":"${C.paper}"},
  {"id":"color-ink","type":"color","label":"Ink","default":"${C.ink}"},
  {"id":"color-clay","type":"color","label":"Accent","default":"${C.clay}"}
]'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>Franklin, institution builder</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${C.paper}; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="${W}" data-height="${H}" data-motion-blur="off">
${hosts.join("\n")}
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${r3(caps.t1)}" data-track-index="3" data-track-kind="captions" data-width="${W}" data-height="${H}" style="z-index:50"></div>
      <audio id="voice" class="clip" src="assets/narration.wav" data-start="0" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music-bed.m4a" data-start="0" data-duration="${DUR}" data-track-index="11" data-volume="1"></audio>
${sfx.join("\n")}
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(HERE, "index.html"), index);
// the plate's in-point is a property of its <video>
const endFile = path.join(HERE, "compositions", "end.html");
fs.writeFileSync(endFile, fs.readFileSync(endFile, "utf8").replace('<video id="end-plate"', `<video id="end-plate" data-start="0" data-media-start="${end.mediaStart}" data-duration="${r3(end.t1 - end.t0)}"`).replace('class="full" src', 'class="full clip" src'));
// what the sound mix and the README need to know
fs.writeFileSync(path.join(HERE, "cues.json"), JSON.stringify({ duration: DUR, voiceEnd: VOICE_END, sections: Object.fromEntries(scenes.map((s) => [s.id, r3(s.t0)])), sfx: scenes.flatMap((s) => s.sfx) }, null, 1));
console.log(`${scenes.length} scenes, ${groups.length} caption groups, ${DUR}s`);
