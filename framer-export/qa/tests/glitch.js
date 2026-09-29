// Does a clip ever show the wrong part of itself while the film plays? Runs the film with the
// media arriving slowly and unevenly (a reload on a slow or busy connection), and samples
// every 40 ms: for each clip on screen, where the clip is against where the film says it
// should be. A clip that plays from its start and jumps forward, or bounces back, shows up as a
// large mismatch or a backward jump while it is playing.
//   node glitch.js <proto|harness> <seed> <maxDelayMs> [w h mobile dpr] [seconds]
const fs = require('fs');
const path = require('path');
const { open, S, wait, gotoHarness, gotoProto, dockFilm } = require('./lib');
const [,, target, seedArg, maxDelay, W = '390', H = '844', MOB = '1', DPR = '2', SECS = '75'] = process.argv;
let seed = +seedArg;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const dir = process.env.PROXY_DIR;

(async () => {
  const t = await open({ w: +W, h: +H, mobile: MOB === '1', dpr: +DPR });
  const { page } = t;
  await page.unroute('**/*.mp4').catch(() => {});
  if (process.env.SLOW) {
    // Media from the slow server (SLOW=http://localhost:PORT/): the harness is pointed at it by
    // ?assetBase=, the prototype's requests are redirected.
    await page.route('**/*.mp4', (route) => route.continue({ url: process.env.SLOW + path.basename(new URL(route.request().url()).pathname) }));
  } else await page.route('**/*.mp4', async (route) => {
    const req = route.request();
    const base = path.basename(new URL(req.url()).pathname);
    const f = path.join(dir, base.replace(/\.mp4$/, '.webm'));
    if (!fs.existsSync(f)) return route.continue();
    // DELAY_CLIP=name:ms holds back one clip's files only (a clip that is late for its turn).
    const [dc, dms] = (process.env.DELAY_CLIP || '').split(':');
    if (dc && base.startsWith(dc + '.')) await new Promise((r) => setTimeout(r, +dms));
    await new Promise((r) => setTimeout(r, rnd() * +maxDelay));      // slow, uneven
    const buf = fs.readFileSync(f);
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers()['range'] || '');
    if (!m) return route.fulfill({ status: 200, headers: { 'Content-Type': 'video/webm', 'Accept-Ranges': 'bytes', 'Content-Length': String(buf.length) }, body: buf });
    const a = m[1] === '' ? buf.length - +m[2] : +m[1];
    let b = m[1] !== '' && m[2] !== '' ? +m[2] : buf.length - 1;
    b = Math.min(b, buf.length - 1);
    return route.fulfill({ status: 206, headers: { 'Content-Type': 'video/webm', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${buf.length}`, 'Content-Length': String(b - a + 1) }, body: buf.subarray(a, b + 1) });
  });
  if (target === 'proto') await gotoProto(page); else { await gotoHarness(page, process.env.SLOW ? 'assetBase=' + encodeURIComponent(process.env.SLOW) : ''); await dockFilm(page); }
  await wait(page, 300);
  await page.evaluate(() => { window.ClubScottsdale.start(); });
  const t0 = Date.now();
  const events = [];
  const last = {};
  let ended = false;
  while (Date.now() - t0 < +SECS * 1000 && !ended) {
    const r = await page.evaluate(() => {
      const s = window.ClubScottsdale.state();
      return { s, clips: window.ClubScottsdale.clips() };
    });
    const T = r.s.t;
    for (const c of r.clips) {
      if (!(T >= c.start && T < c.end) || !c.loaded || c.rs < 2) continue;
      const drift = +(c.start + c.t - T).toFixed(2);
      const prev = last[c.name];
      if (!c.paused && Math.abs(drift) > 0.35) events.push({ kind: 'mismatch', clip: c.name, film: T, clipT: c.t, drift, rs: c.rs });
      if (prev && c.t < prev - 0.08) events.push({ kind: 'backward', clip: c.name, film: T, from: prev, to: c.t });
      last[c.name] = c.t;
    }
    ended = r.s.state === 'ended';
    await wait(page, 40);
  }
  // count distinct glitches (merge events of one clip within 1 s of film time)
  const merged = [];
  for (const e of events) { const p = merged[merged.length - 1]; if (p && p.clip === e.clip && Math.abs(e.film - p.film) < 1) continue; merged.push(e); }
  console.log(JSON.stringify({ delayClip: process.env.DELAY_CLIP || null, target, seed: +seedArg, maxDelay: +maxDelay, ended, wall: +((Date.now() - t0) / 1000).toFixed(1), glitches: merged.length, first: merged.slice(0, 4), errs: t.errs.slice(0, 2) }));
  await t.browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
