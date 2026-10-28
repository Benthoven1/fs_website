"""prep.py — readies the essay's pictures: the archival files (as fetched from
Wikimedia Commons, the Library of Congress and the National Archives, named
as in CREDITS.md) become assets/img/<name>.jpg at a
size the film needs, and assets/img/sizes.json records each one's pixels for
build.mjs's camera.

  python3 prep.py <download-dir>

The pixels are left as they are: no grade, no filter. Franklin's signature
is cut out of its paper so it can be written onto the broadside.
A picture not yet downloaded gets a plain placeholder, so the film still builds.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1]
OUT = os.path.join(HERE, "assets", "img")
os.makedirs(OUT, exist_ok=True)
LONG = 2600  # no picture needs more on its long side
# ...except the panorama, panned at full height, and the two documents the
# camera reads a signature on
LONG_FOR = {"prospect": 5801, "declaration": 4300, "constitution4": 4300}

NAMES = ["prospect", "statehouse", "portrait", "press", "martin", "kite", "stove", "trumbull", "declaration", "constitution4",
         "library-hall", "lib-statue", "bucket", "bond", "hospital", "charter", "penn", "almanac"]
# where a name's file comes from, when it isn't <name>.jpg
ALIAS = {"kite": ["kite-hi", "kite"], "penn": ["college-hall", "penn-quad"]}
# the hospital is one half of a stereograph card
CROP = {"hospital": (0.075, 0.12, 0.495, 0.86)}
sizes = {}


def save(name, im):
    im = im.convert("RGB")
    long = LONG_FOR.get(name, LONG)
    if max(im.size) > long:
        k = long / max(im.size)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + ".jpg"), quality=90)
    sizes[name] = {"w": im.width, "h": im.height}


def source(name):
    for n in ALIAS.get(name, [name]):
        for d in (SRC, os.path.join(HERE, "assets")):
            p = os.path.join(d, n + ".jpg")
            if os.path.exists(p) and os.path.getsize(p) > 1000:
                return p


for name in NAMES:
    p = source(name)
    if p:
        im = Image.open(p)
        if name in CROP:  # (left, top, right, bottom) as fractions
            l, t, r, b = CROP[name]
            im = im.crop((round(l * im.width), round(t * im.height), round(r * im.width), round(b * im.height)))
        save(name, im)
    else:
        print("placeholder:", name)
        im = Image.new("RGB", (1200, 1600), (200, 190, 168))
        ImageDraw.Draw(im).text((60, 60), name, fill=(60, 50, 40))
        save(name, im)

# The signature: ink kept, paper made transparent
sig = os.path.join(SRC, "signature.jpg")
if os.path.exists(sig):
    im = Image.open(sig).convert("RGBA")  # rendered from an SVG: ink on transparency
    flat = Image.new("RGBA", im.size, "white")
    flat.alpha_composite(im)
    g = np.asarray(flat.convert("L"), float)
    alpha = np.clip((200 - g) * 2.2, 0, 255).astype("uint8")
    ink = np.zeros((*g.shape, 4), "uint8")
    ink[..., 0], ink[..., 1], ink[..., 2], ink[..., 3] = 27, 25, 21, alpha
    Image.fromarray(ink, "RGBA").save(os.path.join(OUT, "signature.png"))
else:
    print("placeholder: signature")
    Image.new("RGBA", (620, 250), (0, 0, 0, 0)).save(os.path.join(OUT, "signature.png"))

json.dump(sizes, open(os.path.join(OUT, "sizes.json"), "w"), indent=1)
print(len(sizes), "pictures")
