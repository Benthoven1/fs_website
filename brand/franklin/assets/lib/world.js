// world.js — the film's 3D figures. Every solid comes from a design drawn with
// the Anatomy kit (github.com/wheresryan22/anatomy; figures/*.mjs), whose
// recorder wrote it down part for part (assets/fig/<plot>.parts.json): this
// file only turns those records into geometry, lights them, and moves them on
// the film's schedule. Nothing else is modelled; the backdrop is the page
// behind the transparent canvas.
//
// Every frame is a pure function of the film's time t (HyperFrames seeks
// frames out of order). The opening shows the finished model, then takes it
// apart back to its plinths; from there each part arrives along one direction
// at its time, and some are placed by events: the library's coins ride into
// the hopper, its books arrive shelf by shelf, the donors' coins stack up,
// the Assembly's coins drop. Near the end every institution's rules, members
// and money turn to spheres, rise, and become the planets of Mulvium's own
// cosmos (the landing page's star, rings and pastel porcelain, js/main.js);
// a new project's planet joins it and is given all three.
//
// Design coordinates are the kit's: x along, y toward the viewer, z up. Here
// they become three.js (x, z + LIFT, y), plot by plot.
import * as THREE from "./three/three.module.min.js";
import { RoundedBoxGeometry } from "./three/RoundedBoxGeometry.js";
import { mergeGeometries } from "./three/BufferGeometryUtils.js";

export const PLOTS = { library: [-200, -190], fire: [200, -190], hospital: [-200, 190], academy: [200, 190] };
const INSTITUTIONS = ["library", "fire", "hospital", "academy"];
const LIFT = 19; // the plinth's slab and feet: the design's z = 0 is the slab top
const ACCENT = { library: "#4D6D96", fire: "#A8603F", hospital: "#357F77", academy: "#55804A", mulvium: "#9A5571" };
const MAT = {
  stone: ["#E9E4DA", 0.8], stoneDark: ["#CFC7B8", 0.8], porcelain: ["#F6F3EE", 0.55], trim: ["#F4F0E8", 0.6],
  iron: ["#4A4744", 0.5, 0.2], brass: ["#D0AB62", 0.35, 0.25], pewter: ["#B9BFC3", 0.35, 0.25], gilt: ["#D8B66A", 0.4, 0.2],
  oak: ["#B68C63", 0.62], oakLight: ["#C9A27A", 0.6], walnut: ["#7A5640", 0.6], walnutLight: ["#8E6A50", 0.6],
  paper: ["#F1E8D2", 0.85], ink: ["#2B2522", 0.6], felt: ["#46604E", 0.95], glass: ["#5E6E78", 0.25], rope: ["#CDBB94", 0.9],
  brick: ["#B0634A", 0.85], brickDark: ["#8F4C38", 0.85], slate: ["#5F6772", 0.7], crest: ["#E9DCC0", 0.7],
  leather: ["#6E4430", 0.7], leatherRed: ["#9C4B35", 0.7],
  bindBlue2: ["#5A7AA3", 0.65], bindNavy: ["#2F4566", 0.65], bindCalf: ["#9A6B42", 0.65], bindOx: ["#6D2E2A", 0.65], bindGreen: ["#3F5F4C", 0.65], bindLabel: ["#E6D6B0", 0.7],
};
const TONE = { faint: ["#B9AFA2", 0.8], lo: ["#8F857A", 0.9], mid: ["#6E655C", 1], hi: ["#3B332F", 1] };

// ── easing ─────────────────────────────────────────────────────────────────
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const inOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const outCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const outBack = (x) => { x = clamp01(x); const c = 1.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const span = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp01((t - a) / (b - a)));

const materials = {};
function material(name, plot) {
  // "acc" is the plot's own colour; the shared plot's is Mulvium's
  const key = name === "acc" ? `acc:${ACCENT[plot] ? plot : "mulvium"}` : name;
  if (materials[key]) return materials[key];
  const spec = key.startsWith("acc:") ? [ACCENT[key.slice(4)], 0.55] : MAT[key];
  if (!spec) throw new Error("no material " + key);
  const [color, rough, metal = 0] = spec;
  return (materials[key] = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive: metal ? color : "#000000", emissiveIntensity: metal ? 0.16 : 0 }));
}
const EDGE = new THREE.LineBasicMaterial({ color: "#3B332F", transparent: true, opacity: 0.2 });
const LINES = Object.fromEntries(Object.entries(TONE).map(([k, [c, o]]) => [k, new THREE.LineBasicMaterial({ color: c, transparent: o < 1, opacity: o })]));

// ── records to geometry ────────────────────────────────────────────────────
const V = (x, y, z) => new THREE.Vector3(x, z + LIFT, y); // design → three
function rotated(geo, rot) {
  if (!rot) return geo;
  const p = V(...rot.at), a = THREE.MathUtils.degToRad(rot.deg);
  geo.translate(-p.x, -p.y, -p.z);
  // the design's rule: a positive angle lifts the +y side (axis x), the +x
  // side (axis y), or turns x toward y (axis z)
  if (rot.axis === "x") geo.rotateX(-a); else if (rot.axis === "y") geo.rotateZ(a); else geo.rotateY(-a);
  geo.translate(p.x, p.y, p.z);
  return geo;
}
const bare = (g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal") n.deleteAttribute(k); return n; };
function solidGeometry(s) {
  let geo, edge = null;
  if (s.kind === "box") {
    const r = Math.min(Math.max(s.bevel, 0.05), s.w / 2 - 0.01, s.h / 2 - 0.01, s.d / 2 - 0.01);
    geo = r > 0.25 ? new RoundedBoxGeometry(s.w, s.h, s.d, 2, r) : new THREE.BoxGeometry(s.w, s.h, s.d);
    const c = V(s.x + s.w / 2, s.y + s.d / 2, s.z + s.h / 2);
    geo.translate(c.x, c.y, c.z);
    if (Math.max(s.w, s.h, s.d) > 1.6) { edge = new THREE.EdgesGeometry(new THREE.BoxGeometry(s.w, s.h, s.d)); edge.translate(c.x, c.y, c.z); }
  } else if (s.kind === "cyl") {
    geo = new THREE.CylinderGeometry(s.r2, s.r, s.h, s.seg);
    const c = V(s.x, s.y, s.z + s.h / 2);
    geo.translate(c.x, c.y, c.z);
    if (Math.max(s.r, s.r2) > 1.2) { edge = new THREE.EdgesGeometry(new THREE.CylinderGeometry(s.r2, s.r, s.h, s.seg), 40); edge.translate(c.x, c.y, c.z); }
  } else if (s.kind === "rod") {
    geo = new THREE.CylinderGeometry(s.r, s.r, s.len, s.seg);
    if (s.axis === "x") geo.rotateZ(Math.PI / 2); else geo.rotateX(Math.PI / 2);
    const c = s.axis === "x" ? V(s.x + s.len / 2, s.y, s.z) : V(s.x, s.y + s.len / 2, s.z);
    geo.translate(c.x, c.y, c.z);
  } else if (s.kind === "torus") {
    // the record names the ring's normal: y (the default plane, x-z), x or z
    geo = new THREE.TorusGeometry(s.R, s.t, 8, 28, s.arc);
    if (s.axis === "x") geo.rotateY(Math.PI / 2); else if (s.axis === "z") geo.rotateX(Math.PI / 2);
    const c = V(s.x, s.y, s.z);
    geo.translate(c.x, c.y, c.z);
  } else if (s.kind === "prism") {
    const shape = new THREE.Shape(s.polygon.map(([x, z]) => new THREE.Vector2(x, z)));
    geo = new THREE.ExtrudeGeometry(shape, { depth: s.y1 - s.y0, bevelEnabled: false });
    geo.translate(0, LIFT, s.y0);
    edge = new THREE.EdgesGeometry(geo, 30);
  } else if (s.kind === "dots") {
    geo = mergeGeometries(s.pts.map(([x, y, z]) => {
      const g = new THREE.CylinderGeometry(s.size, s.size, 0.5, 10);
      if (s.normal === "y") g.rotateX(Math.PI / 2); else if (s.normal === "x") g.rotateZ(Math.PI / 2);
      const c = V(x + (s.normal === "x" ? 0.2 : 0), y + (s.normal === "y" ? 0.2 : 0), z + (s.normal === "z" ? 0.2 : 0));
      g.translate(c.x, c.y, c.z);
      return bare(g);
    }));
  }
  if (!geo) return null;
  geo = rotated(bare(geo), s.rot);
  if (edge) edge = rotated(bare(edge), s.rot);
  return { geo, edge };
}
function lineSegments(s) {
  const out = [];
  const seg = (a, b) => out.push(V(...a), V(...b));
  if (s.kind === "line") { for (let i = 0; i < s.pts.length - 1; i++) seg(s.pts[i], s.pts[i + 1]); if (s.closed) seg(s.pts[s.pts.length - 1], s.pts[0]); }
  else if (s.kind === "ticks") s.segs.forEach(([a, b]) => seg(a, b));
  else if (s.kind === "ring") for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2, b = ((i + 1) / 32) * Math.PI * 2; seg([s.x + s.r * Math.cos(a), s.y + s.r * Math.sin(a), s.z], [s.x + s.r * Math.cos(b), s.y + s.r * Math.sin(b), s.z]); }
  else if (s.kind === "knurl") for (let i = 0; i < s.count; i++) { const a = (i / s.count) * Math.PI * 2, x = s.x + (s.r + 0.03) * Math.cos(a), y = s.y + (s.r + 0.03) * Math.sin(a); seg([x, y, s.z0 + 0.15], [x, y, s.z1 - 0.15]); }
  return out;
}

// ── the world ──────────────────────────────────────────────────────────────
export async function createWorld(canvas, labelLayer, S) {
  const W = canvas.width, H = canvas.height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const url = (p) => new URL(p, import.meta.url).href;
  const designs = Object.fromEntries(await Promise.all(Object.keys(PLOTS).map(async (p) => [p, await (await fetch(url(`../fig/${p}.parts.json`))).json()])));
  const docNames = [...new Set(Object.values(designs).flat().flatMap((d) => d.solids.filter((s) => s.kind === "doc").map((s) => s.name)))];
  const loader = new THREE.TextureLoader();
  const docs = Object.fromEntries(await Promise.all(docNames.map(async (n) => {
    const t = await loader.loadAsync(url(`../img/${n}.jpg`));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return [n, t];
  })));

  const scene = new THREE.Scene();
  // a warm key from the upper left, an open sky, a soft fill
  scene.add(new THREE.HemisphereLight("#FFFFFF", "#D9D2C6", 1.45));
  const sun = new THREE.DirectionalLight("#FFF6EA", 2.0);
  sun.position.set(-420, 1500, 620); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -1100, right: 1100, top: 1100, bottom: -1100, near: 100, far: 3600 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.5;
  sun.target.position.set(260, 0, 0); scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight("#E4ECF8", 0.35); fill.position.set(700, 380, -300); scene.add(fill);
  // the floor: invisible, it only takes the figures' shadows
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.ShadowMaterial({ color: "#3B2E22", opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // ── parts: each record merged by material into a few meshes ──────────────
  const parts = [], anchors = {};
  const DIRS = { up: [0, 1, 0], down: [0, -1, 0], left: [-1, 0, 0], right: [1, 0, 0], back: [0, 0, -1], front: [0, 0, 1] };
  for (const [plot, design] of Object.entries(designs)) {
    const [cx, cz] = PLOTS[plot];
    for (const d of design) {
      const byMat = {}, edges = [], byTone = {};
      const g = new THREE.Group();
      for (const s of d.solids) {
        if (s.kind === "doc") {
          // the page keeps its own proportions inside the desk's area
          const img = docs[s.name].image, a = img.width / img.height;
          const geo = a > s.w / s.d ? new THREE.PlaneGeometry(s.w, s.w / a) : new THREE.PlaneGeometry(s.d * a, s.d);
          geo.rotateX(-Math.PI / 2);
          const c = V(s.x, s.y, s.z);
          geo.translate(c.x, c.y, c.z);
          const page = new THREE.Mesh(rotated(geo, s.rot), new THREE.MeshStandardMaterial({ map: docs[s.name], roughness: 0.85 }));
          page.receiveShadow = true;
          g.add(page);
          continue;
        }
        if (["line", "ticks", "ring", "knurl"].includes(s.kind)) { (byTone[s.tone] ||= []).push(...lineSegments(s)); continue; }
        const r = solidGeometry(s);
        if (!r) continue;
        (byMat[s.mat] ||= []).push(r.geo);
        if (r.edge) edges.push(r.edge);
      }
      for (const [m, list] of Object.entries(byMat)) {
        const mesh = new THREE.Mesh(mergeGeometries(list), material(m, plot));
        mesh.castShadow = true; mesh.receiveShadow = true;
        g.add(mesh);
      }
      if (edges.length) g.add(new THREE.LineSegments(mergeGeometries(edges), EDGE));
      for (const [tone, pts] of Object.entries(byTone)) g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), LINES[tone]));
      g.position.set(cx, 0, cz);
      scene.add(g);
      const box = new THREE.Box3().setFromObject(g), h = box.max.y - box.min.y;
      const p = { plot, name: d.name, obj: g, home: g.position.clone(), order: d.build, from: d.from, event: d.event, at: Infinity, dur: d.from === "down" ? 0.9 : 0.75 };
      p.d = d.dist ?? (d.from === "down" ? h + 4 : d.from === "up" ? 420 : 560);
      p.center = box.getCenter(new THREE.Vector3()).sub(g.position);
      parts.push(p);
      anchors[`${plot}.${d.name}`] = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
      p.world = box.getCenter(new THREE.Vector3());
    }
  }
  const named = (plot, re) => parts.filter((p) => p.plot === plot && re.test(p.name)).sort((a, b) => +a.name.replace(/\D/g, "") - +b.name.replace(/\D/g, ""));
  const lib = { stacks: named("library", /^stack\d+$/), books: named("library", /^book\d+$/) };
  lib.mouth = V(230 / 2 - 40, -220 / 2 + 38, 51.2).add(new THREE.Vector3(PLOTS.library[0], 0, PLOTS.library[1]));
  const find = (plot, name) => parts.find((p) => p.plot === plot && p.name === name);
  const hosp = { donors: named("hospital", /^donor\d+$/), held: find("hospital", "held"), paddle: find("hospital", "paddle"), HELD: 34 };

  // ── the modern institution: the site's cosmos, high over the plots ───────
  // The star is Mulvium; three planets are what every institution had to make
  // for itself (rules, members, money); the fourth is a new project. Sizes,
  // rings, tilts and colours are the landing page's (js/main.js), scaled.
  const C0 = new THREE.Vector3(0, 1150, 0), K = 62;
  const porcelain = (c, r = 0.38) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 });
  const cosmos = new THREE.Group(); cosmos.position.copy(C0); scene.add(cosmos);
  const star = new THREE.Mesh(new THREE.SphereGeometry(1.25 * K, 64, 64), porcelain("#F0D5BB"));
  cosmos.add(star);
  const ORBITS = [
    { id: "members", color: "#C4DDB8", radius: 3.0, tilt: [0, 0, 0], speed: 0.36, phase: 0.0 },
    { id: "rules", color: "#B8CAE0", radius: 3.8, tilt: [Math.PI / 2, 0, 0], speed: 0.26, phase: 1.1 },
    { id: "money", color: "#E0B8C8", radius: 4.5, tilt: [Math.PI / 3.2, Math.PI / 5 + Math.PI / 2, 0], speed: 0.22, phase: 2.4 },
    { id: "project", color: "#B8DDD8", radius: 5.0, tilt: [Math.PI / 3.2, Math.PI / 5, 0], speed: 0.18, phase: 3.8 },
  ];
  const ringMat = porcelain("#CDBE96", 0.35); ringMat.transparent = true;
  const planets = Object.fromEntries(ORBITS.map((o) => {
    const pivot = new THREE.Group(); pivot.rotation.set(...o.tilt); cosmos.add(pivot);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(o.radius * K, 0.045 * K, 16, 256), ringMat);
    pivot.add(ring);
    const rot = new THREE.Group(); pivot.add(rot);
    const planet = new THREE.Mesh(new THREE.SphereGeometry(0.5 * K, 48, 48), porcelain(o.color));
    planet.position.set(o.radius * K, 0, 0); rot.add(planet);
    return [o.id, { ...o, pivot, ring, rot, planet }];
  }));
  const planetAt = (id) => planets[id].planet.getWorldPosition(new THREE.Vector3());
  // each institution's rules, members and money, and the sphere it turns into
  const KIND_COLOR = { rules: "#B8CAE0", members: "#C4DDB8", money: "#E0B8C8" };
  const rising = INSTITUTIONS.flatMap((plot, i) => ["rules", "members", "money"].map((what, j) => ({ p: find(plot, what), what, k: i * 3 + j }))).filter((m) => m.p);
  rising.forEach((m) => { m.orb = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 32), porcelain(KIND_COLOR[m.what])); m.orb.visible = false; scene.add(m.orb); });
  // the structure a new project is given: a line to each planet and the star
  const tethers = ["members", "rules", "money", "star"].map((to) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1, 10), new THREE.MeshStandardMaterial({ color: "#FFFFFF", emissive: "#FFFFFF", emissiveIntensity: 0.4, roughness: 0.5 }));
    m.visible = false; scene.add(m);
    return { to, m };
  });
  const pulses = ["members", "money", "rules"].map((from) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 20), new THREE.MeshStandardMaterial({ color: "#FFFFFF", emissive: "#FFF4E0", emissiveIntensity: 1.2 }));
    m.visible = false; scene.add(m);
    return { from, m };
  });
  const beam = (m, a, b) => {
    const d = b.clone().sub(a), len = d.length();
    m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, Math.max(0.001, len), 1);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  };

  // marks for "rules, members, money" on all four plots at once
  const rings = [];
  for (const plot of ["library", "fire", "hospital", "academy"]) for (const what of ["rules", "members", "money"]) {
    // the hospital's money is its grant machine: the ring goes round the donors' column
    const a = anchors[`${plot}.${what}`] || anchors[{ "hospital.money": "hospital.donorCol" }[`${plot}.${what}`]];
    const r = new THREE.Mesh(new THREE.TorusGeometry(31, 1.8, 8, 64), new THREE.MeshStandardMaterial({ color: "#C27A55", roughness: 0.4, emissive: "#C27A55", emissiveIntensity: 0.35 }));
    r.rotation.x = -Math.PI / 2; r.position.set(a.x, LIFT + 0.4, a.z); r.visible = false; scene.add(r);
    rings.push({ obj: r, what });
  }

  // ── schedule ─────────────────────────────────────────────────────────────
  // each plinth lands when the opening names its plot; the rest of a plot is
  // built in its window, in the design's order
  for (const [plot, t] of Object.entries(S.plinths)) find(plot, "plinth").at = t;
  const CO = S.events.cosmos;
  for (const [plot, [t0, t1]] of Object.entries(S.build)) {
    const ps = parts.filter((p) => p.plot === plot && !(p.event && p.event !== "coins") && p.name !== "plinth");
    const lo = Math.min(...ps.map((p) => p.order)), hi = Math.max(...ps.map((p) => p.order));
    ps.forEach((p) => (p.at = t0 + (t1 - t0) * ((p.order - lo) / Math.max(1e-6, hi - lo))));
  }

  // ── camera ───────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(34, W / H, 5, 14000);
  const DIR = new THREE.Vector3(0.62, 0.62, 1).normalize();
  const HIGH = new THREE.Vector3(0.45, 1.05, 1).normalize();
  function shot(s) {
    const [kind, plot, what] = s.split(":");
    if (kind === "wide") return { target: new THREE.Vector3(0, 340, 20), dist: 3200, dir: HIGH.clone() };
    if (kind === "all4") return { target: new THREE.Vector3(0, 120, 20), dist: 2900, dir: HIGH.clone() };
    if (kind === "cosmos") return { target: C0.clone(), dist: 2350, dir: new THREE.Vector3(0.22, 0.38, 1).normalize() };
    if (kind === "cosmosClose") return { target: C0.clone().add(new THREE.Vector3(60, -40, 80)), dist: 1500, dir: new THREE.Vector3(0.3, 0.3, 1).normalize() };
    // the opening's sweep: low from the left, round to the right
    if (kind === "sweepA") return { target: new THREE.Vector3(0, 90, 0), dist: 2000, dir: new THREE.Vector3(-0.9, 0.42, 1).normalize() };
    if (kind === "sweepB") return { target: new THREE.Vector3(0, 70, 0), dist: 2500, dir: new THREE.Vector3(0.95, 0.7, 0.75).normalize() };
    const [cx, cz] = PLOTS[plot];
    if (kind === "plot") return { target: new THREE.Vector3(cx, 60, cz + 6), dist: 1050, dir: DIR.clone() };
    if (kind === "mid") return { target: new THREE.Vector3(cx, 60, cz + 6), dist: 800, dir: DIR.clone() };
    if (kind === "close") return { target: anchors[`${plot}.${what}`].clone().add(new THREE.Vector3(0, -14, 0)), dist: 560, dir: DIR.clone() };
    throw new Error("shot " + s);
  }
  const cams = S.cam.map((c) => ({ ...c, s: shot(c.shot) }));
  function cameraAt(t) {
    let cur = { target: cams[0].s.target.clone(), dist: cams[0].s.dist, dir: cams[0].s.dir.clone() };
    for (const c of cams.slice(1)) {
      if (t <= c.t) break;
      const e = inOut((t - c.t) / c.dur);
      cur = { target: cur.target.clone().lerp(c.s.target, e), dist: Math.exp(Math.log(cur.dist) + (Math.log(c.s.dist) - Math.log(cur.dist)) * e), dir: cur.dir.clone().lerp(c.s.dir, e).normalize() };
    }
    const drift = cur.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.06 * Math.sin(t * 0.07));
    camera.position.copy(cur.target).addScaledVector(drift, cur.dist);
    camera.lookAt(cur.target);
  }

  // ── labels: names over the model, projected to the screen ────────────────
  // names on the cosmos follow their planets
  const UP = new THREE.Vector3(0, 0.62 * K, 0);
  const moving = { "cosmos.star": () => star.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.4 * K, 0)), ...Object.fromEntries(ORBITS.map((o) => [`cosmos.${o.id}`, () => planetAt(o.id).add(UP)])) };
  const labels = (S.labels || []).map((l) => {
    if (!anchors[l.anchor] && !moving[l.anchor]) throw new Error("no anchor " + l.anchor);
    const el = document.createElement("div");
    el.className = "wl";
    el.innerHTML = `<span class="wl-t">${l.text}</span><i class="wl-l"></i><b class="wl-d"></b>`;
    labelLayer.appendChild(el);
    return { ...l, el, text: el.firstChild, half: l.text.length * 10.5 + 8, get: moving[l.anchor] || (() => anchors[l.anchor]) };
  });
  const v = new THREE.Vector3();

  // ── a frame ──────────────────────────────────────────────────────────────
  function place(p, k) {
    p.obj.scale.setScalar(1);
    if (p.from === "pop") { // in place, growing from a little smaller
      const s = 0.82 + 0.18 * outBack(k);
      p.obj.scale.setScalar(s); p.obj.position.copy(p.home).addScaledVector(p.center, 1 - s);
      return;
    }
    const e = p.from === "down" ? outCubic(k) : outBack(k), d = DIRS[p.from];
    p.obj.position.set(p.home.x + d[0] * p.d * (1 - e), p.home.y + d[1] * p.d * (1 - e), p.home.z + d[2] * p.d * (1 - e));
  }
  const [p0, p1, p2] = S.preview, inst = (p) => INSTITUTIONS.includes(p.plot);
  const hiOrder = Math.max(...parts.map((p) => p.order));
  function preview(t) {
    // the finished model, then taken apart, each part leaving the way it will
    // come back; the plinths stay
    for (const p of parts) {
      if (!inst(p)) { p.obj.visible = false; continue; }
      cosmos.visible = false; rising.forEach((m) => (m.orb.visible = false)); tethers.forEach((th) => (th.m.visible = false)); pulses.forEach((pu) => (pu.m.visible = false));
      p.obj.scale.setScalar(1);
      if (p.name === "plinth") { p.obj.visible = true; p.obj.position.copy(p.home); continue; }
      const finished = !/^stack\d+$/.test(p.name);
      if (t < p1) { p.obj.visible = finished; p.obj.position.copy(p.home); if (p.name === "held") p.obj.position.y -= hosp.HELD; continue; }
      const k = clamp01((t - p1 - 0.5 * (1 - p.order / hiOrder)) / 0.6);
      p.obj.visible = finished && k < 1;
      if (p.event && p.event !== "coins") { p.obj.position.copy(p.home); p.obj.position.y += 260 * k * k; continue; }
      place(p, 1 - k);
      if (p.name === "held") p.obj.position.y -= hosp.HELD;
    }
  }
  function renderAt(t) {
    if (t >= p0 && t < p2) { preview(t); return frame(t); }
    for (const p of parts) {
      if (p.event && p.event !== "coins") continue;
      p.obj.visible = t >= p.at;
      if (p.obj.visible) place(p, (t - p.at) / p.dur);
    }
    cosmosAt(t);
    // library: each stack, once landed, lifts, rides to the hopper and drops in
    {
      const [c0, c1] = S.events.libCoins;
      lib.stacks.forEach((p, i) => {
        if (t < p.at + p.dur) return;
        const u = (t - (c0 + (c1 - c0) * (i / lib.stacks.length))) / 0.85;
        if (u <= 0) return;
        if (u >= 1) { p.obj.visible = false; return; }
        const from = p.home.clone().add(p.center), e = inOut(Math.min(1, u / 0.78));
        const pos = from.clone().lerp(lib.mouth, e); pos.y += Math.sin(Math.PI * e) * 95; // high enough to clear the cabinet
        if (u > 0.78) pos.y = lib.mouth.y - 14 * ((u - 0.78) / 0.22);
        p.obj.position.copy(pos.sub(p.center));
      });
      const [b0, b1] = S.events.libBooks;
      lib.books.forEach((b, i) => {
        const k = (t - (b0 + (b1 - b0) * (i / lib.books.length))) / 0.5;
        b.obj.visible = k > 0;
        b.obj.position.copy(b.home); b.obj.position.z -= 30 * (1 - outCubic(k));
      });
    }
    // hospital: the donors' coins stack up; at the mark the paddle lifts and
    // the Assembly's coins drop onto their platform
    {
      const [d0, d1] = S.events.hospDonors, tt = S.events.hospTrip;
      hosp.donors.forEach((c, n) => {
        const k = (t - (d0 + (d1 - d0) * (n / hosp.donors.length))) / 0.3;
        c.obj.visible = k > 0; c.obj.position.copy(c.home); c.obj.position.y += 60 * Math.pow(1 - clamp01(k), 2);
      });
      if (t >= hosp.paddle.at + hosp.paddle.dur) hosp.paddle.obj.position.y = hosp.paddle.home.y + 6 * outCubic((t - tt) / 0.15);
      if (t >= hosp.held.at + hosp.held.dur) {
        const k = clamp01((t - tt - 0.15) / 0.34);
        hosp.held.obj.position.y = hosp.held.home.y - hosp.HELD * k * k;
      }
    }
    for (const r of rings) {
      const k = (t - S.events.turn[r.what]) / 0.45;
      r.obj.visible = k > 0 && t < S.events.turnEnd;
      const s = 0.6 + 0.4 * outBack(k); r.obj.scale.set(s, s, s);
    }
    frame(t);
  }
  // The cosmos at t: the pieces turn to spheres and rise to their planets; the
  // star and its rings arrive; the new project's planet flies up into its
  // orbit, is wired to the rest, takes gifts, grants and contracts, and grows
  function cosmosAt(t) {
    const [a, b] = CO.rise, tStar = CO.star, tNew = CO.project, tWire = CO.wire, [g0, g1] = CO.grow;
    cosmos.visible = t >= a;
    for (const o of ORBITS) o.rot = planets[o.id].rot, o.rot.rotation.z = o.phase + o.speed * 0.6 * (t - a);
    cosmos.updateMatrixWorld(true);
    // the pieces become spheres, and the spheres rise
    const arrived = { rules: 0, members: 0, money: 0 }, total = { rules: 0, members: 0, money: 0 };
    for (const m of rising) {
      total[m.what]++;
      if (t < a) { m.orb.visible = false; continue; }
      const t0 = a + m.k * 0.09, flight = Math.max(0.8, b - t0);
      const k1 = clamp01((t - t0) / 0.35), u = clamp01((t - t0 - 0.3) / flight);
      // the piece shrinks into its sphere
      const s = 1 - outCubic(k1);
      m.p.obj.visible = s > 0.01; m.p.obj.scale.setScalar(Math.max(0.001, s));
      m.p.obj.position.copy(m.p.world).addScaledVector(m.p.center, -s);
      if (u >= 1) { m.orb.visible = false; arrived[m.what]++; continue; }
      m.orb.visible = k1 > 0;
      const from = m.p.world, to = planetAt(m.what), e = inOut(u);
      const ctrl = from.clone().lerp(to, 0.35); ctrl.y = from.y + 700;
      const q = from.clone().multiplyScalar((1 - e) * (1 - e)).addScaledVector(ctrl, 2 * e * (1 - e)).addScaledVector(to, e * e);
      m.orb.position.copy(q); m.orb.scale.setScalar(0.4 + 0.6 * outCubic(k1) + 0.6 * e);
    }
    for (const id of ["rules", "members", "money"]) {
      const f = arrived[id] / total[id];
      planets[id].planet.visible = f > 0;
      planets[id].planet.scale.setScalar(0.35 + 0.65 * Math.sqrt(f));
    }
    // the star and its rings
    const ks = clamp01((t - tStar) / 0.8);
    star.visible = ks > 0; star.scale.setScalar(Math.max(0.001, outBack(ks)));
    ringMat.opacity = clamp01((t - tStar - 0.2) / 0.8);
    ORBITS.forEach((o, i) => { planets[o.id].ring.visible = ringMat.opacity > 0; planets[o.id].ring.scale.setScalar(0.85 + 0.15 * outCubic(clamp01((t - tStar - 0.2 - i * 0.12) / 0.8))); });
    // the new project: up from the plots into its orbit, then growing
    const np = planets.project, kn = clamp01((t - tNew) / 1.3);
    np.planet.visible = kn > 0;
    np.planet.scale.setScalar(0.35 + 0.65 * smooth((t - g0) / Math.max(0.3, g1 - g0)));
    np.planet.position.set(np.radius * K, 0, 0);
    if (kn > 0 && kn < 1) {
      cosmos.updateMatrixWorld(true);
      const w = planetAt("project"), p = new THREE.Vector3(0, 60, 0).lerp(w, inOut(kn));
      np.planet.position.copy(np.rot.worldToLocal(p));
    }
    cosmos.updateMatrixWorld(true);
    // the structure: a line from the project to each planet and the star
    const P = planetAt("project");
    tethers.forEach((th, i) => {
      const kt = clamp01((t - tWire - i * 0.25) / 0.6);
      th.m.visible = kt > 0;
      if (!th.m.visible) return;
      const target = th.to === "star" ? star.getWorldPosition(new THREE.Vector3()) : planetAt(th.to);
      beam(th.m, P, P.clone().lerp(target, outCubic(kt)));
    });
    // gifts, grants, contracts: a pulse from members, money and rules in to the project
    pulses.forEach((pu, i) => {
      const k = (t - CO.pulses[i]) / 0.7;
      pu.m.visible = k > 0 && k < 1;
      if (pu.m.visible) pu.m.position.copy(planetAt(pu.from).lerp(P, inOut(k)));
    });
  }
  function frame(t) {
    for (const r of rings) if (t < S.events.turn.rules) r.obj.visible = false;
    cameraAt(t);
    renderer.render(scene, camera);
    for (const l of labels) {
      const k = Math.min(span(t, l.t0, l.t0 + 0.3), 1 - span(t, l.t1 - 0.25, l.t1));
      if (k <= 0) { l.el.style.opacity = 0; continue; }
      v.copy(l.get()).project(camera);
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      // the name stays inside the frame even when its point is near an edge
      const dx = Math.min(0, W - 48 - (x + l.half)) + Math.max(0, 48 - (x - l.half));
      l.el.style.opacity = k;
      l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      l.text.style.transform = `translateX(${dx.toFixed(1)}px)`;
    }
  }
  return { renderAt, anchors };
}
