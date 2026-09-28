// In-page behaviour of the component on a Framer-like page: docking, the opening screen,
// the scroll lock, the site header, the end, replay, glide-to-dock, resize, unmount and
// remount, other page setups (smooth scroll, content below, no header hiding, a named
// header), the Framer canvas, server render + hydration, style leaks and media deferral.
//   node inpage.js [group …]    groups: mobile desktop setups canvas ssr strict leaks media
const { open, S, wait, gotoHarness, toBottom, swipe, geo, headerState } = require('./lib');

const results = [];
const check = (group, label, ok, info) => { results.push({ group, label, ok: !!ok, info }); };
const noOverflow = (g) => g.sw <= g.cw;

async function waitFor(page, fn, arg, ms = 5000) {
  try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; }
}

async function mobile() {
  const G = 'mobile 390x844 (touch)';
  const t = await open({ w: 390, h: 844, mobile: true, dpr: 2 });
  const { page } = t;
  await gotoHarness(page);
  await wait(page, 1200);
  let s = await S(page), g = await geo(page), hd = await headerState(page);
  check(G, 'top of page: opening screen, page not locked, header shown', s.state === 'gate' && !s.htmlLocked && !s.locked && hd.opacity === 1 && hd.pe === 'auto', { s, hd });
  check(G, 'component is one viewport tall, full width, no horizontal overflow', g.h === g.vh && noOverflow(g), g);
  check(G, "cover's opening animation waits until the film is on screen", !(await page.evaluate(() => document.querySelector('.pursuit-club-chapter').classList.contains('pcc-live'))));
  const ft = await page.evaluate(() => ({ faces: [...document.fonts].filter((f) => /^"?Pursuit (Serif|Sans)"?$/.test(f.family)).map((f) => f.family.replace(/"/g, '') + ' ' + f.weight + ' ' + f.style + ' ' + f.status), type: document.querySelector('.pursuit-club-chapter').classList.contains('pcc-type'), vis: getComputedStyle(document.querySelector('.pursuit-club-chapter #club-scottsdale')).visibility }));
  check(G, "the film's five fonts are added and loaded at mount, then the film is shown", ft.faces.length === 5 && ft.faces.every((f) => / loaded$/.test(f)) && ft.type && ft.vis === 'visible', ft);

  // Scroll down to the film with real swipes (each one a new touch that begins far above the dock).
  for (let i = 0; i < 12 && !(await S(page)).docked; i++) await swipe(t, 700, 150, null, 8);
  await wait(page, 600);
  s = await S(page); g = await geo(page);
  check(G, 'scrolling down reaches the film and docks it (film top = 0 at the end of the page)', s.docked && g.top === 0 && g.y === g.maxY, { s, g });
  check(G, 'the swipes that brought it there did not start it', s.state === 'gate', s);
  check(G, "cover's opening animation starts on screen", await page.evaluate(() => document.querySelector('.pursuit-club-chapter').classList.contains('pcc-live')));
  await wait(page, 1000);
  hd = await headerState(page);
  check(G, 'header fades out while the opening screen fills the view (as the prototype showed it)', /pcc-hdr--hidden/.test(hd.cls) && hd.opacity === 0 && hd.pe === 'none', hd);

  // A swipe down (page up) at the opening screen leaves: the page is not locked yet.
  const y0 = (await geo(page)).y;
  await swipe(t, 300, 700, null, 16);
  await wait(page, 900);
  g = await geo(page); s = await S(page); hd = await headerState(page);
  check(G, 'swiping down at the opening screen scrolls the page back up', g.y < y0 - 100 && s.state === 'gate', { y0, y: g.y });
  check(G, 'header returns once the film is below mid-screen', !/pcc-hdr--hidden/.test(hd.cls), hd);

  // Back to the film; a new swipe up starts it.
  await toBottom(page); await wait(page, 500);
  await swipe(t, 600, 420);
  await wait(page, 1500);
  s = await S(page); g = await geo(page); hd = await headerState(page);
  check(G, 'a new swipe up on the docked opening screen starts the film', s.state === 'playing' && s.t > 0.5, s);
  check(G, 'page locked with the film docked; header hidden', s.htmlLocked && g.top === 0 && /pcc-hdr--hidden/.test(hd.cls), { s, g, hd });

  // The site re-renders its header while the film has it hidden: a variant's new class list,
  // then a new element in its place. Either way it is hidden again.
  await page.evaluate(() => { document.querySelector('.framer-nav-container').className = 'framer-nav-container framer-v-scrolled'; });
  await wait(page, 150);
  hd = await headerState(page);
  check(G, 'site re-renders the header with new classes mid-film: hidden again', /pcc-hdr--hidden/.test(hd.cls) && /framer-v-scrolled/.test(hd.cls) && hd.opacity === 0 && hd.pe === 'none', hd);
  await page.evaluate(() => { const n = document.querySelector('.framer-nav-container'); const c = n.cloneNode(true); c.className = 'framer-nav-container'; n.replaceWith(c); });
  await wait(page, 1300);
  hd = await headerState(page);
  check(G, 'site replaces the header element mid-film: the new one is hidden', /pcc-hdr--hidden/.test(hd.cls) && hd.opacity === 0 && hd.pe === 'none', hd);

  // Nothing moves the page while it plays.
  const yLock = g.y;
  await swipe(t, 200, 700); await swipe(t, 700, 200);
  await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 400, cancelable: true, bubbles: true })));
  await page.keyboard.press('PageDown'); await page.keyboard.press('End'); await page.keyboard.press('ArrowUp');
  await wait(page, 600);
  g = await geo(page); s = await S(page);
  check(G, 'swipes, wheel and keys during the film do not move the page', g.y === yLock && g.top === 0, { yLock, g });
  check(G, 'still playing', s.state === 'playing', s);

  // Tap the picture: pause; a swipe resumes after 0.7 s (the approved behaviour).
  await page.touchscreen.tap(195, 300);
  await wait(page, 300);
  const tp = (await S(page)).t;
  await wait(page, 900);
  s = await S(page);
  check(G, 'tap pauses and the clock holds', s.state === 'paused' && s.t === tp, s);
  await swipe(t, 600, 420);
  await wait(page, 1200);
  s = await S(page);
  check(G, 'a swipe resumes it', s.state === 'playing' && s.t > tp, s);

  // The end: unlocked, header back, controls retired.
  await page.evaluate(() => window.ClubScottsdale.seek(window.ClubScottsdale.state().total - 1.2));
  await waitFor(page, () => window.ClubScottsdale.state().state === 'ended', null, 6000);
  await wait(page, 1200);
  s = await S(page); hd = await headerState(page);
  const ctl = await page.evaluate(() => getComputedStyle(document.querySelector('.pursuit-club-chapter #ctl')).visibility);
  check(G, 'the film finishes: page released, header back, controls retired', s.state === 'ended' && !s.htmlLocked && !/pcc-hdr/.test(hd.cls) && hd.opacity === 1 && ctl === 'hidden', { s, hd, ctl });
  const y1 = (await geo(page)).y;
  await swipe(t, 300, 700);
  await wait(page, 900);
  g = await geo(page);
  check(G, 'after the end the page scrolls again', g.y < y1 - 100, { y1, y: g.y });

  // Back down: still the end; Watch again replays from the dock.
  await toBottom(page); await wait(page, 600);
  s = await S(page);
  check(G, 'coming back after the end shows the end, not a restart', s.state === 'ended', s);
  await page.tap('.pursuit-club-chapter #replay');
  await wait(page, 1200);
  s = await S(page); g = await geo(page);
  check(G, 'Watch again plays from the start, docked and locked', s.state === 'playing' && s.t < 2.5 && s.htmlLocked && g.top === 0, { s, g });

  // Unmount mid-film: the page and its header are handed back untouched.
  await page.evaluate(() => window.__unmount());
  await wait(page, 300);
  const after = await page.evaluate(() => ({ html: document.documentElement.className, nav: document.querySelector('.framer-nav-container').className, api: !!window.ClubScottsdale, host: !!document.querySelector('.pursuit-club-chapter'), overflow: getComputedStyle(document.documentElement).overflowY }));
  check(G, 'unmount mid-film: no lock class, header classes removed, API removed', !/pcc/.test(after.html) && !/pcc/.test(after.nav) && !after.api && !after.host && after.overflow !== 'hidden', after);
  const y2 = (await page.evaluate(() => scrollY));
  await swipe(t, 300, 700); await wait(page, 700);
  check(G, 'after unmount the page scrolls normally', (await page.evaluate(() => scrollY)) < y2 - 50);
  await page.evaluate(() => window.__remount());
  await waitFor(page, () => window.ClubScottsdale, null, 5000);
  await toBottom(page); await wait(page, 700);
  await swipe(t, 600, 420); await wait(page, 1500);
  s = await S(page);
  check(G, 'remount: works again from the opening screen', s.state === 'playing' && s.htmlLocked, s);
  check(G, 'no page errors', t.errs.length === 0, t.errs);
  await t.browser.close();
}

async function desktop() {
  const G = 'desktop 1440x900 (wheel, keys, classic scrollbar)';
  const t = await open({ w: 1440, h: 900, mobile: false, dpr: 1 });
  const { page } = t;
  await gotoHarness(page);
  await wait(page, 1200);
  await page.mouse.move(720, 450);
  // A long, fast wheel scroll that runs into the film and keeps going (a trackpad's inertia).
  for (let i = 0; i < 160; i++) { await page.mouse.wheel(0, 60); await wait(page, 12); }
  await wait(page, 300);
  let s = await S(page), g = await geo(page);
  check(G, "a long wheel scroll docks the film and its tail does not start it", s.docked && s.state === 'gate', { s, g });
  const cw0 = g.cw;
  await wait(page, 500);
  await page.mouse.wheel(0, 120);
  await wait(page, 1200);
  s = await S(page); g = await geo(page);
  check(G, 'a new wheel scroll starts it; page locked, film docked', s.state === 'playing' && s.htmlLocked && g.top === 0, { s, g });
  check(G, "the page keeps its width when the lock hides the scrollbar (no layout jump)", g.cw === cw0, { cw0, cw: g.cw });
  const yLock = g.y;
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 300); await wait(page, 20); }
  await page.keyboard.press('PageDown'); await page.keyboard.press('ArrowDown');
  await wait(page, 500);
  g = await geo(page);
  check(G, 'wheel and keys during the film do not move the page', g.y === yLock && g.top === 0, { yLock, g });
  await page.keyboard.press('Space');
  await wait(page, 300);
  check(G, 'Space pauses (approved behaviour)', (await S(page)).state === 'paused');
  await page.keyboard.press('Space');
  await wait(page, 300);
  check(G, 'Space resumes', (await S(page)).state === 'playing');

  // Resize while it plays: still docked, still one viewport tall.
  await page.setViewportSize({ width: 1280, height: 760 });
  await wait(page, 900);
  g = await geo(page); s = await S(page);
  check(G, 'resize while playing: film stays docked and one viewport tall', g.top === 0 && g.h === 760 && s.state === 'playing', { g, s });
  await page.setViewportSize({ width: 1440, height: 900 });
  await wait(page, 900);

  // Skip link (keyboard users) finishes it and releases the page.
  await page.evaluate(() => document.querySelector('.pursuit-club-chapter #skip-link').click());
  await wait(page, 800);
  s = await S(page);
  check(G, 'skip link finishes the film and releases the page', s.state === 'ended' && !s.htmlLocked, s);
  const y1 = (await geo(page)).y;
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -200); await wait(page, 30); }
  await wait(page, 500);
  check(G, 'after the end, wheel scrolls the page up', (await geo(page)).y < y1 - 200);

  // A fresh load: keyboard start at the dock.
  await gotoHarness(page);
  await wait(page, 800);
  await toBottom(page); await wait(page, 700);
  await page.keyboard.press('ArrowDown');
  await wait(page, 1000);
  s = await S(page);
  check(G, 'ArrowDown at the docked opening screen starts it', s.state === 'playing' && s.htmlLocked, s);

  // A fresh load: tap/click the cover while it is only partly on screen: it glides into place.
  await gotoHarness(page);
  await wait(page, 800);
  await page.evaluate(() => { const r = document.querySelector('.pursuit-club-chapter').getBoundingClientRect(); scrollTo(0, scrollY + r.top - innerHeight * 0.45); });
  await wait(page, 700);
  s = await S(page);
  check(G, 'part-way into view: the page still scrolls, film not started', s.state === 'gate' && !s.docked, s);
  await page.mouse.click(720, 800);
  await wait(page, 1300);
  s = await S(page); g = await geo(page);
  check(G, 'a click on the part-visible cover glides it into place and starts it', s.state === 'playing' && g.top === 0 && s.htmlLocked, { s, g });
  check(G, 'no page errors', t.errs.length === 0, t.errs);
  await t.browser.close();
}

async function setups() {
  const G = 'page setups';
  // Smooth scroll-behavior on the page: docking is still instant.
  let t = await open({ w: 1440, h: 900, mobile: false, dpr: 1 });
  await gotoHarness(t.page, 'smooth=1');
  await wait(t.page, 800);
  await t.page.evaluate(() => { const r = document.querySelector('.pursuit-club-chapter').getBoundingClientRect(); document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, scrollY + r.top - 20); document.documentElement.style.scrollBehavior = ''; });
  await wait(t.page, 800);
  await t.page.evaluate(() => window.ClubScottsdale.start());
  let s = await S(t.page), g = await geo(t.page);
  check(G, 'html { scroll-behavior: smooth }: the dock is still instant', g.top === 0 && s.htmlLocked, { s, g });
  await t.browser.close();

  // A wheel-driven smooth-scroll script (Lenis-like): it cannot move the page during the film.
  t = await open({ w: 1440, h: 900, mobile: false, dpr: 1 });
  await gotoHarness(t.page, 'lenis=1');
  await wait(t.page, 800);
  await t.page.mouse.move(720, 450);
  for (let i = 0; i < 50; i++) { await t.page.mouse.wheel(0, 100); await wait(t.page, 16); }
  await wait(t.page, 1500);
  s = await S(t.page);
  check(G, 'smooth-scroll script: the page scrolls down to the film and docks', s.docked && s.state === 'gate', s);
  await wait(t.page, 400);
  await t.page.mouse.wheel(0, 120);
  await wait(t.page, 1200);
  s = await S(t.page); g = await geo(t.page);
  const yl = g.y;
  for (let i = 0; i < 10; i++) { await t.page.mouse.wheel(0, 300); await wait(t.page, 20); }
  await wait(t.page, 800);
  g = await geo(t.page);
  check(G, 'smooth-scroll script: wheel starts the film and cannot move the page while it plays', s.state === 'playing' && g.y === yl && g.top === 0, { s, g, yl });
  await t.page.evaluate(() => window.ClubScottsdale.seek(1e9));
  await wait(t.page, 600);
  for (let i = 0; i < 10; i++) { await t.page.mouse.wheel(0, -200); await wait(t.page, 16); }
  await wait(t.page, 1200);
  check(G, 'smooth-scroll script: after the end it scrolls the page again', (await geo(t.page)).y < yl - 200);
  await t.browser.close();

  // Content below the film: it docks at its own top; after the end the page continues.
  t = await open({ w: 1440, h: 900, mobile: false, dpr: 1 });
  await gotoHarness(t.page, 'below=700');
  await wait(t.page, 800);
  await t.page.evaluate(() => { const r = document.querySelector('.pursuit-club-chapter').getBoundingClientRect(); document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, scrollY + r.top); });
  await wait(t.page, 700);
  await t.page.mouse.move(720, 450);
  await t.page.mouse.wheel(0, 120);
  await wait(t.page, 1200);
  s = await S(t.page); g = await geo(t.page);
  check(G, 'content below: a wheel at the docked film starts it instead of scrolling past', s.state === 'playing' && g.top === 0, { s, g });
  await t.page.evaluate(() => window.ClubScottsdale.seek(1e9));
  await wait(t.page, 600);
  for (let i = 0; i < 8; i++) { await t.page.mouse.wheel(0, 200); await wait(t.page, 30); }
  await wait(t.page, 600);
  check(G, 'content below: after the end the page continues down', (await geo(t.page)).top < -300);
  await t.browser.close();

  // Header options.
  t = await open({ w: 390, h: 844, mobile: true, dpr: 2 });
  await gotoHarness(t.page, 'hide=0');
  await toBottom(t.page); await wait(t.page, 1200);
  let hd = await headerState(t.page);
  check(G, 'Site header "Always show": the header is left alone', !/pcc-hdr/.test(hd.cls) && hd.opacity === 1, hd);
  await gotoHarness(t.page, 'sel=' + encodeURIComponent('.framer-nav'));
  await toBottom(t.page); await wait(t.page, 1200);
  const named = await t.page.evaluate(() => ({ nav: document.querySelector('.framer-nav').className, container: document.querySelector('.framer-nav-container').className }));
  check(G, 'Header selector: the named element is the one hidden', /pcc-hdr--hidden/.test(named.nav) && !/pcc-hdr/.test(named.container), named);
  // A transformed container (Framer effects): fixed children and docking still right.
  await gotoHarness(t.page, 'transform=1');
  await toBottom(t.page); await wait(t.page, 800);
  await swipe(t, 600, 420); await wait(t.page, 1200);
  s = await S(t.page); g = await geo(t.page);
  check(G, 'transformed container: starts, docks and locks', s.state === 'playing' && g.top === 0 && s.htmlLocked, { s, g });
  check(G, 'no page errors', t.errs.length === 0, t.errs);
  await t.browser.close();
}

async function canvas() {
  const G = 'Framer canvas';
  const t = await open({ w: 1440, h: 900, mobile: false, dpr: 1 });
  await t.page.goto(require('./lib').HARNESS + 'index.html?canvas=1');
  await wait(t.page, 1500);
  const c = await t.page.evaluate(() => { const h = document.querySelector('.pursuit-club-chapter'); return { api: !!window.ClubScottsdale, cls: h.className, html: document.documentElement.className, gate: getComputedStyle(h.querySelector('#s-gate')).visibility, h: h.getBoundingClientRect().height }; });
  check(G, 'on the canvas: no film engine, no page lock, the opening screen shows', !c.api && !/pcc-locked/.test(c.html) && /pcc-live/.test(c.cls) && c.gate === 'visible', c);
  check(G, 'on the canvas: desktop layout follows the width it is given', /\bwide\b/.test(c.cls), c);
  await t.page.goto(require('./lib').HARNESS + 'index.html?canvas=1&assetBase=');
  await wait(t.page, 800);
  const note = await t.page.evaluate(() => /Set “Media URL”/.test(document.querySelector('.pursuit-club-chapter').textContent));
  check(G, 'on the canvas without a Media URL: a note says to set it', note);
  check(G, 'no page errors', t.errs.length === 0, t.errs);
  await t.browser.close();
}

async function ssr() {
  const G = 'server render + hydration';
  // The server-rendered HTML: the film's markup and styles, but not its font data.
  const file = require('fs').readFileSync(require('path').join(__dirname, '..', 'harness', 'ssr.html'), 'utf8');
  const part = file.slice(file.indexOf('<div class="framer-1abc2de-container"'), file.indexOf('<div id="below"'));
  check(G, "the page's HTML carries the film's markup and styles but no font data", /class="pursuit-club-chapter pcc"/.test(part) && part.includes('Enter the ecosystem') && !part.includes('data:font') && part.length < 60000, { bytes: part.length });
  // Before the page's scripts run: the film's space is kept (one screen, black), nothing drawn in a fallback font.
  const nojs = await open({ w: 390, h: 844, mobile: true, dpr: 2 });
  const c2 = await nojs.browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const p2 = await c2.newPage();
  await p2.goto(require('./lib').HARNESS + 'ssr.html');
  const pre = await p2.evaluate(() => { const h = document.querySelector('.pursuit-club-chapter'); const cs = getComputedStyle(h); return { h: h.getBoundingClientRect().height, bg: cs.backgroundColor, vis: getComputedStyle(h.querySelector('#club-scottsdale')).visibility }; });
  check(G, 'before hydration: the film keeps its one-screen space, black, and shows nothing yet', pre.h === 844 && pre.bg === 'rgb(0, 0, 0)' && pre.vis === 'hidden', pre);
  await nojs.browser.close();
  const t = await open({ w: 390, h: 844, mobile: true, dpr: 2 });
  const msgs = [];
  t.page.on('console', (m) => msgs.push(m.type() + ' ' + m.text()));
  await gotoHarness(t.page, '', 'ssr.dev.html');
  await wait(t.page, 1500);
  const r = await t.page.evaluate(() => ({ hydrationErrors: window.__hydrationErrors, api: !!window.ClubScottsdale, hosts: document.querySelectorAll('.pursuit-club-chapter').length }));
  const warn = msgs.filter((m) => /hydrat|did not match|Warning:/i.test(m));
  check(G, 'hydrates over the server HTML with no mismatch (React development build)', r.hydrationErrors.length === 0 && warn.length === 0 && r.hosts === 1, { r, warn });
  await toBottom(t.page); await wait(t.page, 700);
  await swipe(t, 600, 420); await wait(t.page, 1500);
  const s = await S(t.page);
  check(G, 'after hydration the film runs', s.state === 'playing' && s.htmlLocked, s);
  check(G, 'no page errors', t.errs.filter((e) => !/Warning/.test(e)).length === 0, t.errs);
  await t.browser.close();
}

async function strict() {
  const G = 'React StrictMode and prop changes (the effect runs, cleans up, runs again on the same DOM)';
  let t = await open({ w: 390, h: 844, mobile: true, dpr: 2 });
  await gotoHarness(t.page, '', 'index.dev.html');
  await wait(t.page, 800);
  const count = () => t.page.evaluate(() => ({ hosts: document.querySelectorAll('.pursuit-club-chapter').length, videos: document.querySelectorAll('.pursuit-club-chapter video').length, pictures: document.querySelectorAll('.pursuit-club-chapter picture').length, styles: Array.from(document.querySelectorAll('.pursuit-club-chapter [style]')).map((e) => e.getAttribute('style').trim()).filter(Boolean).join('|') }));
  const ref = await count();
  await t.browser.close();
  t = await open({ w: 390, h: 844, mobile: true, dpr: 2 });
  await gotoHarness(t.page, 'strict=1', 'index.dev.html');
  await wait(t.page, 800);
  const n = await count();
  const same = JSON.stringify(n) === JSON.stringify(ref);
  check(G, 'StrictMode: one film, the same media elements and inline styles as a single mount', same, same ? null : { ref: { ...ref, styles: ref.styles.length }, n: { ...n, styles: n.styles.length }, firstDiff: [...ref.styles].findIndex((c, i) => c !== n.styles[i]) });
  await toBottom(t.page); await wait(t.page, 700);
  await swipe(t, 600, 420); await wait(t.page, 1500);
  let s = await S(t.page);
  check(G, 'StrictMode: a swipe starts it, docked and locked', s.state === 'playing' && s.htmlLocked, s);
  await t.page.touchscreen.tap(195, 300); await wait(t.page, 400);
  s = await S(t.page);
  check(G, 'StrictMode: one tap pauses (no doubled listeners)', s.state === 'paused', s);
  // A prop change re-runs the effect: the film is torn down and set up again in place.
  await t.page.evaluate(() => window.ClubScottsdale.seek(1e9));
  await wait(t.page, 800);
  await t.page.evaluate(() => window.__rerender({ hideSiteHeader: false }));
  await wait(t.page, 800);
  s = await S(t.page);
  const hd = await headerState(t.page);
  check(G, 'prop change: set up again at the opening screen, page released, header left alone', s.state === 'gate' && !s.htmlLocked && !/pcc/.test(hd.cls), { s, hd });
  await toBottom(t.page); await wait(t.page, 700);
  await swipe(t, 600, 420); await wait(t.page, 1500);
  s = await S(t.page);
  check(G, 'prop change: it plays again', s.state === 'playing' && s.htmlLocked && s.t > 0.3, s);
  check(G, 'no page errors', t.errs.filter((e) => !/Warning/.test(e)).length === 0, t.errs);
  await t.browser.close();
}

async function leaks() {
  const G = 'style isolation (nothing leaks out)';
  const t = await open({ w: 1440, h: 900, mobile: false, dpr: 1 });
  await t.page.goto(require('./lib').HARNESS + 'index.html?defer=1');
  await wait(t.page, 600);
  const snap = () => t.page.evaluate(() => {
    const els = [document.documentElement, document.body, ...document.querySelectorAll('#decoys, #decoys *, .framer-nav-container, .framer-nav, .framer-hero, .framer-earnings, .framer-1abc2de-container')];
    return els.map((el) => { const cs = getComputedStyle(el); const o = {}; for (let i = 0; i < cs.length; i++) o[cs[i]] = cs.getPropertyValue(cs[i]); return o; });
  });
  const before = await snap();
  await t.page.evaluate(() => window.__mount());
  await t.page.waitForFunction(() => window.ClubScottsdale);
  await wait(t.page, 1500);
  const after = await snap();
  const diffs = [];
  before.forEach((b, i) => { for (const k of Object.keys(b)) if (k !== 'animation-play-state' && b[k] !== after[i][k]) diffs.push([i, k, b[k], after[i][k]]); });
  // Allowed to differ: the heights of the container, the page and <html>/<body> (the film
  // now takes its place on the page), and the origins that are derived from those heights.
  const grows = [0, 1, before.length - 1];
  const real = diffs.filter((d) => !(grows.includes(d[0]) && /^(height|block-size|perspective-origin|transform-origin)$/.test(d[1])));
  check(G, 'mounting the component changes no style outside it (page, header, decoys named .film/.micro/.display/.ctl/…)', real.length === 0, real.slice(0, 8));
  check(G, 'no page errors', t.errs.length === 0, t.errs);
  await t.browser.close();
}

async function media() {
  const G = 'media loading';
  const t = await open({ w: 390, h: 844, mobile: true, dpr: 2 });
  const reqs = [];
  t.page.on('request', (r) => { if (/\.mp4$/.test(r.url())) reqs.push(r.url()); });
  await gotoHarness(t.page, 'above=6000');
  await wait(t.page, 2000);
  const s0 = await S(t.page);
  check(G, 'at the top of a long page no video is requested', reqs.length === 0 && !s0.mediaOn, { reqs: reqs.length, mediaOn: s0.mediaOn });
  await t.page.evaluate(() => { const r = document.querySelector('.pursuit-club-chapter').getBoundingClientRect(); scrollTo(0, scrollY + r.top - innerHeight * 2.2); });
  await wait(t.page, 1500);
  const s1 = await S(t.page);
  check(G, 'about a screen and a half before the film, its first clips start loading', s1.mediaOn && reqs.length > 0, { reqs: reqs.map((u) => u.split('/').pop()), mediaOn: s1.mediaOn });
  check(G, 'no page errors', t.errs.length === 0, t.errs);
  await t.browser.close();
}

(async () => {
  const groups = { mobile, desktop, setups, canvas, ssr, strict, leaks, media };
  const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(groups);
  for (const k of want) {
    try { await groups[k](); } catch (e) { check(k, 'group crashed', false, String(e && e.stack || e).slice(0, 600)); }
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.group + ' · ' + r.label + (r.ok ? '' : '  ' + JSON.stringify(r.info).slice(0, 700)));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
