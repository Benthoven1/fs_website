// capture.js — frames of the launch film without its words (brand/film/
// ?clean), for the launch email's GIFs: one page per range, at FPS.
//   node email/launch/capture.js name:from:to ...   (frames land in frames/name/)
const { chromium } = require("playwright");
const fs = require("fs");
const FPS = 12;
(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  await Promise.all(process.argv.slice(2).map(async (spec) => {
    const [name, a, b] = spec.split(":");
    fs.mkdirSync(`frames/${name}`, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on("pageerror", (e) => console.error(name, e.message));
    await page.goto("http://localhost:8765/brand/film/index.html?render&clean", { waitUntil: "load" });
    await page.waitForFunction(() => window.film, null, { timeout: 120000 });
    await page.evaluate(() => window.film.ready);
    const n = Math.round((b - a) * FPS);
    for (let i = 0; i < n; i++) {
      await page.evaluate((t) => window.film.seek(t), +a + i / FPS);
      await page.screenshot({ path: `frames/${name}/${String(i).padStart(4, "0")}.png`, timeout: 120000 });
    }
    console.log(name, n, "frames");
  }));
  await browser.close();
})();
