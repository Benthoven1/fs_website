# Franklin, institution builder — spec (v3)

```text
GOAL:    The viewer leaves understanding, as a textbook would put it, that Franklin
         founded four lasting institutions by one method, building each one's
         foundation from nothing, and that a fiscal sponsor (Mulvium) supplies that
         foundation today.

OUTPUT:  HyperFrames, 1080 x 1920, 30 fps, H.264 + AAC 48 kHz.

TIME:    the narration's length + 1.2 s lead-in + the close (~8 s); the voice is the clock:
         every move starts on its anchor word in timing.json.

VOICE:   formal documentary register (Humanizer pass: no staged openers, no one-line
         closers, no aphorisms); declarative sentences, facts and dates.

LOOK:    the Mulvium site's porcelain, set like a business-channel textbook.
         - ground: #ECEAE5, lit from above (#F5F3EF at 30% height to #E3DFD8 at the edges)
         - cards: #F9F8F5, 1 px #D9D4CA, radius 28, shadow 0 18 48 rgba(27,22,19,.10)
         - ink #1B1613; muted #5C544E; one clay accent #B87758 for numbers that matter
         - one colour per institution, from the site's planet palette, deepened:
           library #4D6D96, fire #A8603F, hospital #357F77, academy #55804A, Mulvium #9A5571
         - type: IBM Plex Sans 600/700 (titles, figures), IBM Plex Mono 400/500 (kickers,
           captions, sources, 28 px minimum), Lora (the close)
         - every picture is a numbered figure with its source: "FIG. 2.2 ... · LOC"

DEVICES: a chapter header (kicker + title) and a 1725-1755 timeline whose needle visits
         each year and marks each founding in its colour; key-figure counters; tags;
         a four-step process; and four isometric machines (Anatomy kit, figures/):
         2.1 the subscription library (50 coin stacks -> hopper -> bookcase)
         4.3 the matching grant (donors' column trips the Assembly's latch)
         6.1 four foundations (each with its own rules, members and money)
         7.1 one shared foundation (services once, a rail of sockets, a new project)

MOTION:  each machine is put together on screen: every part lowers into place along
         the figure's vertical in build order (plinth first, the lit subject last),
         0.5 s expo.out each; then it runs on the narration (coins ride to the hopper,
         the latch drops the stack, the module slides into its socket).
         Cards: expo.out 0.5-0.6 s from below, a side or a slight zoom (varied);
         exits blur out in 0.2-0.25 s; titles enter word by word; counters count.

SUBTITLES: only where the screen does not already set the words (CAPTION_FROM).

BANNED:  dark grounds, glow, gradients beyond the ground's light; pill chips; three
         identical cards as the whole layout; all text centred; every element fading
         up the same way; italic accent words (the close's "institutions." is the
         brand's own); decoration on figures that is not a real part.

QA:      frame 0 shows the East Prospect and the chapter header; the ring lands on
         "B Franklin"; the ledger reads £2,000 a side; each machine is seen being built;
         no subtitle repeats words on screen; 28 px type floor outside the machines;
         loudness -16 to -14 LUFS.
```
