import * as THREE from "three";

// Pastel porcelain colors
const PASTEL_STAR    = 0xF0D5BB;
const PASTEL_IFO     = 0xC4DDB8;
const PASTEL_CASTLES = 0xB8CAE0;
const PASTEL_EDU     = 0xE0B8C8;
const PASTEL_ZONES   = 0xB8DDD8;
const CREAM_DEEP     = 0xcdbe96;
const PAPER          = 0xeceae5;

const STAR_RADIUS = 1.25;

// ringTube is set per-orbit so that after 2D pivot scaling all rings appear the same
// line weight from the overhead camera (tube_initial × scale_2D ≈ 0.04 for every ring).
// ellipseX is the X-axis stretch applied only in 2D; each orbit traces a distinct
// ellipse while remaining properly nested (no overlaps).
//
// 2D semi-axes in world space (pivot rotation.x = π/2):
//   X semi-axis = radius2D × ellipseX
//   Z semi-axis = radius2D
// Nesting check (must both grow outward): IFO(3.125,2.5) < Castles(3.375,4.5)
//   < Education(7.15,6.5) < Zones(7.65,8.5) — verified non-overlapping.
// The star is Mulvium; each planet is one of its companies. `status` is the
// italic line under the name on hover; planets with an `href` open their
// company's page.
const ORBITS = [
  {
    id: "ifo",
    name: "FSOS",
    status: "Explore",
    href: "pages/offerings/fsos.html",
    radius: 3.0,  radius2D: 2.5,  ellipseX: 1,  ringTube: 0.045,
    planetSize: 0.42, planetColor: PASTEL_IFO,
    tilt: [0, 0, 0],
    speed: 0.36,  phase: 0.0,
  },
  {
    id: "castles",
    name: "Fiscal Sponsorship",
    status: "Explore",
    href: "pages/offerings/fiscal-sponsorship.html",
    radius: 3.8,  radius2D: 4.5,  ellipseX: 1,  ringTube: 0.045,
    planetSize: 0.42,  planetColor: PASTEL_CASTLES,
    tilt: [Math.PI / 2, 0, 0],
    speed: 0.26,  phase: 1.1,
  },
  {
    id: "education",
    name: "Oak",
    status: "Explore",
    href: "pages/offerings/oak.html",
    radius: 4.5,  radius2D: 6.5,  ellipseX: 1,  ringTube: 0.045,
    planetSize: 0.42, planetColor: PASTEL_EDU,
    tilt: [Math.PI / 3.2, Math.PI / 5 + Math.PI / 2, 0],
    speed: 0.22,  phase: 2.4,
  },
  {
    id: "zones",
    name: "To Be Announced",
    status: "",
    radius: 5.0,  radius2D: 8.5,  ellipseX: 1,  ringTube: 0.045,
    planetSize: 0.42, planetColor: PASTEL_ZONES,
    tilt: [Math.PI / 3.2, Math.PI / 5, 0],
    speed: 0.18,  phase: 3.8,
  },
];

const canvas            = document.getElementById("cosmos");
const navbar            = document.getElementById("navbar");
const navCap            = document.getElementById("nav-cap");
const brandLink         = document.getElementById("brand-link");
const body              = document.body;
const expansionWrapper  = document.getElementById("expansion-wrapper");
const canvasWrap        = document.getElementById("canvas-wrap");
window.scrollTo(0, 0);
body.classList.add("cosmos-only");

const scene = new THREE.Scene();

const PAPER_COLOR       = new THREE.Color(PAPER);
const PASTEL_STAR_COLOR = new THREE.Color(PASTEL_STAR);
const WHITE_COLOR       = new THREE.Color(0xffffff);
const BLACK_COLOR       = new THREE.Color(0x000000);
const NIGHT_COLOR       = new THREE.Color(0x060412);

const bgColor    = new THREE.Color(PAPER);
scene.background = bgColor;

// Star-field — scattered on the y≈0 plane, visible from the overhead 2D camera.
// Uses a ShaderMaterial for per-star size variation, subtle colour tint, and twinkle.
// Original positions are also the geometry's "position" attribute so Three.js frustum
// culling still works.
const SKY_COUNT     = 4500;
const skyPosArr     = new Float32Array(SKY_COUNT * 3);
const skySizeArr    = new Float32Array(SKY_COUNT);
const skyTwinkleArr = new Float32Array(SKY_COUNT);
const skyColorArr   = new Float32Array(SKY_COUNT * 3);

for (let i = 0; i < SKY_COUNT; i++) {
  // 60% in visible area (±16), 25% near-outer (±45), 15% far scattered (±110)
  const sr0 = Math.random();
  const spread = sr0 < 0.60 ? 16 : (sr0 < 0.85 ? 45 : 110);
  skyPosArr[i * 3]     = (Math.random() - 0.5) * spread * 2;
  skyPosArr[i * 3 + 1] = Math.random() * 2;
  skyPosArr[i * 3 + 2] = (Math.random() - 0.5) * spread * 2;

  // 50% small (1.0–2.0 px), 35% medium (2.0–3.5 px), 15% bright (3.5–6 px)
  const sr = Math.random();
  skySizeArr[i] = sr < 0.50 ? 1.0 + Math.random()
               : sr < 0.85 ? 2.0 + Math.random() * 1.5
               :              3.5 + Math.random() * 2.5;

  skyTwinkleArr[i] = Math.random() * Math.PI * 2;

  // Subtle warm, cool, or neutral white
  const ct = Math.random();
  if (ct < 0.15) {
    skyColorArr[i*3]=1.0; skyColorArr[i*3+1]=0.92+Math.random()*0.08; skyColorArr[i*3+2]=0.76+Math.random()*0.14;
  } else if (ct < 0.28) {
    skyColorArr[i*3]=0.80+Math.random()*0.15; skyColorArr[i*3+1]=0.88+Math.random()*0.12; skyColorArr[i*3+2]=1.0;
  } else {
    const v = 0.88 + Math.random() * 0.12;
    skyColorArr[i*3]=v; skyColorArr[i*3+1]=v; skyColorArr[i*3+2]=v;
  }
}

const skyStarGeo = new THREE.BufferGeometry();
skyStarGeo.setAttribute("position",   new THREE.BufferAttribute(skyPosArr,     3));
skyStarGeo.setAttribute("aSize",      new THREE.BufferAttribute(skySizeArr,    1));
skyStarGeo.setAttribute("aTwinkle",   new THREE.BufferAttribute(skyTwinkleArr, 1));
skyStarGeo.setAttribute("aColor",     new THREE.BufferAttribute(skyColorArr,   3));

const skyStarMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:    { value: 0.0 },
    uOpacity: { value: 0.0 },
  },
  vertexShader: `
    attribute float aSize;
    attribute float aTwinkle;
    attribute vec3  aColor;
    uniform float uTime;
    uniform float uOpacity;
    varying float vAlpha;
    varying vec3  vColor;
    void main() {
      vec3 pos = position;
      float twinkle = 0.72 + 0.28 * sin(uTime * 1.7 + aTwinkle);
      vAlpha = uOpacity * twinkle;
      vColor = aColor;
      gl_PointSize = aSize * (0.88 + 0.12 * sin(uTime * 1.1 + aTwinkle * 1.4));
      gl_Position  = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3  vColor;
    void main() {
      vec2  uv = gl_PointCoord - vec2(0.5);
      float r  = length(uv);
      float a  = (1.0 - smoothstep(0.25, 0.5, r)) * vAlpha;
      gl_FragColor = vec4(vColor, a);
    }
  `,
  transparent: true,
  depthTest:   false,
  depthWrite:  false,
});
const skyStars = new THREE.Points(skyStarGeo, skyStarMat);

// ── Sky group — everything in here rotates together as the user scrolls ───────
scene.add(skyStars);

// ── Shooting stars — brief streaks across the night sky (expansion view) ──────
// Thin additive-blended planes lying on the XZ plane so the overhead 2D camera
// sees them as meteors crossing the star-field.
const meteorTex = (() => {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 16;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0,  "rgba(255,255,255,0)");
  grad.addColorStop(0.72, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.96, "rgba(255,255,255,0.95)");
  grad.addColorStop(1.0,  "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 16);
  return new THREE.CanvasTexture(c);
})();

const meteors = [];
for (let i = 0; i < 3; i++) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.07),
    new THREE.MeshBasicMaterial({
      map: meteorTex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
    })
  );
  mesh.visible = false;
  scene.add(mesh);
  meteors.push({ mesh, t: 1, dur: 1, dirX: 0, dirZ: 0, speed: 0 });
}
let meteorTimer = 2.0;

function spawnMeteor() {
  const m = meteors.find((mm) => mm.t >= 1);
  if (!m) return;
  const phi = Math.random() * Math.PI * 2;
  // Plane rotated flat (x: -π/2) with roll phi travels along (cosφ, 0, -sinφ)
  m.dirX  = Math.cos(phi);
  m.dirZ  = -Math.sin(phi);
  m.dur   = 0.8 + Math.random() * 0.7;
  m.speed = 9 + Math.random() * 6;
  m.t     = 0;
  // Start half a flight back so the streak crosses a random visible point
  const px = (Math.random() - 0.5) * 13;
  const pz = (Math.random() - 0.5) * 13;
  const back = m.speed * m.dur * 0.5;
  m.mesh.position.set(px - m.dirX * back, 0.6, pz - m.dirZ * back);
  m.mesh.rotation.set(-Math.PI / 2, 0, phi);
  m.mesh.visible = true;
}

// ── Sphere annotation sprite — lives IN the 3D scene with depth testing, so
// rings and other spheres in front of it genuinely occlude the label, exactly
// like any other object. Drawn to a canvas texture: name in small caps, an
// italic status line, and a hairline leader with a dot pointing at the sphere.
const labelTexCache = new Map();
// flip=true draws the leader on top (label hangs BELOW the sphere — used for
// the star so the label clears the hero halo at the top of the screen)
function labelTexture(name, status, night, flip) {
  const key = name + "|" + (status || "") + "|" + (night ? 1 : 0) + "|" + (flip ? 1 : 0);
  if (labelTexCache.has(key)) return labelTexCache.get(key);
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const g = c.getContext("2d");
  const ink  = night ? "rgba(255,255,255,0.95)" : "#1b1613";
  const soft = night ? "rgba(255,255,255,0.65)" : "rgba(59,51,47,0.85)";
  g.textAlign = "center";

  function drawText(nameY, statusY) {
    g.fillStyle = ink;
    g.font = "74px 'Cormorant SC', serif";
    if ("letterSpacing" in g) g.letterSpacing = "10px";
    // Long names (e.g. "Fiscal Sponsorship") shrink to fit the texture
    const nameW = g.measureText(name).width;
    if (nameW > 960) g.font = `${Math.floor(74 * 960 / nameW)}px 'Cormorant SC', serif`;
    g.fillText(name, 512, nameY);
    if (status) {
      g.font = "italic 50px 'Cormorant Garamond', serif";
      if ("letterSpacing" in g) g.letterSpacing = "3px";
      g.fillStyle = soft;
      g.fillText(status, 512, statusY);
    }
  }
  function drawLeader(dotY, lineFrom, lineTo) {
    g.strokeStyle = ink;
    g.globalAlpha = 0.5;
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(512, lineFrom); g.lineTo(512, lineTo); g.stroke();
    g.fillStyle = ink;
    g.globalAlpha = 0.6;
    g.beginPath(); g.arc(512, dotY, 8, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  }

  if (flip) {
    drawLeader(118, 140, 226);
    drawText(330, status ? 404 : 0);
  } else {
    drawText(170, 246);
    const y = status ? 282 : 246;
    drawLeader(y + 112, y + 14, y + 92);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  labelTexCache.set(key, tex);
  return tex;
}

const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  transparent: true, opacity: 0, depthTest: true, depthWrite: false,
}));
labelSprite.scale.set(3.1, 1.55, 1);
labelSprite.visible = false;
scene.add(labelSprite);
let labelVisTarget = 0;
let labelFlip = false;

function setLabel(name, status, flip, front) {
  labelFlip = !!flip;
  // front=true (the star's call-to-action) renders over the rings; sphere
  // annotations keep depth testing so the scene occludes them naturally.
  labelSprite.material.depthTest = !front;
  labelSprite.renderOrder = front ? 10 : 0;
  labelSprite.material.map = labelTexture(name, status, body.classList.contains("night-mode"), labelFlip);
  labelSprite.material.needsUpdate = true;
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

// Soft sculptural lighting
scene.add(new THREE.AmbientLight(0xfff7e8, 0.35));
const hemi = new THREE.HemisphereLight(0xffffff, 0xd9cfb0, 0.75);
scene.add(hemi);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 10, 8);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xfff1d8, 0.5);
fillLight.position.set(-8, 3, -4);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xf1e4bf, 0.55);
rimLight.position.set(-2, -6, -8);
scene.add(rimLight);

function porcelainMat(color, roughness = 0.38) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: false });
}

// Central star — emissive support needed for the radiant white transition
const star = new THREE.Mesh(
  new THREE.SphereGeometry(STAR_RADIUS, 96, 96),
  new THREE.MeshStandardMaterial({
    color: PASTEL_STAR, roughness: 0.38, metalness: 0, flatShading: false,
    emissive: 0x000000, emissiveIntensity: 0,
  })
);
star.userData = { type: "star" };
scene.add(star);

// Orbit rings + planets (no spokes)
const orbits = [];

ORBITS.forEach((def) => {
  const pivot = new THREE.Group();
  pivot.rotation.set(def.tilt[0], def.tilt[1], def.tilt[2]);
  pivot.userData.baseTilt = [...def.tilt];
  scene.add(pivot);

  // Ring: tube radius compensated per orbit so all appear equal weight in 2D overhead view
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(def.radius, def.ringTube, 24, 256),
    porcelainMat(CREAM_DEEP, 0.35)
  );
  pivot.add(ring);

  // Rotator carries the planet around the ring axis (local Z)
  const rotator = new THREE.Group();
  rotator.rotation.z = def.phase;
  pivot.add(rotator);

  // Planet — no spoke
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(def.planetSize, 64, 64),
    porcelainMat(def.planetColor)
  );
  planet.position.x = def.radius;
  planet.userData = { type: "planet", def };
  rotator.add(planet);

  orbits.push({ def, pivot, rotator, ring, planet, angle: def.phase });
});

// Camera — 2D is overhead; Y=24 gives visible radius ≈9.2 which frames max Z semi-axis (8.5)
const CAM_3D  = new THREE.Vector3(0, 2.6, 14.5);
const CAM_2D  = new THREE.Vector3(0, 24, 0.001);
const LOOK_AT = new THREE.Vector3(0, 0, 0);

camera.position.copy(CAM_3D);
camera.lookAt(LOOK_AT);

// Zoom — FOV-based; 42 is the default. Only active in 3D mode.
const FOV_DEFAULT = 42;
const FOV_MIN     = 30;   // zooming in further crops the solar system
const FOV_MAX     = 75;
let targetFov     = FOV_DEFAULT;

const state = {
  mode: "3d",
  t: 0,
  target: 0,
  hoverStar: false,
  hoverPlanet: null,
  labelPlanet: null,
  labelStar: false,
  clock: new THREE.Clock(),
  expansionP1: 0,
  lsRevealP: 1,
};

let lsVW = window.innerWidth;
let lsVH = window.innerHeight;
let cachedCanvasRect = canvas.getBoundingClientRect();
let cachedScrollTotal = 0;

// Reduced-motion preference — gates camera parallax and shooting stars
const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Hover-capable fine pointer (mouse/trackpad) — gates the cinematic wheel
// system; touch devices scroll natively
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// Pointer-driven camera parallax — normalized viewport coords, lerped each frame
const camDrift = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener("pointermove", (e) => {
  camDrift.tx = (e.clientX / lsVW) * 2 - 1;
  camDrift.ty = (e.clientY / lsVH) * 2 - 1;
}, { passive: true });

// ── Hero — the brand dissolves on entry and the statements fade with it
const heroBrand      = document.getElementById("hero-brand");
const heroHalo       = document.getElementById("hero-halo");
const heroStatements = document.getElementById("hero-statements");

// Gooey visibility at fraction f (0 hidden → 1 settled); blur only when motion allowed
function applyGoo(el, f) {
  if (f <= 0.001) { el.style.opacity = "0"; el.style.filter = ""; return; }
  if (f >= 0.999) { el.style.opacity = "1"; el.style.filter = ""; return; }
  el.style.opacity = String(Math.pow(f, 0.4));
  el.style.filter  = motionOK ? `blur(${Math.min(6 / f - 6, 60)}px)` : "";
}

// ── Framing — the cosmos's starting zoom, and the statements around it ──────
// Phones in portrait start fully zoomed out; phones in landscape start with
// the solar system exactly as wide as the MULVIUM wordmark, first M to last.
// The statement and mission are then placed around the cosmos's measured
// bounds: beside it when there is room, above and below it otherwise.
const heroStatement = heroStatements.querySelector(".hero-statement");
const heroMission   = heroStatements.querySelector(".hero-mission");
const cosmosHint    = document.getElementById("cosmos-hint");
const fitCam = new THREE.PerspectiveCamera(FOV_DEFAULT, 1, 0.1, 200);
const fitPts = [];
ORBITS.forEach((def) => {
  const tilt = new THREE.Euler(...def.tilt);
  const r = def.radius;
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    fitPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0).applyEuler(tilt));
  }
});

// The cosmos's extent in normalized device coordinates at the default zoom.
// Every point scales about the centre by tan(fov/2), so one pass serves all.
function cosmosNdc(aspect) {
  fitCam.aspect = aspect;
  fitCam.updateProjectionMatrix();
  fitCam.position.copy(CAM_3D);
  fitCam.lookAt(LOOK_AT);
  fitCam.updateMatrixWorld();
  const b = { l: Infinity, r: -Infinity, t: -Infinity, b: Infinity }, v = new THREE.Vector3();
  for (const p of fitPts) {
    v.copy(p).project(fitCam);
    b.l = Math.min(b.l, v.x); b.r = Math.max(b.r, v.x);
    b.t = Math.max(b.t, v.y); b.b = Math.min(b.b, v.y);
  }
  return b;
}
const tanHalf = (fov) => Math.tan((fov * Math.PI) / 360);

// The wordmark's width from the left edge of its first M to the right edge
// of its last (letter-spacing trails each glyph, so the last one's is removed)
function brandWidth() {
  const node = heroBrand.firstChild;
  if (!node || !node.length) return 0;
  const range = document.createRange();
  range.setStart(node, 0); range.setEnd(node, 1);
  const first = range.getBoundingClientRect();
  range.setStart(node, node.length - 1); range.setEnd(node, node.length);
  const last = range.getBoundingClientRect();
  const spacing = parseFloat(getComputedStyle(heroBrand).letterSpacing) || 0;
  return last.right - spacing - first.left;
}

// The zoom each layout opens at (the wheel and pinch zoom from there)
function baseFov(w, h) {
  if (finePointer) return FOV_DEFAULT;
  if (h > w) return FOV_MAX;                                // phone, portrait
  const width = brandWidth();                               // phone, landscape
  if (!width) return FOV_DEFAULT;
  const b = cosmosNdc(w / h);
  const wDefault = ((b.r - b.l) / 2) * w;
  const fov = (360 / Math.PI) * Math.atan(tanHalf(FOV_DEFAULT) * wDefault / width);
  return Math.max(FOV_MIN, Math.min(FOV_MAX, fov));
}

let heroFramed = false;
function layoutHero() {
  const w = lastW || window.innerWidth, h = lastH || window.innerHeight;
  const fov = baseFov(w, h);
  if (state.mode === "3d") {
    targetFov = fov;
    if (!heroFramed) { camera.fov = fov; camera.updateProjectionMatrix(); } // open already framed
  }
  heroFramed = true;

  // The cosmos's bounds on screen at that zoom
  const b = cosmosNdc(w / h), k = tanHalf(FOV_DEFAULT) / tanHalf(fov);
  const L = ((1 + b.l * k) / 2) * w, T = ((1 - b.t * k) / 2) * h, B = ((1 - b.b * k) / 2) * h;
  const edge = Math.max(20, Math.min(88, w * 0.045));
  const gap  = Math.max(12, Math.min(28, w * 0.012));
  const col  = Math.min(360, L - edge - gap);
  const side = w >= h && col >= 150;
  const root = document.documentElement;
  root.dataset.heroLayout = side ? "side" : "stack";

  if (side) {
    root.style.setProperty("--hero-edge", `${edge}px`);
    root.style.setProperty("--hero-col", `${col}px`);
    root.style.setProperty("--hero-mid", `${(T + B) / 2}px`);
  } else {
    // Statement under the wordmark; mission under the cosmos, clear of the hint
    const vgap = Math.max(12, Math.min(22, h * 0.02));
    root.style.setProperty("--st-top", `${heroBrand.getBoundingClientRect().bottom + vgap}px`);
    const hintTop = cosmosHint.firstElementChild.getBoundingClientRect().top || h;
    const mh = heroMission.offsetHeight;
    root.style.setProperty("--mi-top", `${Math.max(0, Math.min(B + vgap, hintTop - mh - vgap))}px`);
  }
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutHero);

// The statement's words rise into place at their own speeds on the intro
{
  const text = heroStatement.textContent.trim();
  heroStatement.textContent = "";
  const spoken = document.createElement("span"); // read once, whole
  spoken.className = "hidden-text";
  spoken.textContent = text;
  heroStatement.append(spoken);
  const DUR = [1.05, 1.3, 0.95, 1.4, 1.15, 0.9, 1.35, 1.0, 1.25];
  text.split(/\s+/).forEach((word, i) => {
    const mask = document.createElement("span");
    mask.className = "hw";
    mask.setAttribute("aria-hidden", "true");
    const inner = document.createElement("span");
    inner.textContent = word;
    inner.style.setProperty("--d",   `${(0.08 * i + 0.05 * ((i * 7) % 3)).toFixed(2)}s`);
    inner.style.setProperty("--dur", `${DUR[i % DUR.length]}s`);
    mask.appendChild(inner);
    heroStatement.append(mask, " ");
  });
}

let lastW = 0, lastH = 0;
function resize() {
  lsVW = window.innerWidth;
  lsVH = window.innerHeight;
  cachedScrollTotal = expansionWrapper.offsetHeight - lsVH;
  cachedCanvasRect = canvas.getBoundingClientRect();
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w === lastW && h === lastH) return;
  lastW = w; lastH = h;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  layoutHero();
}
resize();
window.addEventListener("resize", resize);
// Layout is read only when it can have changed (the window, the canvas or the
// scroll wrapper resizing), never once a frame
if ("ResizeObserver" in window) {
  const layoutWatch = new ResizeObserver(() => resize());
  layoutWatch.observe(canvas);
  layoutWatch.observe(expansionWrapper);
}

let canvasOnScreen = true;
new IntersectionObserver(([e]) => { canvasOnScreen = e.isIntersecting; }).observe(canvas);

const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();
let pointerInside = false;

canvas.addEventListener("pointermove", (e) => {
  cachedCanvasRect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - cachedCanvasRect.left) / cachedCanvasRect.width)  * 2 - 1;
  pointer.y = -((e.clientY - cachedCanvasRect.top)  / cachedCanvasRect.height) * 2 + 1;
  pointerInside = true;
});

canvas.addEventListener("pointerleave", (e) => {
  if (e.pointerType === "touch") return; // touch: let the click handler fire first
  pointerInside = false;
  state.hoverStar = false;
  state.hoverPlanet = null;
  canvas.style.cursor = "default";
  // Label persists — only cleared when another sphere is hovered or 2D mode starts
});

// Touch: update pointer on tap so the click handler finds the right object via raycasting
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "touch") return;
  cachedCanvasRect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - cachedCanvasRect.left) / cachedCanvasRect.width)  * 2 - 1;
  pointer.y = -((e.clientY - cachedCanvasRect.top)  / cachedCanvasRect.height) * 2 + 1;
  pointerInside = true;
  updateHover();
});

canvas.addEventListener("click", () => {
  if (footerOpen) { closeFooter(); return; }
  if (state.mode === "3d") {
    if (state.hoverPlanet) coverAndNavigate(state.hoverPlanet.def.href);
    else if (state.hoverStar) goTo2D();
  } else if (state.mode === "2d") {
    if (state.hoverStar) fadeInLoadingScreen(() => snapTo3D());
    else if (state.hoverPlanet) coverAndNavigate(state.hoverPlanet.def.href);
  }
});

// ── Footer drawer — on the 3D landing, scrolling down brings up the site's
// footer navigation, the way scrolling reaches the bottom of any page; the
// cosmos rises with it. Scrolling back up (or tapping the cosmos) returns.
const siteFooter = document.getElementById("site-footer");
let footerOpen = false;
function setFooterHeight() {
  if (siteFooter) document.documentElement.style.setProperty("--sf-h", siteFooter.offsetHeight + "px");
}
function openFooter() {
  if (footerOpen || state.mode !== "3d" || lsActive || !body.classList.contains("cosmos-only")) return;
  setFooterHeight();
  footerOpen = true;
  body.classList.add("footer-open");
  labelVisTarget = 0;
}
function closeFooter() {
  if (!footerOpen) return;
  footerOpen = false;
  body.classList.remove("footer-open");
}
window.addEventListener("resize", setFooterHeight);
{
  // One gesture, one move: a burst of wheel events counts once
  let wheelLock = 0;
  window.addEventListener("wheel", (e) => {
    if (!body.classList.contains("cosmos-only") || e.ctrlKey) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock || Math.abs(e.deltaY) < 4) return;
    if (e.deltaY > 0 && !footerOpen) { openFooter(); wheelLock = now + 650; }
    else if (e.deltaY < 0 && footerOpen) { closeFooter(); wheelLock = now + 650; }
  }, { passive: false });

  let touchY = null, touchX = null;
  const onStart = (e) => {
    if (e.touches.length !== 1) { touchY = null; return; }
    touchY = e.touches[0].clientY; touchX = e.touches[0].clientX;
  };
  const onEnd = (e) => {
    if (touchY === null || !body.classList.contains("cosmos-only")) return;
    const dy = e.changedTouches[0].clientY - touchY, dx = e.changedTouches[0].clientX - touchX;
    touchY = null;
    if (Math.abs(dy) < 50 || Math.abs(dx) > Math.abs(dy)) return;
    if (dy < 0) openFooter(); else closeFooter();
  };
  canvas.addEventListener("touchstart", onStart, { passive: true });
  canvas.addEventListener("touchend", onEnd, { passive: true });
  if (siteFooter) {
    siteFooter.addEventListener("touchstart", onStart, { passive: true });
    siteFooter.addEventListener("touchend", onEnd, { passive: true });
  }

  window.addEventListener("keydown", (e) => {
    if (!body.classList.contains("cosmos-only")) return;
    if (["ArrowDown", "PageDown", "End"].includes(e.key)) { e.preventDefault(); openFooter(); }
    else if (["ArrowUp", "PageUp", "Home", "Escape"].includes(e.key)) { e.preventDefault(); closeFooter(); }
  });
}

// ── Loading screen ────────────────────────────────────────────────────────────
// Plays a nested-rectangle reveal sequence when navigating via top/footer nav.
// Five concentric frames animate up from the bottom: Musical → Pictorial →
// image-13 → Horticulture (images from the repo) → transparent knockout that
// shows the live Three.js canvas. The knockout expands to fill the viewport,
// seamlessly becoming the destination animation before the overlay fades away.
const loadingScreen = document.getElementById("loading-screen");
const lsF1 = document.getElementById("ls-f1");
const lsF2 = document.getElementById("ls-f2");
const lsF3 = document.getElementById("ls-f3");
const lsF4 = document.getElementById("ls-f4");
const lsBorder = document.getElementById("ls-border");
const lsF1img = lsF1.querySelector(".ls-img");
const lsF2img = lsF2.querySelector(".ls-img");
const lsF3img = lsF3.querySelector(".ls-img");
const lsF4img = lsF4.querySelector(".ls-img");
let lsRaf         = null;
let lsActive      = false;
let lsHoleVisible = false; // true once the canvas window hole first opens

// Sets a transparent canvas-window hole in the loading screen via a nonzero-
// winding clip-path: outer CW rectangle + inner CCW rectangle = hole.
// Works with hardware-accelerated WebGL canvases (unlike mix-blend-mode).
function lsSetHole(vw, vh, hW, hH, hCY) {
  if (hW < 2 || hH < 2) { loadingScreen.style.clipPath = ""; return; }
  const cx = vw / 2;
  const x1 = cx - hW / 2, y1 = hCY - hH / 2;
  const x2 = cx + hW / 2, y2 = hCY + hH / 2;
  // Outer CW: 0,0 → vw,0 → vw,vh → 0,vh → 0,0
  // Inner CCW: x1,y1 → x1,y2 → x2,y2 → x2,y1 → x1,y1  (opposite winding = hole)
  loadingScreen.style.clipPath =
    `polygon(0px 0px,${vw}px 0px,${vw}px ${vh}px,0px ${vh}px,0px 0px,` +
    `${x1}px ${y1}px,${x1}px ${y2}px,${x2}px ${y2}px,${x2}px ${y1}px,${x1}px ${y1}px)`;
}

function showLoadingScreen(onReady, duration, startOpaque) {
  if (lsActive) return;
  lsActive = true;
  lsHoleVisible = false;
  const dur = duration || 4000;
  if (lsRaf) { cancelAnimationFrame(lsRaf); lsRaf = null; }

  [lsF1, lsF2, lsF3, lsF4].forEach(f => {
    f.style.width = "0"; f.style.height = "0";
    f.style.transform = "translate(-50%, -50%)";
    f.style.visibility = "";
  });
  lsBorder.style.width = "0"; lsBorder.style.height = "0";
  lsBorder.style.transform = "translate(-50%, -50%)";
  lsBorder.style.visibility = "hidden";
  [lsF1img, lsF2img, lsF3img, lsF4img].forEach(f => { f.style.transform = "scale(1.2)"; });
  loadingScreen.style.clipPath  = "";
  loadingScreen.style.opacity   = startOpaque ? "1" : "0";
  loadingScreen.style.display   = "block";
  loadingScreen.style.pointerEvents = "all";
  loadingScreen.setAttribute("aria-hidden", "false");
  document.documentElement.classList.remove("ls-instant-cover");

  let readyCalled = false, t0 = null;

  function eCubicInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
  function eRise(t)     { return 1 - Math.pow(1 - t, 3); }
  function eSlit(t)     { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); } // expo ease-out: height reveal
  function eConverge(t) { return t * t * t * t; }
  function eExpand(t)   { return 1 - (1 - t) * (1 - t); } // quadratic ease-out: consistent velocity, no asymptotic tail
  function ph(t, a, b, efn) {
    return (efn || eCubicInOut)(Math.max(0, Math.min(1, (t - a) / (b - a))));
  }

  // cy_off is vertical pixel offset from centered position (positive = down).
  function setF(el, w, h, cy_off) {
    el.style.width     = w + "px";
    el.style.height    = h + "px";
    el.style.transform = `translate(-50%, calc(-50% + ${cy_off}px))`;
  }

  function setBorder(w, h, cy_off = 0) {
    lsBorder.style.visibility = "";
    lsBorder.style.width  = (w + 6) + "px";
    lsBorder.style.height = (h + 6) + "px";
    lsBorder.style.transform = `translate(-50%, calc(-50% + ${cy_off}px))`;
  }

  function lsCleanup() {
    state.lsRevealP = 1;
    // First reveal complete — play the hero title entrance over the cosmos
    body.classList.add("cosmos-intro");
    layoutHero();
    [lsF1, lsF2, lsF3, lsF4, lsBorder].forEach(f => {
      f.style.width = "0"; f.style.height = "0";
      f.style.transform = "translate(-50%, -50%)";
      f.style.visibility = "hidden";
    });
    [lsF1img, lsF2img, lsF3img, lsF4img].forEach(f => { f.style.transform = ""; });
    loadingScreen.style.opacity    = "0";
    loadingScreen.style.clipPath   = "";
    loadingScreen.style.display    = "none";
    loadingScreen.style.pointerEvents = "none";
    loadingScreen.setAttribute("aria-hidden", "true");
    lsActive = false;
    lsHoleVisible = false;
  }

  function tick(ts) {
    try {
      if (!t0) t0 = ts;
      const t = Math.min(1, (ts - t0) / dur);

      // Use cached viewport dimensions; updated by the resize handler on orientation change.
      const vw = lsVW;
      const vh = lsVH;
      const WIN_W = vw * 0.68, WIN_H = vh * 0.62;
      const F4_W  = vw * 0.70, F4_H  = vh * 0.635;
      const F3_W  = vw * 0.72, F3_H  = vh * 0.65;
      const F2_W  = vw * 0.76, F2_H  = vh * 0.68;
      const F1_W  = vw * 0.80, F1_H  = vh * 0.71;
      const EFF   = 0.92;
      const EWIN_W = WIN_W * EFF, EWIN_H = WIN_H * EFF;
      const EF4_W  = F4_W  * EFF, EF4_H  = F4_H  * EFF;
      const EF3_W  = F3_W  * EFF, EF3_H  = F3_H  * EFF;
      const EF2_W  = F2_W  * EFF, EF2_H  = F2_H  * EFF;
      const EF1_W  = F1_W  * EFF, EF1_H  = F1_H  * EFF;

      // Fire mode transition immediately when opaque, else after fade-in.
      if (!readyCalled && (startOpaque || t >= 0.08)) {
        readyCalled = true;
        try { if (onReady) onReady(); } catch (err) { console.error(err); }
      }

      // Fade the overlay out during Phase 3 so the asymptotic tail of the
      // expansion is invisible — prevents the near-full rectangle from looking frozen.
      const fadeIn  = startOpaque ? 1 : ph(t, 0, 0.08);
      const fadeOut = ph(t, 0.78, 1.0); // start fading while expansion is still visibly moving
      loadingScreen.style.opacity = String(fadeIn * (1 - fadeOut));

      if (startOpaque || t >= 0.08) {
        state.lsRevealP = ph(t, 0.10, 1.0);
      }

      // Slow directional drift — each image pans in its own direction across the
      // full animation, giving a sense of the camera moving through the photograph.
      // translate() before scale() keeps drift in screen-pixel space.
      const d1 = ph(t, 0.08, 1.0);
      const d2 = ph(t, 0.14, 1.0);
      const d3 = ph(t, 0.20, 1.0);
      const d4 = ph(t, 0.26, 1.0);
      lsF1img.style.transform = `translate(${-7 + 14 * d1}px, ${ 4 -  8 * d1}px) scale(${1.3 - 0.3 * ph(t, 0.08, 0.30, eRise)})`;
      lsF2img.style.transform = `translate(${ 6 - 12 * d2}px, ${-5 + 10 * d2}px) scale(${1.3 - 0.3 * ph(t, 0.14, 0.32, eRise)})`;
      lsF3img.style.transform = `translate(${ 5 - 10 * d3}px, ${ 6 - 11 * d3}px) scale(${1.3 - 0.3 * ph(t, 0.20, 0.34, eRise)})`;
      lsF4img.style.transform = `translate(${-5 + 10 * d4}px, ${-7 + 14 * d4}px) scale(${1.3 - 0.3 * ph(t, 0.26, 0.38, eRise)})`;

      // Group rises from below — cubic ease-out locks into position.
      const holeCY = vh / 2 + vh * 0.5 * (1 - ph(t, 0.06, 0.28, eRise));
      const cy_off = holeCY - vh / 2;

      if (t < 0.54) {
        // ── Phase 1: Each frame opens as a slit — width snaps, height reveals ──
        // Musical (lsF1) first, Pictorial (lsF2) second, image(13) (lsF3) third,
        // Horticulture (lsF4) fourth. Width: fast cubic snap. Height: expo ease-out.
        const f1w = ph(t, 0.08, 0.14, eRise);
        const f2w = ph(t, 0.14, 0.20, eRise);
        const f3w = ph(t, 0.20, 0.26, eRise);
        const f4w = ph(t, 0.26, 0.32, eRise);

        const f1h = ph(t, 0.08, 0.32, eSlit);
        const f2h = ph(t, 0.14, 0.38, eSlit);
        const f3h = ph(t, 0.20, 0.44, eSlit);
        const f4h = ph(t, 0.26, 0.46, eSlit);

        if (t >= 0.08) setF(lsF1, EF1_W * f1w, Math.max(3, EF1_H * f1h), cy_off);
        if (t >= 0.14) setF(lsF2, EF2_W * f2w, Math.max(3, EF2_H * f2h), cy_off);
        if (t >= 0.20) setF(lsF3, EF3_W * f3w, Math.max(3, EF3_H * f3h), cy_off);
        if (t >= 0.26) setF(lsF4, EF4_W * f4w, Math.max(3, EF4_H * f4h), cy_off);

        // 5th rectangle — canvas hole — also opens as a slit.
        if (t >= 0.30) {
          lsHoleVisible = true;
          const hw = ph(t, 0.30, 0.36, eRise);
          const hh = ph(t, 0.30, 0.48, eRise); // cubic ease-out: smooth reveal, no expo hang
          const holeW = EWIN_W * hw;
          const holeH = Math.max(3, EWIN_H * hh);
          lsSetHole(vw, vh, holeW, holeH, holeCY);
          setBorder(holeW, holeH, cy_off);
        } else {
          loadingScreen.style.clipPath = "";
          lsBorder.style.width = "0"; lsBorder.style.height = "0";
        }
        // t 0.48→0.54: all five fully open — still moment before the pull.

      } else if (t < 0.67) {
        // ── Phase 2: Quartic ease-in converge — barely moves then slams in ────
        const cp = ph(t, 0.54, 0.67, eConverge);
        setF(lsF1, EF1_W + (EWIN_W - EF1_W) * cp, EF1_H + (EWIN_H - EF1_H) * cp, 0);
        setF(lsF2, EF2_W + (EWIN_W - EF2_W) * cp, EF2_H + (EWIN_H - EF2_H) * cp, 0);
        setF(lsF3, EF3_W + (EWIN_W - EF3_W) * cp, EF3_H + (EWIN_H - EF3_H) * cp, 0);
        setF(lsF4, EF4_W + (EWIN_W - EF4_W) * cp, EF4_H + (EWIN_H - EF4_H) * cp, 0);
        lsSetHole(vw, vh, EWIN_W, EWIN_H, vh / 2);
        setBorder(EWIN_W, EWIN_H);

      } else {
        // ── Phase 3: Expo ease-out expansion completes at t=0.90; the overlay
        // fades out from t=0.82 so the asymptotic tail is never visible.
        const ep = ph(t, 0.67, 0.90, eExpand);
        const hw = EWIN_W + (vw    - EWIN_W) * ep;
        const hh = EWIN_H + (vh    - EWIN_H) * ep;
        const fw = Math.min(hw, WIN_W);
        const fh = Math.min(hh, WIN_H);
        setF(lsF1, fw, fh, 0);
        setF(lsF2, fw, fh, 0);
        setF(lsF3, fw, fh, 0);
        setF(lsF4, fw, fh, 0);
        lsSetHole(vw, vh, hw, hh, vh / 2);
        setBorder(hw, hh);
      }

      if (t < 1) {
        lsRaf = requestAnimationFrame(tick);
      } else {
        lsCleanup();
      }
    } catch (err) {
      console.error("Loading screen animation error:", err);
      lsCleanup();
    }
  }

  lsRaf = requestAnimationFrame(tick);
}

canvas.setAttribute("tabindex", "0");
canvas.setAttribute("role", "application");
canvas.setAttribute("aria-label", "Mulvium cosmos. Click or tap a planet to explore. Click or tap the center to enter.");
if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) {
  const hint = document.querySelector("#cosmos-hint p");
  if (hint) hint.textContent = "Tap a sphere.";
}
canvas.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && state.mode === "3d") { goTo2D(); e.preventDefault(); }
});

// Zoom (3D mode only) answers zoom gestures, never plain scrolling: a trackpad
// pinch (and ctrl/⌘ + wheel) arrives as a wheel event with ctrlKey set; Safari
// sends gesture events instead. Plain scrolling reveals the footer below.
const zoomBy = (deg) => { targetFov = Math.max(FOV_MIN, Math.min(FOV_MAX, targetFov + deg)); };
canvas.addEventListener("wheel", (e) => {
  if (state.mode !== "3d" || !e.ctrlKey) return;
  e.preventDefault();
  zoomBy(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 10) * 0.35);
}, { passive: false });
{
  let gestureFov = null;
  canvas.addEventListener("gesturestart", (e) => { if (state.mode === "3d") { e.preventDefault(); gestureFov = targetFov; } });
  canvas.addEventListener("gesturechange", (e) => {
    if (gestureFov === null) return;
    e.preventDefault();
    targetFov = Math.max(FOV_MIN, Math.min(FOV_MAX, gestureFov / e.scale));
  });
  canvas.addEventListener("gestureend", () => { gestureFov = null; });
}

// Pinch-to-zoom (3D mode only)
{
  let pinchDist = null;
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist = Math.hypot(dx, dy);
    }
  }, { passive: true });
  canvas.addEventListener("touchmove", (e) => {
    if (state.mode !== "3d" || e.touches.length !== 2 || pinchDist === null) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const newDist = Math.hypot(dx, dy);
    const delta   = pinchDist - newDist;
    targetFov     = Math.max(FOV_MIN, Math.min(FOV_MAX, targetFov + delta * 0.08));
    pinchDist     = newDist;
  }, { passive: true });
  canvas.addEventListener("touchend", () => { pinchDist = null; }, { passive: true });
}

function goTo2D() {
  if (state.mode !== "3d") return;
  closeFooter();
  targetFov = FOV_DEFAULT;
  state.mode = "transitioning";
  state.target = 1;
  navbar.classList.add("visible");
  navbar.setAttribute("aria-hidden", "false");
  body.classList.remove("cosmos-only");
  body.classList.add("mode-2d");
  labelVisTarget = 0;
  state.labelPlanet = null;
  state.labelStar = false;
}

function goTo3D() {
  if (state.mode !== "2d") return;
  targetFov = baseFov(lastW, lastH);
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  resetCinematicScroll();
  state.mode = "transitioning";
  state.target = 0;
  body.classList.add("cosmos-only");
  body.classList.remove("mode-2d", "expansion-active", "night-mode");
  document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
  state.expansionP1 = 0;
  state.lsRevealP    = 1;
  bgColor.copy(PAPER_COLOR);
}

// Instantly snaps all state to the 3D opening view from any mode.
// Called under cover of the loading screen so the snap is never visible.
function snapTo3D() {
  targetFov = camera.fov = baseFov(lastW, lastH); // under cover: no visible zoom
  camera.updateProjectionMatrix();
  // Rewind the hero (wordmark, statement, mission) so its entrance plays
  // again when the loading screen lifts, instead of simply being there
  body.classList.add("hero-reset");
  body.classList.remove("cosmos-intro");
  void body.offsetWidth;
  body.classList.remove("hero-reset");
  state.t         = 0;
  state.target    = 0;
  state.mode      = "3d";

  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  resetCinematicScroll();
  body.classList.add("cosmos-only");
  body.classList.remove("mode-2d", "expansion-active", "night-mode");
  document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
  navbar.classList.remove("visible");
  navbar.setAttribute("aria-hidden", "true");
  labelVisTarget = 0;
  state.labelPlanet  = null;
  state.labelStar    = false;
  state.expansionP1  = 0;
  state.lsRevealP    = 1;
  bgColor.copy(PAPER_COLOR);
}

// Instantly sets the overhead orbit view (the 2D state), skipping the 3D
// landing. Used under cover of the loading screen when arriving at
// index.html#orbit, i.e. from "Dear Leader" on another page.
function jumpTo2D() {
  closeFooter();
  targetFov = camera.fov = FOV_DEFAULT;
  camera.updateProjectionMatrix();
  state.t      = 1;
  state.target = 1;
  state.mode   = "2d";
  navbar.classList.add("visible");
  navbar.setAttribute("aria-hidden", "false");
  body.classList.remove("cosmos-only");
  body.classList.add("mode-2d", "expansion-active");
  labelVisTarget = 0;
  state.labelPlanet = null;
  state.labelStar   = false;
  window.scrollTo(0, 0);
  resetCinematicScroll();
}

// "Dear Leader": the overhead orbit view, wherever the visitor is on the page
function goToOrbit() {
  if (state.mode === "3d") { goTo2D(); return; }
  document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
  resetCinematicScroll();
  window.scrollTo({ top: 0, behavior: motionOK ? "smooth" : "auto" });
}

// Fade the current page content out to white, then start the loading animation.
// This is the "fade-out before the loading screen" — the overlay fades IN
// (covering the page) which from the viewer's perspective is a fade-out of
// whatever was visible (the night sky, the letter, etc.).
function fadeInLoadingScreen(onReady) {
  if (lsActive) return;
  lsActive = true;
  [lsF1, lsF2, lsF3, lsF4, lsBorder].forEach(f => {
    f.style.width = "0"; f.style.height = "0"; f.style.visibility = "hidden";
  });
  loadingScreen.style.clipPath      = "";
  loadingScreen.style.transition    = "";
  loadingScreen.style.opacity       = "0";
  loadingScreen.style.display       = "block";
  loadingScreen.style.pointerEvents = "all";
  loadingScreen.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      loadingScreen.style.transition = "opacity 0.25s ease";
      loadingScreen.style.opacity    = "1";
      setTimeout(() => {
        loadingScreen.style.transition = "";
        lsActive = false;
        showLoadingScreen(onReady, 5000, true);
      }, 250);
    });
  });
}

brandLink.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.reload();
});

// "Dear Leader" links (navbar and footer) open the overhead orbit view
document.querySelectorAll("#home-link, [data-orbit-link]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    navbar.classList.remove("menu-open");
    goToOrbit();
  });
});

// Fade to white before navigating to any sub-page from index.html.
// Uses the existing #loading-screen overlay so the WebGL canvas is covered
// cleanly (avoids GPU-compositing issues with body opacity on canvas elements).
function coverAndNavigate(href) {
  if (lsActive) { window.location.href = href; return; }
  // visibility:hidden suppresses rendering entirely — prevents image frames
  // from showing at residual sizes AND prevents #ls-border's CSS border from
  // collapsing to a visible 6 px square when width/height are zeroed.
  [lsF1, lsF2, lsF3, lsF4, lsBorder].forEach(f => {
    f.style.width = "0"; f.style.height = "0"; f.style.visibility = "hidden";
  });
  loadingScreen.style.transition = ""; // clear any leftover transition
  loadingScreen.style.clipPath = "";
  loadingScreen.style.opacity = "0";
  loadingScreen.style.display = "block";
  loadingScreen.style.pointerEvents = "all";
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      loadingScreen.style.transition = "opacity 0.35s ease";
      loadingScreen.style.opacity = "1";
      setTimeout(function () {
        loadingScreen.style.transition = "";
        window.location.href = href;
      }, 350);
    });
  });
}

document.addEventListener("click", (ev) => {
  const link = ev.target.closest("a[href]");
  if (!link || link.target === "_blank") return;
  const href = link.getAttribute("href");
  if (!href) return;
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;       // external
    if (url.pathname === location.pathname) return;   // same page (brand handled elsewhere)
    ev.preventDefault();
    coverAndNavigate(href);
  } catch (e) {}
});

document.querySelectorAll(".nav-item.has-dropdown").forEach((item) => {
  const trigger = item.querySelector(".nav-trigger");
  let leaveTimer = null;
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    clearTimeout(leaveTimer);
    const wasOpen = item.classList.contains("open");
    document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
    if (!wasOpen) { item.classList.add("open"); trigger.setAttribute("aria-expanded", "true"); }
    else           { trigger.setAttribute("aria-expanded", "false"); }
  });
  item.addEventListener("mouseenter", () => {
    clearTimeout(leaveTimer);
    if (window.matchMedia("(hover: hover)").matches) {
      document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
      item.classList.add("open");
    }
  });
  item.addEventListener("mouseleave", () => {
    leaveTimer = setTimeout(() => {
      item.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }, 150);
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".nav-item.open").forEach((el) => {
    el.classList.remove("open");
    el.querySelector(".nav-trigger").setAttribute("aria-expanded", "false");
  });
  // Close mobile menu when clicking outside the navbar
  if (navbar && navbar.classList.contains("menu-open")) {
    const bg = navbar.querySelector(".nav-burger");
    navbar.classList.remove("menu-open");
    if (bg) { bg.setAttribute("aria-expanded", "false"); bg.setAttribute("aria-label", "Open menu"); }
  }
});

// Mobile burger toggle
{ const burger = navbar?.querySelector(".nav-burger");
  if (burger) {
    burger.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = navbar.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }
}


function lerp(a, b, t) { return a + (b - a) * t; }
function lerpVec(a, b, t, out) {
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.z = a.z + (b.z - a.z) * t;
  return out;
}
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

const tmpVec   = new THREE.Vector3();
const worldPos = new THREE.Vector3();

function updateHover() {
  const in2DMode  = state.mode === "2d";
  if (!pointerInside || footerOpen || (state.mode !== "3d" && !in2DMode)) {
    state.hoverStar = false;
    state.hoverPlanet = null;
    canvas.style.cursor = "default";
    return;
  }

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([star, ...orbits.map((o) => o.planet)], true);

  if (hits.length > 0) {
    const obj = hits[0].object;
    state.hoverStar   = obj.userData.type === "star";
    const hitPlanet   = obj.userData.type === "planet" ? orbits.find((o) => o.planet === obj) : null;
    state.hoverPlanet = hitPlanet && hitPlanet.def.href ? hitPlanet : null;
    canvas.style.cursor = (state.hoverPlanet || state.hoverStar) ? "pointer" : "default";

    if (in2DMode) {
      if (state.hoverPlanet) {
        state.labelPlanet = state.hoverPlanet;
        state.labelStar   = false;
        setLabel(state.hoverPlanet.def.name, state.hoverPlanet.def.status);
        labelVisTarget = 1;
      } else {
        labelVisTarget = 0;
      }
    } else if (hitPlanet) {
      state.labelPlanet = hitPlanet;
      state.labelStar   = false;
      // High planets get their label below them, clear of the hero halo
      hitPlanet.planet.getWorldPosition(worldPos);
      setLabel(hitPlanet.def.name, hitPlanet.def.status, worldPos.y > 0.9);
      labelVisTarget = 1;
    } else if (state.hoverStar) {
      state.labelPlanet = null;
      state.labelStar   = true;
      setLabel("Enter Mulvium", "", true, true);
      labelVisTarget = 1;
    }
  } else {
    state.hoverStar   = false;
    state.hoverPlanet = null;
    canvas.style.cursor = "default";
    // Label stays — pinned to last hovered sphere
  }
}

// Tracks the annotation sprite to its sphere and eases its opacity. Runs in
// animate(); the sprite's depthTest handles occlusion by rings and spheres.
function trackLabel(dt) {
  let target = labelVisTarget;
  if (lsActive) target = 0;
  const cur = labelSprite.material.opacity;
  const nxt = cur + (target - cur) * (1 - Math.pow(0.0005, dt));
  labelSprite.material.opacity = nxt;
  labelSprite.visible = nxt > 0.02;
  if (!labelSprite.visible) return;
  let anchorObj = null, r = 0.42;
  if (state.labelPlanet) {
    anchorObj = state.labelPlanet.planet;
    r = state.labelPlanet.def.planetSize;
  } else if (state.labelStar) {
    anchorObj = star;
    r = STAR_RADIUS * star.scale.x;
  }
  if (anchorObj) {
    anchorObj.getWorldPosition(worldPos);
    labelSprite.position.set(worldPos.x, worldPos.y + (labelFlip ? -(r + 1.0) : r + 1.0), worldPos.z);
  }
}

// ---------- Animation loop ----------
function animate() {
  const dt       = Math.min(state.clock.getDelta(), 0.05);
  const eased    = easeInOut(state.t);
  const p1e      = easeInOut(state.expansionP1);

  // Constant circular orbiting
  orbits.forEach((o) => {
    o.angle += o.def.speed * dt;
    o.rotator.rotation.z = o.angle;
    o.planet.rotation.y += 0.08 * dt;
  });

  // 3D↔2D tilt/scale transition, then scale-out during expansion
  const revealMul = lerp(7.0, 1.0, easeInOut(state.lsRevealP));
  orbits.forEach((o) => {
    const [rx, ry, rz] = o.pivot.userData.baseTilt;
    const expF          = 1 + easeInOut(state.expansionP1) * 10;
    const expansionFade = 1 - easeInOut(state.expansionP1);
    const isExpanding   = state.expansionP1 > 0;

    o.pivot.rotation.x = lerp(rx, Math.PI / 2, eased);
    o.pivot.rotation.y = lerp(ry, 0, eased);
    o.pivot.rotation.z = lerp(rz, 0, eased);
    const s  = lerp(1, o.def.radius2D / o.def.radius, eased);
    const ex = lerp(1, o.def.ellipseX,                eased);
    o.pivot.scale.set(s * ex * expF * revealMul, s * expF * revealMul, s * expF * revealMul);

    // Rings and planets stay opaque until the expansion fades them out
    for (const m of [o.ring.material, o.planet.material]) {
      m.opacity     = expansionFade;
      m.transparent = isExpanding;
    }

    // On wide viewports (mobile landscape / tablet) the camera frustum is
    // broad enough that innermost orbits remain in frame long after expansion
    // begins. Opacity alone is not enough — near-zero transparent geometry can
    // still produce rendering artefacts against the dark night sky.
    // Fully suppress draw calls once the fade is essentially complete.
    const fullyFaded = isExpanding && expansionFade < 0.02;
    o.ring.visible   = !fullyFaded;
    o.planet.visible = !fullyFaded;
  });

  // Star: shrinks as expansion progresses, then drifts to a flower centre once tiny
  const pulse      = 1 + Math.sin(performance.now() * 0.0011) * 0.01;
  const starShrink = lerp(1, 0.04, p1e);
  const starTarget = (state.hoverStar && (state.mode === "3d" || state.mode === "2d") ? 1.1 : pulse) * starShrink;
  star.scale.lerp(tmpVec.set(starTarget, starTarget, starTarget), 1 - Math.pow(0.0005, dt));

  // Center star stays at rose origin (0,0,0) — it becomes the heart of the rose
  star.position.set(0, 0, 0);

  // Color: pastel cream → plain white; keep emissive very faint so it blends with the field
  star.material.color.copy(PASTEL_STAR_COLOR).lerp(WHITE_COLOR, p1e);
  star.material.emissive.copy(BLACK_COLOR).lerp(WHITE_COLOR, p1e);
  star.material.emissiveIntensity = p1e * 0.2;
  star.material.roughness = lerp(0.38, 0.2, p1e);

  orbits.forEach((o) => {
    const target = state.hoverPlanet === o && (state.mode === "3d" || state.mode === "2d") ? 1.18 : 1;
    o.planet.scale.lerp(tmpVec.set(target, target, target), 1 - Math.pow(0.001, dt));
  });

  // 3D↔2D transition
  if (state.mode === "transitioning") {
    const dir = state.target > state.t ? 1 : -1;
    state.t += dir * dt * 0.85;
    if ((dir === 1 && state.t >= 1) || (dir === -1 && state.t <= 0)) {
      state.t    = state.target;
      state.mode = state.target === 1 ? "2d" : "3d";
      if (state.mode === "2d") {
        body.classList.add("expansion-active");
      } else {
        navbar.classList.remove("visible");
        navbar.setAttribute("aria-hidden", "true");
      }
    }
  }

  // Camera: blend 3D→2D
  lerpVec(CAM_3D, CAM_2D, eased, camera.position);

  // Pointer parallax — gentle camera drift for depth in 3D, fully off in the
  // overhead 2D/expansion view so the scroll-driven framing stays exact.
  if (motionOK) {
    const k = 1 - Math.pow(0.02, dt);
    camDrift.x += (camDrift.tx - camDrift.x) * k;
    camDrift.y += (camDrift.ty - camDrift.y) * k;
    const amp = 0.5 * (1 - eased);
    camera.position.x += camDrift.x * amp;
    camera.position.y += -camDrift.y * amp * 0.55;
  }
  camera.lookAt(LOOK_AT);

  // Zoom: smoothly lerp FOV toward target (in 3D, and while moving to or from 2D)
  if ((state.mode === "3d" || state.mode === "transitioning") && Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov = camera.fov + (targetFov - camera.fov) * 0.12;
    camera.updateProjectionMatrix();
  }

  // Expansion: background fades from paper to #060412; star-field fades in
  bgColor.copy(PAPER_COLOR).lerp(NIGHT_COLOR, p1e);
  skyStarMat.uniforms.uTime.value    = performance.now() * 0.001;
  skyStarMat.uniforms.uOpacity.value = p1e;

  // Shooting stars — spawn occasionally once the night sky is mostly in
  if (motionOK && p1e > 0.55) {
    meteorTimer -= dt;
    if (meteorTimer <= 0) {
      spawnMeteor();
      meteorTimer = 3.5 + Math.random() * 6;
    }
  }
  meteors.forEach((m) => {
    if (m.t >= 1) {
      if (m.mesh.visible) { m.mesh.visible = false; m.mesh.material.opacity = 0; }
      return;
    }
    m.t += dt / m.dur;
    m.mesh.position.x += m.dirX * m.speed * dt;
    m.mesh.position.z += m.dirZ * m.speed * dt;
    m.mesh.material.opacity = Math.sin(Math.PI * Math.min(1, m.t)) * 0.85 * p1e;
  });

  // Keep navbar and nav-cap background in exact sync with the canvas lerp
  { const _r = (a, b) => Math.round(a + (b - a) * p1e);
    if (navbar) navbar.style.backgroundColor =
      `rgba(${_r(255,6)},${_r(255,4)},${_r(255,18)},${(0.86+0.02*p1e).toFixed(3)})`;
    if (navCap) navCap.style.backgroundColor =
      `rgb(${_r(236,6)},${_r(234,4)},${_r(229,18)})`; }

  // ── Hero choreography ───────────────────────────────────────────────────────
  // MULVIUM dissolves over the first half of the 3D→2D camera transition, and
  // the statement and mission fade out with it.
  {
    const introOn  = body.classList.contains("cosmos-intro") ? 1 : 0;
    const brandVis = Math.max(0, 1 - state.t * 2) * introOn;

    applyGoo(heroBrand, brandVis);
    heroStatements.style.opacity = Math.pow(brandVis, 0.6).toFixed(3);
    heroHalo.style.opacity       = String((1 - p1e) * introOn);
  }

  updateHover();
  trackLabel(dt);

  // Skip the GPU render while the loading screen fully covers the canvas (hole
  // not open yet) or the canvas is scrolled out of view. All scene state still
  // updates, so the 3D world is in the right place when it is seen again.
  if ((!lsActive || lsHoleVisible) && canvasOnScreen) renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// ---------- Expansion scroll sequence ----------
function updateExpansionScroll() {
  if (!body.classList.contains("expansion-active")) return;
  if (cachedScrollTotal <= 0) return;
  // Rings expand, star goes radiant, night sky fades in — completed over the
  // first ~half-viewport of scroll, just before the letter rises into view
  const ramp = Math.max(1, Math.min(cachedScrollTotal, 480));
  state.expansionP1 = Math.max(0, Math.min(1, window.scrollY / ramp));

  // Wait until background is halfway dark before flipping night-mode text colours
  if (state.expansionP1 >= 0.5) {
    body.classList.add("night-mode");
  } else {
    body.classList.remove("night-mode");
  }
}


// ── Scroll reveal — the letter and footer rise in as they enter view ──
{
  const rvSelectors = [
    "#letter-section .letter-body > *",
    "#letter-section .letter-close",
    "#site-footer .footer-copy",
  ];
  const rvEls = document.querySelectorAll(rvSelectors.join(", "));
  rvEls.forEach((el) => el.classList.add("rv"));
  const rvObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      // In cosmos mode the page content sits behind the fixed canvas at the
      // top of the document — ignore those phantom intersections so reveals
      // still play when the content is genuinely scrolled into view later.
      if (en.isIntersecting && !body.classList.contains("cosmos-only")) {
        en.target.classList.add("rv-in");
        rvObserver.unobserve(en.target);
      }
    });
  }, { threshold: 0.06, rootMargin: "0px 0px -6% 0px" });
  rvEls.forEach((el) => rvObserver.observe(el));
}

window.addEventListener("scroll", () => {
  if (body.classList.contains("expansion-active")) updateExpansionScroll();
}, { passive: true });

window.addEventListener("resize", () => {
  if (body.classList.contains("expansion-active")) updateExpansionScroll();
});

// Cinematic scroll — intercept wheel events and apply smooth inertia
// resetCinematicScroll is called by mode transitions (snapTo3D, goTo3D, …)
// after their programmatic window.scrollTo: it cancels any in-flight inertia
// so a stale scrollTarget can't drag the page back away from the top.
let resetCinematicScroll = () => {};
if (finePointer) {
  let scrollTarget = 0;
  let scrollRafId  = null;

  resetCinematicScroll = () => {
    if (scrollRafId) { cancelAnimationFrame(scrollRafId); scrollRafId = null; }
    scrollTarget = window.scrollY;
  };

  function cinematicStep() {
    const cur  = window.scrollY;
    const diff = scrollTarget - cur;
    if (Math.abs(diff) < 0.5) {
      window.scrollTo(0, scrollTarget);
      scrollRafId = null;
      return;
    }
    window.scrollBy(0, diff * 0.10);
    scrollRafId = requestAnimationFrame(cinematicStep);
  }

  window.addEventListener("wheel", (e) => {
    // Don't intercept when the 3D canvas has focus (canvas wheel = zoom)
    if (body.classList.contains("cosmos-only")) return;
    e.preventDefault();
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    scrollTarget    = Math.max(0, Math.min(maxScroll, scrollTarget + e.deltaY * 1.6));
    if (!scrollRafId) scrollRafId = requestAnimationFrame(cinematicStep);
  }, { passive: false });

  // Keep scrollTarget in sync when scrolled by other means (anchor links, etc.)
  window.addEventListener("scroll", () => {
    if (!scrollRafId) scrollTarget = window.scrollY;
  }, { passive: true });
}

animate();

// When arriving from a sub-page (sessionStorage flag set by page-transition.js),
// play the full loading screen animation so the canvas is revealed through the
// same frame-sequence the user already saw start on the previous page.
// The canvas background is white on load, so the overlay fade-in (t 0→0.10)
// is invisible — both are #ffffff until the frames appear.
{
  const _entering = sessionStorage.getItem("ls-entering");
  if (_entering) {
    sessionStorage.removeItem("ls-entering");
  }
  const _orbit = window.location.hash === "#orbit";
  if (_orbit) history.replaceState(null, "", window.location.pathname);
  showLoadingScreen(() => { if (_orbit) jumpTo2D(); }, _entering ? 5000 : 4000, true);
}

// When the page is restored from the browser back-forward cache the WebGL
// context may have been lost. Reload to reinitialise Three.js cleanly.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
});

// Discard accumulated clock time so the first frame after a tab-switch or
// page restore doesn't produce a massive dt spike.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) state.clock.getDelta();
});

