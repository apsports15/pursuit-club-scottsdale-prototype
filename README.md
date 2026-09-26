# Club Scottsdale · interactive prototype

**Pursuit · 05 / The Ecosystem.** A standalone scroll film for locking the creative
and interaction direction of the Club Scottsdale section before it's built in Framer.
Nothing here touches thepursuitpath.com.

## Run it

Open `index.html` in Chrome, Safari or Firefox. It works straight from disk and
offline (GSAP, ScrollTrigger, Lenis and the fonts are vendored).

Or serve the folder: `npx serve .` and open the printed URL.

## Controls (prototype only)

| | |
|---|---|
| **Transition mode** chip, top of screen | Cinematic · Editorial · Aggressive. Switching keeps your place. |
| `1` `2` `3` | Same, from the keyboard |
| `.` / `,` | Jump to the next / previous beat (each transition starts at a beat) |
| `H` | Hide the HUD (bottom right: current scene, transition code, mode) |
| `L` | Hide placeholder labels to judge composition only |
| `#editorial` etc. in the URL | Open in a given mode |
| `?rm=1` in the URL | Preview the reduced-motion version |
| `ClubScottsdale.beats()` in the console | List every beat and its scroll position |

The HUD names every beat with a letter code (A–I, P) so feedback can be specific:
"B in Editorial is right", "cut G".

## Scene structure

The section is four scroll "reels" plus a native-scroll ending. Pinned reels are one
GSAP timeline each, scrubbed by scroll.

| Scene | What happens | Reel |
|---|---|---|
| **01 Enter** | Near black. `— 05 —` / THE ECOSYSTEM / THE WORLD AROUND *PURSUIT*. The site's thin vertical line sits under the headline with SCROLL TO ENTER. First scroll: the cue fades, the line grows to full height and becomes the seam of a door. | 1 · pinned |
| **02 Reveal** | The seam opens as a slit onto the arrival footage, the slit becomes an editorial frame (BEYOND THE PROGRAM. / CLUB SCOTTSDALE), then the frame expands to full bleed. The site header steps aside: you're inside. | 1 · pinned |
| **03 Experience** | The transition vocabulary. Wipe to the supercar → the next scene slides over like a turned page → split screen (interior / dinner) → dinner takes over → pinned dinner with overheard lines (*"Call him tomorrow. Tell him I sent you."*) → black cut: ACCESS CHANGES THE GAME. → stacked editorial frames (YOUR STORY, *PROPERLY TOLD.*) in native scroll → horizontal spread (THE WORLD GETS BIGGER *WHEN YOUR CIRCLE DOES.*) → zoom through into the event. | 1, 2, 3, 4 |
| **04 Understand** | The event shrinks back into a frame and typography takes over. NETWORK → MEDIA → EXPERIENCES → ENVIRONMENT → OPPORTUNITY. Each word swaps the footage, morphs the frame to a new composition and moves the type. Experiences plays as a three-cut montage; Opportunity sits in a letterbox. | 4 · pinned |
| **05 The point** | The letterbox closes to a single line. Silence. PURSUIT BUILDS THE SKILLS AND CAPITAL. fills in word by word above the line; THE ECOSYSTEM *EXPANDS* WHAT YOU CAN DO WITH THEM. below it. Coda: YOUR ENVIRONMENT CHANGES WHAT FEELS POSSIBLE. | 4 · pinned |
| **06 Return** | The line extends into the Pursuit path: 01 SELL · 02 BUILD · 03 OWN. A champagne hairline frame then draws around all three: THE ECOSYSTEM / CLUB SCOTTSDALE · AROUND EVERY PHASE. The header returns. | 4 · pinned |
| **07 Your Pursuit** | Pinning ends and the page scrolls normally again. YOUR PURSUIT STARTS HERE. (the bookend to the site's hero), SELL. BUILD. OWN., the pearl APPLY TO PURSUIT pill (not linked). | native |

## Transitions tested

| Code | Transition | Where | Cinematic | Editorial | Aggressive |
|---|---|---|---|---|---|
| **I** | Cropped / slit reveal | 01 the door; 04→05 letterbox close | wide slit, slow | narrow slit, jumps to an off-centre frame | hairline slit |
| **A** | Editorial frame → full bleed | 02 arrival | large centred frame, title over it | right-hand frame, title bottom left | tiny frame, big scale jump |
| **A′** | Full bleed → editorial frame | 03→04 event shrinks into Network | | | |
| **B** | Mask / wipe | 03 arrival → supercar | soft feathered mask rising | hard page wipe with a light edge, old shot pushed aside | fast diagonal wipe with a scale punch |
| **P** | Page turn | reel 1 → reel 2 | next scene slides over; previous one recedes and dims (all modes) | | |
| **D** | Split screen → single frame | 03 interior / dinner | 50/50 halves | two offset magazine frames with captions | halves, loser pushed out |
| **C** | Pinned media | 03 dinner + overheard lines | slow push-in | nearly static | stronger push |
| **F** | Black cut | 03 ACCESS CHANGES THE GAME. | fade through black | hard cut, flush-left type with rule | hard cut, type slams in |
| **E** | Stacked editorial frames | 03 media / content | slow parallax, one frame crosses the headline | magazine layout, flush-left headline | large frames, strong speed differences, frames grow |
| **H** | Horizontal moment | 03 aviation → travel → drive → Scottsdale → event | eased | linear, 1:1 with scroll | accelerating |
| **G** | Zoom through | 03 into the event | large frame, gentle push | medium | small frame, big push, others fly out |
| — | Category swaps inside the frame | 04 | crossfade | footage slides up inside the frame | hard cut |

## What scroll controls

Everything in reels 1, 2 and 4 is scrubbed: frame sizes and positions (clip-path
insets), wipes and masks, inner footage scale, split-screen takeover, overheard
lines, the black cut, the horizontal track, the zoom, each category's word,
description, footage and frame composition, the letterbox close, the word-by-word
fill of the two sentences, the path drawing and the ecosystem frame.

Reel 3 (stacked frames) and the CTA use native scroll: frames move at different
speeds as the page scrolls, and the CTA plays once when it arrives. The page load
animation (chapter number, headline, line) is the only time-based motion. Lenis
smooths wheel input on desktop; touch uses native scrolling.

Mode changes: scroll length per beat, scrub lag, easing, frame sizes, wipe type,
black-cut style, category swap style, parallax strength, zoom size, and the
Editorial layouts (flush-left type, asymmetric frames).

## Footage map

Every placeholder is a labelled slate: clip code, suggested length and shot
direction. The full list, with notes, lives in `js/media.js`.

| Code | Placeholder | Used in | What to pull from the 6 minutes |
|---|---|---|---|
| CS-01 | Club exterior / arrival | 01–02 slit → frame → full | Wide, blue hour, car arriving, entrance near centre (it's first seen through a narrow slit) |
| CS-02 | Supercar night shot | 03 wipe | Low angle, slow push, headlights and reflections |
| CS-03 | Club interior | 03 split, left | Slow lateral move, warm light, people soft |
| CS-04 | Founders / network dinner | 03 split → pinned | 10–14s, still enough to hold three lines of type |
| CS-05 | Videographer / content shoot | 03 stacked | Crew mid-take |
| CS-06 | Photographer / portrait | 03 stacked | Strobe pop, vertical crop |
| CS-07 | Content detail / monitor | 03 stacked | Monitor, lens, the edit |
| CS-08 | Private jet / aviation | 03 horizontal | Tall composition: stairs, wing, doorway |
| CS-09 | Travel / experience | 03 horizontal | Destination establishing shot |
| CS-10 | Supercars / desert drive | 03 horizontal | Tracking shot, open road |
| CS-11 | Scottsdale environment | 03 horizontal | Golden hour, desert, city edge |
| CS-12 | Event / community | 03 zoom target, 04 start | Widest, sharpest crowd shot; it scales to full screen |
| CS-04B | Founders / network dinner (alt) | 04 Network | Handshake, a founder mid-story |
| CS-05B | Videographer / content (alt) | 04 Media | Member on camera, crew visible |
| CS-08B / 02B / 09B | Jet · cars · travel | 04 Experiences montage | Three 1–1.5s hero frames |
| CS-03B | Club interior (alt) | 04 Environment | Wide, symmetrical, quiet architecture |
| CS-13 | Entrepreneur conversation | 04 Opportunity letterbox | Two people on the thirds, 2.39:1-friendly |

To test real footage, see `media/README.md`.

## What I'd carry into Framer

1. **The line as the through-thread.** The site's vertical hairline becomes the door
   seam that opens Club Scottsdale; the world closes back into a horizontal line; that
   line becomes the divider for the thesis and then the SELL → BUILD → OWN path. It
   ties the section to Pursuit without any explanation.
2. **Slit → frame → full bleed (I + A)** as the entry. It feels like stepping inside,
   not like a hero video loading.
3. **The page turn (P)** between the arrival and the club interior: native-feeling,
   cheap to build, reads as editorial.
4. **Pinned dinner with overheard lines (C)**. It says "access and relationships"
   without a feature list, and it's the most human moment in the section.
5. **One black cut (F)**, used once. More than one dilutes it.
6. **The ecosystem index (04)**: one frame that morphs composition while the word,
   footage and description change together. Editorial's slide-within-frame swap is
   the most premium; Cinematic's crossfade is the safest.
7. **The ecosystem frame around the path (06)**. The same frame that held the footage
   now holds Sell / Build / Own, which answers "is this separate from Pursuit?" in
   one image.

Likely cuts or trims: the stacked frames (E) are the loosest idea and cost a lot of
footage; Aggressive mode is useful as a boundary check rather than a direction.
A blend likely lands best: Cinematic pacing for 01–03, Editorial compositions for 04–06.

## Notes

- Type is matched to the live site by eye: Instrument Serif (display, with italic
  accents) and Outfit (micro-labels, body). If the Framer project uses different
  families, change `--serif` / `--sans` in `css/style.css`.
- The header is a static replica of the live header, for context. Nothing links anywhere.
- Copy for the overheard lines and scene captions is placeholder copy.
- Dark by design; single theme.

## Files

```
index.html        markup for every scene
css/style.css     tokens, placeholder slate, scene layouts per mode
js/media.js       footage manifest (labels, shot notes, optional src)
js/main.js        timelines, transition modes, HUD, mode switching
vendor/           GSAP 3.15 + ScrollTrigger, Lenis 1.3
assets/fonts/     Instrument Serif, Outfit (woff2)
media/            drop real clips here
```
