// film.js — Mulvium's launch film, drawn from the site's own pieces: the
// landing page's porcelain cosmos and night sky (js/main.js), MulviumSOS's
// sphere of words (js/fsos.js, with its own vocabulary and packing), the
// Fiscal Sponsorship page's bowl (js/bowl.js), the hero's rising words, and
// lines from the site and the founder's letter.
//
// Every frame is a function of time alone: film.seek(t) draws the frame at t
// seconds, so render.js can capture the film frame by frame, and the page
// plays itself, in time with its score, when opened in a browser. The cue
// times live in cues.json, which the score (score.py) is written to as well.
// ?format=reel draws it at 1080 × 1920 for phones, from the same timeline.
//
// Five acts:
//   I    0–15    Millions of ideas, as stars, met in flight
//   II   15–27   The organization you have to build: a sphere of its work
//   III  27–50   One light: the cosmos gathers, and the founder's letter
//   IV   50–69   The organization beneath you: the bowl, then who brings what
//   V    69–88   The expansion: every idea lit, then the landing page itself
import * as THREE from "three";
import CLOUD from "../../js/fsos-cloud.js";
import { vocabulary, STYLES, slotSize, drawWord } from "../../js/fsos-words.js";

const CUES = await (await fetch("cues.json")).json();
const PARAMS = new URLSearchParams(location.search);
const RENDER = PARAMS.has("render");
const REEL = PARAMS.get("format") === "reel";
const W = REEL ? 1080 : 1920, H = REEL ? 1920 : 1080;
const DURATION = CUES.duration;
document.documentElement.dataset.format = REEL ? "reel" : "wide";
// The reel sees the same scenes through a taller window: each field of view
// is widened so that as much of each scene fits across its narrow width
const fovFor = (f) => (REEL ? (360 / Math.PI) * Math.atan(Math.tan((f * Math.PI) / 360) * 1.75) : f);

// ── Time helpers ──────────────────────────────────────────────────────────────
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // main.js's
const cubicInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const expoIn = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
const smooth = (a, b, x) => { const k = seg(x, a, b); return k * k * (3 - 2 * k); };

// cubic-bezier(0.16, 1, 0.3, 1): the hero's words rising
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

// A smooth path through [time, value] keys: monotone cubic Hermite, so a value
// never overshoots its keys, and it comes to rest at the first and last
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

// Seeded randomness, so every render places everything the same way
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── The renderer and the light of the landing page (js/main.js) ──────────────
const PASTEL_STAR    = 0xF0D5BB;
const PASTEL_IFO     = 0xC4DDB8;
const PASTEL_CASTLES = 0xB8CAE0;
const PASTEL_EDU     = 0xE0B8C8;
const PASTEL_ZONES   = 0xB8DDD8;
const CREAM_DEEP     = 0xcdbe96;
const PAPER          = 0xeceae5;
const STAR_RADIUS    = 1.25;

const stage = document.getElementById("stage");
stage.style.width = W + "px";
stage.style.height = H + "px";
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: RENDER });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 600);
const PAPER_COLOR = new THREE.Color(PAPER);
const NIGHT_COLOR = new THREE.Color(0x060412);
const STAR_COLOR  = new THREE.Color(PASTEL_STAR);
const WHITE       = new THREE.Color(0xffffff);
const BLACK       = new THREE.Color(0x000000);
const bgColor = new THREE.Color(PAPER);
scene.background = bgColor;

scene.add(new THREE.AmbientLight(0xfff7e8, 0.35));
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfb0, 0.75));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 10, 8);
// Only the bowl casts shadows (js/bowl.js)
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.radius = 8;
keyLight.shadow.bias = -0.0005;
keyLight.shadow.normalBias = 0.03;
Object.assign(keyLight.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xfff1d8, 0.5);
fillLight.position.set(-8, 3, -4);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xf1e4bf, 0.55);
rimLight.position.set(-2, -6, -8);
scene.add(rimLight);

const porcelain = (color, roughness = 0.38, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

// ── The cosmos, as the landing page builds it ────────────────────────────────
// The star is Mulvium's; here the four planets are the four who make an
// institution exist, and the blue one opens into the Fiscal Sponsorship bowl
const ORBITS = [
  { id: "ifo",       radius: 3.0, radius2D: 2.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_IFO,
    tilt: [0, 0, 0],                                  speed: 0.36, phase: 0.0 },
  { id: "castles",   radius: 3.8, radius2D: 4.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_CASTLES,
    tilt: [Math.PI / 2, 0, 0],                        speed: 0.26, phase: 1.1 },
  { id: "education", radius: 4.5, radius2D: 6.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_EDU,
    tilt: [Math.PI / 3.2, Math.PI / 5 + Math.PI / 2, 0], speed: 0.22, phase: 2.4 },
  { id: "zones",     radius: 5.0, radius2D: 8.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_ZONES,
    tilt: [Math.PI / 3.2, Math.PI / 5, 0],            speed: 0.18, phase: 3.8 },
];

const cosmos = new THREE.Group();
scene.add(cosmos);
const star = new THREE.Mesh(
  new THREE.SphereGeometry(STAR_RADIUS, 96, 96),
  new THREE.MeshStandardMaterial({ color: PASTEL_STAR, roughness: 0.38, metalness: 0, emissive: 0x000000, emissiveIntensity: 0 })
);
cosmos.add(star);
const orbits = ORBITS.map((def) => {
  const pivot = new THREE.Group();
  cosmos.add(pivot);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(def.radius, def.ringTube, 24, 256), porcelain(CREAM_DEEP, 0.35));
  pivot.add(ring);
  const rotator = new THREE.Group();
  pivot.add(rotator);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(def.planetSize, 64, 64), porcelain(def.planetColor));
  planet.position.x = def.radius;
  rotator.add(planet);
  return { def, pivot, ring, rotator, planet };
});
const orbitOf = (id) => orbits.find((o) => o.def.id === id);

// The orbits' own clock: quick while the cosmos gathers itself, slow while
// its spheres are named, quick again as it expands; integrated once
const orbitSpeed = track([[0, 1], [28.5, 1], [31, 3.2], [33, 1.8], [37, 1], [57, 1], [58.6, 0.4], [64.5, 0.4],
  [66.5, 1], [69, 1], [72, 1.4], [CUES.flash - 0.05, 1.4], [CUES.flash + 0.05, 1], [DURATION, 1]]);
const CLOCK_DT = 1 / 240;
const clockTable = new Float32Array(Math.ceil((DURATION + 1) / CLOCK_DT) + 1);
for (let i = 1; i < clockTable.length; i++) clockTable[i] = clockTable[i - 1] + orbitSpeed(i * CLOCK_DT) * CLOCK_DT;
const orbitClock = (t) => {
  const f = Math.max(0, t) / CLOCK_DT, i = Math.min(clockTable.length - 2, Math.floor(f));
  return lerp(clockTable[i], clockTable[i + 1], f - i);
};

// ── Stars: the landing page's night sky, and a deep field to fly through ─────
function starTint(r, col, i) {
  const ct = r();
  if (ct < 0.15) { col[i * 3] = 1; col[i * 3 + 1] = 0.92 + r() * 0.08; col[i * 3 + 2] = 0.76 + r() * 0.14; }
  else if (ct < 0.28) { col[i * 3] = 0.8 + r() * 0.15; col[i * 3 + 1] = 0.88 + r() * 0.12; col[i * 3 + 2] = 1; }
  else { const v = 0.88 + r() * 0.12; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; }
}
function starField(count, seed, place) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3), size = new Float32Array(count),
        tw = new Float32Array(count), col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const [x, y, z, s] = place(r);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; size[i] = s;
    tw[i] = r() * Math.PI * 2;
    starTint(r, col, i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aTwinkle", new THREE.BufferAttribute(tw, 1));
  g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  return g;
}
const STAR_FRAG = `
  varying float vAlpha;
  varying vec3  vColor;
  void main() {
    vec2  uv = gl_PointCoord - vec2(0.5);
    float a  = (1.0 - smoothstep(0.25, 0.5, length(uv))) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }`;
const skyMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
  vertexShader: `
    attribute float aSize; attribute float aTwinkle; attribute vec3 aColor;
    uniform float uTime; uniform float uOpacity;
    varying float vAlpha; varying vec3 vColor;
    void main() {
      vAlpha = uOpacity * (0.72 + 0.28 * sin(uTime * 1.7 + aTwinkle));
      vColor = aColor;
      gl_PointSize = aSize * (0.88 + 0.12 * sin(uTime * 1.1 + aTwinkle * 1.4));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: STAR_FRAG,
  transparent: true, depthTest: false, depthWrite: false,
});
const sky = new THREE.Points(starField(4500, 7, (r) => {
  const s0 = r(), spread = s0 < 0.6 ? 16 : s0 < 0.85 ? 45 : 110;
  const x = (r() - 0.5) * spread * 2, y = r() * 2, z = (r() - 0.5) * spread * 2, sr = r();
  return [x, y, z, sr < 0.5 ? 1.0 + r() : sr < 0.85 ? 2.0 + r() * 1.5 : 3.5 + r() * 2.5];
}), skyMat);
scene.add(sky);

const deepMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
  vertexShader: `
    attribute float aSize; attribute float aTwinkle; attribute vec3 aColor;
    uniform float uTime; uniform float uOpacity;
    varying float vAlpha; varying vec3 vColor;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      float d = -mv.z;
      float s = aSize * 34.0 / max(d, 0.1);
      vAlpha = uOpacity * (0.74 + 0.26 * sin(uTime * 1.7 + aTwinkle))
             * smoothstep(0.6, 5.0, d) * (1.0 - smoothstep(220.0, 330.0, d))
             * clamp(s, 0.18, 1.0);
      vColor = aColor;
      gl_PointSize = clamp(s, 1.0, 9.0);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: STAR_FRAG,
  transparent: true, depthTest: false, depthWrite: false,
});
const deepField = new THREE.Points(starField(7000, 11, (r) => {
  let x, y;
  do { x = (r() - 0.5) * 140; y = (r() - 0.5) * 90; } while (Math.abs(x) < 1.6 && Math.abs(y) < 1.2);
  const sr = r();
  return [x, y, 60 - r() * 380, sr < 0.55 ? 0.6 + r() * 0.8 : sr < 0.9 ? 1.4 + r() * 1.4 : 2.8 + r() * 2.4];
}), deepMat);
deepField.frustumCulled = false;
scene.add(deepField);

// Shooting stars over the closing night, as the landing page draws them
const meteorTex = (() => {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 16;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, "rgba(255,255,255,0)");
  grad.addColorStop(0.72, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.96, "rgba(255,255,255,0.95)");
  grad.addColorStop(1.0, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 16);
  return new THREE.CanvasTexture(c);
})();
const meteors = (() => {
  const r = rng(23);
  return [73.15, 75.65, 77.45, 78.85, 80.15, 81.05].map((at) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.07),
      new THREE.MeshBasicMaterial({ map: meteorTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false })
    );
    mesh.visible = false;
    scene.add(mesh);
    const phi = r() * Math.PI * 2, dur = 0.8 + r() * 0.7, speed = 9 + r() * 6;
    const px = (r() - 0.5) * (REEL ? 12 : 22), pz = (r() - 0.5) * (REEL ? 22 : 12), back = speed * dur * 0.5;
    return { mesh, at, dur, speed, dirX: Math.cos(phi), dirZ: -Math.sin(phi), phi,
             x0: px - Math.cos(phi) * back, z0: pz + Math.sin(phi) * back };
  });
})();

// ── Act II: the sphere of work, MulviumSOS's (js/fsos.js) ─────────────────────
// Every word M.SOS's agents handle, placed as js/fsos-cloud.js packs them,
// inking in ahead of the camera until they fill the night
const SPHERE_C = new THREE.Vector3(0, 0, -76), SPHERE_R = 5.6;
const sphereGroup = new THREE.Group();
sphereGroup.position.copy(SPHERE_C);
scene.add(sphereGroup);
// M.SOS's greens, lifted to read on the night
const TONES = {
  agent: [0xeef4e6],
  focus: [0xd3e6c7, 0xc4ddb8],
  work:  [0x9fbb92, 0xa9c49c, 0xb4cda7, 0x93ad86, 0xbdd3b0, 0x8ea880],
};
const GOLD = new THREE.Color(0xffd98c);
// The jobs the stamps fall on: the first six that face the camera as each lands
const STAMPED = ["bylaws", "Budgets", "grant report", "payroll", "Press", "permits", "form 990", "insurance",
  "board minutes", "contracts", "invoices", "audit trail", "state filings", "hiring", "cash flow", "policies"];
const sphereRot = (t) => 0.1 * t + 0.035 * Math.max(0, t - 19) ** 2;
const sphereScale = (t) => {
  let s = 1;
  for (const h of CUES.hits) if (t >= h) s += 0.045 * Math.exp(-(t - h) * 6);
  return s;
};
let words = null; // built once the fonts are in
function buildSphere() {
  const ATLAS_W = 2048, PAD = 6;
  const atlasCanvas = document.createElement("canvas");
  const actx = atlasCanvas.getContext("2d");
  const entries = vocabulary();
  let x = 0, y = 0, rowH = 0;
  for (const en of entries) {
    const slot = slotSize(actx, en.text, STYLES[en.kind]);
    const w = slot.w + PAD * 2, h = slot.h + PAD * 2;
    if (x + w > ATLAS_W) { x = 0; y += rowH; rowH = 0; }
    Object.assign(en, { x, y, w, h });
    x += w; rowH = Math.max(rowH, h);
  }
  atlasCanvas.width = ATLAS_W;
  atlasCanvas.height = y + rowH;
  actx.fillStyle = "#ffffff";
  for (const en of entries) drawWord(actx, en.text, STYLES[en.kind], en.x + en.w / 2, en.y + en.h / 2, en.w - PAD * 2);
  const atlas = new THREE.CanvasTexture(atlasCanvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 8;

  const r = rng(20261002);
  const byKey = new Map(entries.map((en) => [en.kind + ":" + en.text, en]));
  const placed = [];
  for (const [kind, text, nx, ny, nz, ex, ey, ez, w, h] of CLOUD) {
    const en = byKey.get(kind + ":" + text);
    if (!en) continue;
    const n = new THREE.Vector3(nx, ny, nz), e = new THREE.Vector3(ex, ey, ez);
    placed.push({ en, n, e, u: new THREE.Vector3().crossVectors(n, e), w, h });
  }
  let verts = 0;
  const segs = placed.map((p) => Math.max(2, Math.ceil(p.w / 0.06)));
  segs.forEach((s) => { verts += (s + 1) * 2; });
  const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3), uv = new Float32Array(verts * 2);
  const col = new Float32Array(verts * 4), index = [];
  const AW = atlasCanvas.width, AH = atlasCanvas.height;
  let v = 0;
  const d1 = new THREE.Vector3(), d = new THREE.Vector3();
  const spans = placed.map((p, wi) => {
    const S = segs[wi], first = v;
    const tones = TONES[p.en.kind], tone = new THREE.Color(tones[Math.floor(r() * tones.length)]);
    const rad = p.en.kind === "agent" ? 1.04 : 1 + r() * 0.035;
    const u0 = (p.en.x + PAD) / AW, u1 = (p.en.x + p.en.w - PAD) / AW;
    const vTop = 1 - (p.en.y + PAD) / AH, vBot = 1 - (p.en.y + p.en.h - PAD) / AH;
    for (let i = 0; i <= S; i++) {
      const s = -p.w / 2 + (p.w * i) / S;
      d1.copy(p.n).multiplyScalar(Math.cos(s)).addScaledVector(p.e, Math.sin(s));
      for (let j = 0; j < 2; j++) {
        const tt = j === 0 ? -p.h / 2 : p.h / 2;
        d.copy(d1).multiplyScalar(Math.cos(tt)).addScaledVector(p.u, Math.sin(tt));
        pos.set([d.x * rad, d.y * rad, d.z * rad], v * 3);
        nor.set([d.x, d.y, d.z], v * 3);
        uv.set([u0 + ((u1 - u0) * i) / S, j === 0 ? vBot : vTop], v * 2);
        v++;
      }
      if (i < S) { const a = first + i * 2; index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    return { first, count: v - first, tone, n: p.n, text: p.en.text, start: 0, litAt: 1e9, key: "" };
  });
  // Words ink in in a shuffled order, coming faster and faster
  const order = spans.map((s, i) => [r(), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  order.forEach((i, rank) => {
    spans[i].start = CUES.ink[0] + (CUES.ink[1] - CUES.ink[0]) * Math.pow(rank / order.length, 1.3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const colors = new THREE.BufferAttribute(col, 4);
  geo.setAttribute("color", colors);
  geo.setIndex(index);
  // Flat type, seen from both sides; words round the back fade into the night
  const mat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.35 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = { value: NIGHT_COLOR };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vFacing;")
      .replace("#include <project_vertex>", `#include <project_vertex>
        vec3 wN = normalize(mat3(modelMatrix) * normal);
        vec3 wP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vFacing = dot(wN, normalize(cameraPosition - wP));`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vFacing;\nuniform vec3 uNight;")
      .replace("#include <alphatest_fragment>", `#include <alphatest_fragment>
        diffuseColor.rgb = mix(uNight, diffuseColor.rgb, mix(0.16, 1.0, smoothstep(-0.35, 0.55, vFacing)));`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  sphereGroup.add(mesh);

  // Each stamp falls on the job, of those not yet stamped, that faces the
  // camera most squarely as it lands
  const nn = new THREE.Vector3(), toCam = new THREE.Vector3(), q = new THREE.Quaternion(), eu = new THREE.Euler();
  const used = new Set();
  CUES.hits.forEach((h) => {
    flyCam(h, false);
    eu.set(0.22, sphereRot(h), 0);
    q.setFromEuler(eu);
    let best = null, bestF = -2;
    for (const s of spans) {
      if (!STAMPED.includes(s.text) || used.has(s.text) || s.start > h) continue;
      nn.copy(s.n).applyQuaternion(q);
      toCam.copy(camera.position).sub(SPHERE_C).normalize();
      const f = nn.dot(toCam);
      if (f > bestF) { bestF = f; best = s; }
    }
    if (best) { best.litAt = h; used.add(best.text); }
  });
  words = { mesh, spans, colors };
}
const _c = new THREE.Color();
function drawSphere(t) {
  if (!words) return;
  sphereGroup.rotation.set(0.22, sphereRot(t), 0);
  sphereGroup.scale.setScalar(SPHERE_R * sphereScale(t));
  const arr = words.colors.array;
  let dirty = false;
  for (const s of words.spans) {
    const ink = seg(t, s.start, s.start + 0.45);
    const lit = seg(t, s.litAt, s.litAt + 0.12);
    _c.copy(s.tone).lerp(GOLD, lit);
    const key = ink.toFixed(3) + lit.toFixed(3);
    if (key === s.key) continue;
    s.key = key;
    dirty = true;
    for (let k = 0; k < s.count; k++) {
      const o = (s.first + k) * 4;
      arr[o] = _c.r; arr[o + 1] = _c.g; arr[o + 2] = _c.b; arr[o + 3] = ink;
    }
  }
  if (dirty) words.colors.needsUpdate = true;
}

// ── Act IV: the Fiscal Sponsorship bowl (js/bowl.js) ─────────────────────────
// The blue planet's upper half lifts away: it was a bowl all along. Four
// projects drop into it, each wearing one of the loading screen's pictures.
const bowlWorld = new THREE.Group();
scene.add(bowlWorld);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
bowlWorld.add(ground);
const BR = 1.55, BT = 0.12;
const profile = [];
for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI / 2; profile.push(new THREE.Vector2(Math.sin(a) * BR, BR - Math.cos(a) * BR)); }
for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; profile.push(new THREE.Vector2(BR - BT / 2 + Math.cos(a) * -BT / 2, BR + Math.sin(a) * -BT / 2 * 0.6)); }
for (let i = 40; i >= 0; i--) { const a = (i / 40) * Math.PI / 2; profile.push(new THREE.Vector2(Math.sin(a) * (BR - BT), BR - Math.cos(a) * (BR - BT) + BT * 0.4)); }
const shellGeo = new THREE.LatheGeometry(profile, 160);
const vessel = new THREE.Group();
bowlWorld.add(vessel);
const whole = new THREE.Mesh(new THREE.SphereGeometry(BR, 96, 64), porcelain(PASTEL_CASTLES, 0.34));
whole.position.y = BR;
whole.castShadow = true;
vessel.add(whole);
const bowl = new THREE.Mesh(shellGeo, porcelain(PASTEL_CASTLES, 0.34, { side: THREE.DoubleSide }));
bowl.castShadow = bowl.receiveShadow = true;
vessel.add(bowl);
const lidPivot = new THREE.Group();
lidPivot.position.y = BR;
vessel.add(lidPivot);
const lidMat = porcelain(PASTEL_CASTLES, 0.34, { side: THREE.DoubleSide, transparent: true });
const lid = new THREE.Mesh(shellGeo, lidMat);
lid.scale.y = -1;
lid.position.y = BR;
lid.castShadow = true;
const lidFade = { value: 1 };
const lidDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
lidDepth.onBeforeCompile = (sh) => {
  sh.uniforms.uFade = lidFade;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nuniform float uFade;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      transformed = mix(vec3(0.0, ${(BR * 0.55).toFixed(3)}, 0.0), transformed, uFade);`);
};
lid.customDepthMaterial = lidDepth;
lidPivot.add(lid);
const bowlRing = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.045, 24, 256), porcelain(CREAM_DEEP, 0.35));
bowlRing.rotation.set(Math.PI / 2 - 0.22, 0.18, 0);
bowlRing.position.y = 1.15;
bowlRing.castShadow = true;
bowlWorld.add(bowlRing);
// The loading screen's pictures, in its order, glazed like painted porcelain
const PICTURES = ["../../Musical.webp", "../../Pictorial.webp", "../../Luxor.webp", "../../Batad.webp"];
const SPR = 0.5, SPD = 0.7, DROP = 5;
const projects = PICTURES.map((src, i) => {
  const ang = i * Math.PI / 2 + 0.5;
  const x = Math.cos(ang) * SPD, z = Math.sin(ang) * SPD;
  const rr = BR - BT - SPR;
  const rest = new THREE.Vector3(x, BR - Math.sqrt(Math.max(0, rr * rr - x * x - z * z)), z);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SPR, 64, 64), porcelain(0xf0e5d0, 0.36));
  mesh.rotation.order = "YXZ";
  mesh.rotation.x = -0.74;
  mesh.castShadow = mesh.receiveShadow = true;
  vessel.add(mesh);
  return { mesh, src, rest, from: new THREE.Vector3(x * 0.35, rest.y + DROP, z * 0.35) };
});
const picturesReady = Promise.all(projects.map((p) => new Promise((res) => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const ctx = c.getContext("2d");
    ctx.filter = "saturate(0.8) contrast(0.92) brightness(1.04)";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    ctx.filter = "none";
    ctx.fillStyle = "rgba(244, 237, 224, 0.2)";
    ctx.fillRect(0, 0, c.width, c.height);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    p.mesh.material.map = tex;
    p.mesh.material.color.setHex(0xffffff);
    p.mesh.material.needsUpdate = true;
    res();
  };
  img.onerror = res;
  img.src = p.src;
})));
const easeOutBack = (x) => { const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
function poseBowl(t) {
  const [, enter] = CUES.dive;
  bowlRing.scale.setScalar(lerp(3.2, 1, easeInOut(seg(t, enter + 0.2, enter + 2.2))));
  const o = seg(t, CUES.lid, CUES.lid + 1.6), lift = easeInOut(o);
  lidPivot.position.y = BR + lift * 1.1;
  lidPivot.rotation.x = -0.35 * lift;
  lidMat.opacity = 1 - smooth(0.25, 1, o);
  whole.visible = o === 0;
  bowl.visible = o > 0;
  lidFade.value = 1 - smooth(0.04, 0.42, o);
  lid.castShadow = lidFade.value > 0.001;
  lid.visible = o > 0 && o < 1;
  vessel.rotation.y = 0.3 + 0.1 * (t - enter);
  projects.forEach((p, i) => {
    const k = t - CUES.drops[i];
    p.mesh.visible = k >= 0;
    if (k < 0) return;
    if (k < 0.62) {
      const f = k / 0.62;
      p.mesh.position.lerpVectors(p.from, p.rest, f);
      p.mesh.position.y = lerp(p.from.y, p.rest.y, f * f);
      p.mesh.scale.setScalar(Math.max(0.0001, smooth(0, 0.25, f)));
      p.mesh.castShadow = f > 0.75;
    } else {
      const s = clamp01((k - 0.62) / 0.38);
      p.mesh.position.copy(p.rest);
      p.mesh.position.y += Math.sin(Math.PI * s) * 0.14 * (1 - s);
      p.mesh.scale.setScalar(1);
      p.mesh.castShadow = true;
    }
    p.mesh.rotation.y = -Math.PI / 2 - vessel.rotation.y + (i - 1.5) * 0.18;
  });
}
// The bowl's own view, stepped back on a tall frame so its ring fits across
const BOWL_LOOK = new THREE.Vector3(0, 1.55, 0);
const BOWL_DIR = new THREE.Vector3(0, 4.85, 7.6).normalize();
const BOWL_DIST = Math.max(10.6, 3.1 / (Math.tan((16 * Math.PI) / 180) * (W / H)));
function bowlCam(t) {
  const [, enter] = CUES.dive;
  // From inside the planet's glaze, back out to the bowl's view
  const k = expoOut(seg(t, enter, enter + 2.4));
  camera.fov = 32;
  camera.clearViewOffset();
  camera.up.set(0, 1, 0);
  const dist = lerp(2.75, BOWL_DIST, k) * (1 - 0.04 * seg(t, enter + 2.4, CUES.back));
  camera.position.copy(BOWL_LOOK).addScaledVector(BOWL_DIR, dist);
  camera.position.x += Math.sin((t - enter) * 0.35) * 0.3 * k;
  camera.lookAt(BOWL_LOOK);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// ── Projection: a world point to stage pixels ────────────────────────────────
const _v = new THREE.Vector3();
function toScreen(p) {
  _v.copy(p).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, z: _v.z };
}
function screenRadius(p, r) {
  const d = _v.copy(p).sub(camera.position).length();
  return (r / d) * (H / 2 / Math.tan((camera.fov * Math.PI) / 360));
}

// ── Cameras ──────────────────────────────────────────────────────────────────
// Acts I and II fly forward through the deep field, past every idea, toward
// the sphere of work; each stamp shakes it
const flyZ = track([[0, 40], [6, 30], [10, 6], [13, -24], [15.5, -42], [20, -51], [24.75, -63]]);
function shake(t) {
  let s = 0;
  for (const h of CUES.hits) if (t >= h) s += Math.exp(-(t - h) * 7) * Math.sin((t - h) * 52);
  return s;
}
function flyCam(t, withShake = true) {
  const k = withShake ? shake(t) : 0;
  const settle = 1 - smooth(14, 18, t); // the drift settles as the sphere comes
  camera.fov = fovFor(50);
  camera.clearViewOffset();
  camera.up.set(0, 1, 0);
  camera.position.set(Math.sin(t * 0.13) * 1.2 * settle, (Math.cos(t * 0.11) * 0.8 - 0.8) * settle, flyZ(t));
  camera.rotation.set(Math.sin(t * 0.09) * 0.04 * settle + k * 0.006, Math.sin(t * 0.07) * 0.06 * settle + k * 0.004,
    Math.sin(t * 0.05) * 0.03 * settle, "YXZ");
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// The cosmos is seen from a point on a sphere around it: azimuth and
// elevation in degrees, distance, field of view and a roll
function orbitCam({ az, el, dist, fov = 42, roll = 0, target = null }) {
  const a = (az * Math.PI) / 180, e = (Math.min(el, 89.95) * Math.PI) / 180;
  camera.fov = fovFor(fov);
  camera.clearViewOffset();
  camera.position.set(Math.cos(e) * Math.sin(a) * dist, Math.sin(e) * dist, Math.cos(e) * Math.cos(a) * dist);
  // "Up" is the direction of rising elevation, which stays defined overhead
  camera.up.set(-Math.sin(e) * Math.sin(a), Math.cos(e), -Math.sin(e) * Math.cos(a));
  camera.lookAt(target || _origin);
  if (roll) camera.rotateZ((roll * Math.PI) / 180);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
const _origin = new THREE.Vector3();

// Act III: overhead in the night, then down to the landing page's angle,
// held at the centre while the letter is read around it
const G = {
  az:   track([[27.75, 0], [33, 28], [35.6, 12], [38.6, -4], [CUES.dive[0], -16]]),
  el:   track([[27.75, 89.9], [33, 89.9], [35.6, 46], [38.6, 13], [CUES.dive[0], 9.5]]),
  dist: track([[27.75, 24], [33, 24], [35.6, 19], [38.6, 16.6], [CUES.dive[0], 16.0]]),
  roll: track([[27.75, 0], [33, 0], [35.2, -5], [38.6, 0]]),
};
// ...then into the blue planet, which fills the picture as the bowl
const _p = new THREE.Vector3(), _toCam = new THREE.Vector3(), _look = new THREE.Vector3(), _out = new THREE.Vector3();
function genesisCam(t) {
  // The reel stands back a little, to leave room for the letter above and below
  orbitCam({ az: G.az(t), el: G.el(t), dist: G.dist(t) * (REEL ? lerp(1, 1.14, smooth(35, 38.6, t)) : 1), roll: G.roll(t) });
  const [d0, d1] = CUES.dive;
  if (t <= d0) return;
  const k = seg(t, d0, d1);
  orbitOf("castles").planet.getWorldPosition(_p);
  // The camera swings round the planet to its outer side, away from the
  // star, while closing in, so its path never passes through the star
  _toCam.copy(camera.position).sub(_p);
  const far = _toCam.length();
  _toCam.normalize();
  _out.copy(_p).normalize().addScaledVector(_toCam, 0.7).normalize();
  _toCam.lerp(_out, smooth(0, 0.6, k)).normalize();
  const reach = Math.pow(k, 2.2);
  camera.position.copy(_p).addScaledVector(_toCam, lerp(far, 0.55, reach));
  _look.copy(_origin).lerp(_p, smooth(0, 0.55, k));
  camera.lookAt(_look);
  camera.fov = fovFor(lerp(42, 36, reach));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
// Act IV's cosmos, then up overhead as it expands
const M = {
  az:   track([[CUES.back, 30], [65, 8], [CUES.ascend, -6], [72, 0], [CUES.flash, 9]]),
  el:   track([[CUES.back, 16], [65, 11], [CUES.ascend, 12], [72, 89.9]]),
  dist: track([[CUES.back, 21], [60, 18.2], [CUES.exists, 17.6], [66.8, 19.2], [CUES.ascend, 17.5], [72, 24]]),
};
function middleCam(t) { orbitCam({ az: M.az(t), el: M.el(t), dist: M.dist(t) }); }
// The close: the landing page's own view, arrived at
const E = {
  az:   track([[CUES.flash, 12], [DURATION, 0]]),
  el:   track([[CUES.flash, 16], [DURATION, 10.15]]),
  dist: track([[CUES.flash, 17.5], [DURATION, 14.73]]),
};
function heroCam(t) { orbitCam({ az: E.az(t), el: E.el(t), dist: E.dist(t) }); }

// ── The cosmos's state through the film ──────────────────────────────────────
// t2d: 0 is the landing page's 3D view, 1 its overhead orbit view
// exp: the landing page's expansion, 0 at rest, 1 rings out and star radiant
// night: paper (0) to night (1)
const T2D_PATH = track([[27.75, 1], [33, 1], [38.5, 0], [CUES.ascend, 0], [72, 1], [CUES.flash - 0.01, 1]]);
const T2D = (t) => (t >= CUES.flash ? 0 : T2D_PATH(t));
const EXP = (t) => {
  if (t < CUES.rise) return 1;
  if (t < CUES.bloom) return 1 - easeInOut(seg(t, CUES.rise, CUES.bloom));
  if (t < CUES.expand[0]) return 0;
  if (t < CUES.flash) return easeInOut(seg(t, ...CUES.expand));
  return 0;
};
const NIGHT = (t) => {
  if (t < 32.95) return 1;
  if (t < CUES.night[0]) return 1 - cubicInOut(seg(t, 32.95, 33.12));
  if (t < CUES.flash) return cubicInOut(seg(t, ...CUES.night));
  return 0;
};
function poseCosmos(t, t2d, exp) {
  const eased = easeInOut(t2d), pe = easeInOut(exp), clock = orbitClock(t);
  for (const o of orbits) {
    const [rx, ry, rz] = o.def.tilt;
    o.rotator.rotation.z = o.def.phase + o.def.speed * clock;
    o.planet.rotation.y = 0.08 * t;
    o.pivot.rotation.set(lerp(rx, Math.PI / 2, eased), lerp(ry, 0, eased), lerp(rz, 0, eased));
    const s = lerp(1, o.def.radius2D / o.def.radius, eased) * (1 + pe * 10);
    o.pivot.scale.set(s, s, s);
    const fade = 1 - pe;
    for (const m of [o.ring.material, o.planet.material]) { m.opacity = fade; m.transparent = exp > 0; }
    o.ring.visible = o.planet.visible = !(exp > 0 && fade < 0.02);
  }
  const shrink = lerp(1, 0.04, pe), pulse = 1 + Math.sin(t * 1.1) * 0.01;
  star.scale.setScalar(pulse * shrink);
  star.material.color.copy(STAR_COLOR).lerp(WHITE, pe);
  star.material.emissive.copy(BLACK).lerp(WHITE, pe);
  star.material.emissiveIntensity = pe * 0.2;
  star.material.roughness = lerp(0.38, 0.2, pe);
}

// ── DOM layers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const css = (el, prop, v) => { if (el.style[prop] !== v) el.style[prop] = v; };
const show = (el, on) => css(el, "display", on ? "" : "none");
for (const id of ["roads", "leads"]) {
  $(id).setAttribute("viewBox", `0 0 ${W} ${H}`);
  $(id).setAttribute("width", W);
  $(id).setAttribute("height", H);
}
// The landing page's "gooey" visibility: fully there at 1, blurred away toward 0
function goo(el, f, maxBlur = 60) {
  if (f <= 0.001) { css(el, "opacity", "0"); css(el, "filter", "none"); return; }
  if (f >= 0.999) { css(el, "opacity", "1"); css(el, "filter", "none"); return; }
  css(el, "opacity", Math.pow(f, 0.4).toFixed(3));
  css(el, "filter", `blur(${Math.min(6 / f - 6, maxBlur).toFixed(2)}px)`);
}
// Words in masks, each rising at its own speed (the hero's statement)
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
function riseWords(words, t, t0) {
  for (const w of words) {
    const p = riseEase(seg(t, t0 + w.d, t0 + w.d + w.dur));
    css(w.el, "transform", p >= 1 ? "none" : `translateY(${((1 - p) * 115).toFixed(2)}%)`);
  }
}

// Captions, one line each. A line is set for the wide frame (w), the reel
// (r) or both: [x, y, text], x null to centre it, y the top of the line; a
// right-set line (class r) is placed by its right edge.
// fade: enters by blurring in, not rising; cut: leaves on the cut
const CX = null;
const LINES = [
  // I
  { t: [1.5, 6.0],     cls: "moon",       w: [CX, 470, "Millions of people have ideas"], r: [CX, 760, "Millions of people"] },
  { t: [1.8, 6.0],     cls: "moon",       r: [CX, 838, "have ideas"] },
  { t: [3.0, 6.0],     cls: "moon it",    w: [CX, 548, "for things that should exist."], r: [CX, 950, "for things that"] },
  { t: [3.3, 6.0],     cls: "moon it",    r: [CX, 1028, "should exist."] },
  // II
  { t: [15.0, 17.5],   cls: "moon",       w: [CX, 503, "The problem isn’t a lack of ideas."], r: [CX, 840, "The problem isn’t"] },
  { t: [15.3, 17.5],   cls: "moon",       r: [CX, 918, "a lack of ideas."] },
  { t: [18.0, CUES.cut], cls: "moon sm",  w: [CX, 820, "It’s the organization you have to build before you can begin."], r: [CX, 1330, "It’s the organization"], cut: true },
  { t: [18.3, CUES.cut], cls: "moon sm",  r: [CX, 1398, "you have to build"], cut: true },
  { t: [18.6, CUES.cut], cls: "moon sm it", r: [CX, 1466, "before you can begin."], cut: true },
  { t: [25.5, 27.0],   cls: "moon it",    w: [CX, 503, "So most ideas never begin."], r: [CX, 860, "So most ideas"], fade: true },
  { t: [25.5, 27.0],   cls: "moon it",    r: [CX, 938, "never begin."], fade: true },
  // III: the founder's letter, set around the cosmos
  ...letter(),
  // IV
  { t: [CUES.beneath, 58.1], cls: "ink sm",    w: [CX, 92, "At Mulvium, we change the norm"], r: [CX, 440, "At Mulvium, we change the norm"] },
  { t: [CUES.beneath + 0.35, 58.1], cls: "ink sm it", w: [CX, 160, "and we build the organization beneath you."], r: [CX, 508, "and we build the organization"] },
  { t: [CUES.beneath + 0.6, 58.1], cls: "ink sm it", r: [CX, 576, "beneath you."] },
  { t: [CUES.exists, 67.6], cls: "ink it xl",  w: [CX, 842, "It exists."], r: [CX, 1420, "It exists."] },
  // V
  { t: [72.75, 77.25], cls: "moon",       w: [CX, 462, "The next great expansion of human creativity"], r: [CX, 690, "The next great expansion"] },
  { t: [73.0, 77.25],  cls: "moon",       r: [CX, 766, "of human creativity"] },
  { t: [75.0, 77.25],  cls: "moon it",    w: [CX, 540, "won’t come from making it easier to create content."], r: [CX, 860, "won’t come from making it"] },
  { t: [75.25, 77.25], cls: "moon it",    r: [CX, 936, "easier to create content."] },
  { t: [78.0, 81.95],  cls: "moon",       w: [CX, 412, "It will come from making it easier to create"], r: [CX, 744, "It will come from making it"] },
  { t: [78.25, 81.95], cls: "moon",       r: [CX, 820, "easier to create"] },
  { t: [CUES.institutions, 81.95], cls: "gold it xl", w: [CX, 500, "institutions."], r: [CX, 912, "institutions."] },
];
// Four lines of the founder's letter round the centred cosmos: two columns
// either side of it on the wide frame, above and below it on the reel
function letter() {
  const [a, b, c, d] = CUES.letter, out = 48.3;
  const L = 47, rows = (t0, cls, x, y, lines, side) => lines.map((text, i) => {
    const line = { t: [t0 + i * 0.22, out], cls: cls + (i === lines.length - 1 ? " it" : "") };
    line[side] = [x, y + i * L, text];
    return line;
  });
  return [
    { t: [a, out], cls: "ink lg l", w: [110, 176, "Institutions"] },
    { t: [a + 0.3, out], cls: "ink sm it l", w: [114, 286, "change the world."] },
    ...rows(b, "ink xs r", 1810, 196, ["Institutions can simply be", "one person with a vision", "to do something beautiful", "and something authentic."], "w"),
    ...rows(c, "ink xs l", 114, 640, ["Changing the world", "starts with helping", "your neighbor."], "w"),
    ...rows(d, "ink xs r", 1810, 640, ["All you need is", "an appetite for good,", "a vision, and the", "willingness to bring", "it to life."], "w"),
    { t: [CUES.signature, out], cls: "mono", w: [CX, 992, "from the founder’s letter"] },
    // The reel
    { t: [a, out], cls: "ink lg", r: [CX, 236, "Institutions"] },
    { t: [a + 0.3, out], cls: "ink sm it", r: [CX, 344, "change the world."] },
    ...rows(b, "ink xs", CX, 436, ["Institutions can simply be one person", "with a vision to do something beautiful", "and something authentic."], "r"),
    ...rows(c, "ink xs", CX, 1356, ["Changing the world starts", "with helping your neighbor."], "r"),
    ...rows(d, "ink xs", CX, 1478, ["All you need is an appetite for good,", "a vision, and the willingness", "to bring it to life."], "r"),
  ];
}
const CAPS = LINES.filter((c) => (REEL ? c.r : c.w)).map((c) => {
  const [x, y, text] = REEL ? c.r : c.w;
  const el = document.createElement("div");
  el.className = "cap " + c.cls + (x === CX ? " c" : "");
  if (x === CX) el.style.left = W / 2 + "px";
  else if (c.cls.split(" ").includes("r")) el.style.right = W - x + "px";
  else el.style.left = x + "px";
  el.style.top = y + "px";
  $("captions").appendChild(el);
  const words = c.fade ? null : maskWords(el, text);
  if (c.fade) el.textContent = text;
  return { ...c, el, words };
});
function drawCaptions(t) {
  for (const c of CAPS) {
    const [t0, t1] = c.t;
    const on = t >= t0 && (c.cut ? t < t1 : t < t1 + 0.8);
    show(c.el, on);
    if (!on) continue;
    if (c.fade) goo(c.el, Math.min(seg(t, t0, t0 + 1.1), 1 - seg(t, t1, t1 + 0.8)));
    else {
      riseWords(c.words, t, t0);
      goo(c.el, 1 - seg(t, t1, t1 + 0.75));
    }
  }
}

// ── Act I: the ideas, met in flight ──────────────────────────────────────────
const IDEAS = [
  "orchestra", "film festival", "museum", "community garden", "scholarship fund",
  "choir", "research institute", "public library", "dance company", "poetry press",
  "jazz series", "science camp", "theater company", "food pantry", "art residency",
  "youth sports league", "historical society", "music school", "literacy program",
  "seed library", "documentary", "makerspace", "chamber ensemble", "botanical garden",
  "conservation trust", "oral history project", "mural project", "writers’ workshop",
  "community radio station", "after-school program", "heritage festival", "bird sanctuary",
  "summer academy", "reading room", "folk archive", "new cultural institution",
];
function ideaEl(text, parent) {
  const el = document.createElement("div");
  el.className = "idea";
  el.innerHTML = "<i></i><span></span>";
  el.lastChild.textContent = text;
  parent.appendChild(el);
  return el;
}
// Each idea is placed where it should first be seen, just after it lights,
// clear of the words; the flight then carries it past and out of the frame
const flyIdeas = CUES.ideas.map((at, i) => {
  const r = rng(5 + i * 101);
  const fwd = new THREE.Vector3(), dir = new THREE.Vector3();
  const clear = REEL
    ? (x, y) => !(y > 680 && y < 1120) && y > 260 && y < 1640 && x > 60 && x < W - 380
    : (x, y) => !(x > 420 && x < 1450 && y > 380 && y < 700) && y > 190 && y < 890 && x > 90 && x < 1560;
  let x, y;
  do { x = r() * W; y = r() * H; } while (!clear(x, y));
  const depth = 15 + r() * 9;
  flyCam(at + 0.6, false);
  camera.getWorldDirection(fwd);
  dir.set((x / W) * 2 - 1, -(y / H) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
  const pos = camera.position.clone().addScaledVector(dir, depth / dir.dot(fwd));
  return { at, pos, el: ideaEl(IDEAS[i], $("ideas")) };
});
function drawFlyIdeas(t, on) {
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  for (const d of flyIdeas) {
    // Any idea still in view as Act II begins goes out with the flight
    let a = on ? expoOut(seg(t, d.at, d.at + 0.55)) * (1 - smooth(14.6, 15.6, t)) : 0;
    const depth = _v.copy(d.pos).sub(camera.position).dot(fwd);
    a *= clamp01((depth - 1.5) / 3.5);
    if (a <= 0.002 || depth <= 0.5) { show(d.el, false); continue; }
    const p = toScreen(d.pos);
    if (p.x < -500 || p.x > W + 100 || p.y < -100 || p.y > H + 100) { show(d.el, false); continue; }
    show(d.el, true);
    const s = Math.max(0.62, Math.min(1.6, 19 / depth));
    css(d.el, "transform", `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(${s.toFixed(3)})`);
    css(d.el, "opacity", a.toFixed(3));
    css(d.el.firstChild, "transform", `scale(${(1 + 2.2 * (1 - expoOut(seg(t, d.at, d.at + 0.7)))).toFixed(3)})`);
  }
}

// ── Act IV: who brings what — a callout for each of the four spheres ─────────
const TAGS = [
  { sphere: "ifo",       name: "you",       status: "bring the idea" },
  { sphere: "castles",   name: "patrons",   status: "bring the capital" },
  { sphere: "education", name: "mulvium",   status: "brings the institution" },
  { sphere: "zones",     name: "neighbors", status: "share in its beauty" },
].map((g, i) => {
  const el = document.createElement("div");
  el.className = "tag";
  el.innerHTML = "<b></b><em></em>";
  el.children[0].textContent = g.name;
  el.children[1].textContent = g.status;
  $("tags").appendChild(el);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("r", "6");
  $("leads").append(line, dot);
  return { ...g, el, line, dot, at: CUES.tags[i], out: CUES.exists - 0.25 };
});
// The four places the callouts stand, and which sphere each takes: the
// pairing that keeps every leader shortest while they are shown
const ANCHORS = REEL
  ? [[290, 300], [790, 300], [290, 1470], [790, 1470]]
  : [[330, 190], [1590, 190], [330, 800], [1590, 800]];
const _wp = new THREE.Vector3();
function assignAnchors() {
  const pts = TAGS.map((g) => {
    let x = 0, y = 0;
    for (const t of [CUES.tags[0], CUES.tags[3], CUES.exists]) {
      poseCosmos(t, 0, 0);
      cosmos.updateMatrixWorld(true);
      middleCam(t);
      orbitOf(g.sphere).planet.getWorldPosition(_wp);
      const p = toScreen(_wp);
      x += p.x / 3; y += p.y / 3;
    }
    return [x, y];
  });
  let best = null, bestCost = Infinity;
  const perm = (arr, k = 0) => {
    if (k === arr.length) {
      const cost = arr.reduce((s, a, i) => s + Math.hypot(ANCHORS[a][0] - pts[i][0], ANCHORS[a][1] - pts[i][1]) ** 2, 0);
      if (cost < bestCost) { bestCost = cost; best = arr.slice(); }
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      perm(arr, k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  };
  perm([0, 1, 2, 3]);
  TAGS.forEach((g, i) => { g.anchor = ANCHORS[best[i]]; });
}
assignAnchors();
function drawTags(t) {
  for (const g of TAGS) {
    const on = t >= g.at && t < g.out + 0.6;
    show(g.el, on);
    css(g.line, "display", on ? "" : "none");
    css(g.dot, "display", on ? "" : "none");
    if (!on) continue;
    const planet = orbitOf(g.sphere).planet;
    planet.getWorldPosition(_wp);
    const p = toScreen(_wp), rp = screenRadius(_wp, 0.42 * planet.scale.x);
    const a = expoOut(seg(t, g.at, g.at + 0.6)) * (1 - seg(t, g.out, g.out + 0.5));
    const [ax, ay] = g.anchor, h = g.el.offsetHeight;
    css(g.el, "transform", `translate(${ax}px, ${(ay + (1 - a) * 16).toFixed(1)}px)`);
    css(g.el, "opacity", a.toFixed(3));
    // The leader runs from the callout's nearer edge to the sphere's
    const below = p.y > ay + h / 2;
    const sx = ax, sy = below ? ay + h + 14 : ay - 14;
    const dx = p.x - sx, dy = p.y - sy, len = Math.hypot(dx, dy) || 1;
    const ex = p.x - (dx / len) * (rp + 6), ey = p.y - (dy / len) * (rp + 6);
    const k = cubicInOut(seg(t, g.at + 0.15, g.at + 0.85));
    g.line.setAttribute("x1", sx.toFixed(1));
    g.line.setAttribute("y1", sy.toFixed(1));
    g.line.setAttribute("x2", lerp(sx, ex, k).toFixed(1));
    g.line.setAttribute("y2", lerp(sy, ey, k).toFixed(1));
    g.line.setAttribute("opacity", a.toFixed(3));
    g.dot.setAttribute("cx", ex.toFixed(1));
    g.dot.setAttribute("cy", ey.toFixed(1));
    g.dot.setAttribute("opacity", (a * seg(t, g.at + 0.75, g.at + 0.95)).toFixed(3));
  }
}
// A named sphere swells, as one does when hovered on the landing page
function swell(t) {
  for (const o of orbits) {
    const g = TAGS.find((x) => x.sphere === o.def.id);
    const k = easeInOut(seg(t, g.at, g.at + 0.5)) * (1 - easeInOut(seg(t, g.out, g.out + 0.6)));
    o.planet.scale.setScalar(1 + 0.2 * k);
  }
}

// ── Act V: the constellation — every idea lit, a road from each to the star ──
const skyIdeas = (() => {
  // The overhead camera's view of the sky plane, and where words will be
  const hz = 23.4 * Math.tan((fovFor(42) * Math.PI) / 360), hx = hz * (W / H);
  const band = REEL ? [-0.32, 0.12] : [-0.3, 0.3];  // the words, as a share of half the height
  const label = 2 * 360 / W;                         // the widest name, as a share of half the width
  const r = rng(31), pts = [];
  let tries = 0;
  while (pts.length < IDEAS.length && tries++ < 20000) {
    const nx = -0.95 + r() * (1.95 - label), nz = -0.9 + r() * 1.8;
    if (nz > band[0] && nz < band[1]) continue;
    const px = nx * W / 2, pz = nz * H / 2;
    if (pts.some((p) => Math.hypot(p.px - px, (p.pz - pz) * 1.7) < 150)) continue;
    pts.push({ px, pz, x: nx * hx, z: nz * hz });
  }
  // Lit from the star outward, so the light spreads like the expansion itself
  pts.sort((a, b) => Math.hypot(a.px, a.pz) - Math.hypot(b.px, b.pz));
  return pts.map((p, i) => {
    const el = ideaEl(IDEAS[i], $("ideas"));
    el.lastChild.style.fontSize = "24px";
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    $("roads").appendChild(line);
    return { pos: new THREE.Vector3(p.x, 0.6, p.z), at: CUES.constellation[i], el, line };
  });
})();
function drawSkyIdeas(t, starPt) {
  const on = t >= CUES.constellation[0] && t < CUES.flash;
  const fadeAll = 1 - seg(t, CUES.flash - 0.6, CUES.flash);
  for (const d of skyIdeas) {
    const vis = on && t >= d.at;
    show(d.el, vis);
    css(d.line, "display", vis ? "" : "none");
    if (!vis) continue;
    const p = toScreen(d.pos);
    const a = expoOut(seg(t, d.at, d.at + 0.6)) * fadeAll;
    css(d.el, "transform", `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`);
    css(d.el, "opacity", a.toFixed(3));
    css(d.el.firstChild, "transform", `scale(${(1 + 2 * (1 - expoOut(seg(t, d.at, d.at + 0.7)))).toFixed(3)})`);
    const k = cubicInOut(seg(t, d.at - 0.25, d.at + 0.45));
    d.line.setAttribute("x1", starPt.x.toFixed(1));
    d.line.setAttribute("y1", starPt.y.toFixed(1));
    d.line.setAttribute("x2", lerp(starPt.x, p.x, k).toFixed(1));
    d.line.setAttribute("y2", lerp(starPt.y, p.y, k).toFixed(1));
    d.line.setAttribute("stroke-width", "1.3");
    d.line.setAttribute("stroke-opacity", (0.34 * fadeAll).toFixed(3));
  }
}

// ── The close: the landing page's hero ──────────────────────────────────────
const hero = $("hero");
const wordmark = hero.querySelector(".wordmark");
const statement = hero.querySelector(".statement");
const cta = hero.querySelector(".cta");
const heroWords = maskWords(statement, statement.textContent.trim());
function drawHero(t) {
  const on = t >= CUES.flash;
  show(hero, on);
  if (!on) return;
  goo(wordmark, seg(t, CUES.wordmark, CUES.wordmark + 1.4));
  // The wordmark's glint, the navbar's, passing once
  css(wordmark, "backgroundPosition", `${lerp(100, 0, cubicInOut(seg(t, CUES.cta + 0.4, CUES.cta + 2.0))).toFixed(1)}% 0`);
  riseWords(heroWords, t, CUES.statement);
  const c = expoOut(seg(t, CUES.cta, CUES.cta + 0.9));
  if (REEL) {
    css(statement, "top", "1376px");
    css(cta, "top", (1550 + (1 - c) * 24).toFixed(0) + "px");
  } else {
    css(statement, "top", (540 - statement.offsetHeight / 2).toFixed(0) + "px");
    css(cta, "top", (540 - cta.offsetHeight / 2 + (1 - c) * 24).toFixed(0) + "px");
  }
  css(cta, "opacity", c.toFixed(3));
}

// ── The lens: grain, vignette, letterbox ────────────────────────────────────
const grain = $("grain"), gctx = grain.getContext("2d");
grain.width = W / 2;
grain.height = H / 2;
const grainFrames = (() => {
  const r = rng(99), out = [];
  for (let k = 0; k < 8; k++) {
    const img = gctx.createImageData(W / 2, H / 2);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (r() + r() + r() - 1.5) * 70;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    out.push(img);
  }
  return out;
})();
let lastGrain = -1;
const bars = [...$("bars").children];
const glow = $("glow"), streak = $("streak"), black = $("black"), flash = $("flash"), halo = $("halo"),
      vignette = $("vignette"), veil = $("veil"), scrim = $("scrim");

// ── One frame ────────────────────────────────────────────────────────────────
function seek(t) {
  t = Math.max(0, Math.min(DURATION, t));
  const fly = t < CUES.cut;
  const inBowl = t >= CUES.dive[1] && t < CUES.back;
  const cosmosOn = !fly && !inBowl && t >= CUES.spark - 0.3;
  let nightness = 1;

  deepField.visible = sphereGroup.visible = fly;
  cosmos.visible = sky.visible = cosmosOn;
  bowlWorld.visible = inBowl;
  if (fly) {
    flyCam(t);
    bgColor.copy(NIGHT_COLOR);
    deepMat.uniforms.uTime.value = t;
    deepMat.uniforms.uOpacity.value = seg(t, 0.2, 3.2) * (1 - 0.5 * seg(t, 17, CUES.cut));
    drawSphere(t);
  } else if (inBowl) {
    nightness = 0;
    bowlCam(t);
    poseBowl(t);
    bgColor.copy(PAPER_COLOR);
  } else if (cosmosOn) {
    // Posed first: the dive steers by where the blue planet is now
    poseCosmos(t, T2D(t), EXP(t));
    swell(t);
    cosmos.updateMatrixWorld(true);
    if (t < CUES.dive[1]) genesisCam(t);
    else if (t < CUES.flash) middleCam(t);
    else heroCam(t);
    const night = NIGHT(t);
    nightness = night;
    bgColor.copy(PAPER_COLOR).lerp(NIGHT_COLOR, night);
    skyMat.uniforms.uTime.value = t;
    skyMat.uniforms.uOpacity.value = night * (t < 34 ? lerp(0.2, 1, seg(t, CUES.spark, 31)) : 1);
    for (const m of meteors) {
      const k = (t - m.at) / m.dur;
      m.mesh.visible = k > 0 && k < 1 && night > 0.5;
      if (!m.mesh.visible) continue;
      m.mesh.position.set(m.x0 + m.dirX * m.speed * (t - m.at), 0.6, m.z0 + m.dirZ * m.speed * (t - m.at));
      m.mesh.rotation.set(-Math.PI / 2, 0, m.phi);
      m.mesh.material.opacity = Math.sin(Math.PI * k) * 0.85 * night;
    }
  }
  const blackout = t < 1.2 ? 1 - seg(t, 0, 1.2) : t >= CUES.cut && t < CUES.spark ? 1 - seg(t, CUES.spark - 0.25, CUES.spark) : 0;
  if ((fly || inBowl || cosmosOn) && blackout < 1) renderer.render(scene, camera);
  css(black, "opacity", blackout.toFixed(3));
  css(scrim, "opacity", (seg(t, 17.6, 18.2) * (t < CUES.cut ? 1 : 0)).toFixed(3));

  // From the bowl back to the cosmos, through paper
  const v = t >= CUES.back - 0.5 && t < CUES.back + 0.6 ? Math.min(seg(t, CUES.back - 0.5, CUES.back), 1 - seg(t, CUES.back, CUES.back + 0.6)) : 0;
  css(veil, "opacity", v.toFixed(3));

  show($("ideas"), fly || (t >= CUES.constellation[0] && t < CUES.flash));
  drawFlyIdeas(t, fly);

  // The star's light: a spark in the dark, the bloom, the radiant close
  let gA = 0, gS = 0.1;
  if (cosmosOn && t < 34.5) {
    gA = expoOut(seg(t, CUES.spark, CUES.spark + 0.35)) * (1 - seg(t, CUES.bloom + 0.2, 34.5));
    gS = lerp(0.07, 0.6, expoIn(seg(t, CUES.rise, CUES.bloom)));
  } else if (cosmosOn && t >= CUES.expand[0] + 0.75 && t < CUES.flash + 0.2) {
    gA = 0.75 * seg(t, CUES.expand[0] + 0.75, CUES.expand[1]) + 0.25 * seg(t, CUES.flash - 1.1, CUES.flash);
    gS = lerp(0.2, 0.32, seg(t, 72, 81)) + 3 * expoIn(seg(t, CUES.flash - 1.1, CUES.flash));
  }
  const starPt = cosmosOn ? toScreen(star.getWorldPosition(_wp)) : { x: W / 2, y: H / 2 };
  show(glow, gA > 0.001);
  show(streak, gA > 0.001);
  if (gA > 0.001) {
    css(glow, "transform", `translate(${starPt.x.toFixed(1)}px, ${starPt.y.toFixed(1)}px) scale(${gS.toFixed(3)})`);
    css(glow, "opacity", gA.toFixed(3));
    css(streak, "transform", `translate(${starPt.x.toFixed(1)}px, ${starPt.y.toFixed(1)}px) scale(${(0.35 + gS * 0.9).toFixed(3)}, ${(0.6 + gS * 0.6).toFixed(3)})`);
    css(streak, "opacity", (gA * 0.85).toFixed(3));
  }

  const tagsOn = cosmosOn && t >= CUES.tags[0] && t < CUES.exists + 0.5;
  show($("tags"), tagsOn);
  show($("leads"), tagsOn);
  if (tagsOn) drawTags(t);
  show($("roads"), t >= CUES.constellation[0] - 0.3 && t < CUES.flash);
  drawSkyIdeas(t, starPt);

  // Words
  drawCaptions(t);
  const haloA = Math.max(seg(t, CUES.exists - 0.2, CUES.exists + 0.4) * (1 - seg(t, 67.4, 68.2)), t >= CUES.flash ? 1 : 0);
  show(halo, haloA > 0.001);
  if (t >= CUES.flash) css(halo, "transform", REEL ? "translate(540px, 340px) scale(0.85, 0.6)" : "translate(960px, 150px)");
  else css(halo, "transform", REEL ? "translate(540px, 1490px) scale(0.85, 0.5)" : "translate(960px, 880px) scale(1.1, 0.55)");
  css(halo, "opacity", haloA.toFixed(3));
  drawHero(t);

  // The flash at the bloom and at the close
  const fl = Math.max(
    Math.pow(seg(t, CUES.bloom - 0.6, CUES.bloom), 2.0) * (1 - expoOut(seg(t, CUES.bloom, CUES.bloom + 1.6))) * 0.96,
    expoIn(seg(t, CUES.flash - 0.8, CUES.flash)) * (1 - easeInOut(seg(t, CUES.flash, CUES.flash + 1.5)))
  );
  css(flash, "opacity", fl.toFixed(3));

  // The lens
  const gi = Math.floor(t * CUES.fps) % grainFrames.length;
  if (gi !== lastGrain) { gctx.putImageData(grainFrames[gi], 0, 0); lastGrain = gi; }
  css(grain, "opacity", lerp(0.05, 0.085, nightness).toFixed(3));
  css(vignette, "opacity", lerp(0.32, 0.95, nightness).toFixed(3));
  const bar = REEL ? 0 : 140 * (1 - cubicInOut(seg(t, CUES.bloom, CUES.bloom + 1.8)));
  for (const b of bars) css(b, "height", bar.toFixed(1) + "px");
}

// ── Ready, and playing ───────────────────────────────────────────────────────
const fontsReady = Promise.all([
  "400 62px Lora", "italic 400 62px Lora", "500 62px Lora", "italic 500 62px Lora",
  "400 40px 'Major Mono Display'", "400 48px 'IBM Plex Sans'", "500 30px 'IBM Plex Sans'",
].map((f) => document.fonts.load(f))).then(() => document.fonts.ready);
const ready = Promise.all([fontsReady, picturesReady]).then(() => {
  buildSphere();
  // Compile every material the film will need, before the first frame counts
  for (const t of [20, 30, 52, 56, 62, 78, 0]) seek(t);
});
window.film = { seek, ready, duration: DURATION, fps: CUES.fps, width: W, height: H };

if (!RENDER) {
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`;
  };
  fit();
  addEventListener("resize", fit);
  const audio = $("score"), play = $("play");
  const from = parseFloat(PARAMS.get("t")) || 0;
  // The score, held whole, so it can start anywhere on any server
  const scoreReady = fetch(audio.getAttribute("src"))
    .then((r) => (r.ok ? r.blob() : Promise.reject()))
    .then((b) => { audio.src = URL.createObjectURL(b); }, () => {});
  Promise.all([ready, scoreReady]).then(() => {
    seek(from);
    play.hidden = false;
    // The score is the clock; without it, the page keeps its own
    let clock = null;
    const loop = () => {
      const t = clock !== null ? from + (performance.now() - clock) / 1000 : audio.currentTime;
      seek(t);
      if (t < DURATION) requestAnimationFrame(loop);
    };
    const silent = () => { if (clock === null) clock = performance.now(); };
    play.addEventListener("click", () => {
      play.hidden = true;
      const start = () => {
        audio.currentTime = from; // only takes once the score's length is known
        audio.play().catch(silent);
        requestAnimationFrame(loop);
      };
      if (audio.readyState >= 1) start();
      else {
        audio.addEventListener("loadedmetadata", start, { once: true });
        audio.addEventListener("error", () => { silent(); requestAnimationFrame(loop); }, { once: true });
        audio.load();
      }
    });
  });
}
