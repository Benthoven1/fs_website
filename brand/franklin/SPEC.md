# Franklin, institution builder — spec (v3)

```text
GOAL:    The viewer leaves understanding that Franklin founded four lasting
         institutions by one method, building each one's foundation from nothing,
         and that a fiscal sponsor (Mulvium) supplies that foundation today.

OUTPUT:  HyperFrames, 1080 x 1920, 30 fps, H.264 + AAC 48 kHz.

TIME:    the narration's length + 1.2 s lead-in + the close (~8 s); the voice is the clock:
         every move starts on its anchor word in timing.json. Lines that open a build
         carry a held beat before them (pause_before in script.json).

VOICE:   formal documentary register (Humanizer pass: no staged openers, no one-line
         closers, no aphorisms); declarative sentences, facts and dates.

STORY:   one place, no chapters. The isometric designs, drawn with the Anatomy kit
         (figures/*.mjs), are built in 3D (assets/lib/world.js, three.js) on a plain
         backdrop under the whole film; nothing else is modelled:
         - open: four empty plots, outlined, named; at "By 1751" the blueprints of
           what will stand on them appear
         - each institution in turn: the camera goes to its plot and it is built,
           part by part, every part travelling in and landing in place: the slab,
           its foundation (rules, members, money), then its own design
             library   50 brass subscriptions ride into the chest; the shelves fill
             fire      a rack, a bell, thirty leather buckets (figures/fire.mjs)
             hospital  the donors' column fills to the mark; the Assembly's pewter drops
             academy   a brick hall, portico, roof and cupola (figures/academy.mjs)
         - the camera stands back over all four; rules, members, money ringed on each
         - a fifth plot: one foundation shared, institutions in its sockets, a new
           project set in
         The archive's pictures and documents come up over the figures on cards, with a
         soft veil, and go again; documents also lie open on each plot's lectern.
         New figures are designed with the Anatomy kit first: its recorder writes
         <name>.parts.json, and the world builds that design part for part.

LOOK:    modern, predominantly porcelain.
         - backdrop: porcelain, leaning in turn to each institution's colour (pale blue,
           apricot, pale teal, sage, then rose for Mulvium); the figures' soft shadows
           are the only thing on it
         - figures: stone, walnut, oak, brass, pewter, leather, brick; flat colours only,
           a fine drawn outline on every solid
         - cards: #F9F8F5, 1 px #D9D4CA, radius 28; ink #1B1613; muted #5C544E; clay #B87758
         - accents: library #4D6D96, fire #A8603F, hospital #357F77, academy #55804A,
           Mulvium #9A5571
         - type, as on the site: Lora (titles, figures, names), Major Mono Display in
           lower case (kickers, labels, tags), IBM Plex Sans (small text, subtitles)

MOTION:  parts arrive along one axis with a slight settle (0.75 s, back.out), slabs rise
         from the ground (0.9 s); the camera eases between shots and drifts slowly
         between moves; cards expo.out 0.5-0.6 s, exits blur out in 0.2-0.25 s.

SUBTITLES: only where the screen does not already set the words (CAPTION_FROM).

QA:      the model is seen being built at each plot; no frame where a card and a model
         label overlap; the ring lands on "B Franklin"; the readout reads £2,000 a side;
         no subtitle repeats words on screen; 28 px type floor; loudness -16 to -14 LUFS.
```
