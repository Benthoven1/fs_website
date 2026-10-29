// build.mjs — writes the Franklin essay as a HyperFrames project: index.html
// (the root: scene hosts, captions, voice, music and sound) and one file per
// section in compositions/. Every time in them is a literal number, taken
// from timing.json, where the narration's words were measured; so a re-voiced
// line, or a re-timed one, means running this again, not editing by hand.
//
//   node build.mjs            # then: npx hyperframes check / snapshot / render
//
// The look is the Mulvium site's porcelain, set like a textbook: chapters,
// a running timeline, numbered figures with their sources, key figures. The
// archival pictures come from assets/img/ (prep.py); the isometric machines
// from assets/fig/ (figures/*.mjs, built with the Anatomy kit), and each
// machine is put together on screen, part by part, before it runs.
import fs from "fs";
import path from "path";
import { scopedKitCss, themeCss, ACCENTS } from "./figures/common.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const W = 1080, H = 1920;
const C = { paper: "#ECEAE5", surface: "#F9F8F5", ink: "#1B1613", soft: "#3B332F", muted: "#5C544E", rule: "#D9D4CA", clay: "#B87758" };
const A = Object.fromEntries(Object.entries(ACCENTS).map(([k, v]) => [k, v.line]));
const SIZES = JSON.parse(fs.readFileSync(path.join(HERE, "assets/img/sizes.json"), "utf8"));
const SCRIPT = JSON.parse(fs.readFileSync(path.join(HERE, "script.json"), "utf8"));
const FIG = (name) => ({
  svg: fs.readFileSync(path.join(HERE, "assets/fig", `${name}.svg`), "utf8"),
  ...JSON.parse(fs.readFileSync(path.join(HERE, "assets/fig", `${name}.json`), "utf8")),
});

// ── The clock: every word of the narration ─────────────────────────────────
let T = JSON.parse(fs.readFileSync(path.join(HERE, "timing.json"), "utf8"));
if (SCRIPT.lines.some((l, i) => !T.lines[i] || T.lines[i].text !== l.text)) {
  // The narration is behind the script: lay the words out at a reading pace
  // so the scenes can be worked on, and say so
  console.warn("timing.json does not match script.json: using estimated times");
  let t = 1.2, prev = null;
  T = { lines: SCRIPT.lines.map((l) => {
    const sec = l.id.replace(/\d+$/, "");
    if (prev) t += sec === prev ? 0.32 : 0.75;
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
  constructor(id, t0, t1, z) { Object.assign(this, { id, t0, t1, z, html: [], css: [], raw: [], tl: [], sfx: [] }); }
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
  // Put a machine together: every [data-build] part lowers into place, in order
  assemble(figSel, fig, t, span) {
    const builds = [...new Set([...fig.svg.matchAll(/data-build="([\d.]+)"/g)].map((m) => +m[1]))].sort((a, b) => a - b);
    const dt = span / (builds[builds.length - 1] + 1);
    builds.forEach((n) =>
      this.fromTo(`${figSel} [data-build="${n}"]`, { x: fig.moves.lift.x, y: fig.moves.lift.y, opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, t + n * dt));
    return this;
  }
  file() {
    return `<template>
  <style>
${FONTS}
    #root { position: absolute; inset: 0; overflow: hidden; background: ${GROUND}; }
${BASE}
${this.css.join("\n")}
${this.raw.join("\n")}
  </style>
  <div id="root" data-composition-id="${this.id}" data-width="${W}" data-height="${H}">
${this.html.join("\n")}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${this.tl.join("\n    ")}
    window.__timelines["${this.id}"] = tl;
  </script>
</template>
`;
  }
}

const FONTS = [
  ["IBM Plex Sans", "IBMPlexSans-400", 400, "normal"], ["IBM Plex Sans", "IBMPlexSans-500", 500, "normal"],
  ["IBM Plex Sans", "IBMPlexSans-600", 600, "normal"], ["IBM Plex Sans", "IBMPlexSans-700", 700, "normal"],
  ["IBM Plex Mono", "IBMPlexMono-400", 400, "normal"], ["IBM Plex Mono", "IBMPlexMono-500", 500, "normal"],
  ["Lora", "Lora-500", 500, "normal"], ["Lora", "Lora-400i", 400, "italic"], ["Lora", "Lora-500i", 500, "italic"],
].map(([f, file, w, s]) => `    @font-face { font-family: "${f}"; src: url(assets/fonts/${file}.woff2) format("woff2"); font-weight: ${w}; font-style: ${s}; font-display: block; }`).join("\n");

// The site's porcelain: a ground lit from above, white cards, warm rules
const GROUND = `radial-gradient(ellipse 120% 75% at 50% 30%, #F5F3EF 0%, ${C.paper} 58%, #E3DFD8 100%)`;
const BASE = `
    .abs { position: absolute; }
    .full { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
    .sans { font-family: "IBM Plex Sans", sans-serif; color: ${C.ink}; }
    .mono { font-family: "IBM Plex Mono", monospace; color: ${C.muted}; letter-spacing: 0.02em; }
    .serif { font-family: "Lora", serif; color: ${C.ink}; }
    .kicker { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 28px; letter-spacing: 0.14em; text-transform: uppercase; color: ${C.muted}; }
    .w { display: inline-block; white-space: pre; }
    .card { position: absolute; background: ${C.surface}; border: 1px solid ${C.rule}; border-radius: 28px; overflow: hidden;
      box-shadow: inset 0 1px 0 #FFFFFF, 0 2px 4px rgba(27,22,19,0.04), 0 18px 48px rgba(27,22,19,0.10); }
    .card .cap { position: absolute; left: 0; bottom: 0; width: 100%; height: 64px; overflow: hidden; padding: 0 28px; display: flex; align-items: center; gap: 18px;
      background: ${C.surface}; border-top: 1px solid ${C.rule}; font-family: "IBM Plex Mono", monospace; font-size: 28px; color: ${C.muted}; white-space: nowrap; }
    .card .cap b { font-weight: 500; color: ${C.ink}; }
    .pic { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
    .pic img { display: block; width: 100%; height: 100%; }
    .tag { position: absolute; padding: 10px 18px 11px; border-radius: 10px; background: ${C.surface}; border: 1px solid ${C.rule};
      font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 26px; letter-spacing: 0.08em; text-transform: uppercase; color: ${C.ink}; white-space: nowrap; }
    .bar { position: absolute; border-radius: 4px; }
`;
const words = (text, cls = "w") => text.split(" ").map((w) => `<span class="${cls}">${w} </span>`).join("");
const picEl = (id, name) => `<div id="${id}" class="pic" style="width:${SIZES[name].w}px;height:${SIZES[name].h}px"><img src="assets/img/${name}.jpg" alt=""></div>`;
// A numbered figure: an archival picture in a card, framed by a camera, with its source
function exhibit(id, name, { x, y, w, h, fig, caption, extra = "" }) {
  return `<div id="${id}" class="card" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}">
    <div class="abs" style="left:0;top:0;width:${w}px;height:${h - 64}px;overflow:hidden">${picEl(`${id}-pic`, name)}</div>
    <div class="cap"><b>FIG. ${fig}</b><span>${caption}</span></div></div>`;
}
// A camera framing in a w x h window: point (fx, fy) of the picture at the
// window's centre, at k times the scale that covers the window
function frame(name, w, h, fx, fy, k = 1) {
  const { w: iw, h: ih } = SIZES[name];
  const s = Math.max(w / iw, h / ih) * k;
  const x = Math.min(0, Math.max(w - s * iw, w / 2 - fx * iw * s)), y = Math.min(0, Math.max(h - s * ih, h / 2 - fy * ih * s));
  return { x: r3(x), y: r3(y), scale: r3(s) };
}
// An isometric machine in a card, scaled to the card's width
function machine(id, fig, { x, y, w, figNo, caption }) {
  const h = Math.round(w * fig.height / fig.width) + 64;
  return `<div id="${id}" class="card fig" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:#FBFAF7">
    <div class="abs" style="left:0;top:0;width:${w}px;height:${h - 64}px">${fig.svg.replace("<svg", `<svg data-layout-ignore style="width:${w}px;height:${h - 64}px;display:block"`)}</div>
    <div class="cap"><b>FIG. ${figNo}</b><span>${caption}</span></div></div>`;
}
const FIGCSS = scopedKitCss(".fig") + themeCss(".fig");

const scenes = [];
const SECTION = (id) => T.lines.filter((l) => l.id.startsWith(id));
const start = (id) => SECTION(id)[0].t0;
const TOPY = 500; // where a scene's content starts, under the chapter header and the timeline

// ── 0. CHROME: the chapter header and the running timeline, 1725 to 1755 ───
{
  const s = new Scene("chrome", 0, start("end") - 0.35, 40);
  const CH = [
    ["hook", "Philadelphia, 1731", ""], ["who", "The founder", "1"], ["lib", "The Library Company", "2"],
    ["fire", "The Union Fire Company", "3"], ["hosp", "The Pennsylvania Hospital", "4"], ["acad", "The Academy", "5"],
    ["turn", "Four foundations", "6"], ["now", "A shared foundation", "7"],
  ];
  s.style(`#root { background: none; }
    .chap { position: absolute; left: 84px; top: 256px; width: 912px; opacity: 0; }
    .chap .kicker { margin-bottom: 8px; }
    .chap .t { font-family: "IBM Plex Sans", sans-serif; font-weight: 600; font-size: 54px; letter-spacing: -0.01em; color: ${C.ink}; }`);
  CH.forEach(([id, title, n], i) => {
    s.add(`<div id="c${i}" class="chap"><div class="kicker">${n ? `Chapter ${n}` : "Prologue"}</div><div class="t">${words(title)}</div></div>`);
    const t = Math.max(0, start(id) - 0.3);
    s.set(`#c${i}`, { opacity: 1 }, t).fromTo(`#c${i} .kicker`, { opacity: 0 }, { opacity: 1, duration: 0.3 }, t);
    s.fromTo(`#c${i} .w`, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.16, ease: "power2.out", stagger: 0.06 }, t);
    const next = CH[i + 1] ? start(CH[i + 1][0]) - 0.45 : null;
    if (next) s.leave(`#c${i}`, next, 0.2);
  });
  // the timeline: a rule from 1725 to 1755, a mark at each founding, a needle at the year in hand
  const X0 = 84, X1 = 996, Y = 420, yr = (y) => X0 + (y - 1725) / 30 * (X1 - X0);
  let tl = `<div id="line" class="abs" style="left:0;top:0;width:${W}px;height:500px;opacity:0">
    <div class="bar" style="left:${X0}px;top:${Y}px;width:${X1 - X0}px;height:3px;background:${C.rule}"></div>`;
  for (let y = 1725; y <= 1755; y += 5) {
    tl += `<div class="bar" style="left:${r3(yr(y) - 1)}px;top:${Y - 10}px;width:2px;height:${y % 10 === 0 ? 22 : 14}px;background:${C.rule}"></div>`;
    if (y % 10 === 0) tl += `<div class="mono abs" style="left:${r3(yr(y) - 50)}px;top:${Y + 18}px;width:100px;text-align:center;font-size:28px">${y}</div>`;
  }
  const MARKS = [["junto", 1727, "#8A8178"], ["library", 1731, A.library], ["fire", 1736, A.fire], ["hospital", 1751, A.hospital], ["academy", 1751, A.academy]];
  MARKS.forEach(([name, year, col]) => {
    const dy = name === "academy" ? -30 : 0;
    tl += `<div id="m-${name}" class="abs" style="left:${r3(yr(year) - 11)}px;top:${Y - 10 + dy}px;width:22px;height:22px;border-radius:11px;background:${col};border:3px solid ${C.surface};box-shadow:0 2px 6px rgba(27,22,19,.18);opacity:0"></div>`;
  });
  tl += `<div id="needle" class="abs" style="left:${r3(yr(1731) - 1.5)}px;top:${Y - 34}px;width:3px;height:44px;background:${C.ink};border-radius:2px"></div></div>`;
  s.add(tl);
  s.fromTo("#line", { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.15);
  // the needle visits each year as the story reaches it
  const visit = [[at("hook2", "1751"), 1751], [at("lib1", "1727"), 1727], [at("lib2", "1731"), 1731], [at("fire1", "1735"), 1735], [at("fire2", "next"), 1736], [at("hosp1", "1751"), 1751]];
  visit.forEach(([t, y]) => s.to("#needle", { x: yr(y) - yr(1731), duration: 0.6, ease: "power3.inOut" }, t - 0.1));
  const pop = (id, t) => s.fromTo(id, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, t);
  pop("#m-junto", at("lib1", "1727") + 0.4);
  pop("#m-library", at("lib2", "1731") + 0.4);
  pop("#m-fire", at("fire2", "union"));
  pop("#m-hospital", at("hosp1", "hospital"));
  pop("#m-academy", at("acad1", "academy"));
  s.leave("#line", start("turn") - 0.45, 0.3);
  scenes.push(s);
}

// ── 1. HOOK: the city that had none of the four ────────────────────────────
{
  const s = new Scene("hook", 0, start("who") - 0.25, 1);
  const pw = 960, ph = 380;
  s.add(exhibit("pros", "prospect", { x: 60, y: TOPY + 10, w: pw, h: ph, fig: "0.1", caption: "East Prospect of Philadelphia, Scull &amp; Heap, 1754" }));
  s.cam("#pros-pic", frame("prospect", pw, ph - 64, 0.12, 0.5), frame("prospect", pw, ph - 64, 0.6, 0.5), 0, L("hook2").t1 + 0.6, "power1.inOut");
  // four tiles, one an institution each: none in 1731, all founded by 1751
  const TILES = [["Lending library", "library", "1731", "library"], ["Fire company", "fire", "1736", "fire"], ["Hospital", "hospital", "1751", "hospital"], ["College", "college", "1751", "academy"]];
  TILES.forEach(([label, w, year, acc], i) => {
    const x = 60 + (i % 2) * 492, y = TOPY + 418 + Math.floor(i / 2) * 142;
    s.add(`<div id="t${i}" class="card" style="left:${x}px;top:${y}px;width:468px;height:126px;border-radius:20px;opacity:0">
      <div id="t${i}-wash" class="abs" style="left:0;top:0;width:468px;height:126px;background:${ACCENTS[acc].top};opacity:0"></div>
      <div id="t${i}-bar" class="bar" style="left:22px;top:22px;width:8px;height:82px;background:${C.rule}"></div>
      <div class="sans abs" style="left:52px;top:20px;font-size:38px;font-weight:600">${label}</div>
      <div id="t${i}-none" class="mono abs" style="left:52px;top:76px;font-size:27px">1731: NONE</div>
      <div id="t${i}-est" class="mono abs" style="left:52px;top:76px;font-size:27px;color:${A[acc]};font-weight:500;opacity:0">EST. ${year}</div></div>`);
    s.enter(`#t${i}`, at("hook1", w) - 0.1, { from: "up", dur: 0.5 });
    s.sound("click-soft", at("hook1", w) - 0.05, 0.25);
    const t = at("hook2", "all") + i * 0.16;
    s.fromTo(`#t${i}-wash`, { opacity: 0 }, { opacity: 0.4, duration: 0.4, ease: "power2.inOut" }, t)
      .fromTo(`#t${i}-bar`, { backgroundColor: C.rule }, { backgroundColor: A[acc], duration: 0.3 }, t)
      .to(`#t${i}-none`, { opacity: 0, filter: "blur(6px)", duration: 0.15 }, t)
      .fromTo(`#t${i}-est`, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2 }, t + 0.1);
  });
  s.sound("whoosh-short", at("hook2", "all") - 0.05, 0.18);
  s.leave("#pros, #t0, #t1, #t2, #t3", start("who") - 0.5, 0.25);
  scenes.push(s);
}

// ── 2. WHO: a profile, two signatures, one method ──────────────────────────
{
  const s = new Scene("who", start("who") - 0.45, start("lib") - 0.2, 2);
  // the profile: a portrait, a name, four roles with a picture each
  s.add(exhibit("por", "portrait", { x: 60, y: TOPY, w: 520, h: 700, fig: "1.1", caption: "Duplessis, c. 1785" }));
  s.add(`<div id="name" class="abs" style="left:612px;top:${TOPY + 8}px;width:420px;opacity:0">
    <div class="sans" style="font-size:44px;font-weight:600;line-height:1.08"><span class="w">Benjamin</span><br><span class="w">Franklin</span></div>
    <div class="mono" style="font-size:28px;margin-top:10px">1706 – 1790</div></div>`);
  const ROLES = [["printer", "Printer", "almanac", 0.5, 0.3], ["writer", "Writer", "martin", 0.45, 0.32], ["scientist", "Scientist", "kite", 0.55, 0.3], ["inventor", "Inventor", "stove", 0.24, 0.6]];
  ROLES.forEach(([w, label, img, fx, fy], i) => {
    const y = TOPY + 180 + i * 130;
    s.add(`<div id="r${i}" class="abs" style="left:612px;top:${y}px;width:408px;height:112px;opacity:0">
      <div class="card" style="left:0;top:0;width:150px;height:112px;border-radius:16px"><div class="abs" style="left:0;top:0;width:150px;height:112px;overflow:hidden">${picEl(`r${i}-pic`, img)}</div></div>
      <div class="sans abs" style="left:176px;top:34px;font-size:36px;font-weight:500">${label}</div></div>`);
    s.set(`#r${i}-pic`, frame(img, 150, 112, fx, fy, 1.1), 0);
    s.enter(`#r${i}`, at("who1", w) - 0.08, { from: "right", dur: 0.45 });
  });
  const t0 = start("who") - 0.4;
  s.enter("#por", t0, { from: "left" }).cam("#por-pic", frame("portrait", 520, 636, 0.53, 0.36, 1.15), frame("portrait", 520, 636, 0.53, 0.33, 1.28), t0, L("who1").t1 - t0 + 0.6, "power1.inOut");
  s.words("#name .w", at("who1", "franklin") - 0.2, { stagger: 0.12 });
  s.fromTo("#name .mono", { opacity: 0 }, { opacity: 1, duration: 0.3 }, at("who1", "franklin"));
  s.sound("whoosh-short", t0, 0.2);
  // two signatures: Trumbull's Declaration, then Franklin's name on the Constitution
  const tD = at("who2") - 0.2;
  s.leave("#por, #name, #r0, #r1, #r2, #r3", tD - 0.25, 0.22);
  s.add(exhibit("trum", "trumbull", { x: 60, y: TOPY, w: 960, h: 620, fig: "1.2", caption: "Trumbull, Declaration of Independence, 1818", extra: "opacity:0" }));
  s.enter("#trum", tD, { from: "zoom" }).cam("#trum-pic", frame("trumbull", 960, 556, 0.4, 0.5, 1.0), frame("trumbull", 960, 556, 0.62, 0.48, 1.35), tD, at("who2", "constitution") - tD);
  const tC = at("who2", "and") - 0.15, cz = SIZES.constitution4;
  s.add(exhibit("con", "constitution4", { x: 60, y: TOPY + 20, w: 960, h: 660, fig: "1.3", caption: "Constitution, p. 4, 1787 · National Archives", extra: "opacity:0" }));
  // the camera finds "B Franklin" on the page; the ring is drawn where the framing puts it
  const cw = 960, chh = 596, cf = frame("constitution4", cw, chh, 0.88, 0.853, 2.6);
  const sx = 60 + cf.x + 0.88 * cz.w * cf.scale, sy = TOPY + 20 + cf.y + 0.853 * cz.h * cf.scale;
  s.enter("#con", tC, { from: "right", dur: 0.5 });
  s.cam("#con-pic", frame("constitution4", cw, chh, 0.88, 0.853, 1.0), cf, tC + 0.2, 0.9);
  s.add(`<svg id="ring" class="abs" style="left:${r3(sx - 230)}px;top:${r3(sy - 95)}px;width:460px;height:190px;overflow:visible" viewBox="0 0 460 190"><ellipse cx="230" cy="95" rx="214" ry="78" fill="none" stroke="${C.clay}" stroke-width="7" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110" stroke-linecap="round"/></svg>`);
  s.fromTo("#ring ellipse", { strokeDashoffset: 110 }, { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" }, tC + 1.05);
  s.add(`<div id="six" class="card" style="left:60px;top:${TOPY + 700}px;width:960px;height:150px;border-radius:22px;opacity:0">
    <div class="sans abs" style="left:34px;top:14px;font-size:96px;font-weight:700;color:${C.clay}">6</div>
    <div class="sans abs" style="left:120px;top:26px;width:820px;font-size:32px;line-height:1.3;color:${C.soft}">signers of both founding documents<br><span class="mono" style="font-size:28px">Clymer, Franklin, Morris, Read, Sherman, Wilson</span></div></div>`);
  s.enter("#six", at("who2", "both") - 0.1, { from: "up", dur: 0.5 });
  // the method, as a four-step process
  const tM = at("who3") - 0.2;
  s.leave("#trum, #con, #ring, #six", tM - 0.25, 0.22);
  const STEPS = [["need", "Identify a public need"], ["pooling", "Pool contributions"], ["many", "From many members"], ["members", "Found the institution"]];
  s.add(`<div id="mh" class="kicker abs" style="left:84px;top:${TOPY + 10}px;opacity:0">The method</div>`);
  s.fromTo("#mh", { opacity: 0 }, { opacity: 1, duration: 0.3 }, tM);
  STEPS.forEach(([w, label], i) => {
    const y = TOPY + 80 + i * 176;
    s.add(`<div id="st${i}" class="card" style="left:84px;top:${y}px;width:912px;height:136px;border-radius:22px;opacity:0">
      <div class="mono abs" style="left:34px;top:44px;font-size:36px;font-weight:500;color:${C.clay}">0${i + 1}</div>
      <div class="sans abs" style="left:128px;top:40px;font-size:44px;font-weight:600">${label}</div></div>`);
    if (i) s.add(`<div id="ln${i}" class="bar" style="left:136px;top:${y - 40}px;width:4px;height:40px;background:${C.rule};transform-origin:50% 0;opacity:0"></div>`);
    const t = at("who3", w) - 0.1 + (i === 3 ? 0.45 : 0);
    if (i) s.fromTo(`#ln${i}`, { opacity: 1, scaleY: 0 }, { opacity: 1, scaleY: 1, duration: 0.2, ease: "power2.out" }, t - 0.15);
    s.enter(`#st${i}`, t, { from: "left", dur: 0.45 });
  });
  scenes.push(s);
}

// ── 3. LIB: the Junto, the subscription machine, the Library Company ───────
{
  const s = new Scene("lib", start("lib") - 0.2, start("fire") - 0.15, 3);
  s.raw.push(FIGCSS);
  // the Junto's members, from Franklin's own list
  const ROSTER = [["Joseph Breintnal", "scrivener"], ["Thomas Godfrey", "glazier"], ["Nicholas Scull", "surveyor"], ["William Parsons", "shoemaker"], ["William Maugridge", "joiner"], ["Hugh Meredith", "printer"]];
  s.add(`<div id="jun" class="card" style="left:84px;top:${TOPY}px;width:912px;height:700px;opacity:0">
    <div class="kicker abs" style="left:40px;top:36px">Founded 1727</div>
    <div class="sans abs" style="left:40px;top:84px;font-size:76px;font-weight:700;letter-spacing:-0.01em">The Junto</div>
    ${ROSTER.map(([n, t], i) => `<div id="ro${i}" class="abs" style="left:40px;top:${222 + i * 66}px;width:832px;height:66px;border-top:1px solid ${C.rule};opacity:0">
      <span class="sans abs" style="left:0;top:14px;font-size:32px;font-weight:500">${n}</span><span class="mono abs" style="right:0;top:17px;font-size:28px">${t}</span></div>`).join("")}
    <div class="mono abs" style="left:40px;top:632px;font-size:23px">Source: Franklin, Autobiography</div></div>`);
  s.enter("#jun", at("lib1") - 0.15, { from: "zoom" });
  ROSTER.forEach((_, i) => s.enter(`#ro${i}`, at("lib1", "tradesmen") - 0.3 + i * 0.12, { from: "up", dur: 0.4 }));
  // the subscription machine, put together, then run
  const fig = FIG("library");
  const tF = at("lib2") - 0.3;
  s.leave("#jun", tF - 0.2, 0.22);
  s.add(machine("mac", fig, { x: 110, y: TOPY + 130, w: 860, figNo: "2.1", caption: "The subscription library as a machine" }));
  s.style(`#mac [data-part^="shelf"] { opacity: 0; }`);
  s.enter("#mac", tF, { from: "zoom", dur: 0.5 });
  s.assemble("#mac", fig, tF + 0.1, Math.max(1.6, at("lib2", "fifty") - tF - 0.3));
  // each stack rides to the hopper and drops in as the subscriptions are paid
  const c0 = at("lib2", "fifty"), c1 = after("lib2", "each");
  fig.moves.coins.forEach((m, i) => {
    const t = c0 + (c1 - c0) * (i / 50);
    s.to(`#mac [data-part="coin${i}"]`, { x: m.x, y: m.y, duration: 0.45, ease: "power2.inOut" }, t)
      .to(`#mac [data-part="coin${i}"]`, { x: m.x + fig.moves.coinsDrop.x, y: m.y + fig.moves.coinsDrop.y, opacity: 0, duration: 0.2, ease: "power2.in" }, t + 0.45);
  });
  // books arrive shelf by shelf once the fund exists
  [0, 1, 2].forEach((n) => s.fromTo(`#mac [data-part="shelf${n}"]`, { x: fig.moves.shelfIn.x, y: fig.moves.shelfIn.y, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.55, ease: "expo.out" }, c1 + 0.3 + n * 0.25));
  // the arithmetic, above the machine
  s.add(`<div id="sum" class="abs" style="left:84px;top:${TOPY}px;width:912px;opacity:0">
    <span id="n50" class="sans" style="font-size:84px;font-weight:700;color:${A.library}">0</span><span class="sans" style="font-size:40px;color:${C.muted};font-weight:500"> × 40s =&nbsp;</span><span id="fund" class="sans" style="font-size:84px;font-weight:700">£0</span>
    <div class="mono" style="font-size:27px;margin-top:2px">then 10s per member per year</div></div>`);
  s.set("#sum", { opacity: 1 }, c0 - 0.1).count("#n50", c0, c1 - c0 + 0.45, 0, 50).count("#fund", c0, c1 - c0 + 0.45, 0, 100, "'£' + Math.round(v)");
  s.sound("typing", c0, 0.16);
  // the Library Company, from Birch's view of its hall
  const tL = at("lib3") - 0.25;
  s.leave("#mac, #sum", tL - 0.2, 0.22);
  s.add(exhibit("hall", "library-hall", { x: 60, y: TOPY, w: 960, h: 680, fig: "2.2", caption: "Library and Surgeons Hall, Birch, 1799 · LOC", extra: "opacity:0" }));
  s.enter("#hall", tL, { from: "right" }).cam("#hall-pic", frame("library-hall", 960, 616, 0.45, 0.45, 1.05), frame("library-hall", 960, 616, 0.34, 0.42, 1.6), tL, start("fire") - tL);
  s.add(`<div id="since" class="tag" style="left:88px;top:${TOPY + 28}px;opacity:0;color:${A.library}">1731 → today</div>`);
  s.enter("#since", at("lib3", "still") - 0.1, { from: "left", dur: 0.4 });
  s.sound("whoosh-short", tL, 0.18);
  scenes.push(s);
}

// ── 4. FIRE: the proverb, then the company and its buckets ─────────────────
{
  const s = new Scene("fire", start("fire") - 0.15, start("hosp") - 0.15, 4);
  s.add(`<div id="q" class="card" style="left:60px;top:${TOPY}px;width:960px;height:560px;opacity:0">
    <div class="bar" style="left:44px;top:56px;width:8px;height:300px;background:${A.fire}"></div>
    <div id="qt" class="serif abs" style="left:84px;top:44px;width:820px;font-size:68px;line-height:1.18;font-style:italic">${words("An ounce of prevention is worth a pound of cure.")}</div>
    <div class="mono abs" style="left:84px;top:430px;font-size:26px">PENNSYLVANIA GAZETTE · 4 FEB 1735</div></div>`);
  s.enter("#q", at("fire1") - 0.1, { from: "zoom" });
  s.words("#qt .w", at("fire1", "ounce") - 0.1, { stagger: (at("fire1", "cure") - at("fire1", "ounce")) / 10 });
  const tU = at("fire2") - 0.2;
  s.leave("#q", tU - 0.2, 0.22);
  s.add(exhibit("buck", "bucket", { x: 60, y: TOPY, w: 560, h: 680, fig: "3.1", caption: "Leather fire bucket", extra: "opacity:0" }));
  s.enter("#buck", tU, { from: "left" }).cam("#buck-pic", frame("bucket", 560, 616, 0.5, 0.48, 1.1), frame("bucket", 560, 616, 0.5, 0.44, 1.22), tU, start("hosp") - tU);
  s.add(`<div id="uf" class="abs" style="left:650px;top:${TOPY + 20}px;width:380px;opacity:0">
    <div class="kicker">Est. 1736</div>
    <div class="sans" style="font-size:44px;font-weight:600;line-height:1.1;margin-top:10px">Union Fire Company</div>
    <div style="margin-top:26px;width:80px;height:6px;border-radius:3px;background:${A.fire}"></div>
    <div class="mono" style="font-size:26px;margin-top:22px;line-height:1.5">Volunteer brigade<br>Members only</div></div>`);
  s.enter("#uf", at("fire2", "union") - 0.2, { from: "right", dur: 0.5 });
  s.sound("whoosh-short", tU, 0.18);
  scenes.push(s);
}

// ── 5. HOSP: Dr Bond's proposal, and the matching grant as a machine ───────
{
  const s = new Scene("hosp", start("hosp") - 0.15, start("acad") - 0.15, 5);
  s.raw.push(FIGCSS);
  s.add(exhibit("bond", "bond", { x: 60, y: TOPY, w: 430, h: 560, fig: "4.1", caption: "Thomas Bond", extra: "opacity:0" }));
  s.add(exhibit("hos", "hospital", { x: 520, y: TOPY + 80, w: 500, h: 600, fig: "4.2", caption: "Pennsylvania Hospital", extra: "opacity:0" }));
  s.set("#bond-pic", frame("bond", 430, 496, 0.5, 0.35, 1.05), 0);
  s.enter("#bond", at("hosp1") - 0.1, { from: "left" }).enter("#hos", at("hosp1", "hospital") - 0.15, { from: "right" });
  s.cam("#hos-pic", frame("hospital", 500, 536, 0.5, 0.45, 1.0), frame("hospital", 500, 536, 0.55, 0.5, 1.15), at("hosp1") - 0.1, L("hosp1").t1 - at("hosp1") + 0.8);
  const fig = FIG("grant");
  const tG = at("hosp2") - 0.3;
  s.leave("#bond, #hos", tG - 0.2, 0.22);
  s.add(machine("mac", fig, { x: 110, y: TOPY + 130, w: 860, figNo: "4.3", caption: "The matching grant as a machine" }));
  s.style(`#mac [data-part^="d"] { opacity: 0; }`);
  s.enter("#mac", tG, { from: "zoom", dur: 0.5 });
  s.assemble("#mac", fig, tG + 0.1, Math.max(1.6, at("hosp2", "only") - tG - 0.2));
  // the donors' coins, £100 each, while the condition is stated
  const d0 = at("hosp2", "private"), d1 = Math.max(after("hosp2"), at("hosp3", "target"));
  for (let n = 0; n < 20; n++) s.fromTo(`#mac [data-part="d${n}"]`, { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.in" }, d0 + (d1 - d0) * n / 20);
  // at the mark: the paddle lifts, the latch lets go, the Assembly's £2,000 drops
  const tT = d1 + 0.12;
  s.to(`#mac [data-part="paddle"]`, { x: fig.moves.paddleUp.x, y: fig.moves.paddleUp.y, duration: 0.15, ease: "power2.out" }, tT);
  s.to(`#mac [data-part="held"]`, { x: fig.moves.drop.x, y: fig.moves.drop.y, duration: 0.32, ease: "power2.in" }, tT + 0.15);
  s.sound("impact-bass-1", tT + 0.47, 0.22);
  s.add(`<div id="cnt" class="abs" style="left:84px;top:${TOPY}px;width:420px;opacity:0">
    <div class="mono" style="font-size:26px">PRIVATE DONORS</div><div id="dn" class="sans" style="font-size:72px;font-weight:700;color:${A.hospital}">£0</div></div>
    <div id="cnt2" class="abs" style="left:576px;top:${TOPY}px;width:420px;text-align:right;opacity:0">
    <div class="mono" style="font-size:26px">THE ASSEMBLY</div><div id="an" class="sans" style="font-size:72px;font-weight:700;color:${C.muted}">£2,000</div></div>`);
  s.set("#cnt, #cnt2", { opacity: 1 }, d0 - 0.1).count("#dn", d0, d1 - d0 + 0.1, 0, 2000, "'£' + (Math.round(v / 100) * 100).toLocaleString('en-GB')");
  s.fromTo("#an", { color: C.muted }, { color: A.hospital, duration: 0.3 }, tT + 0.45);
  scenes.push(s);
}

// ── 6. ACAD: the charter, and the university it became ─────────────────────
{
  const s = new Scene("acad", start("acad") - 0.15, start("turn") - 0.2, 6);
  s.add(exhibit("ch", "charter", { x: 60, y: TOPY, w: 960, h: 680, fig: "5.1", caption: "Charter of the College of Philadelphia, 1755", extra: "opacity:0" }));
  s.enter("#ch", at("acad1") - 0.1, { from: "right" }).cam("#ch-pic", frame("charter", 960, 616, 0.3, 0.12, 1.5), frame("charter", 960, 616, 0.55, 0.3, 1.25), at("acad1") - 0.1, at("acad1", "university") - at("acad1"));
  const tU = at("acad1", "university") - 0.15;
  s.add(exhibit("pen", "penn", { x: 60, y: TOPY, w: 960, h: 680, fig: "5.2", caption: "College Hall, University of Pennsylvania", extra: "opacity:0" }));
  s.leave("#ch", tU + 0.2, 0.25);
  s.enter("#pen", tU, { from: "zoom", dur: 0.5 }).cam("#pen-pic", frame("penn", 960, 616, 0.5, 0.5, 1.12), frame("penn", 960, 616, 0.5, 0.45, 1.0), tU, 2);
  s.add(`<div id="yrs" class="tag" style="left:60px;top:${TOPY + 710}px;opacity:0;color:${A.academy}">Academy 1751 · University 1791</div>`);
  s.enter("#yrs", tU + 0.3, { from: "left", dur: 0.4 });
  scenes.push(s);
}

// ── 7. TURN: four foundations, built four times ────────────────────────────
{
  const s = new Scene("turn", start("turn") - 0.2, start("now") - 0.15, 7);
  s.raw.push(FIGCSS);
  const fig = FIG("foundations-four");
  s.add(machine("mac", fig, { x: 90, y: TOPY, w: 900, figNo: "6.1", caption: "Four institutions, four foundations" }));
  s.enter("#mac", at("turn1") - 0.15, { from: "zoom", dur: 0.4 });
  s.assemble("#mac", fig, at("turn1"), L("turn1").t1 - at("turn1") + 0.3);
  const KEYS = [["rules", "Rules"], ["members", "Members"], ["money", "Money"]];
  KEYS.forEach(([w, label], i) => {
    s.add(`<div id="k${i}" class="tag" style="left:${118 + i * 230}px;top:${TOPY + 28}px;opacity:0">${label}</div>`);
    s.enter(`#k${i}`, at("turn1", w) - 0.1, { from: "up", dur: 0.35 });
  });
  // four times over, beside a printing business, an almanac and electricity
  s.add(`<div id="x4" class="sans abs" style="left:118px;top:${TOPY + 6}px;font-size:120px;font-weight:700;color:${C.clay};opacity:0">×4</div>`);
  s.enter("#x4", at("turn2", "four") - 0.1, { from: "zoom", dur: 0.4 });
  const SIDE = [["printing", "press", "Printing"], ["almanac", "almanac", "Almanac"], ["electricity", "kite", "Electricity"]];
  s.leave("#k0, #k1, #k2", at("turn2", "while") - 0.3, 0.2);
  SIDE.forEach(([w, img, label], i) => {
    s.add(`<div id="sd${i}" class="card" style="left:${300 + i * 226}px;top:${TOPY + 22}px;width:206px;height:178px;border-radius:16px;opacity:0">
      <div class="abs" style="left:0;top:0;width:206px;height:114px;overflow:hidden">${picEl(`sd${i}-pic`, img)}</div>
      <div class="cap" style="padding:0 16px"><b>${label}</b></div></div>`);
    s.set(`#sd${i}-pic`, frame(img, 206, 114, 0.5, 0.35, 1.05), 0);
    s.enter(`#sd${i}`, at("turn2", w) - 0.15, { from: "up", dur: 0.45 });
  });
  scenes.push(s);
}

// ── 8. NOW: one shared foundation, and a new project plugged into it ───────
{
  const s = new Scene("now", start("now") - 0.15, start("end") - 0.35, 8);
  s.raw.push(FIGCSS);
  const fig = FIG("foundations-shared");
  s.add(machine("mac", fig, { x: 90, y: TOPY, w: 900, figNo: "7.1", caption: "One foundation, shared" }));
  s.style(`#mac [data-part="new"] { opacity: 0; }`);
  s.enter("#mac", at("now1") - 0.1, { from: "zoom", dur: 0.4 });
  s.assemble("#mac", fig, at("now1"), L("now1").t1 - at("now1") + 0.8);
  // the new project slides into the empty socket
  s.fromTo(`#mac [data-part="new"]`, { opacity: 0 }, { opacity: 1, duration: 0.3 }, at("now2", "new") - 0.4);
  s.to(`#mac [data-part="new"]`, { x: fig.moves.newIn.x, y: fig.moves.newIn.y, duration: 0.7, ease: "power3.inOut" }, at("now2", "structure") - 0.2);
  s.sound("click-soft", at("now2", "structure") + 0.5, 0.4);
  // what it can do from its first day
  const CAN = [["tax-deductible", "Gifts"], ["grants", "Grants"], ["contracts", "Contracts"]];
  CAN.forEach(([w, label], i) => {
    s.add(`<div id="cv${i}" class="tag" style="left:${118 + i * 250}px;top:${TOPY + 28}px;opacity:0;color:${A.mulvium}">✓ ${label}</div>`);
    s.enter(`#cv${i}`, at("now2", w) - 0.1, { from: "up", dur: 0.35 });
  });
  scenes.push(s);
}

// ── 9. END: the cosmos and the wordmark (the launch film's own close) ──────
const PLATE = { file: "cosmos-close.mp4", from: 64.6, gather: 77.0, settle: 84.4 };
{
  const t0 = start("end") - 0.35;
  const offset = PLATE.gather - (after("end2") + 0.7);
  const mediaStart = Math.max(0, t0 + offset - PLATE.from);
  const t1 = t0 + (PLATE.settle + 1.6 - PLATE.from - mediaStart);
  const s = new Scene("end", t0, t1, 9);
  s.add(`<video id="plate" class="full" src="assets/${PLATE.file}" muted playsinline style="object-fit:cover"></video>`);
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
// A subtitle never repeats words the page is setting: lines whose words are
// on screen in type get none. Each entry is the first word index from which
// the line is subtitled (Infinity: never).
const NO = Infinity;
const CAPTION_FROM = {
  hook1: NO, hook2: 0, who1: NO, who2: NO, who3: NO, lib1: NO, lib2: NO, lib3: 0,
  fire1: NO, fire2: 0, hosp1: 0, hosp2: NO, hosp3: NO, acad1: NO, turn1: NO, turn2: NO,
  now1: NO, now2: NO, end1: NO, end2: NO,
};
const groups = [];
for (const l of T.lines) {
  const from = CAPTION_FROM[l.id] ?? 0;
  let g = [];
  l.words.forEach((w, i) => {
    if (i < from) return;
    g.push(w);
    const next = l.words[i + 1], len = g.map((x) => x[0]).join(" ").length;
    if (!next || /[.:;]$/.test(w[0]) || (/,$/.test(w[0]) && g.length >= 3) || g.length >= 6 || len > 34 || next[1] - w[2] > 0.15) { groups.push(g); g = []; }
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
    .cap { position: absolute; left: 0; top: 1200px; width: ${W}px; height: 130px; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; }
    .cap span { max-width: 900px; text-align: center; font-family: "IBM Plex Sans", sans-serif; font-weight: 500; font-size: 44px; line-height: 1.25; color: ${C.surface};
      background: rgba(27, 22, 19, 0.86); border-radius: 14px; padding: 10px 24px 12px; box-decoration-break: clone; -webkit-box-decoration-break: clone; }`);
const content = scenes.filter((s) => s.id !== "chrome");
caps.t1 = content[content.length - 1].t0;

// ── The root: scenes, captions, voice, music, sound ────────────────────────
const DUR = r3(content[content.length - 1].t1);
fs.mkdirSync(path.join(HERE, "compositions"), { recursive: true });
for (const f of fs.readdirSync(path.join(HERE, "compositions"))) fs.unlinkSync(path.join(HERE, "compositions", f));
for (const s of [...scenes, caps]) fs.writeFileSync(path.join(HERE, "compositions", `${s.id}.html`), s.file());
// Each scene runs until the next one is on top of it; the chrome over all of them
const hosts = scenes.map((s, i) => {
  const next = content[content.indexOf(s) + 1];
  const end = s.id === "chrome" ? s.t1 : next ? Math.max(s.t1, next.t0 + 0.05) : s.t1;
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
    <div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="${W}" data-height="${H}" data-motion-blur="on">
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
