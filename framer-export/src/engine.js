/* ==========================================================================
   Club Scottsdale · Pursuit 05 / The ecosystem — Framer port of js/club.js

   This is js/club.js, the approved film engine, made to run as one section of a
   longer page instead of being the whole page. Every change from js/club.js is
   marked [framer]; everything else is the approved code, line for line.

   What changes, and only this:
   - It is an instance: mountFilm(host, options) returns { destroy }. Everything it
     queries, animates or listens to belongs to that instance and is released on
     destroy (React unmount, Framer page change).
   - The page is not the film. The film "docks" when its top meets the top of the
     viewport (the page's natural end: this is the last section). The scroll lock
     holds the film there instead of at scroll position 0, and only while it plays.
   - At the opening screen the page still scrolls up, and a scroll only starts the film
     once it is docked and the scroll that brought it there has come to rest.
   - The prototype's stand-in header is gone; the site's own header does what it did
     (hidden while the film plays, back for the ending).
   - Videos start loading when the film comes near, not at page load.

   Original header:
   A guided film on one stage. The first scroll (or tap, or key) starts it and
   locks the page. From there one clock drives everything: a paused GSAP
   timeline is set to the film time every frame, and every clip is slaved to
   that same time. While a clip carries the picture, the clock follows the
   clip, so a clip that is still buffering holds the film instead of drifting
   out of sync; a clip that fails is skipped. The film is a pure function of
   its time, so seeking in either direction is just setting the time.
   ========================================================================== */
export function mountFilm(host, opts) {                                 // [framer] was an IIFE over the whole page
  'use strict';

  const gsap = opts.gsap;                                               // [framer] this build's GSAP (3.15.0), not window.gsap
  const MEDIA = opts.media;                                             // [framer] was window.CS_MEDIA
  const BASE = opts.base;                                               // [framer] the hosted media folder (was 'public/media/club-scottsdale/')
  const $ = (s, r = host) => r.querySelector(s);                        // [framer] queries stay inside the component
  const $$ = (s, r = host) => Array.from(r.querySelectorAll(s));
  const root = host;                                                    // [framer] 'wide' lives on the component root, not <html>
  const body = host;                                                    // [framer] state classes live on the component root, not <body>
  const page = document.documentElement;                                // [framer] only the scroll lock touches the page
  const stage = $('#club-scottsdale');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pct = (v) => v + '%';
  const win = (f) => ({ '--t': pct(f[0]), '--r': pct(f[1]), '--b': pct(f[2]), '--l': pct(f[3]) });
  const D = (name) => MEDIA.clips[name].duration;

  // [framer] Everything this instance attaches or schedules, so destroy() can take it back.
  let dead = false;
  const offs = [];
  const on = (t, type, fn, o) => { t.addEventListener(type, fn, o); offs.push(() => t.removeEventListener(type, fn, o)); };
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };
  const cancel = (id) => { clearTimeout(id); timers.delete(id); };

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const K = RM ? 0 : 1;
  const DEBUG = /[?&]debug\b/.test(location.search);

  const PRELOAD = 11;      // s: a clip starts loading this far ahead of its start (the flight during the opening screen)
  const UNLOAD = 15;       // s: a clip this far behind the playhead gives its buffers back
  // A clip that is still arriving is waited for (the film holds on its current frame);
  // only a clip whose download and playback have both stopped is skipped.
  const STALL_START = 4;   // s with no progress at all before a clip that never started is skipped
  const STALL_MID = 6;     // s with no progress before a clip that stalled mid-play is skipped
  const STALL_MAX = 25;    // s of waiting on one clip in total, whatever the progress

  const wideNow = () => innerWidth >= 900 && innerWidth / innerHeight >= 1.05;
  let WIDE = wideNow();
  root.classList.toggle('wide', WIDE);

  const conn = navigator.connection || {};
  const LOW = !!(conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '')) ||
    Math.min(screen.width, screen.height) * (window.devicePixelRatio || 1) < 800;
  const HEVC = !opts.h264Only && (() => {                               // [framer] + h264Only: the component's "Video format" property
    try { return document.createElement('video').canPlayType('video/mp4; codecs="hvc1"') !== ''; } catch (e) { return false; }
  })();

  /* ------------------------------------------------------------------ media */

  const kindOf = (el) => (WIDE && el.hasAttribute('data-wide') ? 'wide' : 'portrait');
  const opOf = (el) => (WIDE && el.dataset.opWide) || el.dataset.op || '50% 50%';

  function variantFor(name, kind) {
    const v = MEDIA.clips[name].variants;
    let key = kind === 'wide' ? 'w1080' : (LOW ? 'p720' : 'p1080');
    if (!v[key]) key = 'p1080';
    return { key, v: v[key], hevc: v[key + '.hevc'] };
  }
  function sourceFor(name, kind) {
    const s = variantFor(name, kind);
    return BASE + (HEVC && s.hevc ? s.hevc.src : s.v.src);
  }
  function posterFor(name, kind) {
    const p = MEDIA.clips[name].posters;
    const list = p[kind] || p.portrait;
    return BASE + (LOW && list[1] ? list[1] : list[0]);
  }

  function renderMedia() {
    $$('.m[data-clip]', stage).forEach((el) => {
      const name = el.dataset.clip;
      const kind = kindOf(el);
      el.style.setProperty('--op', opOf(el));
      el.innerHTML = '<div class="f"><video muted playsinline preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1"></video></div>';
      const v = $('video', el);
      v.muted = true;
      v.defaultMuted = true;
      v._poster = posterFor(name, kind);
      v._src = sourceFor(name, kind);
      v._name = name;
      v._kind = kind;
      v.addEventListener('error', () => { v._failed = true; });
      v.addEventListener('playing', () => { v._ok = true; });
      el._v = v;
    });
    $$('[data-still]', stage).forEach((el) => {
      const name = el.dataset.still;
      const s = MEDIA.stills[name];
      const set = (ext) => [1080, 720].map((w) => `${BASE}still-${name}.${w}.${ext} ${w}w`).join(', ');
      const sizes = WIDE ? '50vh' : '100vw';
      el.style.setProperty('--op', opOf(el));
      el.innerHTML = `<div class="f"><picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` +
        `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
        `<img src="${BASE}still-${name}.720.webp" alt="${el.dataset.alt || ''}" decoding="async" width="${s.w}" height="${s.h}"></picture></div>`;
    });
  }

  // [framer] No video loads until the film is within about a screen and a half of the
  // viewport (the prototype was the whole page, so it could start at page load).
  let mediaOn = false;
  function load(v) {
    if (v._loaded || !mediaOn) return;                                  // [framer] + !mediaOn
    v._loaded = true;
    v._failed = false;
    v.poster = v._poster;
    v.preload = 'auto';
    v.src = v._src;
  }
  function unload(v) {
    if (!v._loaded) return;
    v._loaded = false;
    v.pause();
    v.removeAttribute('src');
    try { v.load(); } catch (e) { /* ignore */ }
  }
  function seekV(v, t) {
    if (v.readyState < 1 || v.seeking) return;
    const end = (v.duration || t + 1) - 0.02;
    try { v.currentTime = clamp(t, 0, end); } catch (e) { /* not seekable yet */ }
  }
  function playV(v) {
    const p = v.play();
    if (p && p.catch) p.catch((err) => { if (err && err.name === 'NotAllowedError') onBlocked(); });
  }

  // iOS Low Power Mode (and some in-app browsers) refuse to start a video the page plays
  // by itself. A video that has been told to play inside a real tap, touch or key press
  // is allowed from then on, so every interaction unlocks every clip that is not yet
  // known to play: play() and, unless it should be running, pause() straight away.
  function unlockMedia() {
    $$('video', stage).forEach((v) => {
      if (v._ok || v.ended || !v.paused) return;
      try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
      v.pause();
    });
  }

  /* ------------------------------------------------------------------ the page around the film [framer] */

  // The film docks when its top meets the top of the viewport; the lock holds it there.
  const topNow = () => host.getBoundingClientRect().top;
  const docked = () => Math.abs(topNow()) <= 1.5;
  function jumpTo(y) {
    // An instant scroll, whatever scroll-behavior the page sets.
    const prev = page.style.scrollBehavior;
    page.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    page.style.scrollBehavior = prev;
  }
  function dock() {
    const t = topNow();
    if (Math.abs(t) > 0.5) jumpTo(scrollY + t);
  }
  // A start from a tap on a film that is not quite docked: glide it into place first.
  let gliding = null;
  function glideToDock(done) {
    const from = scrollY, to = scrollY + topNow();
    if (Math.abs(to - from) <= 1.5 || !K) { dock(); done(); return; }
    const t0 = performance.now(), ms = 450;
    const g = (gliding = { stop: false });
    const step = (now) => {
      if (g.stop || dead) return;
      const p = Math.min(1, (now - t0) / ms);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      jumpTo(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
      else { gliding = null; dock(); done(); }
    };
    requestAnimationFrame(step);
  }

  // Where the film is: "in the zone" when docked (within 4% of the viewport), since when,
  // and whether the site's header should be out of the way.
  const ARM = 350;         // ms the film must have been docked before a scroll starts it
  const ARM_TOUCH = 250;   // ms, for a new touch
  const QUIET = 160;       // ms without wheel events that marks a new, deliberate scroll
  let zoneSince = 0;
  let visible = false;
  function checkView() {
    const r = host.getBoundingClientRect();
    const atEnd = scrollY + innerHeight >= page.scrollHeight - 2;
    const zone = Math.abs(r.top) <= Math.max(2, innerHeight * 0.04) || (atEnd && r.top < 0 && r.bottom > innerHeight * 0.5);
    if (zone && !zoneSince) zoneSince = performance.now();
    else if (!zone) zoneSince = 0;
    applyHeader();
  }
  let viewQueued = false;
  function queueView() {
    if (viewQueued) return;
    viewQueued = true;
    requestAnimationFrame(() => { viewQueued = false; if (!dead) checkView(); });
  }

  // The site's header does what the prototype's stand-in did: out of the way while the film
  // plays (and while its opening screen fills the view), back for the ending.
  const header = siteHeader(host, opts.headerSelector);
  let hdrHidden = false;
  function applyHeader() {
    let want = false;
    if (opts.hideHeader !== false && body.classList.contains('is-playing')) {
      if (state !== 'gate') want = true;
      else { const r = host.getBoundingClientRect(), mid = innerHeight / 2; want = r.top < mid && r.bottom > mid; }
    }
    if (want !== hdrHidden) { hdrHidden = want; header.set(want); }
    else if (hdrHidden) header.check();
  }

  /* ------------------------------------------------------------------ geometry */

  /* ------------------------------------------------------------------ film state */

  let tl = null;
  let ctx = null;
  let T = 0;               // film time, seconds
  let TOTAL = 1;
  let state = 'gate';      // gate | playing | paused | ended
  let autoPaused = false;
  let scrubbing = false;
  let locked = false;
  let clips = [];          // { v, el, name, start, end, dur, lead, failed, stall, played }
  let CH = [];             // chapters: { label, t }
  let marks = {};          // named film times the UI needs
  let lastAdvance = 0;

  const addClip = (el, start, lead) => {
    const v = el._v;
    const c = { v, el, name: v._name, start, dur: D(v._name), end: start + D(v._name), lead: !!lead, failed: false, stall: 0, played: false };
    clips.push(c);
    return c;
  };
  const chapter = (label, t) => CH.push({ label, t });
  const S = (target, vars, at) => tl.set(target, Object.assign({ immediateRender: false }, vars), at);
  const FT = (target, from, to, at) => tl.fromTo(target, from, Object.assign({ immediateRender: false }, to), at);

  // Text moves one way only: a whole phrase fades in while settling a few pixels, and
  // fades out while rising a few more. Every change of text waits for the previous text
  // to be fully gone; both helpers return the time they finish.
  const GAP = 0.2;
  const sayIn = (sel, at, d = 0.8) => { S(sel, { autoAlpha: 0 }, at); FT(sel, { autoAlpha: 0, y: 10 * K }, { autoAlpha: 1, y: 0, duration: d, ease: 'power2.out' }, at); return at + d; };
  const sayOut = (sel, at, d = 0.5) => { tl.to(sel, { autoAlpha: 0, y: -8 * K, duration: d, ease: 'power2.in' }, at); return at + d; };

  /* ------------------------------------------------------------------ the film */

  function compose() {
    CH = [];
    clips = [];
    marks = {};

    // Everything starts hidden except the cover.
    const TEXT = ['#c-above', '#s-look', '.film > .room', '#q-share', '.film > .p-head', '.film > .group', '#s-close', '.cta__eyebrow', '.cta__title', '.cta__btn', '.cta__replay'];
    gsap.set(['#s-aerial', '#c-scrim', '#s-inside', '#s-seq', '#q-scrim', '#s-heli', '#s-reel', '#s-point', '.cta'].concat(TEXT), { autoAlpha: 0 });
    gsap.set('#s-gate', { autoAlpha: 1 });
    gsap.set('.gate__in', { autoAlpha: 1, y: 0 });
    gsap.set(['#s-cover-dark', '#s-dim'], { opacity: 0 });
    gsap.set('#s-cover', { scale: 1 });
    // [framer] The closing line is centred by its CSS transform, translateY(-50%). GSAP keeps
    // that only if it recognises the value as half the line's height, which it checks with
    // rounded numbers; at some stage sizes (a 1440 px window with a 15 px scrollbar, say) it
    // misses and the line drops about 18 px. Saying it explicitly gives what the approved
    // build shows whenever GSAP does recognise it.
    gsap.set('#s-close', { yPercent: -50, y: 0 });

    /* ---------------- 01 · Enter: the cover, a cut to black, then the drone */
    // Stillness, anticipation, cut, motion. The type fades, the photograph darkens and
    // settles a touch closer, a short black beat, then a hard cut into real footage.
    chapter('Enter', 0);
    tl.to('.gate__in', { autoAlpha: 0, y: -8 * K, duration: 0.7, ease: 'power2.out' }, 0.001);
    tl.to('#s-cover', { scale: 1 + 0.02 * K, duration: 1.15, ease: 'power1.in' }, 0.001);
    tl.to('#s-cover-dark', { opacity: 1, duration: 0.95, ease: 'power2.in' }, 0.15);
    const O = 1.1 + 0.25;                                 // 250 ms of black
    S('#s-gate', { autoAlpha: 0 }, O);
    S('#s-aerial', { autoAlpha: 1 }, O);
    const ae = addClip($('#s-aerial'), O, true);
    // Phones: as the drone levels off over the cars, the frame eases out past the footage's
    // full width (the tall screen would otherwise crop its sides), feathered on every edge.
    const glide0 = (MEDIA.clips.aerial.cuts || [{ t: 0 }, { t: ae.dur * 0.55 }])[1].t;
    if (!WIDE) {
      const r = $('.film').getBoundingClientRect();
      const fit = Math.min(1, (r.width / 1080) / (r.height / 1920));
      // pull back past full width, so the row of cars sits in open black space
      if (fit < 0.98) FT('#s-aerial .f', { scale: 1 }, { scale: fit * 0.88, duration: Math.max(0.01, 2.0 * K), ease: 'power2.inOut' }, O + glide0 - 0.3);
    }
    const F0 = ae.end - 0.9;                              // the interior reveal
    // one quiet caption across the whole descent and flyover
    FT('#c-scrim', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, ease: 'none' }, O + 0.7);
    sayIn('#c-above', O + 0.9, 0.7);
    sayOut('#c-above', F0 - 1.0, 0.5);
    tl.to('#c-scrim', { autoAlpha: 0, duration: 0.6, ease: 'none' }, F0 - 0.9);

    /* ---------------- 02 · Inside: the reveal, then each room once it is on screen */
    chapter('Inside', F0 - 0.3);
    S('#s-inside', { autoAlpha: 1 }, F0);
    FT('#s-inside', { '--t': '100%' }, { '--t': '0%', duration: 1.3, ease: 'power3.inOut' }, F0);
    FT('#s-flight .f', { yPercent: 10 * K }, { yPercent: 0, duration: 1.3, ease: 'power3.inOut' }, F0);
    const fl = addClip($('#s-flight'), F0, true);
    S('#s-aerial', { autoAlpha: 0 }, F0 + 1.35);
    const mk = {};
    MEDIA.clips.flight.marks.forEach((m) => { mk[m.label] = F0 + m.t; });
    sayIn('#s-look', F0 + 0.3, 0.8);                      // arrives with the interior and holds over the entrance
    const lookGone = sayOut('#s-look', mk['The Floor'] - 0.45);
    sayIn('#r-floor', Math.max(lookGone + GAP, mk['The Floor'] + 0.2), 0.6);
    const floorGone = sayOut('#r-floor', mk['The Collection'] + 0.55, 0.4);   // the flight is continuous: the floor runs on into the cars
    sayIn('#r-collection', floorGone + GAP, 0.6);
    const collGone = sayOut('#r-collection', mk['The Lounge'] - 0.75, 0.4);
    // the Lounge: named as the sofa comes into view; the shot plays out to its own cut
    sayIn('#r-lounge', Math.max(collGone + GAP, mk['The Lounge'] - 0.1), 0.5);
    // the shot eases into the sofa and the page turns as it ends: no held frame
    sayOut('#r-lounge', fl.end - 0.55, 0.4);
    const O1 = fl.end - 0.05;                             // the page turns into People as the shot ends

    /* ---------------- 03 · People: page turns */
    const turn = (el, at) => {
      S(el, { autoAlpha: 1 }, at);
      FT(el, { '--t': '100%' }, { '--t': '0%', duration: 0.8, ease: 'power3.inOut' }, at);
      FT(el.firstElementChild, { yPercent: 10 * K }, { yPercent: 0, duration: 0.8, ease: 'power3.inOut' }, at);
    };
    $$('#s-seq .item').forEach((el, j) => { el.style.zIndex = j + 1; gsap.set(el, Object.assign(win([100, 0, 0, 0]), { autoAlpha: 0 })); });
    S('#s-seq', { autoAlpha: 1 }, O1);
    FT('#q-scrim', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'none' }, O1 + 0.4);
    // Each item: a clip plays through; a photograph holds. The next turns 0.35 s before
    // a clip ends, so nothing is ever held on a frozen frame.
    let at = O1;
    let prev = null;
    const place = (id, hold) => {
      const el = $('#' + id);
      turn(el, at);
      if (prev) S(prev, { autoAlpha: 0 }, at + 0.85);    // gone once covered (panels differ in width on desktop)
      prev = el;
      const start = at;
      if (el._v) { const c = addClip(el, at, true); at = c.end - 0.35; return { start, end: c.end }; }
      at += hold; return { start, end: at + 0.8 };
    };
    chapter('People', O1);
    const room = place('i-room', 4.3);
    sayIn('#q-share', room.start + 1.0);
    const shareGone = sayOut('#q-share', room.start + 3.8);
    at = Math.max(at, shareGone + 0.05);
    S('#s-inside', { autoAlpha: 0 }, O1 + 1.1);
    const jer = place('i-jeremy');
    sayIn('#n-jeremy', Math.max(jer.start + 0.3, shareGone + GAP), 0.6);
    sayOut('#n-jeremy', jer.end - 0.6);
    place('i-lounge');                                   // teaching a small group
    place('i-mic');                                      // on a microphone, a full room
    place('i-applause');
    place('i-dinner');
    place('i-network');
    const ky = place('i-kyler');
    sayIn('#n-kyler', ky.start + 0.5);
    const kyGone = sayOut('#n-kyler', ky.end - 0.7);
    at = Math.max(at, kyGone + 0.05);
    const lm = place('i-lanctot', 3.6);
    sayIn('#n-lanctot', Math.max(lm.start + 0.5, kyGone + GAP));
    const lmGone = sayOut('#n-lanctot', lm.start + 3.5);
    at = Math.max(at, lmGone - 0.3);
    const cand = place('i-candid');

    /* ---------------- 04 · Amenities: the helicopter, no words, then three groups */
    const H0 = cand.end - 1.0;
    chapter('Amenities', H0);
    FT('#s-heli', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.0, ease: 'power1.inOut' }, H0);
    FT('#s-heli .still .f', { scale: 1 + 0.06 * K }, { scale: 1, duration: 3.6, ease: 'power2.out' }, H0);
    tl.to('#q-scrim', { autoAlpha: 0, duration: 0.6, ease: 'none' }, H0);
    S('#s-seq', { autoAlpha: 0 }, H0 + 1.05);
    const R0 = H0 + 3.0;                                  // a short wordless pause, then a hard cut
    S('#s-reel', { autoAlpha: 1 }, R0);
    const reel = addClip($('#r-reel'), R0, true);
    S('#s-heli', { autoAlpha: 0 }, R0);
    // One caption per group, never two at once: connect, create, unwind.
    const cuts = MEDIA.clips.crescendo.cuts;
    const groups = [];
    cuts.forEach((c) => { if (!groups.length || groups[groups.length - 1].label !== c.label) groups.push({ label: c.label, t: c.t }); });
    groups.forEach((g, k) => {
      const inAt = R0 + g.t + (k === 0 ? 0.3 : 0.15);
      const outAt = (k + 1 < groups.length ? R0 + groups[k + 1].t : reel.end) - 0.45;
      sayIn('#g-' + g.label, inAt, 0.45);
      sayOut('#g-' + g.label, outAt, 0.35);
    });

    /* ---------------- 05 · Pursuit: the last amenity fades to black under one closing line */
    const Re = reel.end;
    chapter('Pursuit', Re - 0.4);
    FT('#s-point', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power1.inOut' }, Re - 0.4);
    S('#s-reel', { autoAlpha: 0 }, Re + 0.45);
    sayIn('#s-close', Re + 0.3, 0.9);
    const closeGone = sayOut('#s-close', Re + 3.2);
    const C0 = closeGone + GAP + 0.1;
    S('.cta', { autoAlpha: 1 }, C0);
    sayIn('.cta__eyebrow', C0, 0.7);
    sayIn('.cta__title', C0 + 0.15, 0.9);
    sayIn('.cta__btn', C0 + 0.5, 0.7);
    sayIn('.cta__replay', C0 + 0.7, 0.7);
    TOTAL = C0 + 1.6;
    tl.set({}, {}, TOTAL);
    marks.header = TOTAL - 0.8;

    buildUI();
  }

  /* ------------------------------------------------------------------ UI bound to film time */


  function buildUI() {
    $('#ctl-ticks').innerHTML = CH.slice(1).map((c) => `<i style="left:${((c.t / TOTAL) * 100).toFixed(3)}%"></i>`).join('');
  }

  function updateUI() {
    const p = clamp(T / TOTAL, 0, 1);
    $('#ctl-fill').style.transform = `scaleX(${p.toFixed(4)})`;
    $('#ctl-knob').style.left = (p * 100).toFixed(3) + '%';
    // the quiet chapter label: number, a short rule, the name
    const ch = chapterAt(T);
    const label = CH[ch].label;
    const chapEl = $('#ctl-chap');
    if (chapEl.dataset.ch !== String(ch)) {
      chapEl.dataset.ch = String(ch);
      chapEl.innerHTML = `<b>${String(ch + 1).padStart(2, '0')}</b><i aria-hidden="true"></i>${label}`;
    }
    const track = $('#ctl-track');
    const now = Math.round(p * 100);
    if (track.getAttribute('aria-valuenow') !== String(now)) {
      track.setAttribute('aria-valuenow', String(now));
      track.setAttribute('aria-valuetext', `${fmt(T)} of ${fmt(TOTAL)}, ${label}`);
    }
    body.classList.toggle('is-playing', !(state === 'ended' || T >= marks.header));
    applyHeader();                                                      // [framer] the site's header follows, as the stand-in did
    updateSkipLabel();
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function chapterAt(t) {
    let i = 0;
    for (let k = 0; k < CH.length; k++) if (t >= CH[k].t - 0.001) i = k;
    return i;
  }

  /* ------------------------------------------------------------------ clock + clip sync */

  function leadClip() {
    let best = null;
    for (const c of clips) if (c.lead && !c.failed && T >= c.start && T < c.end && (!best || c.start > best.start)) best = c;
    return best;
  }

  // A clip that will not load or play: move on to wherever the next beat begins (the next
  // clip, the next chapter's transition, or this clip's end, whichever comes first).
  function fail(c) {
    c.failed = true;
    c.stall = 0;
    if (DEBUG) console.warn('[club] skipping clip', c.name);
    let resume = c.end;
    clips.forEach((o) => { if (o.lead && o.start > c.start) resume = Math.min(resume, o.start); });
    CH.forEach((h) => { if (h.t > c.start) resume = Math.min(resume, h.t); });
    if (T < resume) T = resume;
  }

  let blocked = false;
  let resumedAt = 0;
  function onBlocked() {
    // Still refused (a phone that needs a tap for each start): hold the film on its
    // current frame and show "Tap to play". The tap unlocks and resumes it.
    if (blocked || dead) return;                                        // [framer] + dead
    blocked = true;
    if (state === 'playing') pause(false);
    setClasses();
  }

  function advance(dt) {
    const lead = leadClip();
    let step = dt;
    if (lead) {
      const v = lead.v;
      if (v._failed || v.error) { fail(lead); return; }
      const nearEnd = T - lead.start > lead.dur - 0.3;
      // Playing means the frame is moving. (iOS can report HAVE_CURRENT_DATA while it plays.)
      const moving = !v.paused && v.currentTime > (lead.lastVT || 0) + 0.001;
      const ok = v._loaded && !v.seeking && (v.ended || (!v.paused && (v.readyState >= 3 || moving || (nearEnd && v.readyState >= 2))));
      lead.lastVT = v.currentTime;
      if (v.ended) {
        // ran out a frame early: let the clock finish the beat
      } else if (!ok) {
        step = 0;
        lead.wait = (lead.wait || 0) + dt;
        // Progress (more data buffered, a higher ready state) resets the no-progress clock.
        const buf = v.buffered && v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0;
        if (buf > (lead.lastBuf || 0) + 0.01 || v.readyState > (lead.lastRS || 0)) {
          lead.stall = 0;
          lastAdvance = performance.now();
        } else lead.stall += dt;
        lead.lastBuf = Math.max(lead.lastBuf || 0, buf);
        lead.lastRS = Math.max(lead.lastRS || 0, v.readyState);
        if (lead.stall > (lead.played ? STALL_MID : STALL_START) || lead.wait > STALL_MAX) { fail(lead); return; }
      } else {
        lead.wait = 0;
        lead.played = true;
        lead.stall = 0;
        // Follow the clip: small errors ease out, so the picture and the timeline stay locked.
        const err = lead.start + v.currentTime - T;
        if (Math.abs(err) > 0.04 && Math.abs(err) < 0.6) step = Math.max(0, dt + err * 0.08);
      }
    }
    if (step > 0) lastAdvance = performance.now();
    T = Math.min(T + step, TOTAL);
  }

  function syncClips() {
    const running = state === 'playing' && !scrubbing;
    const lead0 = running ? leadClip() : null;                          // [framer] see "outgoing clip" below
    for (const c of clips) {
      const v = c.v;
      const near = T > c.start - PRELOAD && T < c.end + 1;
      if (near) load(v);
      else if (v._loaded && (T > c.end + UNLOAD || T < c.start - PRELOAD - 8)) { unload(v); continue; }
      if (!v._loaded) continue;
      const active = T >= c.start && T < c.end && !c.failed;
      const local = clamp(T - c.start, 0, c.dur);
      // Never call play() on a clip that has run out: the browser would restart it.
      const spent = v.ended && local > (v.duration || c.dur) - 0.25;
      if (active && running) {
        // [framer] The outgoing clip of an overlap never rewinds. When the next clip is late,
        // the film waits for it while this clip would play on; the approved code then seeks it
        // back to the film's time again and again, replaying its last moments over and over
        // (a stutter that is not a loop). It now stops on its frame and lets the next clip in.
        if (lead0 && c !== lead0) {
          if (lead0.wait > 0.25 || v.ended) { if (!v.paused) v.pause(); continue; }
          if (v.currentTime > local + 0.15) { if (v.paused && !spent && !v.seeking) playV(v); continue; }
        }
        if (v.paused && !spent) {
          if (Math.abs(v.currentTime - local) > 0.15) seekV(v, local);
          if (!v.seeking) playV(v);
        } else if (!v.seeking && Math.abs(v.currentTime - local) > 0.45) seekV(v, local);
      } else {
        if (!v.paused) v.pause();
        // Parked: before its start a clip shows its first frame, after its end its last.
        const target = T < c.start ? 0 : local;
        if (Math.abs(v.currentTime - target) > 0.15) seekV(v, target);
      }
    }
  }

  function render(animate) {
    tl.time(T, true);
    syncClips();
    updateUI(animate);
    if (DEBUG) debug();
  }

  let last = performance.now();
  let raf = 0;                                                          // [framer] so destroy() can stop the loop
  function frame(now) {
    if (dead) return;                                                   // [framer]
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    try {
      if (locked && !gliding && Math.abs(topNow()) > 0.5) dock();       // [framer] the page above moved: stay docked
      if (state === 'playing' && !scrubbing) {
        advance(dt);
        if (T >= TOTAL) finish();
        // Watchdog: if the clock has not moved for 8 s while playing, move on.
        else if (now - lastAdvance > 8000) { lastAdvance = now; const l = leadClip(); if (l) fail(l); else T = Math.min(TOTAL, T + 0.5); }
      }
      if (state !== 'gate' && (visible || locked)) render(state === 'playing');   // [framer] + nothing to redraw while off screen
    } catch (err) {
      console.error(err);
      if (locked) { state = 'ended'; unlockPage(); setClasses(); }
    }
    raf = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ transport */

  function setClasses() {
    body.classList.toggle('is-started', state !== 'gate');
    body.classList.toggle('is-paused', state === 'paused');
    body.classList.toggle('is-ended', state === 'ended');
    body.classList.toggle('is-blocked', blocked && state === 'paused');
    const btn = $('#ctl-play');
    const paused = state === 'paused' || state === 'ended';
    btn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  }

  function lockPage() {
    locked = true;
    dock();                                                             // [framer] the film fills the viewport (was scrollTo(0, 0))
    page.classList.add('pcc-locked');                                   // [framer] was root.classList.add('is-locked')
  }
  function unlockPage() {
    locked = false;
    page.classList.remove('pcc-locked');                                // [framer] was root.classList.remove('is-locked')
  }

  function start(instant) {
    if (state !== 'gate' || gliding) return;                            // [framer] + gliding
    const go = () => {                                                  // [framer] the approved start, once the film is docked
      if (state !== 'gate' || dead) return;
      state = 'playing';
      T = 0;
      lastAdvance = performance.now();
      lockPage();
      setClasses();
      render(true);
    };
    if (instant === true || docked()) go();                             // [framer]
    else glideToDock(go);                                               // [framer]
  }
  function pause(auto) {
    if (state !== 'playing') return;
    state = 'paused';
    autoPaused = !!auto;
    pausedAt = performance.now();
    clips.forEach((c) => { if (!c.v.paused) c.v.pause(); });
    setClasses();
  }
  let pausedAt = 0;
  function resume() {
    if (state !== 'paused') return;
    state = 'playing';
    autoPaused = false;
    blocked = false;
    lastAdvance = performance.now();
    clips.forEach((c) => { c.stall = 0; });
    setClasses();
    render(false);   // inside the gesture, so a refused clip can play now
  }
  function toggle() { if (state === 'playing') pause(false); else if (state === 'paused') resume(); else if (state === 'ended') replay(); }

  function seek(t, keepState) {
    t = clamp(t, 0, TOTAL);
    if (t >= TOTAL - 0.01) { T = TOTAL; finish(); return; }
    if (state === 'ended' || state === 'gate') { state = 'playing'; lockPage(); }
    T = t;
    lastAdvance = performance.now();
    clips.forEach((c) => { c.stall = 0; c.wait = 0; c.lastBuf = 0; c.lastRS = 0; c.lastVT = 0; c.played = false; if (T < c.end) c.failed = !!c.v._failed; });
    if (!keepState) setClasses();
    render(false);
  }
  function finish() {
    T = TOTAL;
    state = 'ended';
    render(false);
    clips.forEach((c) => { if (!c.v.paused) c.v.pause(); });
    unlockPage();
    setClasses();
  }
  // Skip moves one chapter on, never further: from the last chapter it finishes the film.
  let jumping = false;
  function skip() {
    if (jumping || state === 'gate') return;
    const ch = chapterAt(T);
    const to = ch + 1 < CH.length ? CH[ch + 1].t + 0.01 : TOTAL;
    if (!K || state === 'ended') { seek(to); return; }
    jumping = true;
    const veil = $('#jump');
    veil.classList.add('is-on');
    later(() => {                                                       // [framer] later() = a setTimeout destroy() can cancel
      seek(to);
      later(() => { veil.classList.remove('is-on'); jumping = false; }, 60);
    }, 230);
  }
  function updateSkipLabel() {
    const ch = chapterAt(T);
    const next = ch + 1 < CH.length ? CH[ch + 1].label : 'the end';
    const label = `Skip to ${next}`;
    const btn = $('#ctl-skip');
    if (btn.getAttribute('aria-label') !== label) btn.setAttribute('aria-label', label);
  }
  function replay() {
    const go = () => { state = 'playing'; lockPage(); seek(0); };       // [framer] the approved replay, once the film is docked
    if (docked()) go(); else glideToDock(go);                           // [framer]
  }

  /* ------------------------------------------------------------------ input */

  const SCROLL_KEYS = new Set([' ', 'Spacebar', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End']);
  const inCtl = (el) => el && el.closest && el.closest('.ctl, .cta, .skip, .tap');

  // [framer] Wheel is heard in the capture phase and stopped where the film takes it, so a
  // smooth-scroll script on the page (which listens to the same event) cannot move the page.
  const take = (e) => { e.preventDefault(); e.stopPropagation(); };
  function onWheel(e) {
    if (gliding) { take(e); return; }                                   // [framer]
    if (state === 'gate') { gateWheel(e); return; }                     // [framer] the opening screen, see gateWheel
    if (!locked) return;
    take(e);                                                            // [framer] was e.preventDefault()
    if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 4) return;
    if (state === 'paused' && performance.now() - pausedAt > 700) resume();
  }
  // [framer] At the opening screen the page is not locked: scrolling up leaves as usual, and
  // scrolling down only starts the film once it is docked and has been for a moment, and this
  // is a new scroll, not the tail of the one that brought the page here. While docked, a
  // downward scroll never moves the page.
  let lastWheel = 0;
  function gateWheel(e) {
    const now = performance.now();
    const gap = now - lastWheel;
    lastWheel = now;
    checkView();
    if (!zoneSince || e.deltaY <= 0) return;
    take(e);
    if (now - zoneSince < ARM || gap < QUIET) return;
    if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 4) return;
    start();
  }
  let touchY = null, touchUsed = false, touchGate = false;
  function onTouchStart(e) {
    touchY = e.touches[0].clientY; touchUsed = false;
    if (state === 'gate') { checkView(); touchGate = !!zoneSince && performance.now() - zoneSince >= ARM_TOUCH; }   // [framer]
  }
  function onTouchMove(e) {
    if (gliding) { if (e.cancelable) e.preventDefault(); return; }      // [framer]
    if (state === 'gate') { gateTouch(e); return; }                     // [framer] the opening screen, see gateTouch
    if (!locked) return;
    if (e.cancelable) e.preventDefault();
    if (touchY === null || touchUsed || inCtl(e.target)) return;
    if (Math.abs(e.touches[0].clientY - touchY) > 12) {
      touchUsed = true;
      if (state === 'paused' && performance.now() - pausedAt > 700) resume();
    }
  }
  // [framer] A swipe up on the docked opening screen starts the film (as in the prototype);
  // a swipe down scrolls the page back up.
  function gateTouch(e) {
    if (!touchGate || touchY === null || touchUsed || inCtl(e.target)) return;
    const dy = e.touches[0].clientY - touchY;
    if (dy === 0) return;
    if (dy > 0) { touchUsed = true; return; }
    if (e.cancelable) e.preventDefault();
    if (dy < -12) { touchUsed = true; start(); }
  }
  function onKey(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const onButton = e.target && (/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable);   // [framer] + the page's form fields
    const onTrack = e.target && e.target.id === 'ctl-track';
    if (state === 'gate') {
      checkView();                                                      // [framer]
      if (!zoneSince) return;                                           // [framer] elsewhere on the page, keys scroll as usual
      if (['ArrowDown', 'PageDown', ' ', 'Spacebar', 'Enter'].includes(e.key) && !onButton) { e.preventDefault(); start(); }
      else if (locked && SCROLL_KEYS.has(e.key) && !onButton) e.preventDefault();
      return;
    }
    if (onTrack) return;
    if ((e.key === ' ' || e.key === 'k') && !onButton && state !== 'ended') { e.preventDefault(); toggle(); return; }
    if (locked && SCROLL_KEYS.has(e.key) && !onButton) e.preventDefault();
  }
  function onScroll() {
    if (locked) { if (!gliding && Math.abs(topNow()) > 0.5) dock(); return; }   // [framer] hold the film where it docked (was: scrollTo(0, 0))
    queueView();                                                        // [framer] docking and the header, as the page scrolls
  }

  function bindInput() {
    on(window, 'wheel', onWheel, { passive: false, capture: true });    // [framer] on() = addEventListener that destroy() undoes; + capture (see take)
    on(window, 'touchstart', onTouchStart, { passive: true });
    on(window, 'touchmove', onTouchMove, { passive: false });
    on(window, 'keydown', onKey);
    on(window, 'scroll', onScroll, { passive: true });

    // Every real interaction unlocks the clips (see unlockMedia). The touch that ends a
    // swipe also resumes a film that the phone refused to start.
    const unlockOn = (e) => {
      unlockMedia();
      if (e.type === 'touchend' && blocked && state === 'paused') { resume(); resumedAt = performance.now(); }
    };
    ['touchend', 'click', 'keydown', 'pointerup'].forEach((t) => on(window, t, unlockOn, { capture: true, passive: true }));
    on($('#tap-play'), 'click', () => { if (state === 'paused') resume(); });

    // A tap on the picture: starts the film, then pauses and resumes it.
    on(stage, 'click', (e) => {
      if (inCtl(e.target) || performance.now() - resumedAt < 600) return;
      if (state === 'gate') start();
      else if (state === 'playing' || state === 'paused') toggle();
    });
    on($('#gate-cue'), 'click', (e) => { e.stopPropagation(); start(); });
    on($('#ctl-play'), 'click', toggle);
    on($('#ctl-skip'), 'click', skip);
    on($('#replay'), 'click', replay);
    // [framer] + dock(): on the page the film may be out of view when the link is used
    on($('#skip-link'), 'click', (e) => { e.preventDefault(); seek(TOTAL); dock(); $('#cta').focus({ preventScroll: true }); });

    // Timeline: tap or drag to seek; arrows step 5 s; Page keys step chapters.
    const track = $('#ctl-track');
    let wasPlaying = false;
    const at = (x) => { const r = track.getBoundingClientRect(); return clamp((x - r.left) / r.width, 0, 1) * TOTAL; };
    on(track, 'pointerdown', (e) => {
      if (state === 'gate') return;
      e.preventDefault();
      try { track.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      wasPlaying = state === 'playing' || state === 'ended';
      scrubbing = true;
      body.classList.add('is-scrubbing');
      const t = Math.min(at(e.clientX), TOTAL - 0.05);
      if (state === 'ended') { state = 'paused'; lockPage(); }
      T = t;
      render(false);
    });
    on(track, 'pointermove', (e) => {
      if (!scrubbing) return;
      T = Math.min(at(e.clientX), TOTAL - 0.05);
      render(false);
    });
    const end = (e) => {
      if (!scrubbing) return;
      scrubbing = false;
      body.classList.remove('is-scrubbing');
      const t = at(e.clientX);
      if (t >= TOTAL - 0.25) { finish(); return; }
      state = wasPlaying ? 'playing' : 'paused';
      seek(t);
    };
    on(track, 'pointerup', end);
    on(track, 'pointercancel', end);
    on(track, 'keydown', (e) => {
      if (state === 'gate') return;
      const ch = chapterAt(T);
      const map = {
        ArrowRight: T + 5, ArrowLeft: T - 5, ArrowUp: T + 5, ArrowDown: T - 5, Home: 0, End: TOTAL,
        PageDown: ch + 1 < CH.length ? CH[ch + 1].t : TOTAL, PageUp: CH[Math.max(0, T - CH[ch].t < 1.5 ? ch - 1 : ch)].t,
      };
      if (!(e.key in map)) return;
      e.preventDefault();
      seek(map[e.key]);
    });

    on(document, 'visibilitychange', () => {
      if (document.hidden) pause(true);
      else if (autoPaused) resume();
    });
  }

  /* ------------------------------------------------------------------ build / rebuild */

  function build() {
    // Keep the viewer's place across a rebuild: same chapter, same offset into it.
    const old = CH.length ? { ch: chapterAt(T), off: T - CH[chapterAt(T)].t, end: state === 'ended' } : null;
    if (ctx) ctx.revert();
    $$('#s-people .m').forEach((m) => { m.style.zIndex = ''; });
    ctx = gsap.context(() => {
      tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
      compose();
    }, host);                                                           // [framer] + host: selector strings resolve inside the component
    if (old) {
      if (old.end) T = TOTAL;
      else {
        const next = old.ch + 1 < CH.length ? CH[old.ch + 1].t : TOTAL;
        T = clamp(CH[old.ch].t + old.off, CH[old.ch].t, next - 0.01);
      }
    }
    tl.time(T, true);
    syncClips();
    updateUI(false);
  }

  let dbg = null;
  function debug() {
    if (!dbg) { dbg = document.createElement('div'); dbg.className = 'dbg'; body.appendChild(dbg); }
    const l = leadClip();
    dbg.textContent = `${state}  ${T.toFixed(2)} / ${TOTAL.toFixed(2)}  ${CH[chapterAt(T)].label}\n` +
      (l ? `lead ${l.name} rs${l.v.readyState} vt ${l.v.currentTime.toFixed(2)} stall ${l.stall.toFixed(2)}` : 'lead —') +
      `\nwide ${WIDE}  low ${LOW}  hevc ${HEVC}  locked ${locked}`;
  }

  let api = null;
  let ios = [];
  function init() {
    if (dead) return;                                                   // [framer]
    // [framer] No history.scrollRestoration / scrollTo(0, 0): the page keeps its own scroll.
    renderMedia();
    build();
    // [framer] No lock at the opening screen: the page scrolls until the film is started.
    setClasses();
    bindInput();

    let rT, lastW = stage.clientWidth, lastH = stage.clientHeight;
    on(window, 'resize', () => {
      if (locked) dock();                                               // [framer] stay docked while the viewport changes
      cancel(rT);
      rT = later(() => {
        const nowWide = wideNow();
        const w = stage.clientWidth, h = stage.clientHeight;
        if (nowWide === WIDE && Math.abs(w - lastW) < 40 && Math.abs(h - lastH) < 60) { if (locked) dock(); else queueView(); return; }   // [framer] + dock / queueView
        lastW = w; lastH = h;
        if (nowWide !== WIDE) {
          WIDE = nowWide;
          root.classList.toggle('wide', WIDE);
          $$('video', stage).forEach(unload);
          renderMedia();
        }
        build();
        if (state === 'ended') finish();
        if (locked) dock(); else queueView();                           // [framer]
      }, 200);
    });

    // [framer] Where the film is on the page: whether to draw at all, when the cover's opening
    // animation starts (as the prototype's did at page load), and when videos may load.
    if ('IntersectionObserver' in window) {
      const seen = new IntersectionObserver((es) => es.forEach((en) => {
        visible = en.isIntersecting;
        if (en.isIntersecting && en.intersectionRatio >= 0.15) host.classList.add('pcc-live');
        queueView();
      }), { threshold: [0, 0.15] });
      seen.observe(host);
      const near = new IntersectionObserver((es) => es.forEach((en) => {
        if (!en.isIntersecting || mediaOn) return;
        mediaOn = true;
        syncClips();
        header.prime();
      }), { rootMargin: '150% 0px 150% 0px' });
      near.observe(host);
      ios = [seen, near];
    } else {
      visible = true;
      mediaOn = true;
      host.classList.add('pcc-live');
      syncClips();
    }
    checkView();
    raf = requestAnimationFrame(frame);

    api = {
      state: () => ({ state, t: +T.toFixed(3), total: +TOTAL.toFixed(3), chapter: CH[chapterAt(T)].label, locked, htmlLocked: page.classList.contains('pcc-locked'), scrollY, wide: WIDE, low: LOW, hevc: HEVC, blocked, filmTop: +topNow().toFixed(2), docked: docked(), headerHidden: hdrHidden, mediaOn }),   // [framer] + filmTop, docked, headerHidden, mediaOn
      chapters: () => CH.map((c) => ({ label: c.label, t: +c.t.toFixed(3) })),
      clips: () => clips.map((c) => ({ name: c.name, start: +c.start.toFixed(3), end: +c.end.toFixed(3), t: +c.v.currentTime.toFixed(3), paused: c.v.paused, ended: c.v.ended, rs: c.v.readyState, loaded: !!c.v._loaded, failed: c.failed, src: (c.v.currentSrc || '').split('/').pop() })),
      start: () => { mediaOn = true; start(true); }, pause: () => pause(false), resume, seek, skip, replay,   // [framer] start() docks at once
    };
    window.ClubScottsdale = api;
  }

  const fonts = opts.fonts || (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());   // [framer] + the component's own fonts, added at mount
  Promise.race([fonts, new Promise((r) => later(r, 1200))]).then(init);

  // [framer] Unmount: stop the clock, detach every listener, give every video its buffers
  // back, revert GSAP's inline styles, and hand the page and its header back untouched.
  return {
    destroy() {
      if (dead) return;
      dead = true;
      cancelAnimationFrame(raf);
      if (gliding) gliding.stop = true;
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      offs.splice(0).forEach((off) => off());
      ios.forEach((o) => o.disconnect());
      $$('video', stage).forEach((v) => { try { v.pause(); } catch (e) { /* ignore */ } unload(v); });
      if (ctx) ctx.revert();
      unlockPage();
      header.set(false, true);
      if (dbg && dbg.parentNode) dbg.parentNode.removeChild(dbg);
      if (window.ClubScottsdale === api) delete window.ClubScottsdale;
    },
  };
}

/* [framer] The site's own header, standing in for the prototype's replica: the same
   0.9 s fade and 12 px lift, and no taps while it is hidden. It is the page's
   fixed or sticky bar at the top of the viewport (or whatever headerSelector names).
   Only two classes are added to it and they are removed again, so the header's own
   styles and animations are left alone. */
function siteHeader(host, selector) {
  let els = [];
  let t = 0;
  let hidden = false;
  // If the site re-renders its header while the film has it hidden (a new class list from a
  // variant change, or a new element), hide it again.
  const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => { if (hidden) apply(false); });
  const watched = new Set();
  const apply = (search) => {
    const had = els.length;
    els = els.filter((el) => el.isConnected);
    if (!els.length && (search || had)) els = find();
    els.forEach((el) => {
      if (!el.classList.contains('pcc-hdr--hidden')) { el.classList.add('pcc-hdr'); el.classList.add('pcc-hdr--hidden'); }
      if (mo && !watched.has(el)) { mo.observe(el, { attributes: true, attributeFilter: ['class'] }); watched.add(el); }
    });
  };
  const find = () => {
    if (selector) {
      try { return Array.from(document.querySelectorAll(selector)).filter((el) => !host.contains(el) && !el.contains(host)); } catch (e) { return []; }
    }
    const out = [];
    const vw = innerWidth, vh = innerHeight;
    const all = document.body ? document.body.getElementsByTagName('*') : [];
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      if (host.contains(el) || el.contains(host)) continue;
      const pos = getComputedStyle(el).position;
      if (pos !== 'fixed' && pos !== 'sticky') continue;
      const r = el.getBoundingClientRect();
      if (r.height <= 0 || r.width < vw * 0.5 || r.top > 40 || r.bottom > vh * 0.3) continue;
      if (out.some((o) => o.contains(el))) continue;
      out.push(el);
    }
    return out;
  };
  return {
    // While hidden: make sure it still is (called on every state change and scroll check).
    check() { if (hidden) apply(false); },
    // Look for it ahead of time (the search reads every element's position once).
    prime() {
      if (els.length) return;
      const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
      idle(() => { if (!els.length) els = find(); });
    },
    set(hide, now) {
      clearTimeout(t);
      hidden = hide;
      if (hide) apply(true);
      else {
        if (mo) { mo.disconnect(); watched.clear(); }
        els.forEach((el) => el.classList.remove('pcc-hdr--hidden'));
        const done = () => els.forEach((el) => el.classList.remove('pcc-hdr'));
        if (now) done(); else t = setTimeout(done, 950);
      }
    },
  };
}
