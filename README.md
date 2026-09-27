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

About 62 s on phones, 54 s on desktop (the people run as three columns at once there).

| | Chapter | Footage | What happens |
|---|---|---|---|
| — | Opening | — | Solid #000. *Club Scottsdale / Enter the ecosystem / Scroll to enter.* The first scroll, swipe, tap or key starts the film. |
| 01 | Arrival | CS neon, drone | The neon fills the screen and pushes in slowly. The sign splits open down the middle of the CS, on the clip's own last frame. Behind it, the tent's CS logo sits where the neon's was; it dissolves in and the drone pulls back over the lot and the collection (the film's one zoom-out). *Club Scottsdale · Scottsdale, Arizona.* |
| 02 | Step inside | FPV flight, 18 s | A black curtain with a lit doorway rises over the drone. *Step inside.* The door opens to full screen as the flight starts. The white lounge is held in slow motion (0.45×, motion-interpolated) so it can be taken in; then the event floor and the collection. Room names follow the camera. |
| 03 | Who's inside | 911 overhead still | The still wipes up over the end of the flight, full screen. *The value isn't what's parked outside.* It fades as *It's who's inside.* rises. |
| 04 | In the room | 4 clips | *Proximity is the curriculum.* Phone: one frame, each clip wiping up over the last just before it ends. Desktop: three columns. |
| 05 | Around the table | 4 clips | *The right room changes the conversation.* Same run, continuing. |
| 06 | Access | Helicopter still, 17 amenity cuts | The helicopter crossfades in over the last people clip. *Access changes perspective.* Hard cut into the amenities, cutting faster and faster, with *More than one room.* and a counter synced to the cuts. |
| 07 | The point | — | Hard cut to black: *This isn't the destination.* / *It's part of the environment.* Then *Sell · Build · Own / Your Pursuit starts here. / Apply to Pursuit.* The header returns and the page scrolls again. |

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
  the chapter name, and Skip. Tapping the picture or pressing Space also pauses. While
  paused, a scroll resumes. The film pauses itself when the tab is hidden and resumes
  when it returns.
- **Preloading.** Each clip loads about 11 s before it plays (the first three during the
  opening screen) and gives its buffers back 15 s after. Posters are first frames; the
  split uses a still of the neon's exact last frame, decoded in advance.
- **When a clip fails.** A clip that errors is skipped at once; one that has not started
  2.5 s after it should (or stalls for 5 s mid-play) is skipped. The film moves on to
  wherever the next beat begins. A watchdog moves the film on if the clock ever stops
  for 8 s. If autoplay is refused (iOS Low Power Mode), the film pauses and the next tap
  plays it.

## Media pipeline

The master (`source-media/club-scottsdale-master.MOV`) is never written to. Everything
the page uses comes from one script, one generation from the master:

```
python3 scripts/build_media.py          # builds anything missing, removes anything no longer used
python3 scripts/build_media.py --force  # rebuilds everything
```

It writes source-quality PNG stills to `source-media/stills/` and production media to
`public/media/club-scottsdale/` (clips, posters, AVIF/WebP stills, `manifest.js`). In/out
points, crops, speed, grade and still times all live at the top of the script; trims are
frame-exact so the amenity counter and the room names stay in sync. Slow motion goes
through a lossless intermediate in `build/cache/` (not committed). See
`source-media/media-map.md` for the scene map and the selects.

| | |
|---|---|
| Codecs | HEVC (`hvc1`) for Safari/iOS, H.264 for everything else; muted, 1 s GOP, faststart |
| Sizes | 1080×1920 portrait; 720×1280 for Save-Data, 2G/3G and small screens; 1080×810 per-shot crops for landscape screens |
| Weight | HEVC set about 13 MB for the whole film (H.264 1080 about 20 MB), fetched as it plays |

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
