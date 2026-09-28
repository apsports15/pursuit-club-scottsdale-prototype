// Builds the QA harness: a page shaped like the published Pursuit site in Framer (fixed header,
// Hero and Earnings above, Framer's global CSS), with ClubScottsdaleChapter mounted by React 18
// in a Framer-style code component container.
//
//   cd framer-export/qa && npm install && node build-harness.mjs
//
// Writes harness/index.html (client render), harness/ssr.html (server-rendered, then hydrated),
// harness/harness.js (production React) and harness/harness.dev.js (development React, for
// hydration warnings). Query options, for either page:
//   ?hostile=1     aggressive site CSS on every element type (isolation test)
//   ?smooth=1      html { scroll-behavior: smooth }
//   ?noscrollbar=1 overlay scrollbars (macOS, phones): the page's scrollbar takes no width
//   ?transform=1   the component's container has a transform (as Framer effects add)
//   ?below=600     600 px of page below the component
//   ?above=4000    a taller Earnings section (4000 px more page above the component)
//   ?lenis=1       a wheel-driven smooth-scroll script on the page (like Framer's smooth scroll)
//   ?canvas=1      Framer canvas render target (no film, opening screen only)
//   ?hide=0        leave the site header alone     ?sel=nav      header selector
//   ?defer=1       do not mount until window.__mount()
//   ?strict=1      React.StrictMode (use index.dev.html: effects run, clean up, run again)
//   ?assetBase=…   media folder (default: this repo's public/media/club-scottsdale/ on :8765)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const H = path.join(HERE, 'harness');
const common = {
  bundle: true,
  loader: { '.tsx': 'tsx', '.jsx': 'jsx' },
  alias: { framer: path.join(HERE, 'framer-mock.js') },
  nodePaths: [path.join(HERE, 'node_modules')],
  logLevel: 'warning',
};

await esbuild.build({ ...common, entryPoints: [path.join(H, 'entry.jsx')], outfile: path.join(H, 'harness.js'), format: 'iife', define: { 'process.env.NODE_ENV': '"production"' }, minify: true });
await esbuild.build({ ...common, entryPoints: [path.join(H, 'entry.jsx')], outfile: path.join(H, 'harness.dev.js'), format: 'iife', define: { 'process.env.NODE_ENV': '"development"' } });
await esbuild.build({ ...common, entryPoints: [path.join(H, 'ssr.jsx')], outfile: path.join(H, 'ssr.cjs'), platform: 'node', format: 'cjs', define: { 'process.env.NODE_ENV': '"production"' } });

// Framer's global CSS on a published site (reset + body), as it ships.
const FRAMER_CSS = `
html, body, #main { margin: 0; padding: 0; box-sizing: border-box; }
:root { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
* { box-sizing: border-box; -webkit-font-smoothing: inherit; }
h1, h2, h3, h4, h5, h6, p, figure { margin: 0; }
body, input, textarea, select, button { font-size: 12px; font-family: sans-serif; }
body { background: rgb(11, 11, 11); }
#main { display: contents; }
.framer-page { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 100%; min-height: 100vh; overflow: visible; background: rgb(11, 11, 11); }
.framer-nav-container { position: fixed; top: 0; left: 50%; width: 100%; transform: translateX(-50%); z-index: 10; }
.framer-nav { display: flex; justify-content: space-between; align-items: center; height: 64px; padding: 0 40px; background: rgb(11, 11, 11); border-bottom: 1px solid rgba(255,255,255,0.08); color: #ECE9E3; font: 400 22px/1 Georgia, serif; letter-spacing: 0.3em; }
.framer-nav span { font: 500 12px/1 sans-serif; letter-spacing: 0.2em; }
.framer-section { position: relative; width: 100%; flex: none; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #ECE9E3; font: 400 40px/1.1 Georgia, serif; text-transform: uppercase; text-align: center; }
.framer-hero { height: 900px; background: radial-gradient(circle at 30% 30%, #2a2a2a, #0b0b0b); }
.framer-earnings { height: 1200px; background: #0b0b0b; border-top: 1px solid #1d1d1d; }
.framer-1abc2de-container { position: relative; width: 100%; height: auto; flex: none; }
/* Things a site might already have that share names with the film (leak test decoys). */
.decoys { display: flex; gap: 12px; font: 400 14px/1.4 sans-serif; color: #ECE9E3; text-transform: none; }
`;
// Aggressive site CSS, on every element type the film uses (isolation test, ?hostile=1).
const HOSTILE_CSS = `
html { font-size: 31px; }
body { font: italic 700 29px/3 Georgia, serif; letter-spacing: 3px; word-spacing: 9px; text-transform: lowercase; text-align: right; color: red; text-indent: 30px; text-shadow: 0 0 2px lime; white-space: pre; cursor: crosshair; font-variant: small-caps; line-height: 3; visibility: visible; }
div, p, span, section, figure, picture, i, b, em, a, h1, h2, h3, ol, ul, li { margin: 7px; padding: 3px; line-height: 2.5; letter-spacing: 2px; font-family: Georgia, serif; box-sizing: content-box; text-transform: capitalize; font-style: normal; transition: all 1s; }
button { background: red; border: 4px solid lime; padding: 20px; border-radius: 0; font: bold 20px Arial; text-transform: none; letter-spacing: 0; color: yellow; appearance: none; display: block; }
img, video { max-width: 50%; opacity: 0.5; filter: grayscale(1); object-fit: contain; display: inline; margin: 5px; }
a { color: lime; text-decoration: underline wavy; }
h1, h2, h3 { font-size: 40px; font-weight: 900; }
em { font-style: normal; font-weight: 900; }
section { display: flex; overflow: auto; }
* { outline: 1px dashed rgba(0,255,0,0.4); }
/* The layout wrappers of the page keep the Framer layout (on a real site Framer class rules
   set them); site CSS that moved them would break the whole page, not just the film. */
html, body, #main, .framer-page, .framer-1abc2de-container { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; outline: none !important; }
.framer-page { overflow-x: clip !important; }
`;

if (/['\\]/.test(HOSTILE_CSS)) throw new Error('HOSTILE_CSS must not contain quotes or backslashes (it is inlined in a JS string)');
const page = (ssrMarkup) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Pursuit | harness</title>
<style id="framer-css">${FRAMER_CSS}</style>
<script>
  (function () {
    var q = new URLSearchParams(location.search), d = document;
    if (q.get('hostile')) d.write('<style id="hostile-css">${HOSTILE_CSS.replace(/\n/g, ' ')}</style>');
    if (q.get('smooth')) d.write('<style>html { scroll-behavior: smooth; }</style>');
    if (q.get('noscrollbar')) d.write('<style>html { scrollbar-width: none; } ::-webkit-scrollbar { display: none; }</style>');
    window.__q = q;
    ${ssrMarkup ? 'window.__ssr = true;' : ''}
  })();
</script>
</head>
<body>
<div id="main" data-framer-hydrate-v2>
  <div class="framer-page" data-framer-name="Desktop">
    <div class="framer-nav-container"><nav class="framer-nav" data-framer-name="Navigation"><div>PURSUIT</div><div><span>APPLY ↗</span></div></nav></div>
    <section class="framer-section framer-hero" data-framer-name="Hero">The Pursuit<br>starts here.</section>
    <section class="framer-section framer-earnings" data-framer-name="Earnings">Earnings
      <div class="decoys" id="decoys"><p class="micro">micro</p><h2 class="display">display</h2><div class="film m panel win">film</div><button class="cta__btn">button</button><span class="room__name">room</span><div class="ctl">ctl</div></div>
    </section>
    <div class="framer-1abc2de-container" id="slot">${ssrMarkup || ''}</div>
    <div id="below"></div>
  </div>
</div>
<script>
  (function () {
    var q = window.__q;
    if (q.get('transform')) document.getElementById('slot').style.transform = 'translateZ(0)';
    if (q.get('above')) document.querySelector('.framer-earnings').style.height = (1200 + (+q.get('above'))) + 'px';
    if (q.get('below')) { var b = document.getElementById('below'); b.style.cssText = 'height:' + (+q.get('below')) + 'px;width:100%;background:#151515;flex:none'; }
    if (q.get('lenis')) {
      // A wheel-driven smooth scroll, the way Lenis / Framer's smooth scroll work: it takes
      // wheel events on window and moves the page itself.
      // Like Lenis, it keeps its own position (a float) and lands exactly on its target.
      var target = scrollY, animated = scrollY, raf = 0;
      var step = function () {
        animated += (target - animated) * 0.2;
        if (Math.abs(target - animated) < 0.5) animated = target;
        scrollTo(0, animated);
        raf = animated !== target ? requestAnimationFrame(step) : 0;
      };
      addEventListener('wheel', function (e) {
        e.preventDefault();
        if (!raf) animated = target = scrollY;
        target = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, target + e.deltaY));
        if (!raf) raf = requestAnimationFrame(step);
      }, { passive: false });
      addEventListener('scroll', function () { if (!raf) animated = target = scrollY; }, { passive: true });
    }
  })();
</script>
<script src="${'harness.js'}"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(H, 'index.html'), page(''));
fs.writeFileSync(path.join(H, 'index.dev.html'), page('').replace('src="harness.js"', 'src="harness.dev.js"'));
const { render } = await import(path.join(H, 'ssr.cjs'));
const ssrMarkup = render(new URLSearchParams(''));
fs.writeFileSync(path.join(H, 'ssr.html'), page(ssrMarkup));
fs.writeFileSync(path.join(H, 'ssr.dev.html'), page(ssrMarkup).replace('src="harness.js"', 'src="harness.dev.js"'));
console.log('harness built: index.html, index.dev.html, ssr.html, ssr.dev.html (' + (ssrMarkup.length / 1024).toFixed(1) + ' KB server-rendered)');
