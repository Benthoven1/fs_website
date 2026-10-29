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
  let t = 1.2, prev = null;
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
const picEl = (id, name) => `<div id="${id}" class="pic" style="width:${SIZES[name].w}px;height:${SIZES[name].h}px"><img src="assets/img/${name}.jpg" alt=""></div>`;
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

// ── Cinematic devices ──────────────────────────────────────────────────────
// A plate: an archival picture filling the screen, a slow camera move across
// it, a scrim where type sits on it, and a quiet source line
function plate(s, id, name, { t0, t1, from, to, scrim = "low", credit = "", enter = "cut", exit = "cut", z = 1 }) {
  const sc = scrim === "low" ? "linear-gradient(180deg, rgba(14,10,8,0) 45%, rgba(14,10,8,0.62) 100%)"
    : scrim === "high" ? "linear-gradient(0deg, rgba(14,10,8,0) 50%, rgba(14,10,8,0.55) 100%)"
    : scrim === "deep" ? "linear-gradient(180deg, rgba(14,10,8,0) 48%, rgba(14,10,8,0.88) 64%, rgba(14,10,8,0.92) 100%)"
    : scrim === "both" ? "linear-gradient(180deg, rgba(14,10,8,0.45) 0%, rgba(14,10,8,0) 30%, rgba(14,10,8,0) 52%, rgba(14,10,8,0.65) 100%)" : "none";
  s.add(`<div id="${id}" class="full plate" style="z-index:${z};opacity:0">
    <div class="full" style="overflow:hidden">${picEl(`${id}-pic`, name)}</div>
    <div class="full" style="background:${sc}"></div>
    ${credit ? `<div class="credit">${credit}</div>` : ""}</div>`);
  s.cam(`#${id}-pic`, frame(name, W, H, ...from), frame(name, W, H, ...to), t0 - 0.3, t1 - t0 + 0.6, "power1.inOut");
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
    .kt.white { color: #FFFFFF; text-shadow: 0 2px 24px rgba(0,0,0,0.45); }
    .kt.ink { color: ${C.ink}; }
    .kt i { font-style: italic; font-weight: 500; }
    .kk { position: absolute; z-index: 5; font-family: "Major Mono Display", monospace; font-size: 34px; letter-spacing: 0.06em; text-transform: lowercase; opacity: 0; }
    .kk.white { color: rgba(255,255,255,0.9); text-shadow: 0 1px 10px rgba(0,0,0,0.5); }
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
      rise: [at("now1", "founder"), after("now1") + 0.9], star: at("now2", "sponsor") - 0.1,
      project: at("now2", "new") - 0.15, wire: at("now2", "existing") - 0.1,
      pulses: [at("now2", "tax-deductible"), at("now2", "grants"), at("now2", "contracts")],
      grow: [at("now2", "while"), after("now2") + 0.6],
    },
  };
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
  const labels = [
    { text: "rules", anchor: "library.rules", t0: arrive("library", 1) + 0.3, t1: at("lib2", "fifty") - 0.2 },
    { text: "members", anchor: "library.members", t0: arrive("library", 2) + 0.3, t1: at("lib2", "fifty") - 0.2 },
    { text: "money", anchor: "library.money", t0: arrive("library", 3) + 0.3, t1: at("lib2", "fifty") - 0.2 },
    ...["rules", "members", "money"].map((w) => ({ text: w, anchor: `cosmos.${w}`, t0: events.cosmos.rise[1] - 0.2, t1: at("now2", "from") - 0.2 })),
    { text: "mulvium", anchor: "cosmos.star", t0: events.cosmos.star + 0.6, t1: at("now2", "from") - 0.2 },
    { text: "a new project", anchor: "cosmos.project", t0: events.cosmos.project + 1.2, t1: start("end") - 0.4 },
  ];
  const tints = [
    ["library", "#1F3F6B", "#4E73A3", after("lib1") - 0.4], ["fire", "#7A2817", "#B4583A", after("fire1") - 0.4], ["hospital", "#13514A", "#3F8A80", after("hosp1") - 0.4],
    ["academy", "#264F22", "#5E8A4E", at("acad1") - 1.2], ["neutral", "#E6E1D8", C.paper, start("turn") - 0.9], ["mulvium", "#24122A", "#5A2E4E", at("now1", "founder") - 0.2],
  ];
  return { plinths, preview: [p0, p1, p2], build: plotBuild, events, cam, labels, tints };
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
    .wl-t { position: absolute; bottom: 66px; left: -300px; width: 600px; text-align: center; font-family: "Major Mono Display", monospace; font-size: 32px;
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
  plate(s, "pros", "prospect", { t0: 0, t1: tB, from: [0.16, 0.52, 1.05], to: [0.58, 0.5, 1.12], scrim: "both", credit: "Scull &amp; Heap, East Prospect of Philadelphia, 1754", enter: "punch" });
  s.add(kt("y1731", "1731.", { y: 250, size: 230 }));
  s.add(kk("phl", "philadelphia", { y: 520 }));
  s.fromTo("#y1731", { opacity: 1, scale: 1.18, filter: "blur(6px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.7, ease: "expo.out" }, 0);
  land(s, "#phl", at("hook1", "philadelphia") - 0.1);
  const NONE = [["no1", "No lending library.", "library"], ["no2", "No fire company.", "fire"], ["no3", "No hospital.", "hospital"], ["no4", "No college.", "college"]];
  NONE.forEach(([id, text, w], i) => {
    s.add(kt(id, text, { y: 1080 + i * 96, size: 76 }));
    slam(s, `#${id}`, at("hook1", "no", i + 1) - 0.05);
    s.sound("impact-bass-2", at("hook1", "no", i + 1) - 0.02, 0.12);
  });
  // "By 1751": a white flash, and the payoff, the whole of it, on the model
  s.add(`<div id="fl" class="flash"></div>`);
  s.fromTo("#fl", { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power1.in" }, tB - 0.12).to("#fl", { opacity: 0, duration: 0.5, ease: "power2.out" }, tB);
  s.set("#y1731, #phl, #no1, #no2, #no3, #no4", { opacity: 0 }, tB);
  s.sound("riser", tB - 1.9, 0.12).sound("impact-bass-1", tB, 0.22);
  s.add(kt("y1751", "1751", { y: 230, size: 200, cls: "ink" }));
  s.add(kt("all4", "<i>All four.</i>", { y: 440, size: 110, cls: "ink" }));
  slam(s, "#y1751", at("hook2", "1751") - 0.05);
  land(s, "#all4", at("hook2", "all") - 0.1);
  s.to("#y1751, #all4", { opacity: 0, filter: "blur(8px)", duration: 0.25 }, tBen - 0.1);
  scenes.push(s);
}

// ── WHO: the founder, in quick cuts; two signatures; one method ────────────
{
  const tBen = at("hook2", "benjamin");
  const s = new Scene("who", tBen - 0.05, start("lib") - 0.1, 11);
  s.raw.push(KT);
  plate(s, "por", "portrait", { t0: tBen, t1: at("who1", "printer"), from: [0.53, 0.42, 1.0], to: [0.53, 0.33, 1.25], credit: "Joseph-Siffred Duplessis, c. 1785", enter: "wipe" });
  s.add(kt("name", "Benjamin<br>Franklin", { y: 1060, size: 120 }));
  land(s, "#name", tBen + 0.05, { dy: 60, dur: 0.7 });
  s.to("#name", { opacity: 0, duration: 0.2 }, at("who1", "printer") - 0.05);
  // printer, writer, scientist, inventor: a cut on every word
  const ROLES = [["printer", "press", "Printer.", [0.5, 0.5, 1.05], [0.5, 0.46, 1.18]], ["writer", "martin", "Writer.", [0.5, 0.36, 1.05], [0.5, 0.32, 1.2]],
    ["scientist", "kite", "Scientist.", [0.5, 0.32, 1.0], [0.5, 0.28, 1.15]], ["inventor", "stove", "Inventor.", [0.36, 0.52, 1.0], [0.4, 0.5, 1.12]]];
  ROLES.forEach(([w, img, word, a, b], i) => {
    const t0 = at("who1", w) - 0.04, t1 = i < 3 ? at("who1", ROLES[i + 1][0]) - 0.04 : at("who2") - 0.1;
    plate(s, `r${i}`, img, { t0, t1, from: a, to: b, enter: "punch" });
    s.add(kt(`rw${i}`, word, { y: 1290, size: 130, extra: "z-index:5" }));
    slam(s, `#rw${i}`, t0);
    s.set(`#rw${i}`, { opacity: 0 }, t1);
    s.sound("whoosh-short", t0, 0.14);
  });
  // two signatures: Trumbull's Declaration, then Franklin's name on the Constitution
  const tC = at("who2", "constitution") - 0.1;
  plate(s, "trum", "trumbull", { t0: at("who2") - 0.1, t1: tC, from: [0.3, 0.5, 1.0], to: [0.66, 0.48, 1.05], credit: "John Trumbull, Declaration of Independence, 1818", enter: "wipeRight" });
  const CF = [0.88, 0.853, 3.0];
  plate(s, "con", "constitution4", { t0: tC, t1: at("who3") - 0.15, from: [0.8, 0.8, 1.3], to: CF, credit: "Constitution, p. 4, 1787 · National Archives", scrim: "low", enter: "dive", exit: "rise" });
  // the ring lands where the framing puts "B Franklin" (a framing near the
  // page's edge is clamped, so the point is not always the screen's centre)
  const cf = frame("constitution4", W, H, ...CF), RX = cf.x + CF[0] * SIZES.constitution4.w * cf.scale, RY = cf.y + CF[1] * SIZES.constitution4.h * cf.scale + 95; // the signature sits just under the framing point
  s.add(`<svg id="ring" class="abs" style="left:${r3(RX - 300)}px;top:${r3(RY - 130)}px;width:600px;height:260px;overflow:visible;z-index:6" viewBox="0 0 600 260"><ellipse cx="300" cy="130" rx="280" ry="110" fill="none" stroke="${C.clay}" stroke-width="9" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110" stroke-linecap="round"/></svg>`);
  s.fromTo("#ring ellipse", { strokeDashoffset: 110 }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" }, at("who2", "one") - 0.5);
  s.set("#ring", { opacity: 0 }, at("who3") - 0.15);
  s.add(kt("one6", `1 <i style="font-size:0.5em">of</i> 6`, { y: 1330, size: 190, align: "center", extra: "z-index:6" }));
  slam(s, "#one6", at("who2", "six") - 0.05);
  s.set("#one6", { opacity: 0 }, at("who3") - 0.15);
  // the method, set in the narration's own words over the bare plinths
  const M = [["m1", "Identify a public need.", "identify"], ["m2", "Pool contributions", "pooling"], ["m3", "from many members.", "many"]];
  s.add(kk("mk", "one method", { y: 1250, cls: "ink" }));
  land(s, "#mk", at("who3", "method") - 0.1);
  M.forEach(([id, text, w], i) => { s.add(kt(id, text, { y: 1310 + i * 92, size: 76, cls: "ink" })); land(s, `#${id}`, at("who3", w) - 0.1); });
  s.to("#mk, #m1, #m2, #m3", { opacity: 0, filter: "blur(8px)", duration: 0.3 }, start("lib") - 0.5);
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
    s.add(`<div id="ro${i}" class="abs" style="left:72px;top:${1000 + i * 82}px;width:936px;opacity:0;z-index:5">
      <span class="serif" style="font-size:52px;font-weight:600;color:#FFF;text-shadow:0 2px 18px rgba(0,0,0,.5)">${n}</span>
      <span class="kk white" style="position:relative;opacity:1;font-size:30px;margin-left:18px">${t}</span></div>`);
    land(s, `#ro${i}`, at("lib1", "tradesmen") - 0.25 + i * 0.22, { dy: 24 });
  });
  s.set("#jk, #ro0, #ro1, #ro2, #ro3, #ro4, #ro5", { opacity: 0 }, after("lib1") - 0.3);
  s.sound("whoosh", after("lib1") - 0.3, 0.16);
  // the arithmetic, set on the ground under the model as the subscriptions run in
  const c0 = at("lib2", "fifty"), c1 = after("lib2", "each");
  s.add(`<div id="sum" class="abs" style="left:72px;top:${LOW}px;width:936px;opacity:0">
    <span id="n50" class="serif" style="font-size:190px;font-weight:600;color:#FFFFFF">0</span><span class="serif" style="font-size:64px;color:rgba(255,255,255,0.75);font-style:italic"> × 40s = </span><span id="fund" class="serif" style="font-size:150px;font-weight:600;color:#FFFFFF">£0</span></div>`);
  land(s, "#sum", c0).count("#n50", c0, c1 - c0 + 0.4, 0, 50).count("#fund", c0, c1 - c0 + 0.4, 0, 100, "'£' + Math.round(v)");
  s.to("#sum", { opacity: 0, filter: "blur(8px)", duration: 0.3 }, start("lib3") - 0.5);
  s.sound("typing", c0, 0.12);
  // through the bookcase into the Library Company's hall
  plate(s, "hall", "library-hall", { t0: start("lib3") - 0.3, t1: start("fire") - 0.1, from: [0.42, 0.45, 1.25], to: [0.34, 0.42, 1.55], credit: "William Birch, Library and Surgeons Hall, 1799", enter: "dive", exit: "cut" });
  s.add(kt("today", "1731 <i>→ today</i>", { y: 250, size: 120 }));
  land(s, "#today", at("lib3", "today") - 0.2);
  scenes.push(s);
}

// ── FIRE: the proverb, set large; the company and its thirty buckets ───────
{
  const s = new Scene("fire", start("fire") - 0.1, start("hosp") - 0.1, 13);
  s.raw.push(KT);
  plate(s, "buck", "bucket", { t0: start("fire") - 0.1, t1: after("fire1") + 0.5, from: [0.5, 0.55, 1.05], to: [0.5, 0.45, 1.3], scrim: "both", credit: "Leather fire bucket, Dedham Historical Society", enter: "cut", exit: "wipeUp" });
  s.add(kk("gz", "pennsylvania gazette · 1735", { y: 250 }));
  land(s, "#gz", at("fire1", "newspaper") - 0.1);
  s.add(kt("q", words("An ounce of prevention is worth a pound of cure."), { y: 420, size: 112, extra: "font-style:italic;font-weight:500" }));
  s.set("#q", { opacity: 1 }, at("fire1", "an") - 0.1);
  s.fromTo("#q .w", { opacity: 0, y: 20, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.25, ease: "power2.out", stagger: (at("fire1", "cure") - at("fire1", "an")) / 10 }, at("fire1", "an") - 0.1);
  s.to("#gz, #q", { opacity: 0, duration: 0.3 }, after("fire1") + 0.1);
  s.sound("whoosh", after("fire1") + 0.1, 0.16);
  // on the model: the count of volunteers, then of buckets
  s.add(kt("v30", `<span id="n30">0</span> <i style="font-size:0.42em;opacity:0.8">volunteers</i>`, { y: LOW - 20, size: 200 }));
  land(s, "#v30", at("fire2", "thirty") - 0.15).count("#n30", at("fire2", "thirty") - 0.1, 0.9, 0, 30);
  s.add(kt("b30", `30 <i style="font-size:0.42em;opacity:0.8">leather buckets</i>`, { y: LOW + 190, size: 110 }));
  land(s, "#b30", at("fire2", "buckets") - 0.2);
  scenes.push(s);
}

// ── HOSP: Dr Bond's proposal; the matching grant, run; the Act itself ──────
{
  const s = new Scene("hosp", start("hosp") - 0.1, start("acad") - 0.1, 14);
  s.raw.push(KT);
  plate(s, "bond", "bond", { t0: start("hosp") - 0.1, t1: at("hosp1", "hospital") - 0.05, from: [0.5, 0.36, 1.0], to: [0.5, 0.3, 1.2], credit: "Thomas Bond", enter: "wipeRight" });
  plate(s, "hos", "hospital", { t0: at("hosp1", "hospital") - 0.05, t1: after("hosp1") + 0.2, from: [0.5, 0.45, 1.0], to: [0.56, 0.5, 1.2], credit: "Pennsylvania Hospital, Pine Street", enter: "punch", exit: "wipeUp" });
  s.add(kk("bk", "1751", { y: 250 }));
  land(s, "#bk", at("hosp1", "1751") - 0.1);
  s.set("#bk", { opacity: 0 }, after("hosp1") - 0.3);
  // the condition, in large type on the model
  const d0 = at("hosp2", "private"), d1 = Math.max(after("hosp2"), at("hosp3", "target")), tT = d1 + 0.12;
  s.add(kk("ak", "the assembly", { y: 250 }));
  s.add(kt("an", "£2,000", { y: 300, size: 150, extra: "color:rgba(255,255,255,0.7)" }));
  land(s, "#ak", at("hosp2", "assembly") - 0.1);
  land(s, "#an", at("hosp2", "two") - 0.1);
  s.add(kt("oif", "<i>only if</i>", { y: 470, size: 100, extra: "color:#F6C9A8" }));
  slam(s, "#oif", at("hosp2", "only") - 0.05);
  s.add(kk("dk", "private donors", { y: LOW }));
  s.add(kt("dn", "£0", { y: LOW + 50, size: 150, extra: "color:#F6C9A8" }));
  land(s, "#dk", d0 - 0.2); land(s, "#dn", d0 - 0.2);
  s.count("#dn", d0, d1 - d0 + 0.1, 0, 2000, "'£' + (Math.round(v / 100) * 100).toLocaleString('en-GB')");
  s.fromTo("#an", { color: "rgba(255,255,255,0.7)" }, { color: "#FFFFFF", duration: 0.3 }, tT + 0.45);
  s.sound("impact-bass-1", tT + 0.47, 0.22);
  s.to("#ak, #an, #oif, #dk, #dn", { opacity: 0, filter: "blur(8px)", duration: 0.3 }, d1 + 1.0);
  // into the lectern: the Act, full screen
  plate(s, "act", "hospital-act", { t0: at("hosp3", 5) - 0.2, t1: start("acad") - 0.1, from: [0.5, 0.36, 1.4], to: [0.5, 0.5, 1.15], scrim: "none", credit: "An Act to encourage the Establishing of an Hospital, 1751", enter: "dive", exit: "fade" });
  scenes.push(s);
}

// ── ACAD: the hall rises; the 1749 plan; the trustees; the university ──────
{
  const s = new Scene("acad", start("acad") - 0.1, start("turn") - 0.2, 15);
  s.raw.push(KT);
  s.add(kt("ac", `Academy <i>1751</i>`, { y: 250, size: 110 }));
  land(s, "#ac", at("acad1", "academy") - 0.1);
  s.to("#ac", { opacity: 0, filter: "blur(8px)", duration: 0.25 }, start("acad2") - 0.3);
  // the plan, in Franklin's own printing, and what it asked for
  plate(s, "prop", "proposals", { t0: start("acad2") - 0.2, t1: start("acad3") - 0.1, from: [0.5, 0.36, 1.12], to: [0.5, 0.4, 1.02], scrim: "deep", credit: "Franklin, Proposals Relating to the Education of Youth in Pensilvania, 1749", enter: "wipe", exit: "wipeUp" });
  s.add(kt("y1749", "1749", { y: 1270, size: 150, extra: "z-index:5" }));
  land(s, "#y1749", at("acad2", "1749") - 0.15);
  const AIMS = [["a1", "A school for <i>useful</i> subjects,", "useful"], ["a2", "taught in English,", "english"], ["a3", "alongside Latin and Greek.", "alongside"]];
  AIMS.forEach(([id, text, w], i) => { s.add(kt(id, text, { y: 1450 + i * 82, size: 64, extra: "z-index:5" })); land(s, `#${id}`, at("acad2", w) - 0.1); });
  s.to("#y1749, #a1, #a2, #a3", { opacity: 0, filter: "blur(8px)", duration: 0.25 }, start("acad3") - 0.3);
  // the trustees, on the model: their bench and their subscription box
  s.add(kt("tr24", `24 <i style="font-size:0.42em;opacity:0.85">trustees</i>`, { y: 250, size: 190 }));
  slam(s, "#tr24", at("acad3", "twenty-four") - 0.05);
  s.add(kt("pres", "<i>Franklin, president</i>", { y: 470, size: 72 }));
  land(s, "#pres", at("acad3", "president") - 0.1);
  s.to("#tr24, #pres", { opacity: 0, filter: "blur(8px)", duration: 0.3 }, start("acad4") - 0.3);
  // what it became
  plate(s, "pen", "penn", { t0: start("acad4") - 0.1, t1: start("turn") - 0.2, from: [0.5, 0.5, 1.15], to: [0.48, 0.42, 1.0], credit: "College Hall, University of Pennsylvania", enter: "wipe", exit: "wipeUp" });
  s.add(kt("upenn", "University<br>of Pennsylvania", { y: 1150, size: 110, extra: "z-index:5" }));
  land(s, "#upenn", at("acad4", "university") - 0.1, { dy: 50, dur: 0.6 });
  scenes.push(s);
}

// ── TURN: four foundations, built four times, beside everything else ──────
{
  const s = new Scene("turn", start("turn") - 0.2, start("now") - 0.2, 16);
  s.raw.push(KT);
  const RMM = [["rw", "Rules written.", "rules"], ["mr", "Members recruited.", "members"], ["mo", "Money raised.", "money"]];
  RMM.forEach(([id, text, w], i) => {
    s.add(kt(id, text, { y: LOW - 40 + i * 98, size: 82, cls: "ink" }));
    land(s, `#${id}`, at("turn1", w) - 0.1);
    s.sound("click-soft", at("turn1", w) - 0.05, 0.22);
  });
  s.to("#rw, #mr, #mo", { opacity: 0, filter: "blur(8px)", duration: 0.25 }, at("turn2", "four") - 0.35);
  s.add(kt("x4", `<i>Four times.</i>`, { y: 260, size: 150, cls: "ink", extra: `color:${C.clay}` }));
  slam(s, "#x4", at("turn2", "four") - 0.05);
  s.sound("impact-bass-2", at("turn2", "four"), 0.18);
  s.set("#x4", { opacity: 0 }, at("turn2", "printing") - 0.05);
  // beside a printing business, an almanac and his experiments: a cut each
  const SIDE = [["printing", "press", "a printing business", [0.5, 0.5, 1.1], [0.5, 0.45, 1.25]], ["almanac", "almanac", "an almanac", [0.5, 0.3, 1.0], [0.5, 0.36, 1.15]], ["experiments", "kite", "experiments<br>with electricity", [0.5, 0.25, 1.1], [0.5, 0.22, 1.3]]];
  SIDE.forEach(([w, img, text, a, b], i) => {
    const t0 = at("turn2", w) - 0.05, t1 = i < 2 ? at("turn2", SIDE[i + 1][0]) - 0.05 : start("now") - 0.6;
    plate(s, `sd${i}`, img, { t0, t1, from: a, to: b, enter: "punch", exit: i < 2 ? "cut" : "fade" });
    s.add(kt(`st${i}`, `<i>${text}</i>`, { y: 1460, size: 104, extra: "z-index:5" }));
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
  L1.forEach(([id, text, w], i) => { s.add(kt(id, text, { y: 240 + i * 100, size: 88 })); land(s, `#${id}`, at("now1", w) - 0.1); });
  s.sound("riser", at("now1") - 0.4, 0.14).sound("impact-bass-1", at("now2", "sponsor"), 0.22);
  s.to("#f1, #f2, #f3", { opacity: 0, filter: "blur(8px)", duration: 0.3 }, at("now2") - 0.2);
  s.add(kk("fs", "fiscal sponsorship", { y: 250 }));
  land(s, "#fs", at("now2", "fiscal") - 0.1);
  s.sound("whoosh", at("now2", "new") - 0.3, 0.16);
  s.add(kt("d1", "From day one:", { y: 300, size: 96 }));
  land(s, "#d1", at("now2", "from") - 0.1);
  const CAN = [["c1", "tax-deductible gifts", "tax-deductible"], ["c2", "grants", "grants"], ["c3", "contracts", "contracts"]];
  CAN.forEach(([id, text, w], i) => {
    s.add(kt(id, `<span style="color:#F2B8CF">✓</span> ${text}`, { y: LOW - 30 + i * 92, size: 74 }));
    land(s, `#${id}`, at("now2", w) - 0.1);
    s.sound("click-soft", at("now2", w) - 0.05, 0.25);
  });
  s.add(kt("work", "<i>while the founder does the work.</i>", { y: LOW + 270, size: 64, extra: "opacity:0;color:rgba(255,255,255,0.8)" }));
  land(s, "#work", at("now2", "while") - 0.1);
  scenes.push(s);
}

// ── END: the launch film's network, from its point outward; the wordmark ───
// cosmos-close.mp4 is the launch film from 64.6 s on, without its words. It
// enters at 65.3 s, the network still gathered to a point, so the network
// opens out as "The next great expansion" is said, and later gathers back
// into the wordmark.
const PLATE = { file: "cosmos-close.mp4", from: 64.6, enter: 65.3, settle: 84.4 };
{
  const t0 = start("end") - 0.35;
  const mediaStart = PLATE.enter - PLATE.from;
  const t1 = t0 + (PLATE.settle + 1.6 - PLATE.enter);
  const s = new Scene("end", t0, t1, 9);
  s.add(`<div id="pw" class="full" style="opacity:0"><video id="plate" class="full" src="assets/${PLATE.file}" muted playsinline style="object-fit:cover"></video></div>`);
  s.fromTo("#pw", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power1.out" }, t0);
  s.mediaStart = r3(mediaStart);
  s.add(`<div id="build" class="serif abs" style="left:90px;top:840px;width:900px;text-align:center;font-size:56px;line-height:1.25">${words("Mulvium is building that structure for the next Franklin.")}</div>`);
  s.words("#build .w", at("end1") - 0.05, { stagger: (after("end1") - at("end1") - 0.3) / 9 });
  s.leave("#build", at("end2") - 0.15, 0.25);
  s.add(`<div id="close" class="serif abs" style="left:90px;top:760px;width:900px;text-align:center;font-size:46px;line-height:1.3">${words("The next great expansion of human creativity will come from making it easier to create")}<br><span style="font-size:108px;color:${C.clay};font-style:italic">${words("institutions.")}</span></div>`);
  s.words("#close .w", at("end2", "the") - 0.05, { stagger: (at("end2", "institutions") - at("end2", "the")) / 15 });
  s.leave("#close", after("end2") + 0.6, 0.3);
  s.sound("riser", at("end2", "institutions") - 1.6, 0.2);
  scenes.push(s);
}

// ── Captions: only where the screen does not already say it ────────────────
// Each line is subtitled over a span of its words, [from, to): the rest of it
// is set on screen in type, or carried by the picture alone.
const SPAN = {
  hook2: [9], who2: [0, 11], who3: [0, 8], lib1: [0, 6], lib2: [0, 12], lib3: [0], fire1: [0, 13], fire2: [0, 9],
  hosp1: [0], hosp3: [0], acad1: [0], acad2: [0, 6], acad3: [10], turn1: [0, 8], now2: [0, 13],
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
    .cap span { max-width: 900px; text-align: center; font-family: "IBM Plex Sans", sans-serif; font-weight: 500; font-size: 44px; line-height: 1.25; color: ${C.surface};
      background: rgba(27, 22, 19, 0.86); border-radius: 14px; padding: 10px 24px 12px; box-decoration-break: clone; -webkit-box-decoration-break: clone; }`);
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
