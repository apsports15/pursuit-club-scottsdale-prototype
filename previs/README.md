# Club Scottsdale — footage previs

A review build of the proposed mobile-first storyboard using the real selects reel.
It is not the final design and does not replace the prototype in the repo root,
which stays untouched as the creative reference.

Open `previs/index.html` in a browser (works from disk), or serve the repo and
visit `/previs/`. Best viewed on a phone, or in desktop dev tools at iPhone size.
On desktop it shows the same phone canvas centred; the desktop adaptation isn't built.

## Review controls

The bar at the bottom shows the chapter, shot number and transition for the
current beat.

- `‹` `›` (or `,` `.`): jump to the previous / next beat
- `Labels` (or `L`): hide the bar text and the shot tags on the footage

## Structure

| Chapter | Shots | Transitions |
|---|---|---|
| 01 Enter | none, then 26 in the seam | seam → I slit (26 is scrubbed by scroll) |
| 02 Arrival | 26 → 12 → 13 | A slit → full screen → B soft wipe → hero, title in the sky |
| 03 Inside the club | 42 → 34 + P3 | P page turn → D vertical split → takeover |
| 04 Collection | 27/28 → 31, cards 47 · 23 · 15 | full screen → moving background → V vertical filmstrip |
| 05 Experiences | 32 → 43 → 48 · 44 · 49 · 45 → 1 | F type on black → G zoom through → rapid cuts → B diagonal wipe |
| 06 People + access | P1 → 37 · 40 · 11 · 5 | F black type → C pinned still → portrait page wipes |
| 07 The ecosystem | 54 · 29 · 28/47/48 · 25 · 64 | full screen → A′ shrink to frame → category morphs |
| 08 The point | none | I frame closes to a line → words fill with scroll |
| 09 Return | none | line turns vertical → Sell / Build / Own → native scroll CTA |

## Media

`media/` holds clips cut from the selects reel (`vNN.mp4`, with a `vNN.jpg`
poster) and stills (`sNN.jpg` from the reel, `p1.jpg` / `p3.jpg` from the
supplied photos). Handles, stickers and baked-in text are left in on purpose;
they will be cleaned or replaced in media prep.
