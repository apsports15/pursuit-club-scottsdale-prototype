// Visual regression capture: the same film times, from the approved build (the prototype page)
// or from the Framer component in the harness, as viewport screenshots.
//   node vr_capture.js <proto|harness> <outDir> <w> <h> <mobile 0|1> <dpr> [step] [query] [file]
// The site header is hidden in both (the prototype's stand-in replica vs the site's own header;
// the header's behaviour is tested separately), CSS animations/transitions are settled by
// Playwright, and every frame waits for its videos to finish seeking.
const fs = require('fs');
const path = require('path');
const { open, S, gotoHarness, gotoProto, dockFilm, wait } = require('./lib');
const [,, target, outDir, w, h, mobile, dpr, step = '0.5', query = '', file = 'index.html'] = process.argv;

(async () => {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const t = await open({ w: +w, h: +h, mobile: mobile === '1', dpr: +dpr });
  const { page } = t;
  const hide = target === 'proto' ? '.site-head{visibility:hidden!important}' : '.framer-nav-container{visibility:hidden!important}';
  if (target === 'proto') await gotoProto(page);
  else { await gotoHarness(page, query, file); await dockFilm(page); }
  await page.addStyleTag({ content: hide + ' *{caret-color:transparent!important}' });
  await wait(page, 2500);
  const shots = [];
  const shoot = async (name) => { await page.screenshot({ path: path.join(outDir, name + '.png'), animations: 'disabled' }); shots.push(name); };
  const g0 = await S(page);
  if (target !== 'proto' && !g0.docked) throw new Error('not docked: ' + JSON.stringify(g0));
  await shoot('gate');
  await page.evaluate(() => { window.ClubScottsdale.start(); window.ClubScottsdale.pause(); });
  const total = (await S(page)).total;
  let times = [];
  if (process.env.TIMES) times = process.env.TIMES.split(',').map(Number);
  else {
    for (let x = 0.05; x < total; x += +step) times.push(+x.toFixed(2));
    times.push(+(total - 0.02).toFixed(2));
  }
  for (const T of times) {
    await page.evaluate((T) => { window.ClubScottsdale.pause(); window.ClubScottsdale.seek(T); }, T);
    // wait for every clip that shows at T to have its frame
    const t0 = Date.now();
    while (Date.now() - t0 < 4000) {
      const ok = await page.evaluate((T) => window.ClubScottsdale.clips().every((c) => !(T >= c.start - 0.05 && T < c.end + 0.05) || (c.loaded && c.rs >= 2)), T);
      const seeking = await page.evaluate(() => Array.from(document.querySelectorAll('video')).some((v) => v.seeking));
      if (ok && !seeking) break;
      await wait(page, 100);
    }
    await wait(page, 350);
    await shoot(String(Math.round(T * 100)).padStart(5, '0'));
  }
  await page.evaluate(() => window.ClubScottsdale.seek(1e9));
  await wait(page, 1500);
  await shoot('ended');
  const s = await S(page);
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({ target, w, h, mobile, dpr, query, file, total, times, shots, state: s, errs: t.errs }, null, 1));
  console.log(JSON.stringify({ target, outDir, frames: shots.length, total, errs: t.errs.slice(0, 5) }));
  await t.browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
