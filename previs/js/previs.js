/* ==========================================================================
   Club Scottsdale — footage previs (mobile-first)
   Reels
     A (pinned)  01 Enter · 02 Arrival            26 → 12 → 13
     B (pinned)  03 Inside the club               42 → 34 + P3
     C (pinned)  04 The collection                27/28 → 31 + cards 47, 23, 15
     D (pinned)  05 Experiences                   32 → 43 → 48 44 49 45 → 1
     E (pinned)  06 People + access               P1 → 37 40 11 5
     F (pinned)  07 The ecosystem                 54 · 29 · 28/47/48 · 25 · 64
     G (pinned)  08 The point
     H (pinned)  09 Return to Pursuit             then native scroll to the CTA
   1 timeline unit = LEN × one screen of scroll.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, r = document) => (typeof r === 'string' ? document.querySelector(r) : r).querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const body = document.body;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const K = RM ? 0 : 1;
  const TOUCH = matchMedia('(hover: none), (pointer: coarse)').matches;

  const W = () => $('.stage').clientWidth;
  const H = () => $('.stage').clientHeight;
  const LEN = () => (TOUCH ? 0.74 : 0.7);
  const U = () => LEN() * window.innerHeight;
  const pct = (v) => v + '%';
  const win = (f) => ({ '--t': pct(f[0]), '--r': pct(f[1]), '--b': pct(f[2]), '--l': pct(f[3]) });

  let ctx = null;
  let cleanups = [];
  let markers = [];
  let pending = [];
  let lastIdx = -1;
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  let lenis = null;
  let introTl = null;

  /* ------------------------------------------------------------------ media */

  function renderMedia() {
    $$('.m[data-src]').forEach((el) => {
      const id = el.dataset.src;
      const still = /^[sp]/.test(id);
      if (el.dataset.op) el.style.setProperty('--op', el.dataset.op);
      const inner = still
        ? `<img src="media/${id}.jpg" alt="" decoding="async">`
        : `<video src="media/${id}.mp4" poster="media/${id}.jpg" muted playsinline ${el.hasAttribute('data-scrub') ? 'preload="auto"' : 'loop preload="metadata"'}${el.hasAttribute('data-scrub') ? ' data-scrub' : ''}></video>`;
      el.innerHTML = `<div class="f">${inner}</div><span class="tag">Shot ${el.dataset.shot}</span>`;
    });
  }

  // Play a clip only while it is on screen and not hidden; restart it each time it appears.
  function shown(v) {
    const r = v.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return false;
    let el = v;
    for (let i = 0; i < 7 && el && el !== body; i++) {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.02) return false;
      el = el.parentElement;
    }
    return true;
  }
  function runVideos() {
    const vids = $$('video:not([data-scrub])');
    setInterval(() => {
      vids.forEach((v) => {
        const on = shown(v);
        if (on && !v._on) { v._on = true; try { v.currentTime = 0; } catch (e) { /* not loaded */ } v.play().catch(() => {}); }
        else if (!on && v._on) { v._on = false; v.pause(); }
      });
    }, 200);
  }

  // Shot 26 is scrubbed by scroll rather than played.
  let scrubV = null, scrubT = 0, scrubRaf = 0;
  function seek(t) {
    scrubT = t;
    if (scrubRaf) return;
    scrubRaf = requestAnimationFrame(() => {
      scrubRaf = 0;
      if (scrubV && scrubV.readyState >= 1 && Math.abs(scrubV.currentTime - scrubT) > 0.03) {
        try { scrubV.currentTime = scrubT; } catch (e) { /* ignore */ }
      }
    });
  }
  function unlockScrub() {
    if (!scrubV) return;
    const p = scrubV.play();
    if (p && p.then) p.then(() => { scrubV.pause(); seek(scrubT); }).catch(() => {});
  }

  function splitChars() {
    $$('[data-split]').forEach((el) => {
      const txt = el.textContent.trim();
      el.setAttribute('aria-label', txt);
      el.innerHTML = Array.from(txt).map((c) => `<span class="ch" aria-hidden="true">${c}</span>`).join('');
    });
  }

  function makeGrain() {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    const img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    $('.grain').style.backgroundImage = `url(${c.toDataURL('image/png')})`;
  }

  /* ------------------------------------------------------------------ scaffolding */

  function beat(tl, key, at, info) {
    tl.addLabel(key, at);
    pending.push(Object.assign({ key, tl }, info));
  }

  function pinReel(el, tl, spacing = true) {
    const st = ScrollTrigger.create({
      trigger: el,
      pin: true,
      pinSpacing: spacing,
      start: 'top top',
      end: () => '+=' + Math.round(tl.duration() * U()),
      scrub: RM ? true : (TOUCH ? 0.5 : 0.8),
      animation: tl,
      anticipatePin: 1,
    });
    pending.forEach((b) => { b.st = st; markers.push(b); });
    pending = [];
    return st;
  }

  const thread = $('#thread');

  /* ------------------------------------------------------------------ A · 01 Enter + 02 Arrival */

  function buildA() {
    const el = $('#ra');
    const stage = $('.stage', el);
    const a26 = $('#a26'), a12 = $('#a12'), a13 = $('#a13');

    gsap.set(a26, Object.assign(win([0, 50, 0, 50]), { autoAlpha: 0 }));
    gsap.set($('.f', a26), { scale: 1 + 0.25 * K });
    a12.classList.add('mask-soft');
    cleanups.push(() => a12.classList.remove('mask-soft'));
    gsap.set(a12, { '--mp': '0%', autoAlpha: 0 });
    gsap.set(a13, { autoAlpha: 0 });
    gsap.set('#ra .reveal .li', { yPercent: 112 });
    gsap.set(['#ra .kicker', '#a-scrim', '#a-cap'], { autoAlpha: 0 });

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    beat(tl, 'a-enter', 0, { ch: '01 / Enter', shot: 'No media', tr: 'Darkness · seam · scroll to enter' });
    tl.to('#ra .cue', { autoAlpha: 0, duration: 0.25, ease: 'none' }, 0);
    tl.to('#ra .intro', { autoAlpha: 0, y: -30 * K, duration: 0.6, ease: 'power1.in' }, 0.05);
    tl.to('#ra .seam', { top: '0%', height: '100%', duration: 0.7 }, 0);

    let t = 0.7;
    beat(tl, 'a-slit', t, { ch: '01 / Enter', shot: 'Shot 26 · scroll-scrubbed', tr: 'I — Seam opens to a slit' });
    tl.set(a26, { autoAlpha: 1 }, t);
    tl.to(a26, { '--l': '44%', '--r': '44%', duration: 0.6 }, t);
    tl.to('#ra .seam', { autoAlpha: 0, duration: 0.25, ease: 'none' }, t + 0.15);
    const sc = { t: 0 };
    tl.to(sc, { t: 2.1, duration: 2.7, ease: 'none', onUpdate: () => seek(sc.t) }, t);
    t += 0.8;

    beat(tl, 'a-full', t, { ch: '02 / Arrival', shot: 'Shot 26', tr: 'A — Slit → full screen' });
    tl.to(a26, Object.assign(win([0, 0, 0, 0]), { duration: 1.1 }), t);
    tl.to($('.f', a26), { scale: 1, duration: 1.1 }, t);
    t += 1.5;

    beat(tl, 'a-wipe', t, { ch: '02 / Arrival', shot: 'Shot 12', tr: 'B — Soft wipe (rising mask)' });
    tl.set(a12, { autoAlpha: 1 }, t);
    tl.to(a12, { '--mp': '100%', duration: 1.1, ease: 'sine.inOut' }, t);
    tl.fromTo($('.f', a12), { scale: 1.1 }, { scale: 1, duration: 1.3, ease: 'power2.out' }, t);
    tl.to($('.f', a26), { scale: 1 + 0.06 * K, duration: 1.1, ease: 'none' }, t);
    t += 1.4;

    beat(tl, 'a-hero', t, { ch: '02 / Arrival', shot: 'Shot 13', tr: 'Arrival hero · title in the sky', chrome: 'immerse' });
    tl.to(a13, { autoAlpha: 1, duration: 0.35, ease: 'none' }, t);
    tl.fromTo($('.f', a13), { scale: 1 + 0.08 * K }, { scale: 1, duration: 1.8, ease: 'power2.out' }, t);
    tl.to('#a-scrim', { autoAlpha: 1, duration: 0.5, ease: 'none' }, t + 0.1);
    tl.to('#ra .kicker', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 0.3);
    tl.to('#ra .reveal .li', { yPercent: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }, t + 0.35);
    tl.to('#a-cap', { autoAlpha: 1, duration: 0.3, ease: 'none' }, t + 0.9);
    t += 2.0;

    // Last screen of the pin: reel B turns over it like a page.
    beat(tl, 'a-cover', t, { ch: '03 / Inside the club', shot: 'Shot 42 · still', tr: 'P — Page turn' });
    tl.to(stage, { scale: 1 - 0.06 * K, opacity: 0.3, duration: 1 / LEN(), ease: 'none' }, t);

    const sp = $('#ra-spacer');
    const setSp = () => { sp.style.height = Math.max(0, Math.round(tl.duration() * U() - el.offsetHeight)) + 'px'; };
    setSp();
    ScrollTrigger.addEventListener('refreshInit', setSp);
    cleanups.push(() => { ScrollTrigger.removeEventListener('refreshInit', setSp); sp.style.height = ''; });
    pinReel(el, tl, false);
  }

  /* ------------------------------------------------------------------ B · 03 Inside the club */

  function buildB() {
    const el = $('#rb');
    const b42 = $('#b42'), b34 = $('#b34'), bp3 = $('#bp3');
    gsap.set(b34, Object.assign(win([0, 0, 99.9, 0]), { autoAlpha: 0 }));
    gsap.set(bp3, Object.assign(win([99.9, 0, 0, 0]), { autoAlpha: 0 }));
    gsap.set(['#b-div', '.b-pcap', '#b-cap2'], { autoAlpha: 0 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
    beat(tl, 'b-wall', 0, { ch: '03 / Inside the club', shot: 'Shot 42 · still', tr: 'P — Page turn lands on the logo wall' });
    let t = 0.6;

    beat(tl, 'b-split', t, { ch: '03 / Inside the club', shot: 'Shots 34 + P3', tr: 'D — Vertical split closes over the wall' });
    tl.set([b34, bp3], { autoAlpha: 1 }, t);
    tl.to(b34, { '--b': '50%', duration: 0.9 }, t);
    tl.fromTo($('.f', b34), { yPercent: -8 * K }, { yPercent: 0, duration: 0.9 }, t);
    tl.to(bp3, { '--t': '50%', duration: 0.9 }, t + 0.08);
    tl.fromTo($('.f', bp3), { yPercent: 8 * K }, { yPercent: 0, duration: 0.9 }, t + 0.08);
    tl.to($('.f', b42), { scale: 1 - 0.06 * K, duration: 0.9 }, t);
    tl.to('#b-cap', { autoAlpha: 0, duration: 0.25, ease: 'none' }, t);
    tl.to(['#b-div', '.b-pcap'], { autoAlpha: 1, duration: 0.3, ease: 'none' }, t + 0.75);
    t += 0.9 + 0.8;

    beat(tl, 'b-take', t, { ch: '03 / Inside the club', shot: 'P3 · still', tr: 'Takeover · lounge fills the screen' });
    tl.to(bp3, { '--t': '0%', duration: 1.0 }, t);
    tl.to($('.f', b34), { yPercent: -8 * K, duration: 1.0 }, t);
    tl.to(['#b-div', '.b-pcap'], { autoAlpha: 0, duration: 0.25, ease: 'none' }, t);
    tl.fromTo($('img', bp3), { scale: 1 + 0.1 * K }, { scale: 1, duration: 2.0, ease: 'none' }, t);
    tl.to('#b-cap2', { autoAlpha: 1, duration: 0.3, ease: 'none' }, t + 0.8);
    t += 2.0;
    tl.to({}, { duration: 0.01 }, t);
    pinReel(el, tl);
  }

  /* ------------------------------------------------------------------ C · 04 The collection (vertical filmstrip) */

  function buildC() {
    const el = $('#rc');
    const c31 = $('#c31');
    const cards = $$('.card', el);
    gsap.set(c31, { autoAlpha: 0 });
    gsap.set('#c-dim', { autoAlpha: 0 });

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    beat(tl, 'c-27', 0, { ch: '04 / Collection', shot: 'Shots 27–28', tr: 'Top-down drone fills the screen' });
    tl.fromTo('#rc .ctitle > *', { autoAlpha: 0, y: 14 * K }, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power3.out' }, 0.1);
    let t = 1.1;

    beat(tl, 'c-31', t, { ch: '04 / Collection', shot: 'Shot 31 · background', tr: 'Crossfade → moving background' });
    tl.to(c31, { autoAlpha: 1, duration: 0.7, ease: 'none' }, t);
    tl.fromTo($('.f', c31), { scale: 1 + 0.15 * K }, { scale: 1, duration: 1.2, ease: 'power2.out' }, t);
    tl.to('#c-dim', { autoAlpha: 1, duration: 0.7, ease: 'none' }, t + 0.3);
    t += 0.9;

    const off = (c) => H() / 2 + c.offsetHeight / 2 + 30;
    tl.to('#rc .ctitle', { autoAlpha: 0.22, duration: 0.5, ease: 'none' }, t + 0.3);
    cards.forEach((c, i) => {
      const s = t + i * 1.05;
      beat(tl, 'c-k' + i, s, { ch: '04 / Collection', shot: `Shot ${c.dataset.shot} · card (31 behind)`, tr: 'V — Vertical filmstrip' });
      tl.fromTo(c, { y: () => off(c) }, { y: () => -off(c), duration: 2.1, ease: 'none' }, s);
      tl.fromTo(c, { scale: 0.76 }, { scale: 1, duration: 1.05, ease: 'power1.out' }, s);
      tl.to(c, { scale: 0.76, duration: 1.05, ease: 'power1.in' }, s + 1.05);
      tl.fromTo($('.f', c), { yPercent: -6 * K }, { yPercent: 6 * K, duration: 2.1, ease: 'none' }, s);
      tl.fromTo($('.card__cap', c), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'none' }, s + 0.7);
      tl.to($('.card__cap', c), { autoAlpha: 0, duration: 0.25, ease: 'none' }, s + 1.3);
    });
    t += 2 * 1.05 + 2.1;
    tl.to({}, { duration: 0.01 }, t);
    pinReel(el, tl);
  }

  /* ------------------------------------------------------------------ D · 05 Experiences */

  function buildD() {
    const el = $('#rd');
    const zf = $('#dzf');
    const d1 = $('#d1');
    gsap.set('#rd .dline .li', { yPercent: 112 });
    gsap.set(zf, { autoAlpha: 0, scale: 0.86 });
    gsap.set(['#d43', '#d48', '#d44', '#d49', '#d45', '#d1', '#d-cap'], { autoAlpha: 0 });
    d1.classList.add('clip-diag');
    cleanups.push(() => d1.classList.remove('clip-diag'));
    gsap.set(d1, { '--p': 0 });

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    beat(tl, 'd-type', 0, { ch: '05 / Experiences', shot: 'No media', tr: 'F — Type on black' });
    tl.to('#rd .dline .li', { yPercent: 0, stagger: 0.12, duration: 0.6, ease: 'power3.out' }, 0.05);
    let t = 1.05;
    tl.to('#rd .dline', { autoAlpha: 0, y: -20 * K, duration: 0.4, ease: 'power1.in' }, t);

    beat(tl, 'd-zoom', t, { ch: '05 / Experiences', shot: 'Shot 32', tr: 'G — Zoom through' });
    tl.to(zf, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, t + 0.1);
    t += 0.75;
    const zs = () => Math.max(W() / zf.offsetWidth, H() / zf.offsetHeight) * 1.02;
    tl.to(zf, { scale: RM ? 1 : zs, duration: 1.1, ease: 'power3.in' }, t);
    tl.fromTo($('.f', zf), { scale: 1 + 0.25 * K }, { scale: 1, duration: 1.1, ease: 'power3.in' }, t);
    t += 1.0;

    beat(tl, 'd-43', t, { ch: '05 / Experiences', shot: 'Shot 43 · still', tr: 'Full-screen event' });
    tl.to('#d43', { autoAlpha: 1, duration: 0.2, ease: 'none' }, t);
    tl.fromTo($('img', '#d43'), { scale: 1 + 0.12 * K }, { scale: 1, duration: 0.9, ease: 'power2.out' }, t);
    tl.set(zf, { autoAlpha: 0 }, t + 0.25);
    t += 0.85;

    let prev = '#d43';
    ['48', '44', '49', '45'].forEach((n) => {
      beat(tl, 'd-c' + n, t, { ch: '05 / Experiences', shot: 'Shot ' + n, tr: 'Rapid cuts · one per scroll step' });
      tl.set('#d' + n, { autoAlpha: 1 }, t);
      tl.set(prev, { autoAlpha: 0 }, t);
      prev = '#d' + n;
      t += 0.42;
    });

    beat(tl, 'd-1', t, { ch: '05 / Experiences', shot: 'Shot 1 · still', tr: 'B — Diagonal wipe' });
    tl.set(d1, { autoAlpha: 1 }, t);
    tl.to(d1, { '--p': 1, duration: 0.6, ease: 'expo.inOut' }, t);
    tl.fromTo($('img', d1), { scale: 1 + 0.3 * K }, { scale: 1, duration: 0.9, ease: 'expo.out' }, t + 0.05);
    tl.to('#d-cap', { autoAlpha: 1, duration: 0.3, ease: 'none' }, t + 0.6);
    t += 1.5;
    tl.to({}, { duration: 0.01 }, t);
    pinReel(el, tl);
  }

  /* ------------------------------------------------------------------ E · 06 People + access */

  function buildE() {
    const el = $('#re');
    const clips = ['37', '40', '11', '5'];
    gsap.set('#re .eline .li', { yPercent: 112 });
    gsap.set(['#ep1', '#ep1-scrim', '#ep1-cap', '.ecap'], { autoAlpha: 0 });
    clips.forEach((n) => gsap.set('#e' + n, Object.assign(win([99.9, 0, 0, 0]), { autoAlpha: 0 })));

    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
    beat(tl, 'e-type', 0, { ch: '06 / People + access', shot: 'No media', tr: 'F — Black typography' });
    tl.to('#re .eline .li', { yPercent: 0, stagger: 0.12, duration: 0.6, ease: 'power3.out' }, 0.05);
    let t = 1.0;
    tl.to('#re .eline', { autoAlpha: 0, y: -20 * K, duration: 0.4, ease: 'power1.in' }, t);

    beat(tl, 'e-p1', t, { ch: '06 / People + access', shot: 'P1 · still', tr: 'C — Pinned still' });
    tl.to(['#ep1', '#ep1-scrim'], { autoAlpha: 1, duration: 0.5, ease: 'none' }, t + 0.15);
    tl.fromTo($('img', '#ep1'), { scale: 1 + 0.12 * K }, { scale: 1, duration: 1.9, ease: 'none' }, t + 0.15);
    tl.to('#ep1-cap', { autoAlpha: 1, duration: 0.3, ease: 'none' }, t + 0.6);
    t += 1.5;

    let prevCap = '#ep1-cap';
    clips.forEach((n) => {
      beat(tl, 'e-' + n, t, { ch: '06 / People + access', shot: 'Shot ' + n, tr: 'Portrait sequence · page wipe up' });
      tl.set('#e' + n, { autoAlpha: 1 }, t);
      tl.to('#e' + n, { '--t': '0%', duration: 0.55 }, t);
      tl.fromTo($('.f', '#e' + n), { yPercent: 8 * K }, { yPercent: 0, duration: 0.55 }, t);
      tl.to(prevCap, { autoAlpha: 0, duration: 0.2, ease: 'none' }, t);
      tl.to(`#e${n}-cap`, { autoAlpha: 1, duration: 0.3, ease: 'none' }, t + 0.4);
      prevCap = `#e${n}-cap`;
      t += 0.9;
    });
    t += 0.2;
    tl.to({}, { duration: 0.01 }, t);
    pinReel(el, tl);
  }

  /* ------------------------------------------------------------------ F · 07 The ecosystem */

  function catIn(tl, b, t) {
    tl.set(b, { autoAlpha: 1 }, t);
    tl.to($$('.ch', b), { yPercent: 0, duration: 0.55, stagger: 0.02, ease: 'power3.out' }, t);
    tl.to($('.fnum', b), { autoAlpha: 1, duration: 0.25, ease: 'none' }, t);
    tl.fromTo($$('.fdesc > span', b), { autoAlpha: 0, y: 10 * K }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.07, ease: 'power3.out' }, t + 0.18);
  }
  function catOut(tl, b, t) {
    tl.to($$('.ch', b), { yPercent: -112, duration: 0.35, stagger: 0.012, ease: 'power2.in' }, t);
    tl.to([$('.fnum', b)].concat($$('.fdesc > span', b)), { autoAlpha: 0, duration: 0.2, ease: 'none' }, t);
    tl.set(b, { autoAlpha: 0 }, t + 0.45);
  }
  function slide(tl, from, to, t) {
    if (RM) {
      tl.to(to, { autoAlpha: 1, duration: 0.5, ease: 'none' }, t);
      tl.to(from, { autoAlpha: 0, duration: 0.5, ease: 'none' }, t);
      return;
    }
    tl.fromTo(to, { autoAlpha: 1, yPercent: 100 }, { autoAlpha: 1, yPercent: 0, duration: 0.75, ease: 'power3.inOut', immediateRender: false }, t);
    tl.to(from, { yPercent: -28, duration: 0.75, ease: 'power3.inOut' }, t);
    tl.set(from, { autoAlpha: 0, yPercent: 0 }, t + 0.76);
  }

  function buildF() {
    const el = $('#rf');
    const ff = $('#ff');
    const blocks = $$('.fcat', el);
    const items = $$('.fidx li', el);
    const sq = Math.min(60, (0.88 * W() / H()) * 100);
    const C = [
      [13, 6, 41, 6],
      [11, 17, 39, 17],
      [9, 0, 37, 0],
      [15, 9, 43, 9],
      [13, 6, 100 - 13 - sq, 6],
    ];
    const layers = ['#f0', '#f1', '#f2a', '#f3', '#f4'];
    const lastLayers = ['#f0', '#f1', '#f2c', '#f3', '#f4'];

    gsap.set(ff, Object.assign(win([0, 0, 0, 0]), { autoAlpha: 1 }));
    gsap.set($$('.m', ff), { autoAlpha: 0 });
    gsap.set('#f0', { autoAlpha: 1 });
    gsap.set(['#rf .fidx', '#rf .ftop'], { autoAlpha: 0 });
    gsap.set(blocks, { autoAlpha: 0 });
    gsap.set($$('.ch', el), { yPercent: 112 });
    gsap.set($$('.fnum, .fdesc > span', el), { autoAlpha: 0 });
    gsap.set(items, { opacity: 0.3 });
    gsap.set(thread, { autoAlpha: 0, scaleX: 1, rotation: 0, x: 0, y: 0 });

    const idx = (tl, i, t) => {
      tl.to(items.filter((_, j) => j !== i), { opacity: 0.3, duration: 0.25, ease: 'none' }, t);
      tl.to(items[i], { opacity: 1, duration: 0.25, ease: 'none' }, t);
    };

    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
    beat(tl, 'f-full', 0, { ch: '07 / The ecosystem', shot: 'Shot 54', tr: 'Full-screen media' });
    tl.to('#rf .ftop', { autoAlpha: 1, duration: 0.3, ease: 'none' }, 0.1);
    let t = 0.55;

    beat(tl, 'f-shrink', t, { ch: '07 / The ecosystem', shot: 'Shot 54 · Network', tr: "A′ — Shrink to shared frame" });
    tl.to(ff, Object.assign(win(C[0]), { duration: 0.9 }), t);
    tl.to('#rf .fidx', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 0.4);
    catIn(tl, blocks[0], t + 0.45);
    idx(tl, 0, t + 0.45);
    t += 0.9 + 0.75;

    const names = ['Network', 'Media', 'Experiences', 'Environment', 'Opportunity'];
    const shots = ['54', '29', '28 → 47 → 48', '25', '64'];
    for (let i = 1; i < 5; i++) {
      const extra = i === 2 ? 0.5 : 0;
      beat(tl, 'f-c' + i, t, {
        ch: '07 / The ecosystem', shot: `Shot ${shots[i]} · ${names[i]}`,
        tr: 'Category morph · slide within frame' + (i === 2 ? ' · montage cuts' : '') + (i === 4 ? ' · square crop' : ''),
      });
      catOut(tl, blocks[i - 1], t);
      tl.to(ff, Object.assign(win(C[i]), { duration: 0.75 }), t);
      slide(tl, $(lastLayers[i - 1]), $(layers[i]), t + 0.05);
      catIn(tl, blocks[i], t + 0.3);
      idx(tl, i, t + 0.3);
      if (i === 2) {
        tl.set('#f2b', { autoAlpha: 1 }, t + 1.0); tl.set('#f2a', { autoAlpha: 0 }, t + 1.0);
        tl.set('#f2c', { autoAlpha: 1 }, t + 1.4); tl.set('#f2b', { autoAlpha: 0 }, t + 1.4);
      }
      t += 0.75 + 0.65 + extra;
    }

    beat(tl, 'f-close', t, { ch: '08 / The point', shot: 'No media', tr: 'I — Frame closes to a line' });
    catOut(tl, blocks[4], t);
    tl.to(['#rf .fidx', '#rf .ftop'], { autoAlpha: 0, duration: 0.3, ease: 'none' }, t);
    tl.to(ff, Object.assign(win([47, 0, 47, 0]), { duration: 0.55, ease: 'power2.inOut' }), t + 0.15);
    tl.to(ff, { '--t': '49.9%', '--b': '49.9%', duration: 0.4, ease: 'power2.in' }, t + 0.7);
    tl.fromTo(thread, { autoAlpha: 0 }, { autoAlpha: 0.8, duration: 0.12, ease: 'none', immediateRender: false }, t + 1.0);
    tl.set(ff, { autoAlpha: 0 }, t + 1.1);
    t += 1.35;
    tl.to({}, { duration: 0.01 }, t);
    pinReel(el, tl);
  }

  /* ------------------------------------------------------------------ G · 08 The point */

  function buildG() {
    const el = $('#rg');
    const wa = $$('.pa .w', el), wb = $$('.pb .w', el);
    gsap.set($$('.w', el), { opacity: 0.1 });
    gsap.set('#rg .point', { autoAlpha: 0 });
    gsap.set('#rg .coda', { autoAlpha: 0 });

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    beat(tl, 'g-point', 0, { ch: '08 / The point', shot: 'No media', tr: 'Line → divider · stillness' });
    // Starts just after 0 so the handoff state from reel F is never overwritten early.
    tl.fromTo(thread,
      { autoAlpha: 0.8, scaleX: 1, rotation: 0, x: 0, y: 0 },
      { autoAlpha: 0.5, scaleX: () => 64 / W(), duration: 0.7, immediateRender: false }, 0.05);
    tl.to('#rg .point', { autoAlpha: 1, duration: 0.3, ease: 'none' }, 0.4);
    tl.to(wa, { opacity: 1, duration: 0.3, stagger: 0.13, ease: 'none' }, 0.55);
    let t = 0.55 + 0.3 + 0.13 * (wa.length - 1) + 0.6;

    beat(tl, 'g-b', t, { ch: '08 / The point', shot: 'No media', tr: 'Words fill with scroll' });
    tl.to(wa, { opacity: 0.4, duration: 0.4, ease: 'none' }, t);
    tl.to(wb, { opacity: 1, duration: 0.3, stagger: 0.12, ease: 'none' }, t + 0.1);
    t += 0.1 + 0.3 + 0.12 * (wb.length - 1) + 0.2;
    tl.to('#rg .coda', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t);
    t += 0.4 + 0.9;

    beat(tl, 'g-rot', t, { ch: '09 / Return to Pursuit', shot: 'No media', tr: 'The line turns vertical' });
    tl.to('#rg .point', { autoAlpha: 0, duration: 0.4, ease: 'power1.in' }, t);
    tl.to(thread, { rotation: 90, duration: 0.6 }, t + 0.2);
    t += 0.9;
    tl.to({}, { duration: 0.01 }, t);
    pinReel(el, tl);
  }

  /* ------------------------------------------------------------------ H · 09 Return to Pursuit */

  function buildH() {
    const el = $('#rh');
    const track = $('.ptrack', el);
    const phases = $$('.phase', el);
    gsap.set('#rh .phead > *', { autoAlpha: 0 });
    gsap.set($$('.node', el), { scale: 0 });
    gsap.set($$('.phase__top, .phase__desc', el), { autoAlpha: 0 });
    gsap.set('#rh .prail', { autoAlpha: 0 });
    gsap.set(['#rh .eco__t', '#rh .eco__b'], { scaleX: 0 });
    gsap.set(['#rh .eco__l', '#rh .eco__r'], { scaleY: 0 });
    gsap.set(['#rh .eco__label', '#rh .eco__sub'], { autoAlpha: 0 });

    // Where the rail sits, relative to the centre of the canvas
    const X = () => track.offsetLeft + 0.5 - W() / 2;
    const Y = () => track.offsetTop + track.offsetHeight / 2 - H() / 2;

    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
    beat(tl, 'h-path', 0, { ch: '09 / Return to Pursuit', shot: 'No media', tr: 'Vertical line → Sell / Build / Own', chrome: 'return' });
    tl.fromTo(thread,
      { autoAlpha: 0.5, scaleX: () => 64 / W(), rotation: 90, x: 0, y: 0 },
      { autoAlpha: 0.8, scaleX: () => track.offsetHeight / W(), x: X, y: Y, duration: 1.0, immediateRender: false }, 0.05);
    tl.set('#rh .prail', { autoAlpha: 1 }, 1.06);
    tl.set(thread, { autoAlpha: 0 }, 1.06);
    tl.fromTo('#rh .phead > *', { autoAlpha: 0, y: 14 * K }, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.5, ease: 'power3.out' }, 0.3);
    phases.forEach((p, i) => {
      tl.to($('.node', p), { scale: 1, duration: 0.3, ease: 'power2.out' }, 1.1 + i * 0.4);
      tl.fromTo([$('.phase__top', p), $('.phase__desc', p)], { autoAlpha: 0, y: 10 * K }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.4, ease: 'power3.out' }, 1.15 + i * 0.4);
    });
    let t = 2.5;
    beat(tl, 'h-eco', t, { ch: '09 / Return to Pursuit', shot: 'No media', tr: 'The ecosystem frames the path' });
    tl.to('#rh .eco__t', { scaleX: 1, duration: 0.6 }, t);
    tl.to(['#rh .eco__l', '#rh .eco__r'], { scaleY: 1, duration: 0.55 }, t + 0.3);
    tl.to('#rh .eco__b', { scaleX: 1, duration: 0.6 }, t + 0.55);
    tl.to('#rh .eco__label', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 0.2);
    tl.to('#rh .eco__sub', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 0.8);
    t += 1.6;
    tl.to({}, { duration: 0.01 }, t);
    pinReel(el, tl);
  }

  /* ------------------------------------------------------------------ CTA (native scroll) */

  function buildCTA() {
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tl.fromTo('.cta__line', { scaleY: 0 }, { scaleY: 1, duration: 0.8, ease: 'power2.inOut' })
      .fromTo('.cta__title .li', { yPercent: 112 }, { yPercent: 0, duration: 1.1, stagger: 0.12 }, 0.3)
      .fromTo(['.cta__sub', '.btn-pill'], { autoAlpha: 0, y: 12 * K }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12 }, 0.8);
    const st = ScrollTrigger.create({ trigger: '#cta', start: 'top 65%', onEnter: () => tl.play(), onLeaveBack: () => tl.reverse() });
    if (window.scrollY > st.start) tl.progress(1);
    markers.push({ key: 'cta', st, ch: '09 / Return to Pursuit', shot: 'No media', tr: 'Native scroll · apply' });
  }

  /* ------------------------------------------------------------------ review bar */

  function resolveMarkers() {
    markers.forEach((m) => {
      m.y = m.tl ? m.st.start + (m.tl.labels[m.key] / (m.tl.duration() || 1)) * (m.st.end - m.st.start) : m.st.start;
    });
    markers.sort((a, b) => a.y - b.y);
    let imm = false;
    markers.forEach((m) => {
      if (m.chrome === 'immerse') imm = true;
      if (m.chrome === 'return') imm = false;
      m.immersed = imm;
    });
    lastIdx = -1;
  }
  function currentIndex(y) {
    let i = 0;
    for (let j = 0; j < markers.length; j++) { if (markers[j].y <= y + 2) i = j; else break; }
    return i;
  }
  const rvCh = $('.rv__ch'), rvShot = $('.rv__shot'), rvTr = $('.rv__tr'), rvBar = $('.rv__progress b');
  function onScroll() {
    const y = window.scrollY;
    const max = ScrollTrigger.maxScroll(window) || 1;
    rvBar.style.transform = `scaleX(${Math.min(1, Math.max(0, y / max))})`;
    if (!markers.length) return;
    const i = currentIndex(y);
    if (i === lastIdx) return;
    lastIdx = i;
    const m = markers[i];
    rvCh.textContent = m.ch;
    rvShot.textContent = m.shot;
    rvTr.textContent = m.tr;
    body.classList.toggle('is-immersed', !!m.immersed);
  }
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  }, { passive: true });
  ScrollTrigger.addEventListener('refresh', () => { resolveMarkers(); onScroll(); });

  function jump(y, smooth) {
    y = Math.max(0, Math.round(y));
    if (lenis) lenis.scrollTo(y, smooth ? { duration: 1.2, force: true } : { immediate: true, force: true });
    else window.scrollTo({ top: y, behavior: smooth && !RM ? 'smooth' : 'auto' });
  }
  function step(d) {
    if (!markers.length) return;
    const i = currentIndex(window.scrollY + 4);
    const m = markers[Math.max(0, Math.min(markers.length - 1, i + d))];
    if (m) jump(m.y + 3, true);
  }
  function toggleLabels() {
    const off = body.classList.toggle('no-labels');
    $('#rv-labels').setAttribute('aria-pressed', String(!off));
  }

  /* ------------------------------------------------------------------ build */

  function getAnchor() {
    if (!markers.length) return null;
    const y = window.scrollY, i = currentIndex(y), m = markers[i], n = markers[i + 1];
    return { key: m.key, f: n ? Math.min(1, Math.max(0, (y - m.y) / Math.max(1, n.y - m.y))) : 0 };
  }
  function toAnchor(a) {
    const i = markers.findIndex((m) => m.key === a.key);
    if (i < 0) return;
    const m = markers[i], n = markers[i + 1];
    jump(n ? m.y + a.f * (n.y - m.y) : m.y);
  }

  function rebuild(anchor) {
    if (ctx) ctx.revert();
    cleanups.forEach((fn) => fn());
    cleanups = [];
    markers = [];
    pending = [];
    lastW = window.innerWidth;
    lastH = window.innerHeight;
    ctx = gsap.context(() => {
      buildA(); buildB(); buildC(); buildD(); buildE(); buildF(); buildG(); buildH(); buildCTA();
    });
    ScrollTrigger.refresh();
    if (lenis) lenis.resize();
    if (anchor) toAnchor(anchor);
    ScrollTrigger.update();
    lastIdx = -1;
    onScroll();
  }

  function intro() {
    if (RM || window.scrollY > 10) return;
    introTl = gsap.timeline({ delay: 0.3 });
    introTl
      .from('.site-head__in', { autoAlpha: 0, duration: 1.1, ease: 'none' }, 0.5)
      .from('.intro__in .chapter__rule', { scaleX: 0, duration: 1.2, ease: 'power3.inOut' }, 0)
      .from('.intro__in .chapter__num', { autoAlpha: 0, duration: 0.9, ease: 'none' }, 0.3)
      .from('.intro__in .chapter__name', { autoAlpha: 0, letterSpacing: '0.6em', duration: 1.3, ease: 'power2.out' }, 0.45)
      .from('.intro__in .li', { yPercent: 112, duration: 1.2, stagger: 0.14, ease: 'power3.out' }, 0.7)
      .from('.seam__draw', { scaleY: 0, duration: 1.0, ease: 'power2.inOut' }, 1.3)
      .from('.cue', { autoAlpha: 0, y: 8, duration: 0.8, ease: 'power2.out' }, 1.7);
  }

  /* ------------------------------------------------------------------ boot */

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  renderMedia();
  splitChars();
  makeGrain();
  runVideos();
  scrubV = $('video[data-scrub]');
  ['touchstart', 'pointerdown', 'wheel', 'keydown'].forEach((ev) => window.addEventListener(ev, unlockScrub, { once: true, passive: true }));

  if (!RM && !TOUCH && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  $('#rv-prev').addEventListener('click', () => step(-1));
  $('#rv-next').addEventListener('click', () => step(1));
  $('#rv-labels').addEventListener('click', toggleLabels);
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === '.' || k === 'n') step(1);
    else if (k === ',' || k === 'p') step(-1);
    else if (k === 'l') toggleLabels();
  });
  $('#apply').addEventListener('click', () => {
    const t = $('.btn-pill__txt');
    if (t.dataset.busy) return;
    const o = t.textContent;
    t.dataset.busy = '1';
    t.textContent = 'Previs · not linked';
    setTimeout(() => { t.textContent = o; delete t.dataset.busy; }, 1600);
  });
  $('#replay').addEventListener('click', () => {
    jump(0);
    ScrollTrigger.update();
    setTimeout(() => { if (introTl) introTl.restart(true); }, 60);
  });
  new IntersectionObserver((es) => body.classList.toggle('at-end', es[0].isIntersecting)).observe($('.foot'));

  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => {
      const dw = Math.abs(window.innerWidth - lastW);
      const dh = TOUCH ? 0 : Math.abs(window.innerHeight - lastH);
      if (dw > 30 || dh > 30) rebuild(getAnchor());
    }, 260);
  });

  window.ClubPrevis = {
    beats: () => markers.map((m) => ({ key: m.key, y: Math.round(m.y), ch: m.ch, shot: m.shot, tr: m.tr })),
    go: (key) => { const m = markers.find((x) => x.key === key); if (m) jump(m.y + 3); },
    jump,
  };

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1800))]).then(() => {
    body.classList.add('is-ready');
    rebuild(null);
    intro();
  });
})();
