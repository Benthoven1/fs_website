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

STORY:   one story, told like a reel: the payoff first, then how it was done.
         - hook: "1731." on the East Prospect, full screen; "No lending library. No fire
           company. No hospital. No college." lands line by line; at "By 1751" a white
           flash and the finished model sweeping past, "1751 · All four."; Franklin's
           portrait wipes in, and behind it the model is taken back to its plinths
         - the founder in quick full-screen cuts (printer, writer, scientist, inventor);
           Trumbull's Declaration into the Constitution, a ring on "B Franklin", 1 of 6
         - each institution: archival plates full screen with slow camera moves, cut
           with its plot being built in 3D from the Anatomy designs (figures/*.mjs);
           the library dives into Birch's hall, the hospital into its 1751 Act
         - "four times": rules, members and money ringed on all four plots, then cuts
           to the press, the almanac and the kite
         - the academy: the hall rises; Franklin's 1749 Proposals full screen (useful
           subjects, in English, alongside Latin and Greek); 24 trustees, Franklin
           their president, at their bench and subscription box; College Hall
         - the turn to now: every institution's rules, members and money become
           spheres and rise off the plots, into the planets of Mulvium's own cosmos
           (the landing page's star, rings and pastel porcelain, js/main.js); the star
           arrives at "fiscal sponsor"; a new project's planet flies up into its orbit,
           is wired to the rest, takes gifts, grants and contracts, and grows
         - the close: the launch film's network, entering gathered to a point, opens
           out on "The next great expansion" and gathers into the wordmark

TYPE:    the narration's own words set as the picture where they carry it (the "No…"
         lines, the proverb, "only if", "Rules written.", "Four times.", "From day
         one:"); subtitles elsewhere, never both. Lora for set words, Major Mono
         Display (lower case) for kickers, IBM Plex Sans for subtitles and sources.

LOOK:    full-bleed archival plates with a scrim where type sits; between them the
         figures on a backdrop that turns deep in each institution's colour (blue,
         red, teal, green; a plum night for Mulvium's cosmos), porcelain between. No cards, tags,
         timeline or numbering. Figures in stone, walnut, oak, brass, pewter, leather
         and brick, flat colours, a fine outline on every solid.

MOTION:  parts arrive along one axis with a slight settle (0.75 s, back.out), slabs rise
         from the ground (0.9 s); the camera eases between shots and drifts slowly.
         Plates enter by cut, punch, wipe or dive (into the model's own document or
         bookcase) and leave by cut, wipe or rise; type slams or lands on its word.

SUBTITLES: only where the screen does not already set the words (CAPTION_FROM).

QA:      the model is seen being built at each plot; no frame where a card and a model
         label overlap; the ring lands on "B Franklin"; the readout reads £2,000 a side;
         no subtitle repeats words on screen; 28 px type floor; loudness -16 to -14 LUFS.
```
