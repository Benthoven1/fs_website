// cues.js — the sounds the picture makes (essay.sfx) and its closing cues,
// read from the page itself, for the soundtrack (soundtrack.py):
//   node brand/franklin/cues.js      (with the site served on :8765)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto("http://localhost:8765/brand/franklin/index.html?render");
  await page.waitForFunction(() => window.essay, null, { timeout: 120000 });
  const out = await page.evaluate(() => ({ duration: window.essay.duration, cues: window.essay.cues, sfx: window.essay.sfx }));
  fs.writeFileSync(path.join(__dirname, "cues.json"), JSON.stringify(out, null, 1));
  console.log(out.sfx.length, "sounds,", out.duration.toFixed(2), "s");
  await browser.close();
})();
