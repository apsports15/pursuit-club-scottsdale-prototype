// Viewer-level film behaviour, run the same way on the approved build (proto: the prototype
// page) and on the component (harness: the Framer-like page, film docked), so the two can be
// compared side by side:
//   transport   pause and resume, seek by tap and by drag (both ways), keys on the timeline,
//               seek while paused, Skip walks the chapters, End, Watch again, the skip link;
//               through all of it the film never moves on the page
//   run         a real-time playthrough from the first gesture to the end: film clock against
//               the wall clock, stalls, clips running backward, scroll attempts during the film
//               (the page must not move), and the page released at the end
//   lpm-swipe   iOS Low Power Mode emulation (a clip may play only after play() was called on it
//   lpm-wheel   in a real touchend / click / keydown). Started by a real swipe it never blocks;
//               started by an untrusted scroll, "Tap to play" shows and one tap carries it to the end
//
//   node behaviour.js <proto|harness> <transport|run|lpm-swipe|lpm-wheel> <w> <h> <mobile 0|1> <dpr>
// Prints one JSON line: { target, scenario, passed, failed: [...], metrics }.
const { open, S, wait, gotoHarness, gotoProto, dockFilm, swipe } = require('./lib');
const [,, target, scenario, W, H, MOB, DPR] = process.argv;
const M = MOB === '1';
const P = target === 'proto' ? '' : '.pursuit-club-chapter ';   // the film's elements, scoped on the page

const results = [];
const check = (label, ok, info) => results.push({ label, ok: !!ok, info });

// iOS Low Power Mode: play() is refused until it has once been called during a real gesture.
const LPM = () => {
  let gesture = false;
  ['touchend', 'click', 'keydown'].forEach((t) => window.addEventListener(t, (e) => { if (e.isTrusted) { gesture = true; setTimeout(() => { gesture = false; }, 0); } }, true));
  const orig = HTMLMediaElement.prototype.play;
  window.__refused = 0;
  window.__played = {};
  document.addEventListener('playing', (e) => { const n = e.target._name || '?'; window.__played[n] = (window.__played[n] || 0) + 1; }, true);
  HTMLMediaElement.prototype.play = function () {
    if (!this.__blessed) {
      if (gesture) this.__blessed = true;
      else { window.__refused++; return Promise.reject(new DOMException('Low Power Mode', 'NotAllowedError')); }
    }
    return orig.call(this);
  };
};

async function setup(init) {
  const t = await open({ w: +W, h: +H, mobile: M, dpr: +DPR, init });
  if (target === 'proto') await gotoProto(t.page);
  else { await gotoHarness(t.page); await dockFilm(t.page); }
  await wait(t.page, 1200);
  return t;
}
const geo = (page) => page.evaluate((P) => { const r = document.querySelector(P + '#club-scottsdale').getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height), y: Math.round(scrollY) }; }, P);
const hostClass = (page) => page.evaluate(() => (document.querySelector('.pursuit-club-chapter') || document.body).className);
const clips = (page) => page.evaluate(() => window.ClubScottsdale.clips());
const tapAt = (t, x, y) => (M ? t.page.touchscreen.tap(x, y) : t.page.mouse.click(x, y));
async function startGesture(t) {
  if (M) await swipe(t, 600, 440);
  else { await t.page.mouse.move(+W / 2, +H / 2); await t.page.mouse.wheel(0, 120); }
}

async function transport() {
  const t = await setup();
  const { page } = t;
  const g0 = await geo(page);
  const still = async () => { const g = await geo(page); return g.top === g0.top && g.h === g0.h && g.y === g0.y; };
  const track = () => page.locator(P + '#ctl-track').boundingBox();
  const clickTrack = async (f) => { const r = await track(); await tapAt(t, r.x + r.width * f, r.y + r.height * 0.6); };
  const dragTrack = async (f0, f1) => {
    const r = await track();
    const y = r.y + r.height * 0.6;
    await page.mouse.move(r.x + r.width * f0, y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(r.x + r.width * (f0 + ((f1 - f0) * i) / 12), y); await wait(page, 30); }
    await page.mouse.up();
  };

  let s = await S(page);
  // The prototype locks the page at its opening screen; on the site the page still scrolls there.
  check('opening screen', s.state === 'gate' && s.htmlLocked === (target === 'proto'), s);
  if (M) await tapAt(t, +W / 2, +H / 2); else await page.keyboard.press('PageDown');
  await wait(page, 3200);
  s = await S(page);
  check('start (tap on phone, Page Down on desktop): playing, page locked', s.state === 'playing' && s.htmlLocked && s.t > 2.5, s);

  await page.click(P + '#ctl-play');
  const tp = (await S(page)).t;
  await wait(page, 1500);
  s = await S(page);
  const cl = await clips(page);
  check('pause button: the clock and every clip hold', s.state === 'paused' && Math.abs(s.t - tp) < 0.001 && cl.every((c) => c.paused), { tp, t: s.t });

  if (M) await swipe(t, 600, 450); else { await page.mouse.move(+W / 2, +H / 3); await page.mouse.wheel(0, 200); }
  await wait(page, 1200);
  s = await S(page);
  check('a scroll gesture resumes it, and the page stays put', s.state === 'playing' && s.t > tp + 0.8 && (await still()), { s, g: await geo(page) });

  await clickTrack(0.6);
  await wait(page, 300);
  const s4 = await S(page);
  await wait(page, 2000);
  s = await S(page);
  check('tap the timeline at 60 %: lands there and plays on', s.state === 'playing' && Math.abs(s4.t - 0.6 * s.total) < 0.8 && s.t > s4.t + 1.5, { landed: s4.t, now: s.t });

  await dragTrack(0.6, 0.15);
  await wait(page, 300);
  const s5 = await S(page);
  await wait(page, 2000);
  s = await S(page);
  check('drag the timeline back to 15 %: lands there and plays on', s.state === 'playing' && Math.abs(s5.t - 0.15 * s.total) < 0.8 && s.t > s5.t + 1.5, { landed: s5.t, now: s.t });

  await page.focus(P + '#ctl-track');
  const k0 = (await S(page)).t;
  await page.keyboard.press('ArrowRight');
  await wait(page, 100);
  s = await S(page);
  check('Arrow Right on the timeline: +5 s', s.t > k0 + 4.5 && s.t < k0 + 6, { from: k0, to: s.t });

  await tapAt(t, +W / 2, +H * 0.35);
  await wait(page, 200);
  await clickTrack(0.42);
  await wait(page, 1200);
  const s7 = await S(page);
  await wait(page, 800);
  s = await S(page);
  check('tap the picture to pause, then seek: stays paused on the new time', s.state === 'paused' && Math.abs(s.t - s7.t) < 0.001 && Math.abs(s.t - 0.42 * s.total) < 0.8, s);
  await page.click(P + '#ctl-play');
  await wait(page, 1500);
  s = await S(page);
  check('play button resumes', s.state === 'playing' && s.t > s7.t + 1, s);

  await page.evaluate(() => window.ClubScottsdale.seek(0.5));
  await wait(page, 400);
  const chs = await page.evaluate(() => window.ClubScottsdale.chapters());
  const seen = [(await S(page)).chapter];
  for (let i = 0; i < chs.length + 1; i++) {
    if ((await S(page)).state === 'ended') break;
    await page.click(P + '#ctl-skip');
    await wait(page, 900);
    const a = await S(page);
    seen.push(a.state === 'ended' ? 'ENDED' : a.chapter);
  }
  const expect = chs.map((c) => c.label).concat(['ENDED']);
  s = await S(page);
  check('Skip walks the chapters one at a time, then finishes', s.state === 'ended' && JSON.stringify(seen) === JSON.stringify(expect), { seen, expect });
  const rel = await page.evaluate(() => ({ html: getComputedStyle(document.documentElement).overflowY, body: getComputedStyle(document.body).overflowY }));
  check('at the end the page is released', !s.htmlLocked && rel.html !== 'hidden' && rel.body !== 'hidden', rel);

  await page.click(P + '#replay');
  await wait(page, 1500);
  s = await S(page);
  check('Watch again: plays from the start, locked', s.state === 'playing' && s.htmlLocked && s.t > 0.8 && s.t < 3, s);

  await page.focus(P + '#ctl-track');
  await page.keyboard.press('End');
  await wait(page, 900);
  s = await S(page);
  const ctlGone = await page.evaluate((P) => getComputedStyle(document.querySelector(P + '#ctl')).visibility === 'hidden', P);
  check('End on the timeline: finished, released, controls retired', s.state === 'ended' && !s.htmlLocked && ctlGone, s);

  await page.click(P + '#replay');
  await wait(page, 1200);
  s = await S(page);
  const ctlBack = await page.evaluate((P) => getComputedStyle(document.querySelector(P + '#ctl')).visibility === 'visible', P);
  check('Watch again from the end: plays, locked, controls back', s.state === 'playing' && s.htmlLocked && s.t < 2.5 && ctlBack, s);

  await page.evaluate((P) => document.querySelector(P + '#skip-link').click(), P);
  await wait(page, 500);
  s = await S(page);
  check('skip link: finished, released', s.state === 'ended' && !s.htmlLocked, s);
  check('the film never moved on the page', await still(), await geo(page));
  check('no page errors', t.errs.length === 0, t.errs);
  await t.browser.close();
  return {};
}

async function run() {
  const t = await setup();
  const { page } = t;
  const g0 = await geo(page);
  await startGesture(t);
  const t0 = Date.now();
  const loops = [], stalls = [], scrolledDuring = [], blockedAt = [];
  const lastClipT = {};
  let lastT = -1, stallSince = null, k = 0;
  while (true) {
    const s = await S(page);
    const cl = await clips(page);
    const wallNow = (Date.now() - t0) / 1000;
    for (const c of cl) {
      const prev = lastClipT[c.name];
      if (prev !== undefined && c.loaded && c.t < prev - 0.05 && s.t >= c.start - 0.05 && s.t < c.end + 0.5) loops.push({ clip: c.name, from: prev, to: c.t, film: s.t });
      lastClipT[c.name] = c.t;
    }
    if (s.t < lastT - 0.01 && s.state !== 'ended') loops.push({ film: 'backward', from: lastT, to: s.t });
    if (s.state === 'playing') {
      if (s.t === lastT) stallSince = stallSince || wallNow;
      else if (stallSince) { if (wallNow - stallSince > 0.3) stalls.push({ at: lastT, secs: +(wallNow - stallSince).toFixed(2) }); stallSince = null; }
    }
    lastT = s.t;
    // Every few seconds, try to scroll: the page must stay put and the film keep going.
    if (++k % 60 === 0 && s.state === 'playing') {
      if (M) await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, cancelable: true })));
      else await page.mouse.wheel(0, 300);
      await page.keyboard.press('PageDown');
      scrolledDuring.push((await geo(page)).y);
    }
    if (/is-blocked/.test(await hostClass(page))) { blockedAt.push(s.t); await wait(page, 600); await tapAt(t, +W / 2, +H * 0.5); await wait(page, 300); }
    if (s.state === 'ended' || wallNow > 150) break;
    await wait(page, 40);
  }
  const wallS = (Date.now() - t0) / 1000;
  await wait(page, 600);
  const end = await S(page);
  // Released: on the prototype the page scrolls down past the film; on the site, back up.
  const yEnd = (await geo(page)).y;
  if (target === 'proto') { if (M) await swipe(t, 600, 300); else await page.mouse.wheel(0, 400); }
  else if (M) await swipe(t, 300, 600); else await page.mouse.wheel(0, -400);
  await wait(page, 800);
  const yAfter = (await geo(page)).y;
  const metrics = { total: end.total, wall: +wallS.toFixed(2), lag: +(wallS - end.total).toFixed(2), stalls, loops, blockedAt, scrolledDuring, docked: g0.y, yEnd, yAfter };
  check('reaches the end', end.state === 'ended', end);
  check('film time keeps pace with the wall clock (within 3 s over the whole film)', wallS - end.total < 3, metrics.lag);
  check('no stall longer than 0.3 s', stalls.length === 0, stalls);
  check('no clip ever runs backward or loops', loops.length === 0, loops);
  check('scroll attempts during the film never move the page', scrolledDuring.length > 3 && scrolledDuring.every((y) => y === g0.y), { scrolledDuring, docked: g0.y });
  check('never blocked (real gestures, no Low Power Mode)', blockedAt.length === 0, blockedAt);
  check('after the end the page scrolls', target === 'proto' ? true : yAfter < yEnd - 100, { yEnd, yAfter });
  check('no page errors', t.errs.length === 0, t.errs);
  await t.browser.close();
  return metrics;
}

async function lpm(mode) {
  const t = await setup(LPM);
  const { page } = t;
  if (mode === 'swipe') await swipe(t, 600, 440, null, 16);
  else await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true })));
  await wait(page, 2000);
  const a = await S(page);
  const aCls = await hostClass(page);
  let taps = 0, frozen = 0, lastT = -1;
  for (let i = 0; i < 500; i++) {
    const s = await S(page);
    if (/is-blocked/.test(await hostClass(page))) {
      taps++;
      if (taps > 5) break;
      await page.tap(P + '#tap-play');
      await wait(page, 400);
      continue;
    }
    if (s.state === 'playing' && s.t === lastT) frozen++;
    lastT = s.t;
    if (s.state === 'ended') break;
    await wait(page, 200);
  }
  const played = await page.evaluate(() => window.__played);
  const names = (await clips(page)).map((c) => c.name);
  const notPlayed = names.filter((n) => !played[n]);
  const end = await S(page);
  const refused = await page.evaluate(() => window.__refused);
  const metrics = { start: { state: a.state, t: a.t, blocked: /is-blocked/.test(aCls) }, taps, frozen, refused, notPlayed };
  if (mode === 'swipe') check('started by a real swipe: never blocked', a.state === 'playing' && taps === 0, metrics);
  else check('started by an untrusted scroll: "Tap to play" shows once, one tap carries it through', /is-blocked/.test(aCls) && taps === 1, metrics);
  check('plays to the end', end.state === 'ended', end);
  check('every clip played', notPlayed.length === 0, notPlayed);
  check('no page errors', t.errs.length === 0, t.errs);
  await t.browser.close();
  return metrics;
}

(async () => {
  let metrics = {};
  try {
    if (scenario === 'transport') metrics = await transport();
    else if (scenario === 'run') metrics = await run();
    else if (scenario === 'lpm-swipe') metrics = await lpm('swipe');
    else if (scenario === 'lpm-wheel') metrics = await lpm('wheel');
    else throw new Error('unknown scenario ' + scenario);
  } catch (e) { check('crashed', false, String(e && e.stack || e).slice(0, 600)); }
  const failed = results.filter((r) => !r.ok);
  console.log(JSON.stringify({ target, scenario, size: `${W}x${H}${M ? ' touch' : ''}`, passed: results.length - failed.length, of: results.length, failed, metrics }));
  process.exit(failed.length ? 1 : 0);
})();
