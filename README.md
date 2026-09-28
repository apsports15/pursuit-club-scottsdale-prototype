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

About 73 s on every screen, in five chapters (Skip moves one chapter on). The story:
enter the place, move inside, see the rooms, meet the people, understand what happens
there, connect it back to Pursuit, apply. People are named from the client's identification.

| | Chapter | Media | On screen |
|---|---|---|---|
| 01 | Enter | Cover still, drone | ENTER THE ECOSYSTEM / CLUB SCOTTSDALE · SCOTTSDALE, ARIZONA. The first scroll, tap or key starts the film; the cover cuts to black and the drone descends, then (on phones) eases out to the footage's full width for the flyover over the cars, under one caption: THE CLUB FROM ABOVE. |
| 02 | Inside | The whole FPV flight: the doorway, front desk and white sectionals, the event floor (0.9×), the collection (1.25×), the white-sofa room played to its own cut (0.9×) | 01 — A Look Inside / THROUGH THE FRONT DOOR holds over the entrance and front desk, on the same line the rooms use. Then each room once it is on screen: 02 — The Floor, 03 — The Collection, 04 — The Lounge. |
| 03 | People | Session photo, Jeremy Miner, teaching, the mic, applause, dinner, the room, Kyler Murray, Bob Menery & Michael Lanctot, conversation | 03 — THE PEOPLE / Learn from people who have already *done it.* / SALES TRAINERS · ATHLETES · MENTORS (under the photo, apart from any name) · SALES TRAINER · FOUNDER, 7TH LEVEL / Jeremy Miner · NFL QUARTERBACK / KYLER MURRAY / AT CLUB SCOTTSDALE · Bob Menery / MEDIA PERSONALITY (left) and Michael Lanctot / MENTOR / YNR (right), set like the site's Ayden Parks and Michael Lanctot / AT CLUB SCOTTSDALE. |
| 04 | Amenities | Helicopter still, 10 amenity shots | The helicopter, wordless. Then one caption per group: CONNECT (DJ, card room, chesterfield, the seated group on the white sofa) / *Conversations that continue beyond the presentation.* · CREATE (the podcast take, whole, and the studio) / *Media, ideas, and content in motion.* · UNWIND / *A place to stay after the work is done.* |
| 05 | Pursuit | Black | The terrace fades to black under READY TO MAKE IT YOURS?, then —— 05 —— / THE NEXT MOVE / YOUR PURSUIT STARTS NOW. (set like the site's hero) / a hairline / APPLY TO PURSUIT → in the site's ivory pill / Watch again. The film controls retire. |

## Typography

Matched to the live Pursuit site (thepursuitpath.com, mobile): Bodoni Moda, the site's
serif, for statements, names and numbers, restrained sans microtext (Outfit) for labels and roles, thin rules, italic only
on the word that carries a line, and plenty of black. Each role does one job.

| Role | Setting | Phone | Used for |
|---|---|---|---|
| Statement | Serif, uppercase, tight leading and tracking, centred | 34–48 px | The CTA title, set like the site's hero; READY TO MAKE IT YOURS? (closing) |
| Chapter label | Serif number + short rule + sans 9 px uppercase, 0.28 em (2.5 px), like the site's "01 —— SELL" | 9 px | Bottom left, in the controls: 01 — ENTER … 05 — PURSUIT |
| Room name | Serif number, rule, serif title-case name (the site's path cards), one shared line | 22–28 px | 01 — A Look Inside (with microtext) · 02 — The Floor · 03 — The Collection · 04 — The Lounge |
| Section line | Serif number + rule + tracked label, sentence-case serif title, microtext | 24–28 px | 03 — THE PEOPLE / Learn from people who have already done it. / SALES TRAINERS · ATHLETES · MENTORS |
| Person | Sans eyebrow role, serif name, sans descriptor | name 30–38 px (duo 21–26 px) | Jeremy Miner; Bob Menery and Michael Lanctot. Kyler Murray keeps his larger uppercase scale. |
| Caption | Sans 10 px uppercase with a rule, 11 px supporting line | 10–11 px | THE CLUB FROM ABOVE; CONNECT / CREATE / UNWIND, one at a time |
| Closing | Serif uppercase, open tracking, centred | 25–32 px | READY TO MAKE IT YOURS?, once, before the CTA |

Every phrase enters and leaves whole, and a new phrase arrives only after the previous
one has fully gone (audited every 50 ms: no two ever overlap). All text stays at least 16 px inside the frame and above the
controls at 360, 375 and 390 px, inside the artifact viewer's safe-area padding.

Desktop keeps the same hierarchy. The footage is vertical 1080 px video, so it is never
stretched into a soft landscape background: every clip plays whole in a portrait panel on
the right and the words sit in a column on the left. Only the cover, a true wide
photograph, fills the screen.

## How it plays

- **One clock.** A paused GSAP timeline holds every transition. Each frame it is set to
  the film time, and every clip is slaved to the same time. While a clip carries the
  picture, the clock follows that clip, so a clip that is still buffering holds the film
  rather than drifting out of sync. The film is a pure function of its time, so seeking
  either way is just setting the time: nothing restarts, loops or replays a first frame.
- **Scroll lock.** From the opening screen until the end, the page does not scroll
  (overflow hidden, plus wheel, touch and scroll keys stopped). It is released when the
  film ends, when Skip is pressed, or if anything throws. The film is the page's only
  content in this prototype (no stand-in footer), so seeking, skipping, replaying and
  finishing never reveal anything below it or move the layout. Seeking back after the end
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
assets/fonts/                  Bodoni Moda (OFL), Outfit
scripts/build_media.py         master → production media
source-media/                  the master, its media map, source-quality stills
public/media/club-scottsdale/  generated production media
```

## Notes

- The header and the Apply button are stand-ins so the entrance and exit can be judged in
  context. No application route is configured in this repository, so the button still
  points at the placeholder `#apply`; wire it to the live site's application link when
  the film is placed on the site.
- The tent logo is about 97 px wide in the source frame against about 760 px for the
  neon's CS, so the opening is a positional match with a dissolve rather than a size
  match (a size match would need an ~8× blow-up).
- The landscape (`w1080`) clip variants are still built but no longer used: desktop
  plays the portrait files in a panel.
