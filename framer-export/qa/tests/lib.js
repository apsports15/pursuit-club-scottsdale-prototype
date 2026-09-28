// Shared helpers for the Framer-export QA scripts (Playwright).
// The repo root must be served on http://localhost:8765 (python3 -m http.server 8765).
// Playwright's Chromium has no H.264/HEVC: set PROXY_DIR to a folder of WebM proxies named
// like the clips (aerial.p1080.webm …) and every *.mp4 request is answered from it, with
// byte ranges like a real host. Or run Google Chrome, which plays H.264: CHANNEL=chrome and
// no PROXY_DIR.
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ORIGIN = process.env.ORIGIN || 'http://localhost:8765';
const HARNESS = ORIGIN + '/framer-export/qa/harness/';
const PROTO = ORIGIN + '/';

function proxyRoute(dir, errs) {
  return async (route) => {
    const req = route.request();
    const base = path.basename(new URL(req.url()).pathname);
    const f = path.join(dir, base.replace(/\.mp4$/, '.webm'));
    if (!fs.existsSync(f)) { errs.push('no proxy ' + base); return route.continue(); }
    const buf = fs.readFileSync(f);
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers()['range'] || '');
    if (!m) return route.fulfill({ status: 200, headers: { 'Content-Type': 'video/webm', 'Accept-Ranges': 'bytes', 'Content-Length': String(buf.length) }, body: buf });
    const a = m[1] === '' ? buf.length - +m[2] : +m[1];
    let b = m[1] !== '' && m[2] !== '' ? +m[2] : buf.length - 1;
    b = Math.min(b, buf.length - 1);
    return route.fulfill({ status: 206, headers: { 'Content-Type': 'video/webm', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${buf.length}`, 'Content-Length': String(b - a + 1) }, body: buf.subarray(a, b + 1) });
  };
}

async function open({ w = 390, h = 844, mobile = true, dpr = 2, rm = false, policy = 'no-user-gesture-required', init } = {}) {
  const browser = await chromium.launch({ channel: process.env.CHANNEL || undefined, args: ['--autoplay-policy=' + policy] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: dpr, reducedMotion: rm ? 'reduce' : 'no-preference' });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
  if (process.env.PROXY_DIR) await page.route('**/*.mp4', proxyRoute(process.env.PROXY_DIR, errs));
  return { browser, ctx, page, errs, w, h, mobile };
}

const S = (page) => page.evaluate(() => window.ClubScottsdale && window.ClubScottsdale.state());
const wait = (page, ms) => page.waitForTimeout(ms);

async function gotoHarness(page, query = '', file = 'index.html') {
  await page.goto(HARNESS + file + (query ? '?' + query : ''));
  await page.waitForFunction(() => window.ClubScottsdale, null, { timeout: 15000 });
}
async function gotoProto(page) {
  await page.goto(PROTO);
  await page.waitForFunction(() => window.ClubScottsdale, null, { timeout: 15000 });
}
// Scroll the page to its end (the film docked), without starting anything.
async function toBottom(page) {
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, document.documentElement.scrollHeight); document.documentElement.style.scrollBehavior = ''; });
}
// Scroll so the film's top meets the top of the view (its dock), without starting anything.
async function dockFilm(page) {
  await page.evaluate(() => { const r = document.querySelector('.pursuit-club-chapter').getBoundingClientRect(); document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, scrollY + r.top); document.documentElement.style.scrollBehavior = ''; });
}
async function swipe(t, fromY, toY, x = null, stepMs = 16) {
  const cdp = t.cdp || (t.cdp = await t.ctx.newCDPSession(t.page));
  const X = x == null ? t.w / 2 : x;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: X, y: fromY }] });
  const n = 10;
  for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: X, y: fromY + ((toY - fromY) * i) / n }] }); await t.page.waitForTimeout(stepMs); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
// The component root and the page, for layout checks.
const geo = (page) => page.evaluate(() => {
  const host = document.querySelector('.pursuit-club-chapter');
  const r = host.getBoundingClientRect();
  const film = document.querySelector('.pursuit-club-chapter #club-scottsdale').getBoundingClientRect();
  return { top: +r.top.toFixed(2), h: +r.height.toFixed(2), filmH: +film.height.toFixed(2), vh: innerHeight, vw: innerWidth, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, y: scrollY, maxY: document.documentElement.scrollHeight - innerHeight };
});
const headerState = (page) => page.evaluate(() => {
  const n = document.querySelector('.framer-nav-container');
  return { cls: n.className, opacity: +getComputedStyle(n).opacity, pe: getComputedStyle(n).pointerEvents };
});

module.exports = { open, S, wait, gotoHarness, gotoProto, toBottom, dockFilm, swipe, geo, headerState, HARNESS, PROTO, ORIGIN };
