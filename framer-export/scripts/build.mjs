// Builds framer-export/ClubScottsdaleChapter.tsx from the approved build.
//
//   node framer-export/scripts/build.mjs
//
// Inputs (never modified): index.html, css/club.css, public/media/club-scottsdale/manifest.js,
// vendor/gsap.min.js, assets/fonts/*.woff2, plus framer-export/src/engine.js (the port of
// js/club.js) and framer-export/src/component.tsx (the React shell).
//
// What it does to the approved CSS, mechanically:
//  - every selector is prefixed with ".pursuit-club-chapter.pcc " (so nothing leaks out);
//    "html…" / "body…" state selectors become "div.pursuit-club-chapter.pcc…". Both add
//    exactly (0,2,0) specificity to every rule, so the cascade inside the film is unchanged;
//  - the html / body / main / :root rules become the component root (one viewport tall);
//  - html.is-locked becomes html.pcc-locked (the page lock), keyframes get a pcc- prefix;
//  - fonts are embedded as data: URLs (no CORS, no second request, no swap), as FontFace
//    descriptors the component adds when it mounts (so they are not in the page's HTML).
// It stops with an error if the approved sources no longer look the way it expects.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.resolve(HERE, '..', 'ClubScottsdaleChapter.tsx');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const fail = (msg) => { console.error('build: ' + msg); process.exit(1); };
const must = (cond, msg) => { if (!cond) fail(msg); };

const R = '.pursuit-club-chapter.pcc';           // the component root: two classes, (0,2,0)
const KEYFRAMES = ['cover-in', 'cover-drift', 'cue'];

/* ---------------------------------------------------------------- markup */
const html = read('index.html');
const skip = /<a class="skip"[^>]*>[\s\S]*?<\/a>/.exec(html);
const film = /<section class="film"[\s\S]*?<\/section>/.exec(html);
must(skip && film, 'index.html: skip link or film section not found');
let filmHtml = skip[0] + '\n' + film[0];
const BASE_PATH = 'public/media/club-scottsdale/';
must(filmHtml.includes(BASE_PATH), 'index.html: media path not found');
filmHtml = filmHtml.split(BASE_PATH).join('__BASE__');
must((filmHtml.match(/href="#apply"/g) || []).length === 1, 'index.html: the Apply link (#apply) not found once');
filmHtml = filmHtml.replace('href="#apply"', 'href="__APPLY__"');
// The cover is below the fold on the site: fetch it at low priority, not ahead of the hero.
must(filmHtml.includes('fetchpriority="high"'), 'index.html: cover fetchpriority not found');
filmHtml = filmHtml.replace('fetchpriority="high"', 'fetchpriority="low"');

/* ---------------------------------------------------------------- CSS */
const css = read('css/club.css').replace(/\/\*[\s\S]*?\*\//g, '');

function blocks(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open < 0) { must(!src.slice(i).trim(), 'css: stray text ' + src.slice(i, i + 40)); break; }
    let depth = 1, j = open + 1;
    while (j < src.length && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
    must(depth === 0, 'css: unbalanced braces');
    out.push({ prelude: src.slice(i, open).trim(), body: src.slice(open + 1, j - 1).trim() });
    i = j;
  }
  return out;
}
function splitSelectors(s) {
  const out = [];
  let depth = 0, cur = '';
  for (const c of s) {
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}
const pageRules = {};                              // html / body / main / :root / html.is-locked…
function mapSelector(sel) {
  sel = sel.replace(/\s+/g, ' ');
  if (['html', 'body', 'main', ':root'].includes(sel) || /^html\.is-locked/.test(sel)) return null;
  const m = /^(html|body)(?![\w-])(.*)$/.exec(sel);
  if (m) { must(/^[.:]/.test(m[2]), 'css: unexpected selector ' + sel); return 'div' + R + m[2]; }
  must(!/(^|[\s>+~(])(html|body)(?![\w-])/.test(sel), 'css: html/body inside a selector: ' + sel);
  return R + ' ' + sel;
}
function decls(body) {
  return body.replace(/(animation(?:-name)?\s*:\s*)([^;]+)/g, (all, prop, value) =>
    prop + value.replace(new RegExp('(^|[\\s,])(' + KEYFRAMES.join('|') + ')(?=[\\s,;]|$)', 'g'), '$1pcc-$2'));
}
// The @font-face rules become FontFace descriptors with the font data inline: the component
// adds them to the page when it mounts, so they stay out of the server-rendered HTML.
const fonts = [];
const FONT_DESCRIPTORS = ['font-family', 'src', 'font-weight', 'font-style', 'font-display'];
function transform(list, nested) {
  return list.map(({ prelude, body }) => {
    if (prelude.startsWith('@font-face')) {
      must(!nested, 'css: nested @font-face');
      const d = {};
      for (const part of body.split(';').map((x) => x.trim()).filter(Boolean)) {
        const i = part.indexOf(':');
        d[part.slice(0, i).trim()] = part.slice(i + 1).trim();
      }
      must(Object.keys(d).every((k) => FONT_DESCRIPTORS.includes(k)), 'css: unexpected @font-face descriptor in ' + body);
      const url = /^url\("\.\.\/(assets\/fonts\/[^"]+\.woff2)"\) format\("woff2"\)$/.exec(d.src || '');
      must(url && /^"[^"]+"$/.test(d['font-family'] || ''), 'css: unexpected @font-face ' + body);
      const b64 = fs.readFileSync(path.join(ROOT, url[1])).toString('base64');
      fonts.push({
        family: d['font-family'].slice(1, -1),
        src: 'url(data:font/woff2;base64,' + b64 + ') format("woff2")',
        weight: d['font-weight'] || 'normal',
        style: d['font-style'] || 'normal',
        display: d['font-display'] || 'auto',
      });
      return '';
    }
    if (prelude.startsWith('@keyframes')) {
      const name = prelude.split(/\s+/)[1];
      must(KEYFRAMES.includes(name), 'css: unknown keyframes ' + name);
      return '@keyframes pcc-' + name + '{' + body + '}';
    }
    if (prelude.startsWith('@media') || prelude.startsWith('@supports')) return prelude + '{' + transform(blocks(body), true) + '}';
    must(!prelude.startsWith('@'), 'css: unexpected at-rule ' + prelude);
    const sels = splitSelectors(prelude);
    const mapped = sels.map(mapSelector);
    if (mapped.every((s) => s === null)) {
      must(!nested, 'css: page rule inside an at-rule: ' + prelude);
      pageRules[prelude.replace(/\s+/g, ' ')] = body.replace(/\s+/g, ' ');
      return '';
    }
    must(mapped.every((s) => s !== null), 'css: page and film selectors mixed: ' + prelude);
    return mapped.join(',') + '{' + decls(body) + '}';
  }).filter(Boolean).join('\n');
}
const filmCss = transform(blocks(css), false);

// The page-level rules the component root replaces. If these change, re-check the root rule.
const EXPECT = {
  ':root': null,
  'html': 'height: 100%; background: var(--black); -webkit-text-size-adjust: 100%; overflow-x: clip;',
  'body': 'height: 100%; margin: 0; background: var(--black); color: var(--pearl); font: 300 16px/1.55 var(--sans); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-x: clip;',
  'html.is-locked, html.is-locked body': 'overflow: hidden; overscroll-behavior: none;',
  'html.is-locked body': 'touch-action: none;',
  'main': 'height: 100%;',
};
must(JSON.stringify(Object.keys(pageRules).sort()) === JSON.stringify(Object.keys(EXPECT).sort()), 'css: page rules changed: ' + Object.keys(pageRules).join(' | '));
for (const [k, v] of Object.entries(EXPECT)) if (v !== null) must(pageRules[k] === v, 'css: ' + k + ' changed: ' + pageRules[k]);
must(fonts.length === 5, 'css: expected 5 @font-face rules');
const tokens = pageRules[':root'];

const rootCss = [
  // The component root is what html, body and main were to the film. all:initial first cuts
  // every inherited property coming from the page around it.
  '.pursuit-club-chapter{all:initial}',
  R + '{' + tokens + ' display:block;position:relative;box-sizing:border-box;width:100%;height:100vh;height:100dvh;min-height:420px;margin:0;padding:0;' +
    'overflow-x:clip;background:var(--black);color:var(--pearl);font:300 16px/1.55 var(--sans);' +
    '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:auto;text-rendering:optimizeLegibility;-webkit-text-size-adjust:100%;text-size-adjust:100%;' +
    // the film is in English (the prototype page was <html lang="en">); all:initial above clears the page's language
    '-webkit-locale:"en"}',
  // Every element inside starts from the browser's own defaults, as it did on the prototype
  // page, whatever element rules the site has. (0,1,1): above element rules, below all film rules.
  '.pursuit-club-chapter :is(a,b,button,div,em,figure,h1,h2,h3,i,img,li,ol,p,picture,section,source,span,ul,video){all:revert}',
  // The page lock (was html.is-locked). scrollbar-gutter keeps the page from shifting where
  // scrollbars take space.
  'html.pcc-locked,html.pcc-locked body{overflow:hidden;overscroll-behavior:none}',
  'html.pcc-locked body{touch-action:none}',
  'html.pcc-locked{scrollbar-gutter:stable}',
  // The site's header, standing in for the prototype's replica (.site-head): same fade and lift.
  '.pcc-hdr{transition:opacity .9s cubic-bezier(0.2,0.7,0.1,1),translate .9s cubic-bezier(0.2,0.7,0.1,1)!important}',
  '.pcc-hdr--hidden{opacity:0!important;translate:0 -12px!important;pointer-events:none!important}',
  // The cover's opening animation (page load, on the prototype) waits until the film is on screen.
  'div' + R + ':not(.pcc-live) .cover__drift,div' + R + ':not(.pcc-live) .gate__cue i::after{animation-play-state:paused}',
  // Nothing of the film shows until its fonts are in (pcc-type): never a fallback font.
  'div' + R + ':not(.pcc-type) #club-scottsdale{visibility:hidden}',
].join('\n');

const STYLE = rootCss + '\n' + filmCss;

/* ---------------------------------------------------------------- media manifest */
const sandbox = { window: {} };
vm.runInNewContext(read('public/media/club-scottsdale/manifest.js'), sandbox);
const MEDIA = sandbox.window.CS_MEDIA;
must(MEDIA && MEDIA.clips && MEDIA.stills, 'manifest: CS_MEDIA not found');

/* ---------------------------------------------------------------- GSAP (vendored, unmodified) */
const gsapSrc = read('vendor/gsap.min.js');
const gsapVersion = (/GSAP (\d+\.\d+\.\d+)/.exec(gsapSrc) || [])[1];
must(gsapVersion, 'vendor/gsap.min.js: version not found');
const GSAP = `/* vendor/gsap.min.js — GSAP ${gsapVersion}, the approved build's copy, unmodified. It is evaluated
   once, in the browser, as a CommonJS module, and installs its globals into a private object
   (GreenSockGlobals) instead of window, so a GSAP the site may load is left alone. */
let GSAP = null
function loadGsap() {
    if (GSAP) return GSAP
    const w = window, hadGlobals = "GreenSockGlobals" in w, prevGlobals = w.GreenSockGlobals
    w.GreenSockGlobals = {}
    const module = { exports: {} }
    ;(function (exports, module, define) {
${gsapSrc.trim()}
    }).call(w, module.exports, module, undefined)
    if (hadGlobals) w.GreenSockGlobals = prevGlobals
    else delete w.GreenSockGlobals
    GSAP = module.exports.gsap || module.exports.default
    return GSAP
}`;

/* ---------------------------------------------------------------- engine */
let engine = fs.readFileSync(path.join(HERE, '..', 'src', 'engine.js'), 'utf8');
must(/^export function mountFilm\(/m.test(engine), 'engine.js: export function mountFilm not found');
engine = engine.replace(/^export function mountFilm\(/m, 'function mountFilm(');

// Every #id the CSS and the engine refer to must exist in the markup.
// (#s-over, #s-people and #h-scrim are retired rules in the approved CSS/JS that match nothing;
// '#g-' is the prefix of #g-connect / #g-create / #g-unwind.)
const ids = new Set([...filmHtml.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const RETIRED = ['s-over', 's-people', 'h-scrim'];
for (const [where, src] of [['engine', engine], ['css', filmCss]]) {
  for (const m of src.matchAll(/#([a-z][\w-]*)/g)) {
    const id = m[1];
    if (RETIRED.includes(id) || id.endsWith('-') || /^[0-9a-f]{3,8}$/.test(id)) continue;
    must(ids.has(id), where + ': #' + id + ' has no element in the markup');
  }
}
for (const g of ['g-connect', 'g-create', 'g-unwind']) must(ids.has(g), 'markup: #' + g + ' missing');

/* ---------------------------------------------------------------- assemble */
let rev = 'unknown';
try { rev = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch (e) { /* not a checkout */ }
const info = `Built from ${rev} · GSAP ${gsapVersion} · ${new Date().toISOString().slice(0, 10)}`;
const shell = fs.readFileSync(path.join(HERE, '..', 'src', 'component.tsx'), 'utf8');
const put = (s, key, val) => { must(s.includes(key), 'component.tsx: ' + key + ' missing'); return s.split(key).join(val); };
let out = shell;
out = put(out, '__BUILD_INFO__', info);
out = put(out, '__STYLE__', JSON.stringify(STYLE));
out = put(out, '__FONTS__', JSON.stringify(fonts, null, 1));
out = put(out, '__FILM_HTML__', JSON.stringify(filmHtml));
out = put(out, '__MEDIA__', JSON.stringify(MEDIA));
out = put(out, '__GSAP__', GSAP);
out = put(out, '__ENGINE__', engine.trim());
fs.writeFileSync(OUT, out);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
console.log(`wrote ${path.relative(ROOT, OUT)} (${kb(out)}): css ${kb(STYLE)}, fonts ${kb(JSON.stringify(fonts))}, markup ${kb(filmHtml)}, media manifest ${kb(JSON.stringify(MEDIA))}, gsap ${kb(gsapSrc)}, engine ${kb(engine)}`);
console.log(info);
