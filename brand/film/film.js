// film.js — Mulvium's launch film, drawn from the site's own pieces: the
// landing page's porcelain cosmos and night sky (js/main.js), the loading
// screen's photographs opening as slits (js/ls.js), the hero's rising words,
// and the site's own lines.
//
// Every frame is a function of time alone: film.seek(t) draws the frame at t
// seconds, so render.js can capture the film frame by frame, and the page
// plays itself, in time with its score, when opened in a browser. The cue
// times live in cues.json, which the score (score.py) is written to as well.
//
// Six acts:
//   I    0–15    Millions of ideas, as stars, met in flight
//   II   15–27   The organization that stands in their way; the stars go out
//   III  27–42   One light: the cosmos assembles, night turns to paper
//   IV   42–60   Four photographs, four values; many roads, one meeting place
//   V    60–73   You, patrons and Mulvium: it exists
//   VI   73–92   The expansion: every idea lit, then the landing page itself
import * as THREE from "three";

const CUES = await (await fetch("cues.json")).json();
const W = 1920, H = 1080;
const DURATION = CUES.duration;
const RENDER = new URLSearchParams(location.search).has("render");

// ── Time helpers ──────────────────────────────────────────────────────────────
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // main.js's
const cubicInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const expoIn = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
const eRise = (x) => 1 - Math.pow(1 - x, 3);   // ls.js's
const eSlit = expoOut;                          // ls.js's
const eConverge = (x) => x * x * x * x;         // ls.js's

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

// Seeded randomness, so every render places every star the same way
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── The cosmos, as the landing page builds it (js/main.js) ───────────────────
const PASTEL_STAR    = 0xF0D5BB;
const PASTEL_IFO     = 0xC4DDB8;
const PASTEL_CASTLES = 0xB8CAE0;
const PASTEL_EDU     = 0xE0B8C8;
const PASTEL_ZONES   = 0xB8DDD8;
const CREAM_DEEP     = 0xcdbe96;
const PAPER          = 0xeceae5;
const STAR_RADIUS    = 1.25;

// The phases are the landing page's, turned so that each sphere the film
// names is in view when it is named
const ORBITS = [
  { id: "ifo",       radius: 3.0, radius2D: 2.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_IFO,
    tilt: [0, 0, 0],                                  speed: 0.36, phase: 0.0 + 0.6 },
  { id: "castles",   radius: 3.8, radius2D: 4.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_CASTLES,
    tilt: [Math.PI / 2, 0, 0],                        speed: 0.26, phase: 1.1 + 5.2 },
  { id: "education", radius: 4.5, radius2D: 6.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_EDU,
    tilt: [Math.PI / 3.2, Math.PI / 5 + Math.PI / 2, 0], speed: 0.22, phase: 2.4 },
  { id: "zones",     radius: 5.0, radius2D: 8.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_ZONES,
    tilt: [Math.PI / 3.2, Math.PI / 5, 0],            speed: 0.18, phase: 3.8 },
];

const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: RENDER });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

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
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xfff1d8, 0.5);
fillLight.position.set(-8, 3, -4);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xf1e4bf, 0.55);
rimLight.position.set(-2, -6, -8);
scene.add(rimLight);

const porcelainMat = (color, roughness = 0.38) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

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
  const ring = new THREE.Mesh(new THREE.TorusGeometry(def.radius, def.ringTube, 24, 256), porcelainMat(CREAM_DEEP, 0.35));
  pivot.add(ring);
  const rotator = new THREE.Group();
  pivot.add(rotator);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(def.planetSize, 64, 64), porcelainMat(def.planetColor));
  planet.position.x = def.radius;
  rotator.add(planet);
  return { def, pivot, ring, rotator, planet };
});

// The orbits' own clock runs faster while the cosmos gathers itself and as
// it expands at the close; integrated once, so any frame can be looked up
const orbitSpeed = track([[0, 1], [28.5, 1], [31, 3.2], [33, 1.8], [37, 1], [72.75, 1], [76, 1.4], [86.2, 1.4], [86.3, 1], [92, 1]]);
const CLOCK_DT = 1 / 240;
const clockTable = new Float32Array(Math.ceil((DURATION + 1) / CLOCK_DT) + 1);
for (let i = 1; i < clockTable.length; i++) clockTable[i] = clockTable[i - 1] + orbitSpeed(i * CLOCK_DT) * CLOCK_DT;
const orbitClock = (t) => {
  const f = Math.max(0, t) / CLOCK_DT, i = Math.min(clockTable.length - 2, Math.floor(f));
  return lerp(clockTable[i], clockTable[i + 1], f - i);
};

// ── The landing page's night sky: stars on the plane the overhead view sees ──
function skyField(count, seed) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3), size = new Float32Array(count),
        tw = new Float32Array(count), col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const s0 = r(), spread = s0 < 0.6 ? 16 : s0 < 0.85 ? 45 : 110;
    pos[i * 3] = (r() - 0.5) * spread * 2;
    pos[i * 3 + 1] = r() * 2;
    pos[i * 3 + 2] = (r() - 0.5) * spread * 2;
    const sr = r();
    size[i] = sr < 0.5 ? 1.0 + r() : sr < 0.85 ? 2.0 + r() * 1.5 : 3.5 + r() * 2.5;
    tw[i] = r() * Math.PI * 2;
    starTint(r, col, i);
  }
  return { pos, size, tw, col };
}
// Subtle warm, cool, or neutral white
function starTint(r, col, i) {
  const ct = r();
  if (ct < 0.15) { col[i * 3] = 1; col[i * 3 + 1] = 0.92 + r() * 0.08; col[i * 3 + 2] = 0.76 + r() * 0.14; }
  else if (ct < 0.28) { col[i * 3] = 0.8 + r() * 0.15; col[i * 3 + 1] = 0.88 + r() * 0.12; col[i * 3 + 2] = 1; }
  else { const v = 0.88 + r() * 0.12; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; }
}
function pointsGeo({ pos, size, tw, col }) {
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
const sky = new THREE.Points(pointsGeo(skyField(4500, 7)), skyMat);
scene.add(sky);

// ── Act I's deep field: the same stars, in a volume the camera flies through ─
const deep = (() => {
  const count = 7000, r = rng(11);
  const pos = new Float32Array(count * 3), size = new Float32Array(count),
        tw = new Float32Array(count), col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let x, y;
    do { x = (r() - 0.5) * 140; y = (r() - 0.5) * 80; } while (Math.abs(x) < 1.6 && Math.abs(y) < 1.2);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = 60 - r() * 380;
    const sr = r();
    size[i] = sr < 0.55 ? 0.6 + r() * 0.8 : sr < 0.9 ? 1.4 + r() * 1.4 : 2.8 + r() * 2.4;
    tw[i] = r() * Math.PI * 2;
    starTint(r, col, i);
  }
  return { pos, size, tw, col };
})();
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
const deepField = new THREE.Points(pointsGeo(deep), deepMat);
deepField.frustumCulled = false;
scene.add(deepField);

// ── Shooting stars over the closing night, as the landing page draws them ──
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
  return [76.9, 79.4, 81.2, 82.6, 83.9, 84.8].map((at) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.07),
      new THREE.MeshBasicMaterial({ map: meteorTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false })
    );
    mesh.visible = false;
    scene.add(mesh);
    const phi = r() * Math.PI * 2, dur = 0.8 + r() * 0.7, speed = 9 + r() * 6;
    const px = (r() - 0.5) * 22, pz = (r() - 0.5) * 12, back = speed * dur * 0.5;
    return { mesh, at, dur, speed, dirX: Math.cos(phi), dirZ: -Math.sin(phi), phi,
             x0: px - Math.cos(phi) * back, z0: pz + Math.sin(phi) * back };
  });
})();

// ── Projection: a world point to stage pixels ────────────────────────────────
const _v = new THREE.Vector3();
function toScreen(p) {
  _v.copy(p).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, z: _v.z };
}
// A sphere's radius on screen, in pixels, at its world position
function screenRadius(p, r) {
  const d = _v.copy(p).sub(camera.position).length();
  const f = H / 2 / Math.tan((camera.fov * Math.PI) / 360) / (camera.view ? camera.view.height / camera.view.fullHeight : 1);
  return (r / d) * f;
}

// ── Cameras ──────────────────────────────────────────────────────────────────
// Acts I and II fly forward through the deep field, slowing as the ideas
// gather; each of Act II's blows shakes it
const flyZ = track([[0, 40], [6, 30], [10, 6], [13, -24], [15.5, -38], [24.75, -44]]);
function shake(t) {
  let s = 0;
  for (const h of CUES.hits) if (t >= h) s += Math.exp(-(t - h) * 7) * Math.sin((t - h) * 52);
  return s;
}
function flyCam(t, withShake = true) {
  const k = withShake ? shake(t) : 0;
  camera.fov = 50;
  camera.clearViewOffset();
  camera.up.set(0, 1, 0);
  camera.position.set(Math.sin(t * 0.13) * 1.2, Math.cos(t * 0.11) * 0.8 - 0.8, flyZ(t));
  camera.rotation.set(Math.sin(t * 0.09) * 0.04 + k * 0.006, Math.sin(t * 0.07) * 0.06 + k * 0.004, Math.sin(t * 0.05) * 0.03, "YXZ");
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// The cosmos is seen from a point on a sphere around it: azimuth and
// elevation in degrees, distance, field of view, a sideways shift of the
// picture (to leave room for words), and a roll
function orbitCam(t, { az, el, dist, fov = 42, shift = 0, roll = 0, ty = 0 }) {
  const a = (az * Math.PI) / 180, e = (Math.min(el, 89.95) * Math.PI) / 180;
  camera.fov = fov;
  camera.position.set(Math.cos(e) * Math.sin(a) * dist, ty + Math.sin(e) * dist, Math.cos(e) * Math.cos(a) * dist);
  // "Up" is the direction of rising elevation, which stays defined overhead
  camera.up.set(-Math.sin(e) * Math.sin(a), Math.cos(e), -Math.sin(e) * Math.cos(a));
  camera.lookAt(0, ty, 0);
  if (roll) camera.rotateZ((roll * Math.PI) / 180);
  if (shift) camera.setViewOffset(W, H, -shift, 0, W, H);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// Act III: overhead in the night, then down to the landing page's angle,
// then into the star
const G = {
  az:    track([[27.75, 0], [33, 28], [35.6, 12], [38.6, -6], [41.2, -12]]),
  el:    track([[27.75, 89.9], [33, 89.9], [35.6, 46], [38.6, 12], [41.2, 10.5]]),
  dist:  track([[27.75, 24], [33, 24], [35.6, 19], [38.6, 15.4], [41.2, 14.4]]),
  roll:  track([[27.75, 0], [33, 0], [35.2, -5], [38.6, 0]]),
  shift: track([[27.75, 0], [36.6, 0], [38.2, 330], [40.8, 330], [41.7, 0]]),
};
function genesisCam(t) {
  // The last moment: a dive into the star, which fills the picture
  const dive = expoIn(seg(t, 41.0, 42.0));
  orbitCam(t, {
    az: G.az(t), el: G.el(t), dist: lerp(G.dist(t), 1.45, dive),
    fov: lerp(42, 34, dive), shift: G.shift(t), roll: G.roll(t),
  });
}
// Acts IV (through the window) to VI: from the window into the cosmos, the
// three spheres named, then up overhead as it expands
const M = {
  az:    track([[57, 38], [60, 22], [66, 6], [69.6, -2], [72.75, -10], [75.75, 0], [86.25, 9]]),
  el:    track([[57, 20], [60, 14], [66, 11], [72.75, 12], [75.75, 89.9]]),
  dist:  track([[57, 26], [60, 15.6], [67.4, 14.6], [69.0, 17.6], [72.75, 17.0], [75.75, 24]]),
  shift: track([[57, 0], [69.4, 0], [70.6, 330], [72.6, 330], [73.8, 0]]),
};
function middleCam(t) {
  orbitCam(t, { az: M.az(t), el: M.el(t), dist: M.dist(t), shift: M.shift(t) });
}
// The close: the landing page's own view, arrived at
const E = {
  az:   track([[86.25, 12], [92, 0]]),
  el:   track([[86.25, 16], [92, 10.15]]),
  dist: track([[86.25, 17.5], [92, 14.73]]),
};
function heroCam(t) {
  orbitCam(t, { az: E.az(t), el: E.el(t), dist: E.dist(t) });
}

// ── The cosmos's state through the film ──────────────────────────────────────
// t2d: 0 is the landing page's 3D view, 1 its overhead orbit view
// exp: the landing page's expansion, 0 at rest, 1 rings out and star radiant
// night: paper (0) to night (1)
const T2D_PATH = track([[27.75, 1], [33, 1], [38.5, 0], [72.75, 0], [75.75, 1], [86.24, 1]]);
const T2D = (t) => (t >= CUES.flash ? 0 : T2D_PATH(t));
const EXP = (t) => {
  if (t < CUES.rise) return 1;
  if (t < CUES.bloom) return 1 - easeInOut(seg(t, CUES.rise, CUES.bloom));
  if (t < 75) return 0;
  if (t < CUES.flash) return easeInOut(seg(t, 75, CUES.dusk[1]));
  return 0;
};
const NIGHT = (t) => {
  if (t < 32.95) return 1;
  if (t < 75) return 1 - cubicInOut(seg(t, 32.95, 33.12));
  if (t < CUES.flash) return cubicInOut(seg(t, 74.6, 76.6));
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
const stage = $("stage");
const css = (el, prop, v) => { if (el.style[prop] !== v) el.style[prop] = v; };
const show = (el, on) => css(el, "display", on ? "" : "none");
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
function riseWords(words, t, t0, speed = 1) {
  for (const w of words) {
    const p = riseEase(seg(t, t0 + w.d / speed, t0 + (w.d + w.dur) / speed));
    css(w.el, "transform", p >= 1 ? "none" : `translateY(${((1 - p) * 115).toFixed(2)}%)`);
  }
}

// Captions. y is the top of the line; x the left edge of a left-set line.
// fade: enters by blurring in, not rising; cut: leaves on the cut, not blurring away
const CAPS = [
  { t: [1.5, 6.0],     y: 470, cls: "c moon",       text: "Millions of people have ideas" },
  { t: [3.0, 6.0],     y: 548, cls: "c moon it",    text: "for things that should exist." },
  { t: [15.0, 17.5],   y: 503, cls: "c moon",       text: "The problem isn’t a lack of ideas." },
  { t: [18.0, 24.75],  y: 466, cls: "c moon",       text: "It’s the organization you have to build", cut: true },
  { t: [18.75, 24.75], y: 544, cls: "c moon it",    text: "before you can begin.", cut: true },
  { t: [25.5, 27.0],   y: 503, cls: "c moon it",    text: "So most ideas never begin.", fade: true },
  { t: [37.5, 40.9],   x: 150, y: 420, cls: "l ink",    text: "Mulvium gives your idea" },
  { t: [37.95, 40.9],  x: 150, y: 498, cls: "l ink",    text: "the institution" },
  { t: [38.4, 40.9],   x: 150, y: 576, cls: "l ink it", text: "from day one." },
  { t: [56.85, 58.6],  y: 166, cls: "c ink",        text: "Many roads." },
  { t: [57.45, 58.6],  y: 836, cls: "c ink it",     text: "One meeting place." },
  { t: [67.5, 69.6],   y: 842, cls: "c ink it xl",  text: "It exists." },
  { t: [70.0, 73.4],   x: 150, y: 372, cls: "l ink sm",    text: "Institutions can simply be" },
  { t: [70.35, 73.4],  x: 150, y: 436, cls: "l ink sm",    text: "one person with a vision" },
  { t: [70.7, 73.4],   x: 150, y: 500, cls: "l ink sm",    text: "to do something beautiful" },
  { t: [71.05, 73.4],  x: 150, y: 564, cls: "l ink sm it", text: "and something authentic." },
  { t: [76.5, 81.0],   y: 462, cls: "c moon",       text: "The next great expansion of human creativity" },
  { t: [78.75, 81.0],  y: 540, cls: "c moon it",    text: "won’t come from making it easier to create content." },
  { t: [81.75, 85.7],  y: 412, cls: "c moon",       text: "It will come from making it easier to create" },
  { t: [83.25, 85.7],  y: 500, cls: "c gold it xl", text: "institutions." },
].map((c) => {
  const el = document.createElement("div");
  el.className = "cap " + c.cls;
  el.style.left = (c.x ?? 960) + "px";
  el.style.top = c.y + "px";
  $("captions").appendChild(el);
  const words = c.fade ? null : maskWords(el, c.text);
  if (c.fade) el.textContent = c.text;
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
  "an orchestra", "a film festival", "a museum", "a community garden", "a scholarship fund",
  "a choir", "a research institute", "a public library", "a dance company", "a poetry press",
  "a jazz series", "a science camp", "a theater company", "a food pantry", "an art residency",
  "a youth sports league", "a historical society", "a music school", "a literacy program",
  "a seed library", "a documentary", "a makerspace", "a chamber ensemble", "a botanical garden",
  "a conservation trust", "an oral history project", "a mural project", "a writers’ workshop",
  "a community radio station", "an after-school program", "a heritage festival", "a bird sanctuary",
  "a summer academy", "a reading room", "a folk archive", "a new cultural institution",
];
function ideaEl(text, parent) {
  const el = document.createElement("div");
  el.className = "idea";
  el.innerHTML = "<i></i><span></span>";
  el.lastChild.textContent = text;
  parent.appendChild(el);
  return el;
}
// Each idea is placed where it should be seen: the early ones just after they
// appear, anywhere clear of the words; the last twelve in pairs, where Act
// II's six jobs will land on them
const JOB_AT = [["bylaws", 400, 300], ["budgets", 1480, 290], ["press", 960, 250],
                ["grant reports", 460, 800], ["payroll", 1460, 810], ["permits", 960, 860]];
const flyIdeas = (() => {
  const r = rng(5), out = [];
  const fwd = new THREE.Vector3(), dir = new THREE.Vector3();
  const clearOfWords = (x, y) => !(x > 420 && x < 1450 && y > 380 && y < 700) && y > 190 && y < 890 && x > 90 && x < 1560;
  CUES.ideas.forEach((at, i) => {
    const late = i >= 10;
    const tRef = late ? 20 : at + 0.6;
    let x, y;
    if (late) {
      const [, ax, ay] = JOB_AT[(i - 10) >> 1];
      [x, y] = (i - 10) % 2 ? [ax + 30, ay + 62] : [ax - 250, ay - 58];
    } else {
      do { x = 90 + r() * 1470; y = 190 + r() * 700; } while (!clearOfWords(x, y));
    }
    const depth = late ? 13 + r() * 6 : 15 + r() * 9;
    flyCam(tRef, false);
    camera.getWorldDirection(fwd);
    dir.set((x / W) * 2 - 1, -(y / H) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
    const pos = camera.position.clone().addScaledVector(dir, depth / dir.dot(fwd));
    // Each of Act II's blows puts out the two ideas under its word
    const killAt = late ? CUES.hits[(i - 10) >> 1] : 1e9;
    out.push({ at, pos, killAt, el: ideaEl(IDEAS[i], $("ideas")) });
  });
  return out;
})();
function drawFlyIdeas(t, on) {
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  for (const d of flyIdeas) {
    let a = on ? expoOut(seg(t, d.at, d.at + 0.55)) : 0;
    const k = seg(t, d.killAt, d.killAt + 0.7);
    a *= 1 - k;
    const depth = _v.copy(d.pos).sub(camera.position).dot(fwd);
    a *= clamp01((depth - 1.5) / 3.5);
    if (a <= 0.002 || depth <= 0.5) { show(d.el, false); continue; }
    const p = toScreen(d.pos);
    if (p.x < -400 || p.x > W + 100 || p.y < -100 || p.y > H + 100) { show(d.el, false); continue; }
    show(d.el, true);
    const s = Math.max(0.62, Math.min(1.5, 19 / depth));
    css(d.el, "transform", `translate(${p.x.toFixed(1)}px, ${(p.y + k * 34).toFixed(1)}px) scale(${s.toFixed(3)})`);
    css(d.el, "opacity", a.toFixed(3));
    const ping = 1 + 2.2 * (1 - expoOut(seg(t, d.at, d.at + 0.7)));
    css(d.el.firstChild, "transform", `scale(${ping.toFixed(3)})`);
    css(d.el, "filter", k > 0 ? `grayscale(1) blur(${(k * 3).toFixed(2)}px)` : "none");
  }
}

// ── Act II: the organization in the way ─────────────────────────────────────
const JOBS = JOB_AT.map(([text, x, y], i) => {
  const el = document.createElement("div");
  el.className = "job";
  el.textContent = text;
  $("ideas").appendChild(el);
  return { el, x, y, at: CUES.hits[i] };
});
function drawJobs(t) {
  for (const j of JOBS) {
    const on = t >= j.at && t < CUES.cut;
    show(j.el, on);
    if (!on) continue;
    const p = expoOut(seg(t, j.at, j.at + 0.35));
    const later = CUES.hits.filter((h) => h > j.at && t >= h).length;
    const w = j.el.offsetWidth, h = j.el.offsetHeight;
    css(j.el, "transform", `translate(${(j.x - w / 2).toFixed(1)}px, ${(j.y - h / 2).toFixed(1)}px) scale(${lerp(1.6, 1, p).toFixed(3)})`);
    css(j.el, "opacity", (p * (later ? 0.55 : 0.95)).toFixed(3));
    css(j.el, "filter", p < 1 ? `blur(${((1 - p) * 14).toFixed(2)}px)` : "none");
  }
}

// ── Act V: the tags, as the landing page annotates a sphere ──────────────────
const TAGS = [
  { at: CUES.tags[0], sphere: "ifo",     name: "you",     status: "bring the idea" },
  { at: CUES.tags[1], sphere: "castles", name: "patrons", status: "bring the capital" },
  { at: CUES.tags[2], sphere: "star",    name: "mulvium", status: "brings the institution", flip: true },
].map((g) => {
  const el = document.createElement("div");
  el.className = g.flip ? "tag flip" : "tag";
  el.innerHTML = "<b></b><em></em><span class='lead'></span><span class='dot'></span>";
  el.children[0].textContent = g.name;
  el.children[1].textContent = g.status;
  $("tags").appendChild(el);
  return { ...g, el };
});
TAGS.forEach((g, i) => { g.out = i < TAGS.length - 1 ? TAGS[i + 1].at + 0.1 : CUES.exists - 0.25; });
const _wp = new THREE.Vector3();
function drawTags(t) {
  for (const g of TAGS) {
    const on = t >= g.at && t < g.out + 0.6;
    show(g.el, on);
    if (!on) continue;
    const obj = g.sphere === "star" ? star : orbits.find((o) => o.def.id === g.sphere).planet;
    obj.getWorldPosition(_wp);
    const rad = g.sphere === "star" ? STAR_RADIUS * star.scale.x : 0.42 * obj.scale.x;
    const p = toScreen(_wp), rp = screenRadius(_wp, rad);
    const a = expoOut(seg(t, g.at, g.at + 0.6)) * (1 - seg(t, g.out, g.out + 0.5));
    const h = g.el.offsetHeight;
    // The star's tag hangs below it, as the landing page hangs it
    const y = g.flip ? p.y + rp + 10 - (1 - a) * 16 : p.y - rp - 10 - h + (1 - a) * 16;
    css(g.el, "transform", `translate(${p.x.toFixed(1)}px, ${y.toFixed(1)}px)`);
    css(g.el, "opacity", a.toFixed(3));
    css(g.el.children[2], "transform", `scaleY(${expoOut(seg(t, g.at + 0.1, g.at + 0.8)).toFixed(3)})`);
  }
}
// A named sphere swells, as one does when hovered on the landing page
function swell(t) {
  for (const o of orbits) {
    const g = TAGS.find((x) => x.sphere === o.def.id);
    const k = g ? easeInOut(seg(t, g.at, g.at + 0.5)) * (1 - easeInOut(seg(t, g.out, g.out + 0.6))) : 0;
    o.planet.scale.setScalar(1 + 0.18 * k);
  }
  const s = TAGS[2], k = easeInOut(seg(t, s.at, s.at + 0.5)) * (1 - easeInOut(seg(t, s.out, s.out + 0.6)));
  star.scale.multiplyScalar(1 + 0.1 * k);
}

// ── Act VI: the constellation — every idea lit, a road from each to the star ─
const skyIdeas = (() => {
  const r = rng(31), pts = [];
  while (pts.length < IDEAS.length) {
    const x = (r() - 0.5) * 29, z = (r() - 0.5) * 16.4;
    if (Math.abs(z) < 2.7 && Math.abs(x) < 12.5) continue;         // clear of the words
    if (x > 9.5 && Math.abs(z) < 3.4) continue;                    // labels run right
    if (pts.some((p) => Math.hypot(p.x - x, (p.z - z) * 1.6) < 2.6)) continue;
    pts.push({ x, z });
  }
  // Lit from the star outward, so the light spreads like the expansion itself
  pts.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  return pts.map((p, i) => {
    const el = ideaEl(IDEAS[i], $("ideas"));
    el.lastChild.style.fontSize = "23px";
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
    // The road draws itself from the star out to the idea
    const k = cubicInOut(seg(t, d.at - 0.25, d.at + 0.45));
    d.line.setAttribute("x1", starPt.x.toFixed(1));
    d.line.setAttribute("y1", starPt.y.toFixed(1));
    d.line.setAttribute("x2", lerp(starPt.x, p.x, k).toFixed(1));
    d.line.setAttribute("y2", lerp(starPt.y, p.y, k).toFixed(1));
    d.line.setAttribute("stroke-width", "1.3");
    d.line.setAttribute("stroke-opacity", (0.34 * fadeAll).toFixed(3));
  }
}

// ── Act IV: the loading screen's photographs ────────────────────────────────
const ls = $("ls");
const frames = [...ls.querySelectorAll(".fr")].map((el, i) => ({
  el, ph: el.querySelector(".ph"), seal: el.querySelector(".seal"), at: CUES.frames[i],
}));
const winEdge = $("win-edge");
// Each frame's size (fractions of the stage), nested one inside the next
const FR = [[0.80, 0.78], [0.62, 0.58], [0.46, 0.42], [0.32, 0.29]];
const MEET = [0.40, 0.46];  // where they converge: the meeting place
const WIN = [0.27, 0.31];   // the window that opens in it
const DRIFT = [[-26, 14], [22, -16], [18, 20], [-18, -22]]; // px, over a frame's time
// The whole composition pushes in, so the newest photograph fills the view
const ZOOM = track([
  [41.9, 0.92], [45.5, 0.95], [46.75, 1.17], [49.25, 1.2], [50.5, 1.56],
  [53.0, 1.6], [54.25, 2.24], [56.25, 2.3], [57.0, 1.0],
]);
const imgSize = [];
const imagesReady = Promise.all(frames.map((f, i) => new Promise((res) => {
  const im = new Image();
  im.onload = () => {
    // The photograph's box: cover for its frame at full size, never resized
    const fw = FR[i][0] * W, fh = FR[i][1] * H, s = Math.max(fw / im.naturalWidth, fh / im.naturalHeight);
    imgSize[i] = [im.naturalWidth * s, im.naturalHeight * s];
    f.ph.style.width = imgSize[i][0] + "px";
    f.ph.style.height = imgSize[i][1] + "px";
    f.ph.style.backgroundImage = `url("${f.ph.dataset.src}")`;
    (im.decode ? im.decode() : Promise.resolve()).then(res, res);
  };
  im.onerror = res;
  im.src = f.ph.dataset.src;
})));

function rectPx([w, h], z = 1) {
  const pw = w * W * z, ph = h * H * z;
  return { l: (W - pw) / 2, t: (H - ph) / 2, w: pw, h: ph };
}
function mixRect(a, b, k) {
  return { l: lerp(a.l, b.l, k), t: lerp(a.t, b.t, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) };
}
function placeEl(el, r) {
  css(el, "transform", `translate(${r.l.toFixed(1)}px, ${r.t.toFixed(1)}px)`);
  css(el, "width", Math.max(0, r.w).toFixed(1) + "px");
  css(el, "height", Math.max(0, r.h).toFixed(1) + "px");
}
function drawLS(t) {
  const on = t >= 41.7 && t < CUES.push[1];
  show(ls, on);
  if (!on) return;
  css(ls, "opacity", seg(t, 41.7, 42.0).toFixed(3));
  const z = ZOOM(t);
  const conv = cubicInOut(seg(t, CUES.converge, CUES.window));      // into the meeting place
  const into = eConverge(seg(t, CUES.window + 0.5, CUES.push[0] - 0.1)); // into the window
  // The window: a slit, then open, then out past the edges of the picture
  const wo = t - CUES.window;
  const winW = WIN[0] * eSlit(clamp01(wo / 0.3)), winH = WIN[1] * eRise(clamp01((wo - 0.05) / 0.8));
  const grow = Math.pow(seg(t, CUES.push[0], CUES.push[1]), 2.6);
  const win = rectPx([lerp(winW, 1.06, grow), lerp(Math.max(winH, 2 / H), 1.06, grow)]);
  const winOpen = wo >= 0;

  frames.forEach((f, i) => {
    const vis = t >= f.at;
    show(f.el, vis);
    if (!vis) return;
    const o = t - f.at;
    const wk = eSlit(clamp01(o / 0.3)), hk = eRise(clamp01((o - 0.05) / 1.05));
    let r = rectPx([FR[i][0] * lerp(0.12, 1, wk), FR[i][1] * hk + 2 / H], z);
    r = mixRect(r, rectPx(MEET), conv);
    r = mixRect(r, win, into);
    placeEl(f.el, r);
    // A mat of paper between each photograph and the next
    css(f.el, "boxShadow", i ? `0 0 0 ${(7 * lerp(z, 1, conv)).toFixed(1)}px #eceae5` : "0 24px 70px rgba(27,22,19,0.22)");
    // The photograph settles from 1.3x, then drifts on
    const kb = lerp(1.3, 1, expoOut(seg(t, f.at, f.at + 1.8))) * (1 + 0.06 * seg(t, f.at, f.at + 16));
    const dk = seg(t, f.at, f.at + 16);
    // ...always covering its frame, however the frame has been reshaped
    const cover = imgSize[i] ? Math.max(r.w / imgSize[i][0], r.h / imgSize[i][1]) * 1.04 : 1;
    const ps = Math.max(kb * lerp(z, 1, conv), cover);
    css(f.ph, "transform", `translate(-50%, -50%) translate(${(DRIFT[i][0] * dk).toFixed(1)}px, ${(DRIFT[i][1] * dk).toFixed(1)}px) scale(${ps.toFixed(4)})`);
    // Its value, in the seal the Fiscal Sponsorship page sets on each picture
    const next = i < 3 ? frames[i + 1].at : CUES.converge - 0.4;
    const sa = expoOut(seg(t, f.at + 0.7, f.at + 1.4)) * (1 - seg(t, next + 0.1, next + 0.5));
    css(f.seal, "opacity", sa.toFixed(3));
    css(f.seal, "transform", `translate(${(r.w * 0.06 + 150).toFixed(1)}px, ${(r.h * 0.94 - 150).toFixed(1)}px) scale(${lerp(0.8, 1, riseEase(seg(t, f.at + 0.7, f.at + 1.6))).toFixed(3)})`);
  });

  // The window cuts through paper and photographs alike, onto the cosmos
  if (winOpen) {
    const { l, t: tp, w, h } = win;
    css(ls, "clipPath", `path(evenodd, "M0 0H${W}V${H}H0Z M${l.toFixed(1)} ${tp.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}Z")`);
    placeEl(winEdge, { l: win.l - 1, t: win.t - 1, w: win.w + 2, h: win.h + 2 });
    css(winEdge, "opacity", (1 - seg(t, CUES.push[1] - 0.5, CUES.push[1])).toFixed(3));
  } else {
    css(ls, "clipPath", "none");
    css(winEdge, "opacity", "0");
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
  css(wordmark, "backgroundPosition", `${lerp(100, 0, cubicInOut(seg(t, 89.6, 91.2))).toFixed(1)}% 0`);
  css(statement, "top", (540 - statement.offsetHeight / 2).toFixed(0) + "px");
  riseWords(heroWords, t, 87.75);
  const c = expoOut(seg(t, CUES.cta, CUES.cta + 0.9));
  css(cta, "top", (540 - cta.offsetHeight / 2 + (1 - c) * 24).toFixed(0) + "px");
  css(cta, "opacity", c.toFixed(3));
}

// ── The lens: grain, vignette, letterbox ────────────────────────────────────
const grain = $("grain"), gctx = grain.getContext("2d");
const grainFrames = (() => {
  const r = rng(99), out = [];
  for (let k = 0; k < 8; k++) {
    const img = gctx.createImageData(960, 540);
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
const glow = $("glow"), streak = $("streak"), black = $("black"), flash = $("flash"), halo = $("halo"), vignette = $("vignette");

// ── One frame ────────────────────────────────────────────────────────────────
function seek(t) {
  t = Math.max(0, Math.min(DURATION, t));
  const fly = t < CUES.cut;
  const inLS = t >= 42 && t < CUES.push[1];
  const cosmosOn = !fly && t >= CUES.spark - 0.3 && !(inLS && t < CUES.window);
  let nightness = 1;

  // The scene
  deepField.visible = fly;
  cosmos.visible = sky.visible = cosmosOn;
  if (fly) {
    flyCam(t);
    bgColor.copy(NIGHT_COLOR);
    deepMat.uniforms.uTime.value = t;
    // The stars dim with each blow
    const blows = CUES.hits.filter((h) => t >= h).length;
    deepMat.uniforms.uOpacity.value = seg(t, 0.2, 3.2) * (1 - 0.13 * blows);
  } else if (cosmosOn) {
    if (t < 42) genesisCam(t);
    else if (t < CUES.flash) middleCam(t);
    else heroCam(t);
    const night = NIGHT(t);
    nightness = night;
    poseCosmos(t, T2D(t), EXP(t));
    swell(t);
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
  const glVisible = (fly || cosmosOn) && blackout < 1;
  if (glVisible) renderer.render(scene, camera);
  css(black, "opacity", blackout.toFixed(3));

  // The night's ideas and the jobs that put them out
  show($("ideas"), fly || (t >= CUES.constellation[0] && t < CUES.flash));
  drawFlyIdeas(t, fly);
  drawJobs(t);

  // The star's light: a spark in the dark, the bloom, the radiant close
  let gA = 0, gS = 0.1;
  if (cosmosOn && t < 34.5) {
    gA = expoOut(seg(t, CUES.spark, CUES.spark + 0.35)) * (1 - seg(t, CUES.bloom + 0.2, 34.5));
    gS = lerp(0.07, 0.6, expoIn(seg(t, CUES.rise, CUES.bloom)));
  } else if (cosmosOn && t >= 76 && t < CUES.flash + 0.2) {
    gA = 0.75 * seg(t, 76, CUES.dusk[1]) + 0.25 * seg(t, 85.4, CUES.flash);
    gS = lerp(0.2, 0.32, seg(t, 76, 85)) + 3 * expoIn(seg(t, 85.4, CUES.flash));
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

  // Act V's tags and Act VI's constellation
  show($("tags"), t >= CUES.tags[0] && t < CUES.exists + 0.5);
  if (t >= CUES.tags[0] && t < CUES.exists + 0.5) drawTags(t);
  show($("roads"), t >= CUES.constellation[0] - 0.3 && t < CUES.flash);
  drawSkyIdeas(t, starPt);

  // Act IV
  drawLS(t);
  if (inLS) nightness = 0;

  // Words
  drawCaptions(t);
  const haloA = Math.max(
    seg(t, CUES.exists - 0.2, CUES.exists + 0.4) * (1 - seg(t, 69.4, 70.2)),
    t >= CUES.flash ? 1 : 0
  );
  show(halo, haloA > 0.001);
  if (t >= CUES.flash) css(halo, "transform", "translate(960px, 150px)");
  else css(halo, "transform", "translate(960px, 880px) scale(1.1, 0.55)");
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
  const bar = 140 * (1 - cubicInOut(seg(t, CUES.bloom, CUES.bloom + 1.8)));
  for (const b of bars) css(b, "height", bar.toFixed(1) + "px");
}

// ── Ready, and playing ───────────────────────────────────────────────────────
const fontsReady = Promise.all([
  "400 62px Lora", "italic 400 62px Lora", "500 62px Lora", "italic 500 62px Lora",
  "400 40px 'Major Mono Display'", "500 30px 'IBM Plex Sans'",
].map((f) => document.fonts.load(f))).then(() => document.fonts.ready);
const ready = Promise.all([fontsReady, imagesReady]).then(() => {
  seek(0);
  // Compile every material the film will need, before the first frame counts
  seek(30); seek(62); seek(80); seek(0);
});
window.film = { seek, ready, duration: DURATION, fps: CUES.fps };

if (!RENDER) {
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`;
  };
  fit();
  addEventListener("resize", fit);
  const audio = $("score"), play = $("play");
  const from = parseFloat(new URLSearchParams(location.search).get("t")) || 0;
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
