// foundations.mjs — Figs. 6a and 6b: what every institution needs under it.
// 6a: four separate plinths, each carrying its own strongbox (money), card
// cabinet (members) and rule stand (rules), with its own work on top: four
// times the same foundation, built from nothing each time.
// 6b: one plinth whose back row carries a single set of those services, and
// a rail of sockets along the front; institutions plug into the rail, and a
// new project slides into the empty socket.
import { k, writeFigure, screen, build, LIFT } from "./common.mjs";

const W = 1000, H = 760;
const FOOT_H = 4;

function kit(P) {
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (pts, style) => k.dotsSvg(pts, style);
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

  function plinth(plan, h) {
    const out = [`<path class="iso-halo" d="${k.haloOf(plan, -h - FOOT_H, h, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(plan, 12))) {
      out.push(S(k.cylinder(x, y, 5, -h - FOOT_H, 1.4, P, 24), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 3.8, -h - FOOT_H + 1.4, FOOT_H - 1.4, P, 24), { tone: "mid" }));
    }
    out.push(S(k.slabOf(plan, -h, h, P, 8, 1.2), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(plan, 4), 0, P), { tone: "lo" }));
    const screws = k.corners(plan, 8);
    out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.8, 0, P, 14)).join(""), { tone: "lo" }));
    out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.45 }));
    return out.join("");
  }
  // money: a strongbox with a lid, a hasp and corner straps
  function strongbox(x, y, s = 1) {
    const b = { x, y, w: 26 * s, d: 26 * s, r: 2 }, h = 18 * s;
    const out = [S(k.slabOf(b, 0, h, P, 4, 0.6), { tone: "hi" })];
    const lid = { x: x - 1.4, y: y - 1.4, w: b.w + 2.8, d: b.d + 2.8, r: 2.6 };
    out.push(S(k.slabOf(lid, h, 6 * s, P, 4, 0.8), { tone: "hi" }));
    out.push(L(k.planOutline(k.insetPlan(lid, 3), h + 6 * s, P), { tone: "faint" }));
    const fx = x + b.w;
    out.push(S(k.slabOf({ x: fx, y: y + b.d / 2 - 3 * s, w: 1.2, d: 6 * s, r: 0.4 }, h - 7 * s, 10 * s, P, 2), { tone: "hi" }));
    out.push(D([at([fx + 1.2, y + b.d / 2, h - 3 * s])], { size: 0.7 * s, tone: "hi" }));
    for (const yy of [y + 4 * s, y + b.d - 4 * s]) out.push(L(k.segment([fx, yy, 1.5], [fx, yy, h - 1], P), { tone: "lo" }));
    return out.join("");
  }
  // members: a card cabinet, two drawers with pulls and label frames
  function cabinet(x, y, s = 1) {
    const b = { x, y, w: 22 * s, d: 28 * s, r: 1.6 }, h = 26 * s;
    const out = [S(k.slabOf(b, 0, h, P, 4, 0.6), { tone: "hi" })];
    const fx = x + b.w;
    for (const z of [h / 2]) out.push(L(k.segment([fx, y + 2, z], [fx, y + b.d - 2, z], P), { tone: "lo" }));
    for (const z of [h * 0.75, h * 0.25]) {
      out.push(L(k.segment([fx, y + b.d / 2 - 5 * s, z + 2.4 * s], [fx, y + b.d / 2 + 5 * s, z + 2.4 * s], P), { tone: "faint" }));
      out.push(S(k.slabOf({ x: fx, y: y + b.d / 2 - 3 * s, w: 1.6, d: 6 * s, r: 0.6 }, z - 1.2 * s, 2.4 * s, P, 2), { tone: "hi" }));
    }
    return out.join("");
  }
  // rules: a stand with a closed book of articles on it
  function rulestand(x, y, s = 1) {
    const stand = { x, y, w: 20 * s, d: 20 * s, r: 1.6 };
    const out = [S(k.slabOf(stand, 0, 10 * s, P, 4, 0.5), { tone: "mid" })];
    const book = { x: x + 2 * s, y: y + 2 * s, w: 16 * s, d: 16 * s, r: 0.8 };
    out.push(S(k.slabOf(book, 10 * s, 4 * s, P, 3, 0.4), { tone: "hi" }));
    out.push(L(k.sideSeam(book, 10 * s + 2 * s, P), { tone: "faint" }));
    out.push(L(k.lineOnTop([book.x + 3 * s, book.y + 3 * s], [book.x + book.w - 3 * s, book.y + 3 * s], 14 * s, P), { tone: "lo" }));
    return out.join("");
  }
  // the institution's own work: a lit block with ribs on its front
  function work(x, y, accent, w = 22, d = 22, h = 40) {
    const b = { x, y, w, d, r: 2 };
    const out = [S(k.slabOf(b, 0, h, P, 4, 0.8), { tone: "hi", lit: true, crease: "lo" })];
    const fx = x + w;
    for (let z = 8; z < h - 4; z += 8) out.push(L(k.segment([fx, y + 3, z], [fx, y + d - 3, z], P), { tone: "lit" }));
    out.push(L(k.planOutline(k.insetPlan(b, 3), h, P), { tone: "lit" }));
    return `<g data-own="${accent}">${out.join("")}</g>`;
  }
  return { at, S, L, D, byDepth, plinth, strongbox, cabinet, rulestand, work };
}

// ── 6a: four foundations ───────────────────────────────────────────────────
{
  const UNITS = [["library", -110, -110], ["fire", -110, 10], ["hospital", 10, -110], ["academy", 10, 10]];
  const pts = UNITS.flatMap(([, x, y]) => k.boxCorners({ x, y, w: 100, d: 100 }, -14, 50));
  const P = k.fitProjection(pts, W, H, { pad: 50, azimuth: 45 });
  const K = kit(P);
  const order = [...UNITS].sort((a, b) => k.depthOf([a[1] + 50, a[2] + 50, 0], P) - k.depthOf([b[1] + 50, b[2] + 50, 0], P));
  // each unit is built whole before the next starts: plinth, rules, members, money, work
  const body = order.map(([name, x, y]) => {
    const u = UNITS.findIndex((v) => v[0] === name) * 5;
    const unit = [
      build(u, K.plinth({ x, y, w: 100, d: 100, r: 6 }, 10)),
      build(u + 1, K.rulestand(x + 12, y + 14)),
      build(u + 2, K.cabinet(x + 12, y + 50)),
      build(u + 3, K.strongbox(x + 46, y + 12)),
      build(u + 4, K.work(x + 52, y + 52, name)),
    ].join("");
    return `<g data-part="unit-${name}">${unit}</g>`;
  });
  writeFigure("foundations-four", {
    width: W, height: H, accent: "library",
    label: "Four separate plinths, each with its own strongbox, card cabinet and rule stand under its own work: the same foundation built four times.",
    body,
    moves: { lift: screen(P, [0, 0, LIFT]) },
  });
}

// ── 6b: one shared foundation ──────────────────────────────────────────────
{
  const PL = { x: -70, y: -190, w: 140, d: 380, r: 8 };
  const P = k.fitProjection([...k.boxCorners(PL, -16, 60)], W, H, { pad: 50, azimuth: 52 });
  const K = kit(P);
  const SOCKETS = [-150, -78, -6, 66, 138];
  const RAIL = { x: 10, y: -176, w: 12, d: 352, r: 2 };
  const out = [build(0, K.plinth(PL, 12))];
  // the shared services, once, along the back
  out.push(build(1, K.rulestand(-58, -150, 1.5)), build(2, K.cabinet(-60, -60, 1.5)), build(3, K.strongbox(-62, 50, 1.5)));
  // a bus bar from the services to the rail, and the rail
  out.push(build(4, K.S(k.slabOf({ x: -16, y: -170, w: 26, d: 6, r: 1 }, 0, 3, P, 2), { tone: "mid" })
    + K.S(k.slabOf(RAIL, 0, 5, P, 4, 0.5), { tone: "mid" })
    + K.L(k.lineOnTop([RAIL.x + 6, RAIL.y + 4], [RAIL.x + 6, RAIL.y + RAIL.d - 4], 5, P), { tone: "faint" })));
  const sockets = SOCKETS.map((y) => {
    const s = { x: RAIL.x + 14, y: y - 2, w: 30, d: 30, r: 2 };
    return K.S(k.slabOf(s, 0, 2, P, 3), { tone: "lo", crease: "none" }) + K.D([K.at([s.x + 4, y + 13, 2]), K.at([s.x + 26, y + 13, 2])], { size: 0.5 });
  });
  out.push(...sockets.map((svg, i) => build(4.6 + i * 0.15, svg)));
  const plugged = [["library", SOCKETS[0]], ["fire", SOCKETS[1]], ["hospital", SOCKETS[2]], ["academy", SOCKETS[3]]];
  plugged.forEach(([name, y], i) => out.push(build(5.6 + i * 0.4, `<g data-part="mod-${name}">${K.work(RAIL.x + 18, y + 2, name, 22, 22, 34)}</g>`)));
  // the new project: in front of the last socket, ready to slide in
  out.push(`<g data-part="new" transform="${k.translateAlong(P, [70, 0, 0])}">${K.work(RAIL.x + 18, SOCKETS[4] + 2, "mulvium", 22, 22, 34)}</g>`);
  writeFigure("foundations-shared", {
    width: W, height: H, accent: "mulvium",
    label: "One plinth carries a single strongbox, card cabinet and rule stand at the back and a rail of sockets at the front; four institutions are plugged into the rail and a new project slides into the fifth socket.",
    body: out,
    moves: { lift: screen(P, [0, 0, LIFT]), newAt: screen(P, [70, 0, 0]), newIn: screen(P, [-70, 0, 0]) },
  });
}
