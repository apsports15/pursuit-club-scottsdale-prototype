# Club Scottsdale in Framer

This folder turns the approved Club Scottsdale film into one Framer code component,
`ClubScottsdaleChapter.tsx`. It goes on the live Pursuit page directly after the Earnings
section, in place of the placeholder "The Ecosystem / Enter the ecosystem ↓" section, and it
is the last section of the page.

The approved build (`index.html`, `css/club.css`, `js/club.js`, `public/media/`,
`assets/fonts/`, `vendor/`, `scripts/`) is the reference and has not been touched. Everything
here is either generated from it or written around it. The component is not an iframe and it
is not a separate site. Its markup sits in the page's own DOM, it scrolls with the page, and
the page's own header does what the prototype's stand-in header did.

**The short version**
1. Host the media folder once (see [4](#4-assets-and-fonts)).
2. In Framer, add a code file named `ClubScottsdaleChapter` and paste in
   [`ClubScottsdaleChapter.tsx`](ClubScottsdaleChapter.tsx) (see [5](#5-inserting-it-into-the-framer-page)).
3. Delete the placeholder section. Drop the component where it was, below Earnings. Set Width
   to Fill and Height to Fit.
4. Paste the media folder's URL into the component's **Media URL** property.
5. Preview it, check it against [7](#7-qa-checklist), then publish.

---

## 1. Dependency and integration audit

| # | Question | The approved build | What that means in Framer |
|---|---|---|---|
| 1 | Framework / runtime | Static HTML, one CSS file, and one vanilla-JS file (ES2020). No framework, no build step, no modules. | Runs as-is inside a React component. Nothing to transpile. |
| 2 | React version | None: it does not use React. | No conflict with Framer's React 18. React only renders the host element and its HTML. |
| 3 | Dependencies | **GSAP 3.15.0** (`vendor/gsap.min.js`, 72.9 KB UMD), and nothing else. There are no npm packages at runtime. | GSAP has no React dependency. It is embedded unmodified and evaluated privately, so it creates no `window.gsap` and cannot clash with any GSAP the site already uses. |
| 4 | Animation libraries | GSAP core only, no plugins (no ScrollTrigger). One paused timeline, set to the film clock every frame. Also 3 CSS keyframe animations (`cover-in`, `cover-drift`, `cue`) and CSS transitions. | Same code, same timeline, same easing and timing. The keyframes are renamed `pcc-…` so they can't collide with the site's. |
| 5 | Scroll libraries | None. The film does not scroll. It is a one-screen stage, and gestures drive it: scrolling starts it and resumes it, a tap pauses it. The page is locked while it plays. | The lock now holds the page at the film's own position (its "dock") instead of at the top of the page. See [2](#2-migration-architecture). |
| 6 | Video / media | JS creates `<video muted playsinline>` elements from a manifest (`window.CS_MEDIA`). It picks HEVC where it plays (Safari) and H.264 elsewhere; portrait `p1080`/`p720` or wide `w1080`; webp posters; avif/webp stills through `<picture>`; and the cover through `<picture>`. Every clip is slaved to the film clock, and there is handling for iOS Low Power Mode. 85 files, 58 MB in total, but one viewer downloads only their device's set: about 10 MB of video on an iPhone, and 10–23 MB on Android depending on the screen. | Same elements, same choices. The manifest is embedded. The files have to be hosted, because Framer's asset library can't hold a folder. Videos wait until the film is near instead of loading at page load. |
| 7 | Fonts | `@font-face` from `assets/fonts/`: Bodoni Moda 400 roman and italic as "Pursuit Serif", and Outfit 300/400/500 as "Pursuit Sans". The CTA's weight 600 is synthesized from 500. | The same five files and the same descriptors are embedded in the component (95 KB) and added to the page when the film mounts, so they stay out of the page's HTML. The film stays hidden until they are in, so it never shows a fallback font; the wait is at most 1.2 s, the same cap the prototype used. There is nothing to install in Framer and there are no cross-origin font requests. The family names are the film's own and are used only inside it. |
| 8 | Asset paths | Relative: `public/media/club-scottsdale/…` in the markup and manifest, `../assets/fonts/…` in the CSS, and `vendor/gsap.min.js`. | Media resolves from the **Media URL** property. Fonts and GSAP are embedded. |
| 9 | CSS architecture | One global stylesheet (623 lines). It has `:root` tokens, `html`/`body` rules, the page state classes `html.wide`, `html.is-locked` and `body.is-*`, and plain element and class selectors. The film box uses container-query units (`cqw`/`cqh`), with `@supports` fallbacks. | Every selector is scoped under the component root. The html/body rules and state classes move onto the root. See [2](#2-migration-architecture). |
| 10 | Responsive breakpoints | Two layouts. Portrait is the default. Wide is used when the viewport is ≥ 900 px wide and its aspect ratio is ≥ 1.05. The cover uses aspect-ratio media queries. Inside the film, sizes follow container units. There is a `prefers-reduced-motion` variant. | The same, decided from the real viewport as before (not from Framer's breakpoint frames). |
| 11 | Viewport-dependent behaviour | The film is `100vh`/`100dvh`. There are safe-area insets, a few `vw` sizes, and `innerWidth`/`innerHeight` for the layout choice. A resize rebuilds the timeline. | The same. The component is exactly one viewport tall, and resizing while it plays keeps it docked. |
| 12 | Sticky / fixed elements | The whole page is the film, locked at scroll 0. Fixed elements: the skip link, the stand-in site header `.site-head`, and the `?debug` overlay. | The skip link and debug overlay are kept. The stand-in header is dropped; the site's real header is hidden and shown with the same 0.9 s fade and 12 px lift. |
| 13 | Conflicts with Framer's React 18 page | None at the library level. The conflicts are page-level. It styles `html`, `body`, `main`, `:root` and generic elements. It calls `scrollTo(0,0)` and sets `history.scrollRestoration = 'manual'` at load. It locks the page from page load. Its window listeners are never removed. GSAP selectors resolve against the whole document. It needs `window.CS_MEDIA`. Asset paths are relative. It preloads video at page load. It has its own header. The cover animation runs from page load. | Each one is fixed in the port. See the table in [2](#2-migration-architecture). |

## 2. Migration architecture

### One generated file
`scripts/build.mjs` builds `ClubScottsdaleChapter.tsx` from the approved files. It stops with
an error if any of them no longer looks the way it expects.

| Part | Source | How it is carried over |
|---|---|---|
| Markup | `index.html`: the skip link and `section.film` | Verbatim. The media path becomes the Media URL, `#apply` becomes the Apply URL, and the cover's `fetchpriority` goes from `high` to `low` (on the site, the cover is not the first thing on the page). |
| Styles | `css/club.css` | Every rule is kept, in order, with every selector prefixed `.pursuit-club-chapter.pcc`. That adds the same (0,2,0) specificity to every rule, so the film's cascade is unchanged. `html…`/`body…` state selectors attach to the root instead. The `html`/`body`/`main`/`:root` rules become the root's own rule (one viewport tall, full width). `html.is-locked` becomes `html.pcc-locked`. Keyframes get a `pcc-` prefix. |
| Fonts | `assets/fonts/*.woff2` (the 5 faces the CSS declares) | Data URLs with the same descriptors, added through the browser's `FontFace` API when the film mounts. They are kept out of the server-rendered HTML so they don't slow the top of the site. The film waits for them, as the prototype did. |
| Isolation | none (written for this) | `all: initial` on the root cuts every inherited site style. An `all: revert` baseline on each element type the film uses stops site rules like `h1 {…}` or `p {…}` from reaching in. Tested with deliberately aggressive site CSS, and with decoy site elements named `.film`, `.micro`, `.ctl`, `.cta__btn`… (see [7](#7-qa-checklist)). |
| GSAP | `vendor/gsap.min.js` | Embedded byte for byte and evaluated once in a sandbox. No globals are left behind. |
| Film engine | `js/club.js` → `src/engine.js` | The approved engine, line for line, except where it had to change for the page. Every change is marked `[framer]`: a changed line at its end, new code by a `[framer]` heading or comment. |
| React shell | `src/component.tsx` | Renders the markup once (`dangerouslySetInnerHTML`, stable across re-renders), mounts the engine in an effect, and removes it on unmount. Holds the property controls and sizing annotations. |

### Page weight
The component adds about 8 KB (compressed) to the page's HTML. It adds about 120 KB
(compressed) of script: the fonts are 71 KB, GSAP 25 KB, and the film's own code, styles and
markup 25 KB. No media loads until the film is within about a screen and a half of the view.
From then on, each clip loads about 11 s before it plays, and only in the viewer's own variant.
For the whole film on an iPhone that is about 10 MB.

### How it behaves on the page
The prototype was the whole page. On the site, the film is the last section, exactly one
screen tall.

- **Scrolling in.** The page scrolls normally until the film's top meets the top of the screen.
  Because it is the last section, that is the natural end of the page: the film is "docked"
  and fills the screen. The Earnings section runs straight into it, with no gap or divider.
- **Opening screen** ("Enter the ecosystem"). It shows exactly as in the prototype. The site
  header fades out as it fills the screen, just as the prototype's header was hidden there.
  A new scroll, swipe, key or tap starts the film, as in the prototype. The tail of the scroll
  that brought the page there does not start it: the film has to be docked for 0.35 s (0.25 s
  for a new touch), and a wheel scroll must follow a 160 ms pause. Scrolling up leaves, because
  the page is not locked yet, and the header comes back.
- **While it plays.** The page is held at the dock, as the prototype held its page. Nothing on
  the page scrolls, and wheel, touch and keys drive the film exactly as before. The page
  keeps its width when the lock hides a desktop scrollbar (`scrollbar-gutter: stable`).
- **The end.** The header comes back 0.8 s before the end, as the stand-in did, and the page is
  released. "Watch again" replays from the dock.
- **Partly on screen.** A tap on the cover while it is only partly on screen glides the page into
  place (0.45 s) and starts the film. The prototype's cover was always fully on screen.

### What changed in the engine, and why (all marked `[framer]` in `src/engine.js`)
| Prototype behaviour | Why it can't stay | Port |
|---|---|---|
| `scrollTo(0,0)` and manual scroll restoration at load | It would throw the visitor to the top of the Pursuit site | Removed. The page keeps its own scroll. |
| Page locked from load; the lock holds scroll at 0 | The rest of the site must stay scrollable | The lock starts with the film and holds scroll at the film's dock. |
| State on `<html>`/`<body>`: `wide`, `is-playing`… | The site's html/body aren't the film's | Classes live on the component root. The one page-level class is `html.pcc-locked`, and only while it plays. |
| `document.querySelector` everywhere, GSAP selector strings | The site could have a `#ctl` or `.film` too | Queries and GSAP (`gsap.context(…, host)`) are scoped to the component. |
| Window listeners never removed | Framer mounts and unmounts components (page changes, editing) | Every listener, timer, observer, frame loop and GSAP style is released on unmount. Videos give their buffers back. |
| Wheel listened to in the bubble phase | A smooth-scroll script on the page (Framer's Smooth Scroll, Lenis) would still move the page | Heard in the capture phase and stopped where the film takes it. |
| Videos load at page load | On the site the film is a long way down | They load once the film is within about 1.5 screens. |
| Cover animation starts at page load | It would finish before anyone scrolls down | It starts when the film comes on screen, as it did in the prototype (the prototype was always on screen). |
| Stand-in `.site-head` | The site has its own header | The site's fixed or sticky header gets the same fade and lift through two classes that are removed again. If the site re-renders its header mid-film, it is hidden again. |
| GSAP measures `#s-close`'s own height to center it (`yPercent` detection) | At some sizes the detection misfires (see below) | `yPercent: -50` is set explicitly, which is the value the design uses everywhere else. |

**One visible difference, and it is a fix.** At certain sizes, GSAP misreads the element's
existing −50% centring when it starts animating "Ready to make it yours?". Seen at 810 × 1080
tablet, and at some desktop sizes when the page has a scrollbar. In the approved build the line
then sits about 17 px below centre. The component always centres it as designed. At every
other size tested the two are identical. The same one-line fix can be applied to `js/club.js`
if you want the prototype to match.

**Two consequences of being on a page rather than being the page:**
- On desktops with classic (always-visible) scrollbars, mostly Windows, the page's scrollbar
  takes about 15 px. The film fills the page's width next to it, so it is 15 px narrower than
  the prototype, which never showed a scrollbar. The layout inside is the same, because it
  follows the film's own size.
- The cover image is requested at low priority and only as the film nears, so it doesn't
  compete with the top of the site.

### Framer sizing annotations
```
@framerSupportedLayoutWidth fixed    → Width: Fill (or a fixed width); no "Fit"
@framerSupportedLayoutHeight auto    → Height: Fit; the component sets its own height
@framerIntrinsicWidth 1200           → size when first dropped on the canvas
@framerIntrinsicHeight 800
```
The component's root is `width: 100%` and `height: 100vh`, then `100dvh` (one screen,
following mobile browser bars), with a minimum of 420 px. Framer's container (the
`framer-…-container` wrapper) takes that height.

## 3. Files

| Path | What it is |
|---|---|
| `ClubScottsdaleChapter.tsx` | **The component.** Generated; paste this whole file into Framer. |
| `src/engine.js` | The film engine: `js/club.js` with every page-integration change marked `[framer]`. |
| `src/component.tsx` | The React shell: property controls, annotations, mount and unmount. |
| `scripts/build.mjs` | Builds `ClubScottsdaleChapter.tsx` from the approved files. |
| `cdn/_headers`, `cdn/build.mjs` | Prepare the media folder for hosting. `node framer-export/cdn/build.mjs` writes `cdn/dist/`, which is not committed. |
| `cdn/check.mjs` | Checks a hosted media folder: every file present, same size, right type, byte ranges supported. |
| `qa/` | The test page and the tests (see [7](#7-qa-checklist)). |

To rebuild after the approved build changes:
```
node framer-export/scripts/build.mjs
```
Then paste the new `ClubScottsdaleChapter.tsx` into Framer over the old one. If the media
changed, upload the folder again too.

## 4. Assets and fonts

**Fonts and GSAP.** Nothing to do. Both are inside the component.

**Media.** The film's 85 files (`public/media/club-scottsdale/`, 58 MB, the largest 7.9 MB)
must be on a public web host that supports byte-range requests, which Safari needs for video.
Any static host or CDN does. The component's `<video>` and `<img>` elements need no CORS
headers.

**Option A: Cloudflare Pages (recommended for the live site).** It is free, bandwidth is
unlimited, commercial use is allowed, and the 25 MB per-file limit is well above the 7.9 MB
largest file.
- *From GitHub, no local tools needed:*
  1. In Cloudflare, go to Workers & Pages → Create → Pages → Connect to Git.
  2. Choose `apsports15/pursuit-club-scottsdale-prototype`, with the branch that holds the
     approved build. Today that is `claude/practical-maxwell-1o782r`; `main` does not have it
     yet.
  3. Set the framework preset to None, the build command to
     `node framer-export/cdn/build.mjs`, and the build output directory to
     `framer-export/cdn/dist`.
  4. Deploy.
- *Or by upload:*
  1. Run `node framer-export/cdn/build.mjs` (or make a folder yourself that contains
     `framer-export/cdn/_headers` and a copy of `public/media/club-scottsdale/` named
     `club-scottsdale`).
  2. Choose Create → Pages → Upload assets, and drop in `framer-export/cdn/dist`.
- The **Media URL** is then `https://<project>.pages.dev/club-scottsdale/`. You can put the
  project on a subdomain such as `media.thepursuitpath.com` under the project's Custom domains.

**Option B: GitHub Pages (quickest to try).** The repository is public.
1. Go to Settings → Pages → Deploy from a branch.
2. Choose `claude/practical-maxwell-1o782r` and `/ (root)`.
3. The Media URL is
   `https://apsports15.github.io/pursuit-club-scottsdale-prototype/public/media/club-scottsdale/`.
The same site also serves the approved prototype at
`https://apsports15.github.io/pursuit-club-scottsdale-prototype/`, which is handy for
side-by-side checks. GitHub Pages has soft bandwidth limits and is not meant as a CDN for a
business site, so use Cloudflare for the live site.

**Check the host** (any computer with Node 18+):
```
node framer-export/cdn/check.mjs https://<project>.pages.dev/club-scottsdale/
```
It should end with `All 84 files OK`. Without Node: open `<Media URL>aerial.p720.mp4` in
Safari on an iPhone. It should play.

## 5. Inserting it into the Framer page

1. **Add the code.** In the Framer editor, open the **Assets** panel. Under **Code**, click
   **+** and create a new code file (a code component) named `ClubScottsdaleChapter`. Select
   everything in the editor that opens, replace it with the whole contents of
   `framer-export/ClubScottsdaleChapter.tsx`, and save (⌘S / Ctrl+S). It compiles in a few
   seconds; the file is 274 KB because the fonts and GSAP are inside it.
2. **Remove the placeholder.** On the home page, in the **Layers** panel, select the
   placeholder section ("THE ECOSYSTEM / THE PEOPLE ARE ONLY PART OF THE ENVIRONMENT … ENTER
   THE ECOSYSTEM ↓") and delete it.
3. **Place the component.** Drag **ClubScottsdaleChapter** from Assets → Code into the page's
   main stack, directly below the **Earnings** section. It must be the last layer in that
   stack, inside the same stack as the other sections (not inside Earnings or another frame).
4. **Size it.** With it selected, in the right-hand panel set **Width: Fill** (100% / 1fr) and
   **Height: Fit**. Position stays **Relative**. Leave its padding, radius, effects,
   transforms and appear or scroll animations empty.
5. **Nothing between.** The film must meet Earnings edge to edge:
   - If there is space between them on the canvas, set the page stack's **Gap** to 0, or remove
     the bottom padding of Earnings. The placeholder had the same space, so this is the only
     place to look.
   - Nothing may come after the component: no bottom padding in the page stack, and no footer.
6. **Properties** (right-hand panel, with the component selected):
   - **Media URL**: the hosted folder from [4](#4-assets-and-fonts), ending in `/club-scottsdale/`.
   - **Apply URL**: `https://apply.thepursuitpath.com/` (already filled in).
   - **Site header**: **Hide in film** (the default). The header fades out for the film and
     comes back for the ending.
   - **Header selector**: leave empty. The page's fixed or sticky header is found
     automatically. Only if it does not hide, enter
     `[data-framer-name="<your header layer's name>"]` using the header's name in the Layers
     panel, e.g. `[data-framer-name="Navigation"]`.
7. **Breakpoints.** Check the Tablet and Phone breakpoints. The component should be visible, at
   Width Fill and Height Fit, and last below Earnings. Framer carries these over from Desktop
   unless you have overridden them. The film chooses its phone or desktop layout from the
   visitor's real screen, as the prototype did.
8. **Preview**, then **Publish**. On the canvas the component shows its opening screen, as tall
   as the editor window, and does not play. It plays in Preview and on the published site.

## 6. Framer settings

- **Site settings:** none. No custom code, head scripts or fonts need to be added.
- **The component instance:** Width Fill, Height Fit, Position Relative, last in the page stack
  directly after Earnings. No effects, appear animations, transforms or overflow settings on it.
- **The page:** keep the normal page scroll. The film holds the page's own scroll position. A
  Smooth Scroll component on the page is fine; it was tested with one that works like Lenis.
- **Header:** no change needed. If the header uses scroll-triggered variants, that is fine too:
  it is hidden again if the variant re-renders it mid-film.
- **"Made in Framer" badge:** if the site shows it, it sits bottom-right, over the film's
  controls. Check that it doesn't cover them.
- **Staging:** if the plan has a staging domain, publish there first and run [7](#7-qa-checklist)
  before updating the live domain.

## 7. QA checklist

### What was verified here (automated)
Tested in Chromium at phone (390 × 844, 375 × 667), tablet (810 × 1080, 1180 × 820) and
desktop (1280 × 720, 1440 × 900). The approved build was the baseline. The component ran on a
test page shaped like the published Pursuit site: Framer's reset CSS, a fixed header, Hero and
Earnings above, and a Framer-style component container. It was rendered by React 18, both
client-side and server-rendered then hydrated. The tests are in `qa/tests/`.

| Check | Where | Result |
|---|---|---|
| **Pixels** (`run_vr.sh`). Screenshots of both builds at the same film times, from the opening screen to the end: every 0.5 s at 390 and 1440, every 1 s at 375, 810 and 1180, every 2 s for the special setups. A pixel counts as changed if it differs by more than 24/255. | 390 × 844, 375 × 667, 810 × 1080, 1180 × 820, 1440 × 900; aggressive site CSS at 390 and 1440; server-rendered and hydrated at 390; media served from another origin (as from a CDN) at 390 | **Identical within noise**: at most a few pixels of ±1 gradient dithering per frame. There are two exceptions. At 810 × 1080 the closing line sits 17 px higher (the fix above). On a few frames the video picture shows the neighbouring video frame after a seek. That is headless Chromium's decoder, not the build: repeat captures of those moments give identical pixels on both builds. In the full run, the odd frames came twice from the approved build and once, over 0.01% of the pixels, from the component. |
| **Computed styles** (`run_parity.sh`). Every CSS property and the box of each of the 188 film elements and their pseudo-elements, at 12 film times from the opening screen to the end | 390 × 844, 375 × 667, 810 × 1080, 1180 × 820, 1280 × 720, 1440 × 900; server-rendered and hydrated; a transformed container; aggressive site CSS | **0 differences**, with two exceptions. At 810 × 1080, `#s-close` differs: that is the fix described above, 17 px higher, back on centre. Under aggressive site CSS, the boxes of hidden (`display: none`) elements are measured from a page origin that the site CSS shifted; everything drawn is identical. |
| **In-page behaviour** (`inpage.js`). Docking, the opening screen, arming, the lock, the header (including when the site re-renders it), tap/pause, the end, coming back, Watch again, unmount mid-film and remount, `scroll-behavior: smooth`, a Lenis-style smooth scroll, content below, both header settings, a transformed container, the Framer canvas, server render and hydration (React dev build: no mismatch), StrictMode, prop changes, nothing leaking out, media deferral, fonts | 390 × 844 touch; 1440 × 900 wheel and keys, with a classic scrollbar | **69 / 69** |
| **Viewer behaviour, both builds** (`run_behaviour.sh`). Transport: pause, resume, seek by tap and drag, keys, seek while paused, Skip through every chapter, End, Watch again, the skip link. A real-time playthrough (71.5 s). Low Power Mode, emulated | 390 × 844 touch; 1440 × 900 | **Identical on both builds.** Transport 17 / 17 on phone and desktop. Playthrough 8 / 8: the film clock stayed within 0.6 s of the wall clock over the 71.5 s, with no stalls and no loops, and the page never moved. Low Power Mode 4 / 4: a swipe start never blocks, and an untrusted start shows "Tap to play" once, after which one tap carries it to the end. |
| **The Framer file** (`compile.js`). Parses and transpiles as TSX, one export, annotations in place, imports only `react` and `framer`, safe to import on a server | — | **6 / 6** |

What this could not cover:
- Real Safari and iOS. Playwright's Chromium has no H.264/HEVC, so the tests played WebM
  copies of the clips.
- Framer's own editor and runtime. framer.com was unreachable from this environment. The
  component uses only Framer's long-standing public API (`addPropertyControls`, `ControlType`,
  `RenderTarget`) and the documented sizing annotations.
- The live site's actual header and CSS. The test page stood in for them.

The manual checks below cover all three.

### Manual checks on the published site (or staging)
**Framer**
- [ ] The canvas shows the opening screen, with no "Set Media URL" note once the URL is set.
- [ ] Preview plays it. The published page's browser console shows no errors.

**iPhone (Safari)**, then **Android (Chrome)**
- [ ] Scroll down through Earnings: the film arrives as the last section, edge to edge. There is
      no gap, line or colour step at the join, and no sideways scrolling.
- [ ] As the opening screen fills the screen, the header fades out.
- [ ] The swipe that brought you there does not start the film. A new swipe up does.
- [ ] Before starting, a swipe down goes back up the page and the header returns.
- [ ] While it plays the page does not move. A tap pauses it; a swipe or tap resumes it.
- [ ] Every scene matches the prototype: text, fonts, timing, crops, transitions. Compare with the
      prototype side by side (Option B above gives you a link).
- [ ] At the end: the header is back, "Your Pursuit starts now", Apply opens
      apply.thepursuitpath.com, Watch again replays, and scrolling up returns to Earnings.
- [ ] With **Low Power Mode on**: a swipe starts the film. If "Tap to play" ever shows, one tap
      carries it to the end.
- [ ] Rotate the phone during the film: the layout follows and the film stays in place.

**Desktop (Chrome, Safari, Firefox; mouse wheel and trackpad)**
- [ ] A long trackpad fling into the film docks it without starting it. A new scroll starts it.
- [ ] On Windows, the page doesn't shift sideways when the film starts (scrollbar gutter).
- [ ] Space pauses and resumes. The timeline takes clicks, drags and arrow keys. Skip steps
      through the chapters.
- [ ] Resizing the window during the film keeps it filling the window.
- [ ] After the end, scrolling up returns to the rest of the page.

**If something is off**
- The header doesn't hide: set **Header selector** (see [5](#5-inserting-it-into-the-framer-page), step 6).
- Videos don't play on iPhone: run `cdn/check.mjs` against the Media URL. The host must
  support byte ranges.
- Debug: add `?debug` to the page URL for an on-screen readout, or run
  `ClubScottsdale.state()` in the browser console.

### Running the automated tests
```
cd framer-export/qa && npm install && node build-harness.mjs
python3 -m http.server 8765          # from the repository root, in another terminal
node tests/compile.js                # the Framer file: TSX, one export, annotations, server-safe
PROXY_DIR=<webm folder> node tests/inpage.js
PROXY_DIR=<webm folder> sh tests/run_behaviour.sh
PROXY_DIR=<webm folder> OUT=/tmp/vr sh tests/run_vr.sh          # then read /tmp/vr/*.summary.json
PROXY_DIR=<webm folder> OUT=/tmp/parity sh tests/run_parity.sh  # then read /tmp/parity/*.json
```
Playwright's own Chromium can't play H.264 or HEVC. `PROXY_DIR` is a folder of WebM copies of
the clips, made with `sh make-proxies.sh <webm folder>` (needs ffmpeg). Both builds play the
same copies, so the comparison holds. With Google Chrome installed, `CHANNEL=chrome` and no
`PROXY_DIR` plays the real files instead.
