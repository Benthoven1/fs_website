// oak.js — the Oak page scene.
// Act 1 (on load): Oak's pink planet sits at the centre, then becomes an acorn
// and a rosette of oak leaves unfurls around it.
// Act 2 (on scroll): the camera pulls back until the acorn is one of many on a
// full oak tree, standing in a circular esplanade whose paving rings echo the
// orbits of the home page. Paper-coloured fog hides the tree at first and
// lifts as the camera retreats.
import * as THREE from "three";
import { scrollCue } from "./scroll-cue.js";

const canvas = document.getElementById("oak-canvas");
if (!canvas) throw new Error("oak: #oak-canvas not found");

const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Palette — the planet and porcelain tones mirror js/main.js
const PAPER        = 0xeceae5;
const PASTEL_OAK   = 0xe0b8c8; // Oak's planet on the home page
const ACORN_NUT    = 0xd6b08a;
const ACORN_CAP    = 0xa98e62;
const BARK         = 0xa6917a;
const CREAM_DEEP   = 0xcdbe96;
const STONE        = 0xe4ddcf;
const STONE_DEEP   = 0xd8cebb;
const LAWN         = 0xcddcb9;
const LEAF_TONES   = [0xb7cda0, 0xa9c295, 0xc4ddb8, 0x9fb98b, 0xbfd3a6];

// ── Renderer, scene, lights (same sculptural lighting as the home cosmos) ────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);
scene.fog = new THREE.Fog(PAPER, 8, 10);

const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 900);

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

function porcelain(color, roughness = 0.38, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
}

// Deterministic randomness so the tree is the same on every visit
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260930);
const rr = (a, b) => a + (b - a) * rand();
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const smooth = (a, b, t) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };

// ── Geometry builders ─────────────────────────────────────────────────────────

// An acorn nut from a sphere of radius 0.5: taller, widest just under the cap,
// tapering to a small point at the bottom. Keeps the sphere's topology so the
// planet can morph into it.
const NUT_R = 0.5;
const ACORN_IN_TREE = 0.6; // acorn size among the crown's leaves
function acornPoint(x, y, z, out) {
  const t = y / NUT_R;                              // -1 (bottom) … 1 (top)
  const radial = Math.hypot(x, z);
  const s = Math.sqrt(Math.max(0, 1 - t * t)) * (0.8 + 0.2 * t) * 1.02;
  const k = radial > 1e-6 ? (NUT_R * s) / radial : 0;
  const tip = t < -0.7 ? 0.07 * smooth(-0.7, -1, t) : 0;
  return out.set(x * k, 0.64 * t - tip, z * k);
}

function nutGeometry(widthSegs, heightSegs, withMorph) {
  const g = new THREE.SphereGeometry(NUT_R, widthSegs, heightSegs);
  const p = g.attributes.position;
  const target = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    acornPoint(p.getX(i), p.getY(i), p.getZ(i), v);
    target[i * 3] = v.x; target[i * 3 + 1] = v.y; target[i * 3 + 2] = v.z;
  }
  const shaped = new THREE.BufferGeometry();
  shaped.setAttribute("position", new THREE.BufferAttribute(target, 3));
  shaped.setIndex(g.index);
  shaped.computeVertexNormals();
  if (!withMorph) return shaped;
  g.morphAttributes.position = [shaped.attributes.position];
  g.morphAttributes.normal = [shaped.attributes.normal];
  return g;
}

// The acorn's cup: a shallow dome of knobbly scales, rim at y = 0
function capGeometry(widthSegs, heightSegs) {
  const R = 0.5;
  const g = new THREE.SphereGeometry(R, widthSegs, heightSegs, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const polar = Math.acos(Math.min(1, v.y / R));
    const az = Math.atan2(v.z, v.x);
    const bump = 0.024 * (0.5 + 0.5 * Math.sin(az * 18 + polar * 26)) * (0.5 + 0.5 * Math.sin(az * 18 - polar * 26));
    v.multiplyScalar((R + bump) / R);
    v.y *= 0.86;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// A lobed oak leaf as a bendable grid: local +y runs base → tip, the face
// looks down +z. Rounded lobes come from the width profile; the blade cups
// slightly and creases along the midrib.
function leafGeometry(segU, segV, L = 1.15, W = 0.4) {
  const width = (u) => {
    if (u < 0.07) return 0.022;                                     // petiole
    const e = Math.pow(Math.sin(Math.PI * Math.pow((u - 0.07) / 0.93, 0.85)), 0.7) * (0.62 + 0.45 * u);
    const lobes = 0.6 + 0.4 * Math.pow(Math.abs(Math.sin(Math.PI * (u * 4.6 + 0.15))), 0.55);
    return Math.max(0.022, W * e * (u > 0.9 ? 1 : lobes));
  };
  const pos = [], idx = [];
  for (let i = 0; i <= segU; i++) {
    const u = i / segU, w = width(u);
    for (let j = 0; j <= segV; j++) {
      const v = -1 + (2 * j) / segV;
      const x = v * w;
      const z = 0.55 * x * x + 0.1 * Math.sin(Math.PI * u) - 0.025 * Math.pow(1 - Math.abs(v), 6);
      pos.push(x, u * L, z);
    }
  }
  const row = segV + 1;
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Tapered tubes along curves, accumulated into one geometry (all the wood)
function woodBuilder() {
  const pos = [], nor = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  return {
    add(curve, r0, r1, segs, radial) {
      const frames = curve.computeFrenetFrames(segs, false);
      const base = pos.length / 3;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        curve.getPointAt(t, P);
        const r = lerp(r0, r1, Math.pow(t, 0.9));
        for (let j = 0; j <= radial; j++) {
          const a = (j / radial) * Math.PI * 2;
          N.copy(frames.normals[i]).multiplyScalar(-Math.cos(a))
            .addScaledVector(frames.binormals[i], Math.sin(a)).normalize();
          pos.push(P.x + r * N.x, P.y + r * N.y, P.z + r * N.z);
          nor.push(N.x, N.y, N.z);
        }
      }
      for (let i = 0; i < segs; i++) {
        for (let j = 0; j < radial; j++) {
          const a = base + i * (radial + 1) + j, b = a + radial + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
      // Round cap on the thin end so twig tips never show a hole
      if (r1 > 0.01) {
        const cap = new THREE.SphereGeometry(r1, 8, 6);
        cap.translate(P.x, P.y, P.z);
        const cb = pos.length / 3;
        pos.push(...cap.attributes.position.array);
        nor.push(...cap.attributes.normal.array);
        for (const k of cap.index.array) idx.push(cb + k);
      }
    },
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
      g.setIndex(idx);
      return g;
    },
  };
}

// ── The hero cluster: planet → acorn, with a rosette of leaves ────────────────
// Placed on the front of the crown; the camera starts close on it.
const CROWN_C = V(0, 15.5, 0);
const CROWN_A = V(14, 8.5, 14);
const HERO = V(3.2, 16.2, 12.9);

const hero = new THREE.Group();
hero.position.copy(HERO);
scene.add(hero);

// The acorn body hangs from the stem top, so it can shrink to the tree's
// proportions during the pull-back without leaving its twig
const HANG_Y = 0.8;
const acornBody = new THREE.Group();
acornBody.position.y = HANG_Y;
hero.add(acornBody);

const nutMat = porcelain(PASTEL_OAK, 0.36);
const nut = new THREE.Mesh(nutGeometry(96, 72, true), nutMat);
nut.position.y = -HANG_Y;
acornBody.add(nut);

const CAP_Y = 0.24; // where the cup's rim meets the nut
const capPivot = new THREE.Group();
capPivot.position.y = CAP_Y - HANG_Y;
acornBody.add(capPivot);
const cap = new THREE.Mesh(capGeometry(96, 32), porcelain(ACORN_CAP, 0.62, { side: THREE.DoubleSide }));
capPivot.add(cap);
const stem = new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(0, 0.3, 0), V(0.02, 0.44, -0.02), V(0.08, 0.55, -0.06)), 12, 0.035, 8),
  porcelain(BARK, 0.6)
);
capPivot.add(stem);
capPivot.scale.setScalar(0.0001);

// Twig from above the cap back into the crown; the tree's branch meets its end
const TWIG_A = V(0.08, 0.83, -0.06);
const TWIG_B = V(0.3, 1.45, -1.1);
const twig = new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(TWIG_A, V(0.1, 1.2, -0.3), TWIG_B), 16, 0.045, 8),
  porcelain(BARK, 0.6)
);
const twigEnd = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), twig.material);
twigEnd.position.copy(TWIG_B);
twig.add(twigEnd);
twig.scale.setScalar(0.0001);
hero.add(twig);

const leafGeoHi = leafGeometry(64, 8);
const leafMat = porcelain(0xffffff, 0.5, { side: THREE.DoubleSide });
const HERO_LEAVES = [
  // angle in the view plane (0 = up), length scale, tilt back, tone
  { a:  0.00, s: 1.18, tilt: -0.35, c: 0 },
  { a:  0.72, s: 1.05, tilt: -0.25, c: 1 },
  { a: -0.78, s: 1.08, tilt: -0.28, c: 2 },
  { a:  1.42, s: 0.98, tilt: -0.15, c: 3 },
  { a: -1.46, s: 1.0,  tilt: -0.18, c: 4 },
  { a:  2.28, s: 0.86, tilt: -0.45, c: 1 },
  { a: -2.25, s: 0.9,  tilt: -0.45, c: 0 },
];
const heroLeaves = HERO_LEAVES.map((d, i) => {
  const m = new THREE.Mesh(leafGeoHi, leafMat.clone());
  m.material.color.setHex(LEAF_TONES[d.c]);
  const holder = new THREE.Group();
  holder.position.set(TWIG_A.x, TWIG_A.y, TWIG_A.z - 0.12);
  holder.rotation.order = "ZYX"; // lean back first, then turn in the view plane
  holder.rotation.set(d.tilt, 0, d.a);
  holder.add(m);
  hero.add(holder);
  return { holder, mesh: m, d, delay: i * 0.08 };
});

// ── The oak tree ─────────────────────────────────────────────────────────────
const tree = new THREE.Group();
tree.visible = false; // hidden until the camera starts to retreat
scene.add(tree);

const insideCrown = (p, k = 1) =>
  ((p.x - CROWN_C.x) / CROWN_A.x) ** 2 + ((p.y - CROWN_C.y) / CROWN_A.y) ** 2 + ((p.z - CROWN_C.z) / CROWN_A.z) ** 2 <= k * k;
function pullInsideCrown(p, k) {
  const d = p.clone().sub(CROWN_C);
  const e = Math.sqrt((d.x / CROWN_A.x) ** 2 + (d.y / CROWN_A.y) ** 2 + (d.z / CROWN_A.z) ** 2);
  if (e > k) p.copy(CROWN_C).addScaledVector(d, k / e);
  return p;
}

const wood = woodBuilder();
const clusters = [];      // leaf-cluster centres
const primaries = [];

// Trunk with a flared root collar
const trunk = new THREE.CatmullRomCurve3([V(0, -0.2, 0), V(0.2, 3, 0.15), V(-0.15, 5.8, 0), V(0.25, 8.4, -0.1)]);
wood.add(trunk, 1.35, 0.9, 24, 20);
const collar = new THREE.LatheGeometry(
  [V(2.3, 0, 0), V(1.9, 0.25, 0), V(1.55, 0.8, 0), V(1.38, 1.6, 0)].map((p) => new THREE.Vector2(p.x, p.y)), 32
);
tree.add(new THREE.Mesh(collar, porcelain(BARK, 0.66)));

const NP = 7;
for (let k = 0; k < NP; k++) {
  const phi = (k / NP) * Math.PI * 2 + rr(-0.25, 0.25);
  const out = V(Math.cos(phi), 0, Math.sin(phi));
  const S = trunk.getPointAt(rr(0.72, 0.98));
  const len = rr(8.5, 11);
  const elev = rr(0.32, 0.72);
  const E = S.clone().addScaledVector(out, Math.cos(elev) * len).add(V(0, Math.sin(elev) * len, 0));
  pullInsideCrown(E, 0.78);
  const M = S.clone().lerp(E, 0.45).add(V(0, rr(-0.6, 0.4), 0));
  const curve = new THREE.CatmullRomCurve3([S, M, E]);
  wood.add(curve, rr(0.55, 0.68), 0.18, 20, 12);
  primaries.push(curve);

  for (let s = 0; s < 4; s++) {
    const t = rr(0.35, 0.95);
    const S2 = curve.getPointAt(t);
    const dir = curve.getTangentAt(t).add(V(rr(-0.9, 0.9), rr(0.1, 0.9), rr(-0.9, 0.9))).normalize();
    const E2 = pullInsideCrown(S2.clone().addScaledVector(dir, rr(3.5, 6)), 0.96);
    const M2 = S2.clone().lerp(E2, 0.5).add(V(0, rr(0, 0.6), 0));
    const c2 = new THREE.CatmullRomCurve3([S2, M2, E2]);
    wood.add(c2, lerp(0.5, 0.22, t) * 0.55, 0.05, 10, 7);
    clusters.push(E2.clone(), c2.getPointAt(0.6));

    for (let q = 0; q < 2; q++) {
      const t3 = rr(0.45, 0.85);
      const S3 = c2.getPointAt(t3);
      const d3 = c2.getTangentAt(t3).add(V(rr(-1, 1), rr(-0.2, 0.8), rr(-1, 1))).normalize();
      const E3 = pullInsideCrown(S3.clone().addScaledVector(d3, rr(1.4, 2.6)), 1.0);
      wood.add(new THREE.LineCurve3(S3, E3), 0.06, 0.03, 3, 5);
      clusters.push(E3);
    }
  }
}

// The branch that carries the hero acorn: from the nearest primary to the twig
{
  const twigEnd = HERO.clone().add(TWIG_B);
  let best = primaries[0], bestD = Infinity;
  for (const c of primaries) {
    const d = c.getPointAt(0.6).distanceTo(twigEnd);
    if (d < bestD) { bestD = d; best = c; }
  }
  const S = best.getPointAt(0.6);
  const M = S.clone().lerp(twigEnd, 0.6).add(V(0, 0.6, -2.2));
  const N = twigEnd.clone().add(V(0.1, 0.5, -0.9));
  wood.add(new THREE.CatmullRomCurve3([S, M, N, twigEnd]), 0.24, 0.045, 20, 8);
}
tree.add(new THREE.Mesh(wood.build(), porcelain(BARK, 0.66)));

// Fill the crown's shell so it reads as one full canopy; keep a clearing
// around the hero cluster so it stands alone at the start.
const HERO_CLEAR = 3.3;
for (let tries = 0; clusters.length < 740 && tries < 40000; tries++) {
  const u = rand() * 2 - 1, a = rand() * Math.PI * 2, r = rr(0.6, 1.0);
  const q = Math.sqrt(1 - u * u);
  const p = V(CROWN_C.x + CROWN_A.x * r * q * Math.cos(a), CROWN_C.y + CROWN_A.y * r * u, CROWN_C.z + CROWN_A.z * r * q * Math.sin(a));
  if (p.y < 8.2) continue;
  let ok = true;
  for (let i = 0; i < clusters.length; i++) if (clusters[i].distanceToSquared(p) < 1.7) { ok = false; break; }
  if (ok) clusters.push(p);
}
const canopyClusters = clusters.filter((c) => c.distanceTo(HERO) > HERO_CLEAR && c.y > 7.5);
const clearingClusters = clusters.filter((c) => { const d = c.distanceTo(HERO); return d <= HERO_CLEAR && d > 1.5; });
const heartClusters = clusters.filter((c) => c.distanceTo(HERO) <= 1.5);

// Leaves: instanced, 6 per cluster, facing outward from the crown
const leafGeoLo = leafGeometry(16, 2); // light enough for phones at ~4k instances
const leafMatLo = porcelain(0xffffff, 0.5, { side: THREE.DoubleSide });
function leafCluster(centres) {
  const perCluster = 6;
  const mesh = new THREE.InstancedMesh(leafGeoLo, leafMatLo, Math.max(1, centres.length * perCluster));
  const poses = [];
  const q = new THREE.Quaternion(), roll = new THREE.Quaternion(), up = V(0, 1, 0), col = new THREE.Color();
  for (const c of centres) {
    const outward = c.clone().sub(CROWN_C).normalize();
    for (let i = 0; i < perCluster; i++) {
      const d = outward.clone().add(V(rr(-0.9, 0.9), rr(-0.6, 0.9), rr(-0.9, 0.9))).normalize();
      q.setFromUnitVectors(up, d);
      roll.setFromAxisAngle(d, rr(0, Math.PI * 2));
      const pose = {
        p: c.clone().add(V(rr(-0.25, 0.25), rr(-0.25, 0.25), rr(-0.25, 0.25))),
        q: q.clone().premultiply(roll),
        s: rr(0.82, 1.12),
      };
      poses.push(pose);
      mesh.setColorAt(poses.length - 1, col.setHex(LEAF_TONES[Math.floor(rand() * LEAF_TONES.length)]));
    }
  }
  mesh.count = poses.length;
  const m = new THREE.Matrix4(), sv = new THREE.Vector3();
  mesh.userData.grow = (k) => {
    poses.forEach((o, i) => mesh.setMatrixAt(i, m.compose(o.p, o.q, sv.setScalar(Math.max(1e-4, o.s * k)))));
    mesh.instanceMatrix.needsUpdate = true;
  };
  mesh.userData.grow(1);
  tree.add(mesh);
  return mesh;
}
leafCluster(canopyClusters);
// Clusters in the clearing grow in as the camera leaves — the nearest ones
// last, once the hero acorn is small on screen
const clearingLeaves = leafCluster(clearingClusters);
const heartLeaves = leafCluster(heartClusters);
clearingLeaves.userData.grow(0);
heartLeaves.userData.grow(0);
let clearingK = 0, heartK = 0;

// Acorns across the crown, the same size as the hero — it is one of many
{
  const picks = canopyClusters.filter(() => rand() < 0.05);
  const nuts = new THREE.InstancedMesh(nutGeometry(24, 18, false), porcelain(ACORN_NUT, 0.36), picks.length);
  const caps = new THREE.InstancedMesh(capGeometry(24, 8), porcelain(ACORN_CAP, 0.62, { side: THREE.DoubleSide }), picks.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = V(1, 1, 1).multiplyScalar(ACORN_IN_TREE);
  picks.forEach((c, i) => {
    e.set(rr(-0.35, 0.35), rr(0, Math.PI * 2), rr(-0.35, 0.35));
    q.setFromEuler(e);
    const p = c.clone().add(V(rr(-0.3, 0.3), -0.4, rr(-0.3, 0.3)));
    nuts.setMatrixAt(i, m.compose(p, q, one));
    caps.setMatrixAt(i, m.compose(p.clone().add(V(0, CAP_Y * ACORN_IN_TREE, 0).applyQuaternion(q)), q, one));
  });
  tree.add(nuts, caps);
}

// ── The esplanade ────────────────────────────────────────────────────────────
function pavingTexture() {
  const S = 2048, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  g.fillStyle = "#e8e2d5";
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "rgba(150, 132, 100, 0.28)";
  g.lineWidth = 2.2;
  const R = S / 2, rings = 18;
  for (let i = 1; i <= rings; i++) {
    const r = (i / rings) * R;
    g.beginPath(); g.arc(R, R, r, 0, Math.PI * 2); g.stroke();
    const n = Math.max(8, Math.round(i * 7));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (i % 2) * (Math.PI / n);
      const r0 = ((i - 1) / rings) * R;
      g.beginPath();
      g.moveTo(R + Math.cos(a) * r0, R + Math.sin(a) * r0);
      g.lineTo(R + Math.cos(a) * r, R + Math.sin(a) * r);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function softShadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(60, 50, 35, 0.34)");
  grad.addColorStop(0.55, "rgba(60, 50, 35, 0.16)");
  grad.addColorStop(1, "rgba(60, 50, 35, 0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const esplanade = new THREE.Group();
esplanade.visible = false;
scene.add(esplanade);
{
  const flat = (geo, mat, y = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    esplanade.add(m);
    return m;
  };
  const PLAZA = 30;
  flat(new THREE.CircleGeometry(420, 96), porcelain(0xe6e1d6, 0.9), -0.05);
  // Lawn parterres between the four avenues
  for (let k = 0; k < 4; k++) {
    const start = k * (Math.PI / 2) + 0.12;
    flat(new THREE.RingGeometry(PLAZA + 1.2, 170, 48, 1, start, Math.PI / 2 - 0.24), porcelain(LAWN, 0.85), 0.0);
  }
  // Avenues leading away from the plaza
  const avenueMat = porcelain(STONE, 0.85);
  for (let k = 0; k < 4; k++) {
    const a = flat(new THREE.PlaneGeometry(7, 160), avenueMat);
    a.rotation.z = k * (Math.PI / 2);
    a.position.set(Math.sin(k * Math.PI / 2) * (PLAZA + 78), 0.06, Math.cos(k * Math.PI / 2) * (PLAZA + 78));
  }
  // The paved plaza and its rings
  flat(new THREE.CircleGeometry(PLAZA, 128), new THREE.MeshStandardMaterial({ map: pavingTexture(), roughness: 0.85 }), 0.1);
  const ringMat = porcelain(CREAM_DEEP, 0.35);
  for (const [r, tube] of [[PLAZA, 0.16], [PLAZA * 0.62, 0.1], [6.3, 0.12]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 256), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.14;
    esplanade.add(ring);
  }
  // Raised bed around the trunk
  const bed = new THREE.Mesh(new THREE.CylinderGeometry(5.7, 5.9, 0.55, 96), porcelain(STONE_DEEP, 0.7));
  bed.position.y = 0.3;
  esplanade.add(bed);
  flat(new THREE.CircleGeometry(5.35, 64), porcelain(LAWN, 0.9), 0.58);
  // The crown's soft shadow on the paving
  const shade = flat(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: softShadowTexture(), transparent: true, depthWrite: false }), 0.16);
  shade.position.x = -2;
  shade.position.z = -2;

  // Benches around the plaza, facing the tree
  const benchMat = porcelain(0xe9dcc4, 0.5);
  const seat = new THREE.BoxGeometry(2.6, 0.16, 0.75);
  const leg = new THREE.BoxGeometry(0.14, 0.45, 0.6);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const b = new THREE.Group();
    const s = new THREE.Mesh(seat, benchMat); s.position.y = 0.5; b.add(s);
    for (const x of [-1.05, 1.05]) { const l = new THREE.Mesh(leg, benchMat); l.position.set(x, 0.23, 0); b.add(l); }
    b.position.set(Math.sin(a) * 21.5, 0.1, Math.cos(a) * 21.5);
    b.rotation.y = a;
    esplanade.add(b);
  }

  // Lamps along the avenues
  const CAP_N = 96;
  const lampPost = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), porcelain(CREAM_DEEP, 0.4), CAP_N);
  const lampGlobe = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 16, 12), porcelain(0xf0d5bb, 0.3), CAP_N);
  const m = new THREE.Matrix4();
  let li = 0;
  for (let k = 0; k < 4; k++) {
    const a = k * (Math.PI / 2);
    const along = V(Math.sin(a), 0, Math.cos(a)), across = V(Math.cos(a), 0, -Math.sin(a));
    for (let d = PLAZA + 6; d < PLAZA + 96; d += 10) {
      for (const side of [-1, 1]) {
        const lp = along.clone().multiplyScalar(d + 5).addScaledVector(across, side * 5.4);
        if (li < CAP_N) {
          lampPost.setMatrixAt(li, m.makeTranslation(lp.x, 1.7, lp.z));
          lampGlobe.setMatrixAt(li, m.makeTranslation(lp.x, 3.5, lp.z));
          li++;
        }
      }
    }
  }
  lampPost.count = lampGlobe.count = li;
  esplanade.add(lampPost, lampGlobe);
}

// ── Camera path ──────────────────────────────────────────────────────────────
// Close on the acorn (framed a little above it, to include the leaves) →
// the whole tree from across the esplanade. Distance grows exponentially so
// the pull-back reads as one continuous zoom.
// The planet sits just below the title; once the leaves open the view rises
// so the whole cluster clears it.
const T_PLANET = HERO.clone().add(V(0, 0.3, 0));
const T_CLUSTER = HERO.clone().add(V(0, 1.35, 0));
const DIR0 = V(0.12, 0.06, 1).normalize();
const T1 = V(0, 12.5, 0);
const DIR1 = V(0, 13, 72).normalize();

let aspect = 1;
const startDist = () => Math.max(7.4, 3.6 / aspect / 0.728);   // leaves fit the width
const endDist   = () => Math.max(66, 34 / aspect / 0.728);     // crown fits the width

const camTarget = new THREE.Vector3(), camDir = new THREE.Vector3(), t0 = new THREE.Vector3();
function placeCamera(p, open) {
  const s = easeInOut(p);
  const d0 = startDist(), d1 = endDist();
  const d = d0 * Math.pow(d1 / d0, s);
  t0.lerpVectors(T_PLANET, T_CLUSTER, open);
  camTarget.lerpVectors(t0, T1, s);
  camDir.lerpVectors(DIR0, DIR1, s).normalize();
  camera.position.copy(camTarget).addScaledVector(camDir, d);
  camera.lookAt(camTarget);
  // Near plane follows the distance so the far ground keeps its depth precision
  camera.near = Math.max(0.05, d * 0.04);
  camera.updateProjectionMatrix();
  // Fog: at first only the acorn cluster is clear; it lifts as we retreat
  scene.fog.near = d + lerp(1.4, 40, s);
  scene.fog.far  = d + lerp(3.2, 260, Math.pow(s, 0.6));
  const shown = p > 0.002;
  tree.visible = shown;
  esplanade.visible = shown;
}

// ── Scroll lock — the page waits for the planet to become an acorn ──────────
// oak.html locks it before first paint (html.oak-locked); it is released
// once the acorn and its leaves have formed.
let scrollLocked = document.documentElement.classList.contains("oak-locked");
window.scrollTo(0, 0);
const holdScroll = (e) => { if (scrollLocked) e.preventDefault(); };
window.addEventListener("wheel", holdScroll, { passive: false });
window.addEventListener("touchmove", holdScroll, { passive: false });
window.addEventListener("keydown", (e) => {
  if (scrollLocked && [" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "End", "Home"].includes(e.key)) e.preventDefault();
});
function releaseScroll() {
  if (!scrollLocked) return;
  scrollLocked = false;
  document.documentElement.classList.remove("oak-locked");
}

// ── Scroll → progress ────────────────────────────────────────────────────────
const track = document.getElementById("oak-track");
const heroText = document.getElementById("oak-hero");
const cue = scrollCue(document.getElementById("oak-cue"));
const shell = document.querySelector(".oak-shell");
let pTarget = 0, pSmooth = 0, covered = false;
function readScroll() {
  const span = track ? track.offsetHeight - window.innerHeight : 1;
  pTarget = span > 0 ? clamp01(window.scrollY / span) : 0;
  // Once the copy's paper has risen over the whole screen the scene can't be
  // seen, so it stops being drawn until the reader scrolls back up
  covered = !!shell && shell.getBoundingClientRect().top < -240;
}
window.addEventListener("scroll", readScroll, { passive: true });

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  aspect = w / h;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  readScroll();
}
window.addEventListener("resize", resize);
resize();

// ── Entrance: the planet appears as the loading screen opens, then becomes
// an acorn once it has finished ─────────────────────────────────────────────
const clock = new THREE.Clock();
let appearT0 = Infinity, morphT0 = Infinity;
function onHole() { if (!isFinite(appearT0)) appearT0 = clock.getElapsedTime(); }
function onDone() {
  onHole();
  if (!isFinite(morphT0)) morphT0 = clock.getElapsedTime() + (motionOK ? 1.6 : -10);
}
// ls.js flags each event on window (e.g. window["__mulvium_ls-hole"]) for late listeners
if (window["__mulvium_ls-hole"]) onHole(); else document.addEventListener("mulvium:ls-hole", onHole);
if (window["__mulvium_ls-done"]) onDone(); else document.addEventListener("mulvium:ls-done", onDone);
setTimeout(onDone, 10000); // safety if the overlay never reports

const PINK = new THREE.Color(PASTEL_OAK), NUTC = new THREE.Color(ACORN_NUT);
const MORPH_DUR = 2.6;

let lastT = 0;
function animate() {
  const t = clock.getElapsedTime();
  const dt = Math.min(0.25, t - lastT);
  lastT = t;

  // Planet entrance
  const a = motionOK ? clamp01((t - appearT0) / 1.1) : (isFinite(appearT0) ? 1 : 0);
  const appear = isFinite(appearT0) ? easeOutBack(a) : 0;

  // Planet → acorn
  const m = isFinite(morphT0) ? clamp01((t - morphT0) / MORPH_DUR) : 0;
  const shape = easeInOut(smooth(0, 0.55, m));
  nut.morphTargetInfluences[0] = shape;
  nutMat.color.copy(PINK).lerp(NUTC, shape);
  capPivot.scale.setScalar(Math.max(0.0001, easeOutBack(smooth(0.3, 0.72, m))));
  twig.scale.setScalar(Math.max(0.0001, smooth(0.4, 0.7, m)));
  heroLeaves.forEach((L) => {
    const k = smooth(0.42 + L.delay, 0.82 + L.delay, m);
    const sway = motionOK ? Math.sin(t * 0.9 + L.delay * 20) * 0.03 : 0;
    L.mesh.scale.setScalar(Math.max(0.0001, easeOutBack(k) * L.d.s));
    L.mesh.rotation.x = (1 - k) * 1.1;           // unfurls from curled to open
    L.holder.rotation.z = L.d.a + sway * k;
  });

  // Scroll-driven pull-back, eased for a soft glide (time-based, so slow
  // devices glide at the same pace instead of lagging behind the scroll)
  pSmooth += (pTarget - pSmooth) * (motionOK ? 1 - Math.exp(-dt * 5) : 1);
  if (Math.abs(pTarget - pSmooth) < 1e-4) pSmooth = pTarget;

  const bob = motionOK ? Math.sin(t * 0.8) * 0.04 : 0;
  hero.position.set(HERO.x, HERO.y + bob * (1 - pSmooth), HERO.z);
  hero.scale.setScalar(Math.max(0.0001, appear));
  acornBody.scale.setScalar(lerp(1, ACORN_IN_TREE, smooth(0.05, 0.6, pSmooth)));

  placeCamera(pSmooth, easeInOut(smooth(0.25, 0.95, m)));
  const k = smooth(0.1, 0.45, pSmooth), kh = smooth(0.45, 0.75, pSmooth);
  if (Math.abs(k - clearingK) > 1e-3 || (k !== clearingK && (k === 0 || k === 1))) {
    clearingK = k;
    clearingLeaves.userData.grow(k);
  }
  if (Math.abs(kh - heartK) > 1e-3 || (kh !== heartK && (kh === 0 || kh === 1))) {
    heartK = kh;
    heartLeaves.userData.grow(kh);
  }

  // Title fades as the camera retreats; the scroll cue waits for the acorn
  if (heroText) heroText.style.opacity = String(1 - smooth(0.02, 0.14, pSmooth));
  cue.ready(m >= 0.9);
  if (m >= 0.95) releaseScroll();

  if (!covered) renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
