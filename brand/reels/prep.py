"""prep.py — the reels' archival scraps, fetched and printed.

Every picture in the reels is public domain (or CC0), from Wikimedia Commons.
This fetches each one, crops it, and gives it a print treatment, so the
collage reads as one set of scraps from one table:

  sepia        an old photograph or engraving, warm ink on aged paper
  duo:A:B      any picture as two inks, A for the shadows and B for the paper
  halftone:A:B a coarse dot screen, ink A on paper B, as a newspaper prints
  color        a painting or a coloured print, aged a little

It also writes CREDITS.md, from each file's own record on Commons.

  python3 brand/reels/prep.py            # fetches what is missing
  python3 brand/reels/prep.py --force    # fetches everything again
"""
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request

import numpy as np
from PIL import Image, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets")
CACHE = os.path.join(HERE, ".cache")
UA = "MulviumReels/1.0 (https://github.com/Benthoven1/fs_website)"

# name: (Commons file, crop as fractions (left, top, right, bottom), treatment, width)
ASSETS = json.load(open(os.path.join(HERE, "assets.json")))


def get(url, tries=10):
    for k in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=90).read()
        except Exception as e:  # Commons rate-limits; wait as it asks
            wait = 20
            if getattr(e, "headers", None) and e.headers.get("retry-after"):
                wait = int(e.headers["retry-after"]) + 2
            print(f"  {e}; again in {wait}s", flush=True)
            time.sleep(wait)
    raise SystemExit("could not fetch " + url)


def fetch(file, width):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, f"{width}-" + file.replace("/", "_"))
    if not os.path.exists(path):
        url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(file) + f"?width={width}"
        data = get(url)
        open(path, "wb").write(data)
        time.sleep(3)
    return Image.open(path)


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def duotone(gray, ink, paper):
    g = np.asarray(gray, dtype=np.float32)[..., None] / 255.0
    out = hexrgb(ink) * (1 - g) + hexrgb(paper) * g
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def halftone(gray, ink, paper, cell=7):
    """Dots on a 45° screen, each sized by the darkness beneath it."""
    g = np.asarray(gray, dtype=np.float32) / 255.0
    h, w = g.shape
    big = 3  # drawn at three times the size, then reduced, for smooth dots
    yy, xx = np.mgrid[0 : h * big, 0 : w * big].astype(np.float32) / big
    c, s = np.cos(np.pi / 4), np.sin(np.pi / 4)
    u, v = (xx * c + yy * s) / cell, (-xx * s + yy * c) / cell
    fu, fv = u - np.floor(u) - 0.5, v - np.floor(v) - 0.5
    # The darkness at each cell's centre sets its dot's radius
    cu, cv = np.floor(u) + 0.5, np.floor(v) + 0.5
    cx, cy = (cu * c - cv * s) * cell, (cu * s + cv * c) * cell
    dark = 1 - g[np.clip(cy.astype(int), 0, h - 1), np.clip(cx.astype(int), 0, w - 1)]
    r = np.sqrt(dark / np.pi) * 1.08
    dot = (np.sqrt(fu * fu + fv * fv) < r).astype(np.float32)
    dot = np.asarray(Image.fromarray((dot * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS), dtype=np.float32) / 255
    out = hexrgb(paper) * (1 - dot[..., None]) + hexrgb(ink) * dot[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def treat(im, how):
    im = im.convert("RGB")
    kind, *args = how.split(":")
    if kind == "color":
        im = ImageOps.autocontrast(im, cutoff=0.5)
        a = np.asarray(im, dtype=np.float32)
        gray = a.mean(axis=2, keepdims=True)
        a = gray + (a - gray) * 0.82  # a little faded
        a = a * np.array([1.0, 0.97, 0.9]) + np.array([8, 6, 0])  # and warmed
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    gray = ImageOps.autocontrast(im.convert("L"), cutoff=1)
    if kind == "sepia":
        return duotone(gray, "#2a1f17", "#efe3c8")
    if kind == "engrave":
        gray = ImageOps.autocontrast(gray.filter(ImageFilter.UnsharpMask(2, 120, 2)), cutoff=2)
        return duotone(gray, "#231a14", "#f1e7d0")
    if kind == "duo":
        return duotone(gray, "#" + args[0], "#" + args[1])
    if kind == "halftone":
        return halftone(gray, "#" + args[0], "#" + args[1], float(args[2]) if len(args) > 2 else 7)
    raise ValueError(how)


def credits():
    files = sorted({v[0] for v in ASSETS.values()})
    rows = []
    for i in range(0, len(files), 40):
        q = urllib.parse.urlencode({
            "action": "query", "format": "json", "prop": "imageinfo", "iiprop": "extmetadata|url",
            "iiextmetadatafilter": "LicenseShortName|Artist|DateTimeOriginal|Credit",
            "titles": "|".join("File:" + f for f in files[i : i + 40]),
        })
        data = json.loads(get("https://commons.wikimedia.org/w/api.php?" + q))
        for p in data["query"]["pages"].values():
            ii = p["imageinfo"][0]
            m = ii.get("extmetadata", {})
            clean = lambda k: " ".join(
                __import__("re").sub(r"<[^>]+>", " ", m.get(k, {}).get("value", "")).split())[:140]
            rows.append((p["title"][5:], clean("Artist") or "Unknown", clean("DateTimeOriginal"), clean("LicenseShortName"),
                         ii["descriptionurl"]))
    used = {v[0]: k for k, v in ASSETS.items()}
    lines = ["# Picture credits", "",
             "Every archival picture in the polymath reels comes from Wikimedia Commons and is in",
             "the public domain or dedicated to it (CC0). Each is cropped and printed anew by",
             "`prep.py` for the collage.", "",
             "| Used as | Commons file | By | Date | Licence |", "|---|---|---|---|---|"]
    for title, artist, date, lic, url in sorted(rows):
        names = ", ".join(k for k, v in ASSETS.items() if v[0] == title)
        lines.append(f"| {names} | [{title}]({url}) | {artist} | {date} | {lic} |")
    open(os.path.join(HERE, "CREDITS.md"), "w").write("\n".join(lines) + "\n")
    bad = [r for r in rows if not any(s in r[3].lower() for s in ("public domain", "cc0", "pd", "no restrictions"))]
    for r in bad:
        print("CHECK LICENCE:", r[0], r[3])


def main():
    os.makedirs(OUT, exist_ok=True)
    force = "--force" in sys.argv
    for name, (file, crop, how, width) in ASSETS.items():
        out = os.path.join(OUT, name + ".jpg")
        if os.path.exists(out) and not force:
            continue
        im = fetch(file, max(width, 1200) if width < 1200 else width)
        w, h = im.size
        l, t, r, b = crop
        im = im.crop((int(l * w), int(t * h), int(r * w), int(b * h)))
        if im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        treat(im, how).save(out, quality=86, optimize=True, progressive=True)
        print("wrote", os.path.relpath(out), im.size, flush=True)
    credits()


if __name__ == "__main__":
    main()
