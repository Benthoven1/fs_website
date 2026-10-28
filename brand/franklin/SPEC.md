# Franklin, institution builder — spec

```text
GOAL:    The viewer leaves knowing Franklin built four lasting institutions by hand, each from
         scratch, and that Mulvium exists so the next founder doesn't have to: they remember
         the Library Company, the matching grant, and the word "institutions".

OUTPUT:  HyperFrames, 1080 x 1920, 30 fps, H.264 + AAC 48 kHz.

TIME:    ~150 s (the narration's length + 1.2 s lead-in + the 7 s close) x 30 = ~4,500 frames.
         The voice is the clock: every beat starts on its anchor word in timing.json.
         Music bed: Bach, Prelude in C major, BWV 846 (Ishizaka, CC0), ~66 bpm, under the voice.

LOOK:    The medium is Franklin's own print shop, plus the real paintings and papers of his city.
         - paper:  laid rag paper #EDE3CB, chain lines every 28 px at 5%, fibre noise 3%,
                   deckled edges on loose sheets; never a gradient.
         - ink:    letterpress black #1B1915: every word that is read, every rule. Ink spreads
                   0.6 px; type is "pressed": a 1 px lighter inner edge at 30%.
         - red:    Poor Richard red #A8261B, the second plate of his almanac: ONE element per
                   frame (a strike-through, a year, a circled signature, the key word).
         - pictures: real paintings, engravings, documents and photographs, full-bleed or as
                   sheets laid on the paper; a sheet's shadow 0 18 px 44 px rgba(40,24,8,.30).
         - display: IM Fell English 400 (the Fell types, cut 1670s-80s), 132-190 px, tracking 0;
                   IM Fell English SC for labels, 46-60 px, tracking +4%.
         - text:    Libre Caslon Text 400/700 (Caslon, the face Franklin bought), captions 50 px,
                   line-height 1.22, ink on a paper slip at 92% when over a picture.
         - light:  grain 4%, warm vignette 10% at the corners; no glow anywhere.

OBJECTS: the 1754 Scull & Heap East Prospect of Philadelphia (four engraved sheets); Duplessis's
         portrait; Trumbull's Declaration; the engrossed Declaration and page 4 of the
         Constitution with Franklin's own signature circled in red; a printed broadside listing
         what the city lacked; the Junto's trades set in type; a subscription list filling to 50;
         Birch's 1799 Library Hall; an ounce and a pound (the proverb set as a broadside); a
         leather fire bucket; Pennsylvania Hospital; a two-column ledger, £2,000 each side; the
         1755 College charter; Penn today; the Poor Richard almanac; West's kite and lightning; a
         printer's iron chase that locks a project's type in place (the "home"); the Mulvium
         cosmos and wordmark.

MOTION:  arrive expo.out 0.6-0.9 s (sheets), 0.12 s (type, a press "kiss": scale 1.035->1,
         blur 3->0 px, opacity 0->1, words 3 frames apart); camera power2.inOut, 3-6 s glides,
         at most 1.08x push on a held picture; exits power3.in, 60% of the entrance; red rules
         are pen strokes, stroke-dashoffset over 0.35 s power2.inOut; a landed title is still.
         Motion blur on (data-motion-blur) for whips and sheet slides.

SHOTS:   (sections follow the script; each line's anchor word starts its move)
  HOOK   1 The East Prospect, full height, the camera travelling along the waterfront;
           "PHILADELPHIA" set across it from frame 0 (thumbnail); "1731" pressed in red on "1731".
         2 A printed broadside, "WANTED in this City": A Lending Library / A Fire Company /
           A Hospital / A College; each struck in red as it is named ("No ...").
         3 "Twenty years later": the strikes lift, each line gets its year (1731, 1736, 1751,
           1751); "one man" -> Franklin's signature writes itself under the list.
  WHO    4 Duplessis portrait, slow push to the eyes; "printer, writer, scientist, inventor":
           four hard cuts, 0.5-0.8 s each (press, almanac, kite, the Pennsylvania fire-place).
         5 "Founding Father": Trumbull's Declaration, glide to Franklin at the table; "signed
           both": the engrossed Declaration, then Constitution page 4, his signature circled red.
         6 "A polymath, pointed at the public good": a printer's manicule (the pointing hand)
           slides in and points at THE PUBLIC GOOD, set in red.
  LIB    7 "the Junto": a 1727 imprint line; the trades set in type, one per word as the voice
           runs (scrivener, glazier, surveyor, shoemaker, joiner, printer, clerk); "read,
           debate, and improve" pressed one by one.
         8 "pooled their own books" -> "fifty subscribers": a subscription list filling to 50
           lines with a running count; "forty shillings each" lands as 40s.
         9 Birch's Library Hall (1799), zoom through its door; "still open today":
           1731 -> TODAY; "America's oldest cultural institution" as the line.
  FIRE   10 "Fire": the paper chars from the edge and burns through to the next shot.
         11 The proverb as a broadside, AN OUNCE / OF PREVENTION / IS WORTH A POUND / OF CURE;
           "Union Fire Company": the bucket, a real 18th-century leather fire bucket.
  HOSP   12 Thomas Bond / the hospital; "two thousand pounds": a ledger, two columns; the
           Assembly's column is dashed and empty until the donors' column counts to £2,000,
           then it prints at once. "matching grants" in red.
  ACAD   13 The 1755 charter, glide over its seal; "University of Pennsylvania": Penn today.
  TURN   14 "But here is the thing": everything stops; the four institutions as four plates.
         15 "built from scratch": each paper named is laid on the pile (agreements,
           subscriptions, fundraising, books), a soft thud each.
         16 "four times" x4; press, almanac and the kite's lightning, one cut each.
  NOW    17 "start from zero": the pile lifts away; the chase drops in, its quoins lock on
           "home from day one"; "accept gifts / win grants / sign contracts" stamp in red-ruled
           furniture; "while the founder does the work": Franklin at the press.
  END    18 "That is what Mulvium is building": the four plates become the cosmos (the launch
           film's own close, clean plate); "a home for the next Franklin."
         19 "institutions." in red-clay; the wordmark.

BANNED:  dark void grounds; glow, bloom, particles; purple/blue gradients; pills and chips
         (the wordmark plate's own CTA is hidden); italic accent words (emphasis is the red
         plate); monospace labels; "01/02" numbering; three cards in a row; everything fading
         and sliding up; titles drifting after they land; slow creeping scale on titles; collage
         piles of cut-outs (the v1 tell); the same whoosh on every cut; ken-burns on every shot
         at the same speed and direction.

QA:      frame 0 reads "PHILADELPHIA" over the prospect; each strike lands on its noun;
         Franklin's signature on the Declaration and Constitution is the one circled; the ledger
         reads £2,000 both sides; every year on screen matches the voice; captions inside
         168-1330 px; phone sheet legible at 360 px; loudness -16 to -14 LUFS, true peak <= -1.
```
