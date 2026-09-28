# Club Scottsdale · Pursuit 05 / The ecosystem

The Club Scottsdale chapter of the Pursuit site, built around the real footage, as one
guided film. The first scroll starts it; it then plays every clip, still, title and
transition in order by itself, and ends on the Pursuit application.

Club Scottsdale is presented as one of the environments around Pursuit, not as
something Pursuit owns.

## Run it

Serve the repo root over HTTP with byte-range support (Safari will not play video
without it), then open it:

```
npx serve .                     # or any static server that supports Range requests
```

Designed first at 390 × 844. Desktop is designed, not scaled. `?debug` shows the film
clock and the clip carrying it; `window.ClubScottsdale` in the console has helpers
(`state()`, `chapters()`, `clips()`, `seek(t)`, `pause()`, `resume()`, `skip()`).

## The film

About 68 s on every screen. The story: enter the place, explore it, learn from
experience, see the relationships and perspectives, discover the amenities, understand
the connection to Pursuit, apply. People are named from the client's identification.

| | Chapter | Media | On screen |
|---|---|---|---|
| 1 | Enter | Cover still, drone | *Enter the ecosystem.* / CLUB SCOTTSDALE · SCOTTSDALE, ARIZONA / *Scroll once to begin.* / *A one-minute look inside.* The first scroll, tap or key starts the film; the cover cuts to black and the drone descends and flies over the cars. |
| 2 | Step inside | FPV flight (the pass over the cars at 1.25×) | STEP INSIDE (light, open-tracked sans) over the threshold, then the room names in large serif, one at a time, with the numbered list of rooms beside them previewing what comes next: 01 THE LOUNGE, 02 THE FLOOR, 03 THE COLLECTION, 04 THE MEETING SPACE. |
| 3 | Learn | Session photo, Jeremy Miner clip, a presenter teaching in the lounge room, a speaker on the mic, applause | *Who you learn from matters.* (over the photo) · **Jeremy Miner** / Sales trainer · Founder, 7th Level (over his clip, ~3.3 s) · two more teaching moments, wordless · the audience. |
| 4 | Connect | Table, dinner, room, Kyler Murray clip, Lanctot & Menery photo, conversation | *Build relationships beyond the workday.* · **Kyler Murray** / NFL quarterback / AT CLUB SCOTTSDALE (clip, ~3.4 s) · **Bob Menery** and **Michael Lanctot**, each name under their own face / AT CLUB SCOTTSDALE (photo, 3 s). |
| 5 | Beyond the workday | Helicopter still, 9 amenity shots | The helicopter, wordless. Then *Space to connect, create, and unwind.* with a small label naming each group as it plays: CONNECT (DJ, card room, lounge), CREATE (podcast), UNWIND (sim racing, pickleball, barber, terrace). |
| 6 | Pursuit | — | *Club Scottsdale is one of the rooms where the Pursuit ecosystem comes together.* Then *Build your next chapter with Pursuit.* / **Apply to Pursuit** / Watch again. The film controls retire. |

## Typography

| Role | Face | Phone | Desktop |
|---|---|---|---|
| Statements and names (Learn, Jeremy Miner, Connect, Bob Menery / Michael Lanctot, the amenities line, the Pursuit line, the closing title) | Instrument Serif 400, sentence case, the key word in italic, line height 1.06; all one size | 28–40 px | 34–52 px |
| Kyler Murray, the room names | Instrument Serif 400, uppercase, line height 0.9 | up to 13 % of the width | up to 132 px |
| Step inside | Outfit 300, uppercase, 0.34 em tracking | 20–30 px | 24–36 px |
| Cover title | Instrument Serif 400, uppercase, open tracking, one line | 22–29 px | 30–52 px |
| Labels (role, context, room list, group, chapter) | Outfit, uppercase, 0.3 em tracking | 9.5–10.5 px | same |

Every phrase enters and leaves whole, and a new phrase arrives only after the previous
one has fully gone (audited every 50 ms: no two ever overlap). Room names change letter
by letter. Phones show clips full screen and photographs across the top at a width that
keeps everyone in frame, with the words beneath; desktop shows each person moment in a
portrait panel with the words beside it.

## How it plays

- **One clock.** A paused GSAP timeline holds every transition. Each frame it is set to
  the film time, and every clip is slaved to the same time. While a clip carries the
  picture, the clock follows that clip, so a clip that is still buffering holds the film
  rather than drifting out of sync. The film is a pure function of its time, so seeking
  either way is just setting the time: nothing restarts, loops or replays a first frame.
- **Scroll lock.** From the opening screen until the end, the page does not scroll
  (overflow hidden, plus wheel, touch and scroll keys stopped). It is released when the
  film ends, when Skip is pressed, or if anything throws. Seeking back after the end
  locks it again.
- **Controls.** A discreet bar along the bottom: pause/resume, a timeline with a tick
  for each chapter (tap or drag to seek, arrow keys ±5 s, Page keys by chapter, Home/End),
  the chapter name, and Skip, which moves one chapter on (through a brief dip to black) and from the last chapter finishes the film. The controls retire when the film ends; Watch again brings them back. Tapping the picture or pressing Space also pauses. While
  paused, a scroll resumes. The film pauses itself when the tab is hidden and resumes
  when it returns.
- **Preloading.** Each clip loads about 11 s before it plays (the first three during the
  opening screen) and gives its buffers back 15 s after. Posters are first frames; the
  split uses a still of the neon's exact last frame, decoded in advance.
- **Low Power Mode.** iOS in Low Power Mode (and some in-app browsers) will not start a
  video the page plays by itself, only one started from a touch. Every touch, tap and key
  press therefore "unlocks" every clip (play, then pause at once), so the swipe that
  starts the film is enough for the whole film. If a phone still refuses, the film holds
  on the current frame with a *Tap to play* button; one tap unlocks everything and it runs
  to the end.
- **Text.** A line rises a few pixels as it fades in and a few more as it fades out; nothing is masked, and a new line only arrives once the previous one has fully gone (a room name, too). Checked by stepping the whole film every 50 ms: no two titles are ever visible at once.
- **Fits the screen.** The page is one screen tall: `html`, `body` and the film fill the
  viewport inside the safe-area padding the artifact viewer puts on `:root` in the phone
  app, so the controls and the bottom lines are never below the fold.
- **When a clip fails.** A clip that errors is skipped at once. A clip that is still
  arriving is waited for (the film holds on its current frame; phones do not preload, so
  the first clip after the cover often needs a moment); only a clip with no progress at
  all for 4 s (6 s mid-play), or 25 s of waiting in total, is skipped. The film moves on to
  wherever the next beat begins. A watchdog moves the film on if the clock ever stops
  for 8 s.

## Media pipeline

The master (`source-media/club-scottsdale-master.MOV`) is never written to. Everything
the page uses comes from one script, one generation from the master:

```
python3 scripts/build_media.py          # builds anything missing, removes anything no longer used
python3 scripts/build_media.py --force  # rebuilds everything
```

It also builds the cover from the supplied still in `source-media/cover/` (a wide version, and a composed portrait for phones). It writes source-quality PNG stills to `source-media/stills/` and production media to
`public/media/club-scottsdale/` (clips, posters, AVIF/WebP stills, `manifest.js`). In/out
points, crops, speed, grade and still times all live at the top of the script; trims are
frame-exact so the amenity counter and the room names stay in sync. Slow motion goes
through a lossless intermediate in `build/cache/` (not committed): the drone's rise off the tent is reversed and plays at 0.4×. See
`source-media/media-map.md` for the scene map and the selects.

| | |
|---|---|
| Codecs | HEVC (`hvc1`) for Safari/iOS, H.264 for everything else; muted, 1 s GOP, faststart |
| Sizes | 1080×1920 portrait; 720×1280 for Save-Data, 2G/3G and small screens; 1080×810 per-shot crops for landscape screens |
| Weight | HEVC set about 14 MB for the whole film (H.264 1080 about 21 MB), fetched as it plays |

## Accessibility and performance

- `prefers-reduced-motion`: no zooms or push-ins; the split becomes a fade.
- Every stage has a text alternative; the stills have alt text; a skip link jumps to
  the application.
- Only transforms, opacity and clip-path are animated. Only clips near the playhead
  hold decoded video.

## Files

```
index.html                     the film stage: every layer, the controls, the CTA
css/club.css                   tokens, type, layouts (html.wide = landscape ≥ 900px)
js/club.js                     film clock, timeline, clip sync, controls, scroll lock
vendor/gsap.min.js             GSAP 3 (the only library)
assets/fonts/                  Instrument Serif, Outfit
scripts/build_media.py         master → production media
source-media/                  the master, its media map, source-quality stills
public/media/club-scottsdale/  generated production media
```

## Notes

- The header and the Apply button are stand-ins so the entrance and exit can be judged in
  context; the button's link is a placeholder.
- The tent logo is about 97 px wide in the source frame against about 760 px for the
  neon's CS, so the opening is a positional match with a dissolve rather than a size
  match (a size match would need an ~8× blow-up).
- Desktop full-screen clips crop vertical footage (1080 px wide) to landscape, so they are
  softer than on a phone.
