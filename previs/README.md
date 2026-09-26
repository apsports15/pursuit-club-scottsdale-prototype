# Club Scottsdale — footage previs

A review build of the mobile-first storyboard using the real selects reel and the
amenities recording. It is not the final design and does not replace the prototype
in the repo root, which stays untouched as the creative reference.

Open `previs/index.html` in a browser (works from disk), or serve the repo and
visit `/previs/`. It is best viewed on a phone. On desktop the same 9:16 canvas is
centred, so no vertical clip is ever stretched across a wide screen.

## How it moves

- The page opens on shot 13 already in motion. There is no black intro and no scroll needed.
- One scroll, swipe or ↓ key plays the next sequence forward to its end. Quick cuts
  inside a sequence play on their own, without a scroll per cut.
- Scroll never scrubs the footage. A trackpad's coasting counts as one gesture, and a
  small wobble does nothing. Going back needs a firmer push and rewinds one stop.
- Scrolling again while a sequence is playing speeds it up; it never skips ahead.
  Scrolling the other way turns it around.
- Clips play once and hold on their last frame. They never loop or restart at a boundary.
- After the CTA, the next scroll hands back to normal page scrolling. Scrolling up at
  the top returns to the film.

Review bar: `‹` `›` step, `Labels` (or `L`) hides the bar text and shot tags.

## Shot map

15 stops. Shots marked "cropped" are framed in code to keep the Instagram handle out
of view at every screen size.

| # | Chapter | Media | Transition |
|---|---|---|---|
| 0 | 01 Arrival | 13 (re-cut from its true start) | Seam opens on the car in motion, title builds over it |
| 1 | 02 The collection | 27 · cropped | B soft wipe up to the lot from above |
| 2 | | 31 · cropped, cards A14 + A09 | Crossfade to the moving background, two cards pass in one run |
| 3 | 03 Inside the club | A02 | P page turn onto the hex hall |
| 4 | | A05 + A12 → A12 | D vertical split, then the lounge takes over |
| 5 | 04 Amenities | 23 · cropped, A13 | B diagonal wipe, then Race and Play in one run |
| 6 | | A08 · A10 · A15 | Groom, Unwind, Host in one run |
| 7 | 05 People + access | P1 | F type on black, then C pinned still |
| 8 | | 43 · 37 · 40 (all cropped) | Portrait page wipes, one flowing run |
| 9 | 06 The ecosystem | A16 | Rises full screen, A′ shrinks to a shared frame: Workspace |
| 10 | | A03 | Category morph: Media |
| 11 | | Reel 1:36 · cropped | Category morph: Mentorship |
| 12 | 07 The point | none | I frame closes to a line, both sentences in one read |
| 13 | 08 Return | none | Line turns vertical, Sell / Build / Own |
| 14 | | none | CTA, then normal scrolling |

`A` numbers are shots from the amenities recording (`media/amNN.jpg`, numbered in the
recording's order after the title card). Plain numbers are the earlier previs shot
numbers. "Reel 1:36" is the mastermind session at 1:36 in the selects reel.

## Media

- `vNN.mp4` / `r0136.mp4`: clips cut from the selects reel, each with a `.jpg` poster.
- `amNN.jpg`: stills from the amenities recording. It is a clean source (no handles,
  stickers or baked-in text), and each shot is effectively a still.
- `s43.jpg`, `p1.jpg`: a reel still and the supplied mastermind photo.

Open media issue: shot 13 carries an `@theclubscottsdale` handle. No crop removes it
without losing the sign or the car, so the previs masks it (`delogo`). The final build
needs the clean original.
