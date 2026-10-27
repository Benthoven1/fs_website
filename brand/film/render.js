// render.js — renders the launch film to MP4, frame by frame, from the film
// page itself: each worker opens the page, seeks it to each of its frames,
// and pipes the screenshots into its own ffmpeg; the parts are then joined
// and the score laid under them.
//
// From the repository root, with Playwright and ffmpeg installed:
//   python3 -m http.server 8765 &
//   python3 brand/film/score.py    # optional: score.m4a is used otherwise
//   node brand/film/render.js brand/mulvium-launch-film-1920x1080.mp4 [workers] [from-s] [to-s]
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const OUT = process.argv[2] || "mulvium-launch-film.mp4";
const WORKERS = parseInt(process.argv[3] || "3", 10);
const URL = "http://localhost:8765/brand/film/index.html?render";
// The score as score.py writes it, or as the page plays it
const SCORE = ["score.wav", "score.m4a"].map((f) => path.join(__dirname, f)).find((f) => fs.existsSync(f)) || "";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "mulvium-film-"));

function ffmpeg(args) {
  const p = spawn("ffmpeg", ["-v", "error", "-y", ...args], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => p.on("close", (c) => (c ? rej(new Error("ffmpeg " + c)) : res())));
  return { stdin: p.stdin, done };
}

async function part(browser, i, from, to, fps) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => console.error("page:", e.message));
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => window.film, null, { timeout: 120000 });
  await page.evaluate(() => window.film.ready);
  const file = path.join(TMP, `part${i}.mp4`);
  // Near-lossless parts; the final encode is the only lossy step that shows
  const enc = ffmpeg(["-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "fast", "-crf", "8", "-pix_fmt", "yuv444p", file]);
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    await page.evaluate((t) => window.film.seek(t), f / fps);
    const png = await page.screenshot({ type: "png" });
    if (!enc.stdin.write(png)) await new Promise((r) => enc.stdin.once("drain", r));
    if ((f - from) % 150 === 0) console.log(`part ${i}: frame ${f} of ${from}–${to}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  enc.stdin.end();
  await enc.done;
  await page.close();
  return file;
}

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const probe = await browser.newPage();
  await probe.goto(URL, { waitUntil: "load" });
  await probe.waitForFunction(() => window.film, null, { timeout: 120000 });
  const { duration, fps } = await probe.evaluate(() => ({ duration: window.film.duration, fps: window.film.fps }));
  await probe.close();
  const first = Math.round(parseFloat(process.argv[4] || "0") * fps);
  const last = Math.round(parseFloat(process.argv[5] || String(duration)) * fps);
  const per = Math.ceil((last - first) / WORKERS);
  const ranges = [];
  for (let i = 0; i < WORKERS; i++) {
    const a = first + i * per, b = Math.min(last, a + per);
    if (a < b) ranges.push([a, b]);
  }
  const parts = await Promise.all(ranges.map(([a, b], i) => part(browser, i, a, b, fps)));
  await browser.close();

  const list = path.join(TMP, "parts.txt");
  fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
  const audio = SCORE
    ? ["-ss", String(first / fps), "-t", String((last - first) / fps), "-i", SCORE]
    : [];
  const enc = ffmpeg(["-f", "concat", "-safe", "0", "-i", list, ...audio,
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-tune", "film", "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-level", "4.2", "-movflags", "+faststart",
    ...(audio.length ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : []), OUT]);
  enc.stdin.end();
  await enc.done;
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log("wrote", OUT);
})();
