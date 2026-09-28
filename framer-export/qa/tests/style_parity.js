// Computed-style parity: for every element in the film (and its ::before / ::after), every
// computed CSS property and its box, in the approved build and in the Framer component, at
// the same film times. Any difference is listed.
//   node style_parity.js <w> <h> <mobile 0|1> <dpr> [harnessQuery] [times]
const { open, S, gotoHarness, gotoProto, toBottom, wait } = require('./lib');
const [,, w, h, mobile, dpr, query = '', timesArg = 'gate,1.0,6,12,24,30,45,50,56,64,68,end'] = process.argv;
const times = timesArg.split(',');

// Properties that legitimately differ and do not affect what is drawn.
const SKIP = new Set(['transition', 'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay', 'transition-behavior']);

async function snapshot(page, T) {
  if (T === 'gate') {/* as loaded */}
  else if (T === 'end') await page.evaluate(() => window.ClubScottsdale.seek(1e9));
  else await page.evaluate((T) => { window.ClubScottsdale.pause(); window.ClubScottsdale.seek(+T); }, T);
  await wait(page, 900);
  return page.evaluate((skip) => {
    // Settle CSS animations and transitions the way Playwright's animations:'disabled' does
    // (finite ones to their end, infinite ones to their start): their progress depends on the
    // wall clock, not on the CSS. GSAP does not use them.
    document.getAnimations().forEach((a) => { try { if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = 0; } else a.finish(); } catch (e) { /* ignore */ } });
    const film = document.querySelector('#club-scottsdale');
    const els = [film, ...film.querySelectorAll('*')];
    const out = [];
    const base = film.getBoundingClientRect();
    for (const el of els) {
      const key = el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? el.tagName.toLowerCase() + '.' + el.className.trim().split(/\s+/).join('.') : el.tagName.toLowerCase()) + '@' + Array.prototype.indexOf.call(el.parentNode.children, el) + '<' + (el.parentNode.id || el.parentNode.className || el.parentNode.tagName);
      for (const pseudo of [null, '::before', '::after']) {
        const cs = getComputedStyle(el, pseudo);
        if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
        const props = {};
        for (let i = 0; i < cs.length; i++) { const p = cs[i]; if (!skip.includes(p)) props[p] = cs.getPropertyValue(p); }
        // keyframes are renamed pcc-… in the component (same keyframes, a name the site cannot share)
        if (props['animation-name']) props['animation-name'] = props['animation-name'].replace(/\bpcc-/g, '');
        const r = pseudo ? null : el.getBoundingClientRect();
        out.push({ key: key + (pseudo || ''), props, rect: r ? [r.left - base.left, r.top - base.top, r.width, r.height].map((v) => +v.toFixed(2)) : null });
      }
    }
    return out;
  }, [...SKIP]);
}

(async () => {
  const run = async (target) => {
    const t = await open({ w: +w, h: +h, mobile: mobile === '1', dpr: +dpr });
    if (target === 'proto') await gotoProto(t.page); else { await gotoHarness(t.page, query, process.env.FILE || 'index.html'); await toBottom(t.page); }
    await wait(t.page, 2500);
    const res = {};
    for (const T of times) {
      if (T !== 'gate' && T !== 'end' && (await S(t.page)).state === 'gate') await t.page.evaluate(() => { window.ClubScottsdale.start(); window.ClubScottsdale.pause(); });
      res[T] = await snapshot(t.page, T);
    }
    await t.browser.close();
    return { res, errs: t.errs };
  };
  const [a, b] = await Promise.all([run('proto'), run('harness')]);
  const report = { viewport: [w, h, mobile, dpr], query, times: {}, errs: { proto: a.errs, harness: b.errs } };
  let total = 0;
  for (const T of times) {
    const A = a.res[T], B = b.res[T];
    const diffs = [];
    if (A.length !== B.length) diffs.push({ count: [A.length, B.length] });
    const n = Math.min(A.length, B.length);
    for (let i = 0; i < n; i++) {
      const x = A[i], y = B[i];
      if (x.key !== y.key) { diffs.push({ at: i, key: [x.key, y.key] }); continue; }
      const d = {};
      for (const p of new Set([...Object.keys(x.props), ...Object.keys(y.props)])) if (x.props[p] !== y.props[p]) d[p] = [x.props[p], y.props[p]];
      if (JSON.stringify(x.rect) !== JSON.stringify(y.rect)) d.__rect = [x.rect, y.rect];
      if (Object.keys(d).length) diffs.push({ key: x.key, d });
    }
    total += diffs.length;
    report.times[T] = { elements: n, differing: diffs.length, diffs: diffs.slice(0, 12) };
  }
  report.totalDiffering = total;
  console.log(JSON.stringify(report, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
