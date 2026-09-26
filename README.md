# Club Scottsdale · Pursuit 05 / The ecosystem

The Club Scottsdale chapter of the Pursuit site, built around the real footage.
It is the one place where the site turns into a film: the page goes dark, you arrive,
you fly through the Club, you meet the people inside, and you come back out on the
Pursuit path understanding why the environment matters.

Club Scottsdale is presented as one of the environments around Pursuit, not as
something Pursuit owns.

## Run it

Serve the repo root and open it (video needs HTTP, not `file://`):

```
python3 -m http.server 8000     # then http://localhost:8000
```

Best on a phone. Desktop is designed, not scaled. `?debug` shows the chapter and beat
state; `window.ClubScottsdale` in the console has helpers (`chapters()`,
`scrollToBeat(id, i)`, `state()`).

## The film

| | Chapter | Footage | What happens | Pace |
|---|---|---|---|---|
| — | Pursuit, section 04 (stand-in) | — | The site as it normally looks; its hairline runs down into the next section | — |
| 01 | Threshold | CS neon | The page goes dark. The hairline draws down, splits into a slit, and the neon glows inside it. *05 · The ecosystem around Pursuit* | slow |
| | Arrival | White Huracán | The car rolls in inside the slit; the slit opens until the site is the footage. The header steps away. | slow |
| | Reveal | Lineup, aerial | Desktop: the lineup rises in full bleed at native 1920×1080. Phone: it opens as a cinemascope band. Then the camera rises over the lot. | build |
| 02 | Enter | FPV flight, 15.9 s, uncut | A black curtain with a lit doorway slides up over the aerial. The doorway is a still of guests walking through; it becomes motion as the door opens to full bleed. Room names follow the camera (Entrance, The lounge, The floor, The collection), keyed to the video's own time. Scrolling ahead gives the flight throttle (up to 2×) instead of seeking. It closes to a letterbox, then black. | immersion |
| 03 | Breathe | Overhead + matte stills | Native scroll. An editorial spread, outside against inside. *The value isn't what's parked outside.* | breathing room |
| 04 | People | 8 moments | Black: *It's who's inside.* Then *Proximity is the curriculum.* (session, lounge, the room, applause) and *The right room changes the conversation.* (networking, dinner, panel, candid). Phone: one frame, a flowing run of page wipes. Desktop: triptychs of native vertical columns. | human energy |
| 05 | Access | Helicopter still | Emerges from the dark. *Access changes perspective.* | breathe |
| | Crescendo | 17 cuts, 8.6 s | Hard cut in. Sim, decks, podcast, court, then the rooms, cutting faster (0.42 → 0.30 s). One persistent line, *More than one room.*, and a counter synced to the cuts. When the clip ends it cuts to black on its own. | accelerate, then stop |
| 06 | Meaning | — | *This isn't the destination.* / *It's part of the environment.* | silence |
| | Return | — | The line becomes the Pursuit path: Sell, Build, Own (vertical on phones, horizontal on desktop). A frame draws around it: *The environment around the path* / *Rooms like Club Scottsdale, at every phase*. *Your environment changes what feels possible.* The header returns. | resolve |
| — | Pursuit, section 06 (stand-in) | — | The site resumes. | — |

## How it moves

- **Native scroll, no hijacking.** No scroll lock, no wheel interception, no smooth-scroll
  library. Chapters are `position: sticky` stages.
- **Scroll decides where, time decides how.** Each chapter has one paused GSAP timeline
  whose beats sit at scroll positions (`data-beats`, in vh from the moment the stage
  pins). Crossing a beat plays that beat's sequence forward in real time; it is never
  scrubbed. A 5 vh hysteresis either side means a wobble cannot re-trigger anything.
  Scrolling back past a beat rewinds it quickly (a deliberate reverse). If you are
  several beats ahead, it plays through them faster rather than skipping.
- **Clips play once.** They start on their beat, hold their last frame, and are never
  restarted by scroll. They pause when their chapter leaves the screen and resume
  (not restart) when it returns.
- **Page turns are physical.** Where one chapter slides over another it is a native
  scroll overlap, so it can't glitch.
- **One hard cut, one black stop.** The helicopter-to-crescendo cut and the crescendo's
  stop happen inside one stage, so they are true cuts.

## Media pipeline

The master (`source-media/club-scottsdale-master.MOV`) is never written to. Everything
the page uses comes from one script, one generation from the master:

```
python3 scripts/build_media.py          # builds anything missing
python3 scripts/build_media.py --force  # rebuilds everything
```

It writes source-quality PNG stills to `source-media/stills/` and production media to
`public/media/club-scottsdale/` (clips, posters, AVIF/WebP stills, `manifest.js`).
In/out points, crops and still times all live at the top of the script; trims are
frame-exact so the crescendo counter stays in sync. See `source-media/media-map.md`
for the full, corrected scene map and the selects.

| | |
|---|---|
| Codecs | HEVC (`hvc1`) for Safari/iOS, H.264 for everything else; muted, 1 s GOP, faststart |
| Sizes | 1080×1920 portrait; 720×1280 for Save-Data, 2G/3G and small screens; 1080×810 per-shot crops for landscape screens; the rotated lineup at 1920×1080 |
| Loading | Posters are WebP; clips load only when their chapter is within 1.5 screens |
| Weight | HEVC 1080 set about 10 MB for the whole chapter, fetched progressively |

## Accessibility and performance

- `prefers-reduced-motion`: clips don't autoplay (posters stand in), transforms are
  removed, transitions shorten to fades.
- A small **Motion** control (bottom right, visible inside the chapter) pauses and
  resumes all footage at any time.
- Autoplay blocked (e.g. iOS Low Power Mode): the posters are the first frames, so the
  film still reads.
- Every chapter has a text description; the stills have alt text; a skip link jumps past
  the film.
- Only transforms, opacity and clip-path are animated. Only the chapter on screen
  decodes video.

## Files

```
index.html                     markup: every chapter, plus stand-ins for sections 04 and 06
css/club.css                   tokens, type, chapter layouts (html.wide = landscape ≥ 900px)
js/club.js                     chapter engine, beats, media loading, flight and crescendo sync
vendor/gsap.min.js             GSAP 3 (the only library)
assets/fonts/                  Instrument Serif, Outfit
scripts/build_media.py         master → production media
source-media/                  the master, its media map, source-quality stills
public/media/club-scottsdale/  generated production media
```

## Notes

- The header and the sections either side are stand-ins so the entrance and exit can be
  judged in context. Their copy is placeholder.
- Room names in the flight describe what the camera passes through; the crescendo shows
  a counter rather than room names, so nothing is claimed that the footage doesn't show.
- Desktop full-bleed moments crop vertical footage (1080 px wide) to landscape, so they
  are softer than the native 1920×1080 lineup. Grain and motion carry it, but a true
  landscape shoot of the flight would sharpen the desktop version further.
