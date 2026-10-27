// dump.mjs — a story's timeline as JSON, for score.py: its cues, and every
// scrap, stamp, tear and caption the picture lands, so the score can land them
// too.   node brand/reels/dump.mjs franklin
const id = process.argv[2] || "franklin";
const S = (await import(`./stories/${id}.js`)).default;
const events = [];
for (const scene of ["past", "now"]) {
  for (const p of S[scene].pieces) {
    const size = p.kind === "disc" ? (p.r * 2) ** 2 : (p.w || 300) * (p.h || p.w * 0.7 || 200);
    events.push({ t: p.at, kind: p.kind, enter: p.enter, size, dur: p.dur || 0, scene, n: p.kind === "ransom" ? p.text.replace(/ /g, "").length : 1 });
    if (p.out !== undefined) events.push({ t: p.out, kind: "off", enter: "off", size, scene });
  }
  for (const c of S[scene].captions || []) c.lines.forEach((l, i) => events.push({ t: c.t[0] + i * (c.stagger ?? 0.22), kind: "caption", enter: "slap", size: 60000, scene }));
}
events.sort((a, b) => a.t - b.t);
console.log(JSON.stringify({ id: S.id, end: S.end, tear: S.tear, duration: S.end.duration, music: S.music, beats: S.beats || [], events }));
