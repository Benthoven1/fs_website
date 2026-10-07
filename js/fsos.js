// fsos.js — the MulviumSOS (M.SOS) page scene (pages/offerings/msos.html):
// a mind made of the work. M.SOS's green planet arrives as the loading screen opens. Then it dissolves
// into words: the solid planet falls away and leaves a sphere made only of
// words fitted into one another like puzzle pieces, the vocabulary of building
// and running an institution and of making it known: the twelve agents of
// Atelier, which builds the institution, and the eight of Grove, its
// communications agency, what each looks
// after, and the everyday work between them. As it does, a porcelain figure grows beneath it and the camera
// draws back: the word sphere is the figure's head. The figure thinks, its head
// turning a little as words light up. The page's text then scrolls up over
// the scene, as on the Oak page.
import * as THREE from "three";
import { STYLES, vocabulary, slotSize, drawWord } from "./fsos-words.js";
import CLOUD from "./fsos-cloud.js";
import { scrollCue } from "./scroll-cue.js";

const canvas = document.getElementById("fsos-canvas");
if (!canvas) throw new Error("fsos: #fsos-canvas not found");

const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Palette — the planet and porcelain tones mirror js/main.js
const PAPER       = 0xeceae5;
const PASTEL_FSOS = 0xc4ddb8;
const PORCELAIN   = 0xf3eee6;
const GLINT       = new THREE.Color(0xc19a5b);   // a word lit up, in gold
// The words take the planet's green, deepened so they read on paper
const TONES = {
  agent: [0x3f5a38],
  focus: [0x58764c, 0x5f7d52],
  work:  [0x6f8a62, 0x7e9c6e, 0x86a376, 0x8fae7f, 0x7a9469, 0x9ab58a],
};

// ── Renderer, scene, lights (same sculptural lighting as the home cosmos) ────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);

const FOV = 36;
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 300);
const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

scene.add(new THREE.AmbientLight(0xfff7e8, 0.35));
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfb0, 0.75));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 16, 10);
keyLight.castShadow = true;
const SHADOW_MAP = window.innerWidth < 720 ? 1024 : 2048;
keyLight.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
keyLight.shadow.radius = 6;
keyLight.shadow.bias = -0.0004;
Object.assign(keyLight.shadow.camera, { left: -7, right: 7, top: 12, bottom: -3, near: 1, far: 50 });
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xfff1d8, 0.5);
fillLight.position.set(-8, 3, -4);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xf1e4bf, 0.55);
rimLight.position.set(-2, -6, -8);
scene.add(rimLight);

// Paper floor that only receives the figure's soft shadow
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.14 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── Figure geometry ──────────────────────────────────────────────────────────
// A short, round stock figure about three heads tall, on a porcelain base.
const HEAD_R = 1.15;
const HEAD_C = new THREE.Vector3(0, 6.15, 0);
// The final view: three-quarters of the figure, from the head to the knees,
// seen a little from one side
const Q_C = new THREE.Vector3(0, 4.9, 0), Q_HALF_H = 3.6, Q_HALF_W = 1.8;

// Deterministic randomness, so tones and depths are the same every visit
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── The atlas: every word drawn once, in white, tinted per word ──────────────
const ATLAS_W = 2048, PAD = 6;
const atlasCanvas = document.createElement("canvas");
const actx = atlasCanvas.getContext("2d");
const entries = vocabulary();
function layoutAtlas() {
  let x = 0, y = 0, rowH = 0;
  entries.forEach((en) => {
    const slot = slotSize(actx, en.text, STYLES[en.kind]);
    const w = slot.w + PAD * 2, h = slot.h + PAD * 2;
    if (x + w > ATLAS_W) { x = 0; y += rowH; rowH = 0; }
    Object.assign(en, { x, y, w, h });
    x += w; rowH = Math.max(rowH, h);
  });
  // Exactly as tall as the words need (WebGL2 mipmaps any size; rounding up
  // to a power of two would double it now that both teams' words are here)
  atlasCanvas.width = ATLAS_W;
  atlasCanvas.height = y + rowH;
}
let atlasHasFonts = false;
function paintAtlas() {
  actx.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
  actx.fillStyle = "#ffffff";
  entries.forEach((en) => drawWord(actx, en.text, STYLES[en.kind], en.x + en.w / 2, en.y + en.h / 2, en.w - PAD * 2));
  atlasHasFonts = fontsIn();
}
const atlas = new THREE.CanvasTexture(atlasCanvas);
atlas.colorSpace = THREE.SRGBColorSpace;
atlas.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const UP = new THREE.Vector3(0, 1, 0);

// ── Building the word surface: one mesh, every word curved onto the sphere ───
const WORD_R = HEAD_R * 1.004;
const headGroup = new THREE.Group();
headGroup.position.copy(HEAD_C);
scene.add(headGroup);

// The planet dissolves rather than fading: a front starts at the point facing
// the viewer and travels round the sphere, its edge broken by soft noise, and
// behind it the surface is simply gone. A thin pale rim lights the edge as it
// goes. The shadow pass erodes in step, so the shadow dissolves with it.
const erode = { uProg: { value: -0.1 }, uFront: { value: new THREE.Vector3(0, 0.16, 1).normalize() }, uRim: { value: new THREE.Color(0xf7f4ea) } };
const ERODE_GLSL = `
  uniform float uProg;
  uniform vec3 uFront;
  varying vec3 vObj;
  float eHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float eNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(eHash(i), eHash(i + vec3(1, 0, 0)), f.x), mix(eHash(i + vec3(0, 1, 0)), eHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(eHash(i + vec3(0, 0, 1)), eHash(i + vec3(1, 0, 1)), f.x), mix(eHash(i + vec3(0, 1, 1)), eHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  // How far round from the front this point is (0 to 1), roughened by noise
  float eField() {
    vec3 d = normalize(vObj);
    float around = acos(clamp(dot(d, uFront), -1.0, 1.0)) / 3.14159265;
    float n = 0.6 * eNoise(d * 3.2) + 0.3 * eNoise(d * 7.1) + 0.1 * eNoise(d * 15.0);
    return 0.74 * around + 0.26 * n;
  }`;
const withErosion = (sh, rim) => {
  Object.assign(sh.uniforms, erode);
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <common>", "#include <common>" + ERODE_GLSL + (rim ? "\nuniform vec3 uRim;" : ""))
    .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      float eEdge = eField() - uProg;
      if (eEdge < 0.0) discard;`);
  if (rim) {
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      float eRim = 1.0 - smoothstep(0.0, 0.05, eEdge);
      diffuseColor.rgb = mix(diffuseColor.rgb, uRim, eRim * 0.8);
      totalEmissiveRadiance += uRim * eRim * 0.35;`);
  }
};
const planetMat = new THREE.MeshStandardMaterial({ color: PASTEL_FSOS, roughness: 0.34, metalness: 0 });
planetMat.onBeforeCompile = (sh) => withErosion(sh, true);
const planet = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 128, 96), planetMat);
planet.castShadow = true;
const planetDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
planetDepth.onBeforeCompile = (sh) => withErosion(sh, false);
planet.customDepthMaterial = planetDepth;
headGroup.add(planet);

let wordMesh = null, wordColors = null;
const wordSpans = [];
function buildCloud() {
  layoutAtlas();
  paintAtlas();
  atlas.needsUpdate = true;
  // Where each word sits comes from js/fsos-cloud.js, packed ahead of time by
  // the shape of its letters (tools/pack-fsos-cloud.html)
  const rnd = mulberry32(20261002);
  const byKey = new Map(entries.map((en) => [en.kind + ":" + en.text, en]));
  const placed = [];
  for (const [kind, text, nx, ny, nz, ex, ey, ez, w, h] of CLOUD) {
    const en = byKey.get(kind + ":" + text);
    if (!en) continue; // a word no longer in the vocabulary
    const n = new THREE.Vector3(nx, ny, nz), e = new THREE.Vector3(ex, ey, ez);
    placed.push({ en, n, e, u: new THREE.Vector3().crossVectors(n, e), w, h });
  }
  let verts = 0;
  const segs = placed.map((p) => Math.max(2, Math.ceil(p.w / 0.06)));
  segs.forEach((s) => { verts += (s + 1) * 2; });
  const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3), uv = new Float32Array(verts * 2);
  const col = new Float32Array(verts * 4), index = [];
  const W = atlasCanvas.width, H = atlasCanvas.height;
  let v = 0;
  const d1 = new THREE.Vector3(), d = new THREE.Vector3();
  placed.forEach((p, wi) => {
    const S = segs[wi], first = v;
    const tones = TONES[p.en.kind], tone = new THREE.Color(tones[Math.floor(rnd() * tones.length)]);
    // A little depth, like a cloud: words sit at slightly different heights
    const rad = WORD_R * (p.en.kind === "agent" ? 1.04 : 1 + rnd() * 0.035);
    const u0 = (p.en.x + PAD) / W, u1 = (p.en.x + p.en.w - PAD) / W;  // the word's slot
    const vTop = 1 - (p.en.y + PAD) / H, vBot = 1 - (p.en.y + p.en.h - PAD) / H;
    for (let i = 0; i <= S; i++) {
      const s = -p.w / 2 + (p.w * i) / S;
      d1.copy(p.n).multiplyScalar(Math.cos(s)).addScaledVector(p.e, Math.sin(s));
      for (let j = 0; j < 2; j++) {
        const t = j === 0 ? -p.h / 2 : p.h / 2;
        d.copy(d1).multiplyScalar(Math.cos(t)).addScaledVector(p.u, Math.sin(t));
        pos.set([d.x * rad, d.y * rad, d.z * rad], v * 3);
        nor.set([d.x, d.y, d.z], v * 3);
        uv.set([u0 + ((u1 - u0) * i) / S, j === 0 ? vBot : vTop], v * 2);
        col.set([planetColor.r, planetColor.g, planetColor.b, 0], v * 4);
        v++;
      }
      if (i < S) { const a = first + i * 2; index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    wordSpans.push({ first, count: v - first, tone, n: p.n, lit: 0, delay: 0 });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 4));
  geo.setIndex(index);
  wordColors = geo.getAttribute("color");
  // Flat type, seen from both sides; words round the back fade toward the
  // paper, which is what gives the hollow sphere its depth
  const mat = new THREE.MeshBasicMaterial({
    map: atlas, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.35,
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uPaper = { value: new THREE.Color(PAPER) };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vFacing;")
      .replace("#include <project_vertex>", `#include <project_vertex>
        vec3 wN = normalize(mat3(modelMatrix) * normal);
        vec3 wP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vFacing = dot(wN, normalize(cameraPosition - wP));`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vFacing;\nuniform vec3 uPaper;")
      .replace("#include <alphatest_fragment>", `#include <alphatest_fragment>
        diffuseColor.rgb = mix(uPaper, diffuseColor.rgb, mix(0.2, 1.0, smoothstep(-0.35, 0.55, vFacing)));`);
  };
  wordMesh = new THREE.Mesh(geo, mat);
  wordMesh.castShadow = true;
  wordMesh.visible = false;
  headGroup.add(wordMesh);
}
// A word's colour, and how far it has inked in (0 to 1). Its letters are drawn
// where the atlas's ink times this exceeds the alpha test, so as it rises they
// thicken from nothing to full strokes.
function setWordColor(span, color, ink = 1) {
  for (let k = 0; k < span.count; k++) wordColors.setXYZW(span.first + k, color.r, color.g, color.b, ink);
}

// Words are drawn with their web fonts, so wait for the font stylesheet and
// the fonts (but not forever); if they arrive later, repaint.
const FONTS = [STYLES.agent.font, STYLES.focus.font, STYLES.work.font];
const FAMILIES = ["Cormorant SC", "Cormorant Garamond", "DM Mono"];
// Each family has a face actually loaded (document.fonts.check() also says
// yes when the stylesheet hasn't arrived to declare any faces at all)
function fontsIn() {
  const faces = [...document.fonts];
  return FAMILIES.every((fam) => faces.some((f) => f.family.replace(/"/g, "") === fam && f.status === "loaded"));
}
function repaintIfFontsArrived() {
  if (!cloudReady || atlasHasFonts || !fontsIn()) return;
  paintAtlas();
  atlas.needsUpdate = true;
}
document.fonts.addEventListener("loadingdone", repaintIfFontsArrived);
function fontsReady() {
  const link = document.querySelector('link[href*="fonts.googleapis"]');
  const sheet = !link || link.sheet ? Promise.resolve() : new Promise((r) => {
    link.addEventListener("load", r, { once: true });
    link.addEventListener("error", r, { once: true });
  });
  return sheet.then(() => Promise.all(FONTS.map((f) => document.fonts.load(f))));
}
const planetColor = new THREE.Color(PASTEL_FSOS);
let cloudReady = false;
const fontsLoaded = fontsReady().catch(() => {});
Promise.race([fontsLoaded, new Promise((r) => setTimeout(r, 4000))]).then(() => {
  buildCloud();
  cloudReady = true;
  fontsLoaded.then(repaintIfFontsArrived);
});

// ── The porcelain figure ─────────────────────────────────────────────────────
// Smooth, faceless stock-figure parts. Each part hangs from the joint it
// grows out of, so the body can grow down from the head.
// A soft studio for the glaze to reflect: a paper room with two softboxes
function studio() {
  const pm = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: PAPER, side: THREE.BackSide })));
  const softbox = (w, h, at, power) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.98, 0.94).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.copy(at);
    m.lookAt(0, 0, 0);
    room.add(m);
  };
  softbox(7, 4, new THREE.Vector3(5, 7, 6), 3);
  softbox(5, 3, new THREE.Vector3(-7, 2, -3), 1.4);
  const tex = pm.fromScene(room, 0.04).texture;
  pm.dispose();
  return tex;
}
const porcelain = new THREE.MeshPhysicalMaterial({
  color: PORCELAIN, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1,
  envMap: studio(), envMapIntensity: 0.4,
});
const body = new THREE.Group();
scene.add(body);
const parts = [];
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const shade = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
// A tapered limb from a to b (radii ra → rb) with rounded ends, grown from a
function limb(a, b, ra, rb, order) {
  const g = new THREE.Group();
  g.position.copy(a);
  const dir = b.clone().sub(a), len = dir.length();
  const inner = new THREE.Group();
  const shaft = shade(new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, len, 40, 1, true), porcelain));
  shaft.position.y = len / 2;
  const capA = shade(new THREE.Mesh(new THREE.SphereGeometry(ra, 32, 20), porcelain));
  const capB = shade(new THREE.Mesh(new THREE.SphereGeometry(rb, 32, 20), porcelain));
  capB.position.y = len;
  inner.add(shaft, capA, capB);
  inner.quaternion.setFromUnitVectors(UP, dir.normalize());
  g.add(inner);
  body.add(g);
  parts.push({ g, order });
}
// An ellipsoid centred on c, grown from anchor
function blob(anchor, c, sx, sy, sz, order) {
  const g = new THREE.Group();
  g.position.copy(anchor);
  const m = shade(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), porcelain));
  m.scale.set(sx, sy, sz);
  m.position.copy(c).sub(anchor);
  g.add(m);
  body.add(g);
  parts.push({ g, order });
}
{
  // Neck, and one round piece from hips to shoulders
  limb(V(0, 4.98), V(0, 4.55), 0.34, 0.38, 0);
  const torso = new THREE.LatheGeometry([
    [0.0, 2.05], [0.4, 2.1], [0.78, 2.3], [0.95, 2.65], [1.0, 3.1], [0.97, 3.6], [0.9, 4.05],
    [0.8, 4.4], [0.6, 4.65], [0.32, 4.78], [0.0, 4.8],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 64);
  const tg = new THREE.Group();
  tg.position.set(0, 4.75, 0);
  const tm = shade(new THREE.Mesh(torso, porcelain));
  tm.position.y = -4.75;
  tm.scale.z = 0.78;
  tg.add(tm);
  body.add(tg);
  parts.push({ g: tg, order: 1 });
  for (const s of [-1, 1]) blob(V(s * 0.82, 4.3), V(s * 0.88, 4.28), 0.36, 0.36, 0.36, 2);
  // Thinking: one hand up at the chin...
  const elbowR = V(0.95, 3.5, 0.95), wristR = V(0.3, 4.8, 0.95);
  limb(V(0.92, 4.22, 0.08), elbowR, 0.3, 0.26, 3);
  limb(elbowR, wristR, 0.25, 0.21, 4);
  blob(wristR, V(0.2, 5.05, 0.88), 0.25, 0.27, 0.24, 5);
  // ...the other arm across the middle, its hand cupping that elbow
  const elbowL = V(-1.05, 3.3, 0.6), wristL = V(0.55, 3.35, 1.08);
  limb(V(-0.92, 4.22, 0.08), elbowL, 0.3, 0.26, 3);
  limb(elbowL, wristL, 0.25, 0.21, 4);
  blob(wristL, V(0.76, 3.4, 1.06), 0.26, 0.22, 0.24, 5);
  // Short, sturdy legs and round feet
  for (const s of [-1, 1]) {
    limb(V(s * 0.45, 2.35), V(s * 0.48, 0.62, 0.02), 0.46, 0.36, 4);
    blob(V(s * 0.48, 0.62), V(s * 0.5, 0.5, 0.2), 0.3, 0.22, 0.46, 5);
  }
  // Round porcelain base
  const bg = new THREE.Group();
  const base = shade(new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.75, 0.3, 96), porcelain));
  base.position.y = 0.15;
  bg.add(base);
  body.add(bg);
  parts.push({ g: bg, order: 6 });
}
parts.forEach((p) => p.g.scale.setScalar(0.0001));

// ── Pointer parallax ─────────────────────────────────────────────────────────
const drift = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener("pointermove", (e) => {
  drift.tx = (e.clientX / window.innerWidth) * 2 - 1;
  drift.ty = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

canvas.setAttribute("role", "img");
canvas.setAttribute("aria-label", "A porcelain figure, thinking, whose head is a sphere of words: the twenty agents of MulviumSOS, twelve in Atelier, which builds the institution, and eight in Grove, which makes it known, and the work each one handles");

// ── Prose rises in as it scrolls into view (same .rv classes as the home page)
{
  const els = document.querySelectorAll(".fsos-prose-header, .fsos-prose-body > p");
  els.forEach((el) => el.classList.add("rv"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("rv-in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.06, rootMargin: "0px 0px -6% 0px" });
  els.forEach((el) => io.observe(el));
  // The operating-system stack builds from the hardware up (css/msos.css)
  const stack = document.getElementById("os-stack");
  if (stack) {
    const so = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { stack.classList.add("is-in"); so.disconnect(); }
    }, { threshold: 0.2 });
    so.observe(stack);
  }
}

// ── Framing: close on the head, then the whole figure ────────────────────────
// Both views fit their subject to the screen; tall screens step back.
let distHead = 5, distQ = 10;
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  distHead = Math.max(HEAD_R / 0.5 / tanHalf, (HEAD_R + 0.6) / (tanHalf * camera.aspect));
  distQ = Math.max(Q_HALF_H / tanHalf, Q_HALF_W / (tanHalf * camera.aspect));
}
window.addEventListener("resize", resize);
resize();

// The scene stays fixed behind the page; once the text has covered it, stop
// drawing. The scroll cue shows once the figure is whole (js/scroll-cue.js).
let onScreen = true;
const cue = scrollCue(document.getElementById("fsos-cue"));
function readScroll() { onScreen = window.scrollY < window.innerHeight * 1.8; }
window.addEventListener("scroll", readScroll, { passive: true });
readScroll();

// ── Timeline ─────────────────────────────────────────────────────────────────
// The planet arrives as the loading screen opens. Once the overlay has gone it
// dissolves into words while, in the same breath, the body grows beneath it
// and the camera draws back to show the figure.
const clock = new THREE.Clock();
let holeT = Infinity, doneT = Infinity, openT = Infinity;
function onHole() { if (!isFinite(holeT)) holeT = clock.getElapsedTime(); }
function onDone() { onHole(); if (!isFinite(doneT)) doneT = clock.getElapsedTime(); }
// ls.js flags each event on window (e.g. window["__mulvium_ls-hole"]) for late listeners
if (window["__mulvium_ls-hole"]) onHole(); else document.addEventListener("mulvium:ls-hole", onHole);
if (window["__mulvium_ls-done"]) onDone(); else document.addEventListener("mulvium:ls-done", onDone);
setTimeout(onDone, 10000); // safety if the overlay never reports

const RESOLVE = 3.0;        // planet → words
const GROW = 2.8;           // the body grows, from the neck down
const PULL = 3.0;           // the camera draws back
const THINK = 3.4;          // then the figure thinks
const GLINT_EVERY = 0.35;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

const tmpColor = new THREE.Color(), camDir = new THREE.Vector3(), nWorld = new THREE.Vector3();
const target = new THREE.Vector3(), viewDir = new THREE.Vector3();
const viewHead = new THREE.Vector3(0, 0.16, 1).normalize(), viewQ = new THREE.Vector3(0.35, 0.1, 1).normalize();
let lastT = 0, nextGlint = 0, colorsDirty = false, settled = false;

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = Math.min(0.05, t - lastT);
  lastT = t;
  if (!onScreen) return;

  // The resolve begins once the overlay has gone and the cloud is built;
  // words facing the viewer go first
  if (!isFinite(openT) && isFinite(doneT) && cloudReady) {
    openT = motionOK ? Math.max(t, doneT + 0.4) : -100;
    wordMesh.visible = true;
    headGroup.updateMatrixWorld();
    // Where each word sits on the dissolving front (the noise averages out)
    wordSpans.forEach((s) => {
      s.front = 0.74 * Math.acos(THREE.MathUtils.clamp(s.n.dot(erode.uFront.value), -1, 1)) / Math.PI + 0.13;
    });
  }
  const since = t - openT;

  // Arrival: the planet swells into place
  const a = isFinite(holeT) ? (motionOK ? clamp01((t - holeT) / 1.1) : 1) : 0;
  headGroup.scale.setScalar(Math.max(0.0001, easeOutBack(a)));

  // Resolve: just ahead of the front, each word inks into the surface, its
  // strokes thickening from nothing, and deepens to its tone; then the surface
  // around it dissolves away, leaving only the words
  const r = isFinite(openT) ? clamp01(since / RESOLVE) : 0;
  const prog = lerp(-0.08, 1.06, easeInOut(r));
  erode.uProg.value = prog;
  planet.visible = prog < 1.05;
  if (wordMesh && r < 1) {
    settled = false;
    wordSpans.forEach((s) => {
      const ink = smooth(s.front - 0.26, s.front - 0.12, prog);
      const deepen = smooth(s.front - 0.16, s.front + 0.04, prog);
      setWordColor(s, tmpColor.copy(planetColor).lerp(s.tone, 0.45 + 0.55 * deepen), ink);
    });
    wordMesh.castShadow = r > 0.55;
    colorsDirty = true;
  } else if (wordMesh && r >= 1 && !settled) {
    wordSpans.forEach((s) => setWordColor(s, s.tone));
    wordMesh.castShadow = true;
    settled = true;
    colorsDirty = true;
  }

  // Meanwhile the body grows down from the head and the camera draws back
  const g = isFinite(openT) ? clamp01((since - 0.1) / GROW) : 0;
  parts.forEach((p) => {
    const k = clamp01((g - p.order * 0.075) / 0.4);
    p.g.scale.setScalar(Math.max(0.0001, easeOutBack(k)));
  });
  const c = isFinite(openT) ? easeInOut(clamp01((since - 0.05) / PULL)) : 0;
  target.lerpVectors(HEAD_C, Q_C, c);
  viewDir.lerpVectors(viewHead, viewQ, c).normalize();
  const dist = distHead * Math.pow(distQ / distHead, c);
  camera.position.copy(target).addScaledVector(viewDir, dist);
  if (motionOK) {
    const k = 1 - Math.pow(0.02, dt);
    drift.x += (drift.tx - drift.x) * k;
    drift.y += (drift.ty - drift.y) * k;
    camera.position.x += drift.x * dist * 0.02;
    camera.position.y += -drift.y * dist * 0.012;
  }
  camera.lookAt(target);
  camDir.copy(camera.position).sub(HEAD_C).normalize();

  // Once whole, the figure thinks: its head turns a little and words light up
  const thinking = settled && since > THINK;
  if (motionOK && thinking) {
    headGroup.rotation.y = Math.sin((since - THINK) * 0.35) * 0.3;
    headGroup.updateMatrixWorld();
    if (t >= nextGlint) {
      const front = wordSpans.filter((s) => s.lit <= 0 && nWorld.copy(s.n).transformDirection(headGroup.matrixWorld).dot(camDir) > 0.3);
      if (front.length) front[Math.floor(Math.random() * front.length)].lit = 1e-4;
      nextGlint = t + GLINT_EVERY * (0.6 + Math.random() * 0.8);
    }
  }
  if (settled) {
    wordSpans.forEach((s) => {
      if (s.lit <= 0) return;
      s.lit += dt / 1.6;
      const k = s.lit >= 1 ? 0 : Math.sin(Math.PI * s.lit);
      setWordColor(s, tmpColor.copy(s.tone).lerp(GLINT, k * 0.85));
      if (s.lit >= 1) s.lit = 0;
      colorsDirty = true;
    });
  }
  cue.ready(thinking || !motionOK);
  if (colorsDirty) { wordColors.needsUpdate = true; colorsDirty = false; }

  renderer.render(scene, camera);
}
animate();
