/* ==========================================================================
   Club Scottsdale — footage previs (mobile-first)

   One master timeline holds the whole film. It is never scrubbed by scroll:
   a scroll, swipe or key press is one gesture, and one gesture plays the
   next sequence forward to its stop. Clips play once and hold their last
   frame. A deliberate reverse gesture rewinds to the previous stop.

     01 Arrival          13                              (plays on load)
     02 The collection   27 → 31 + cards A14, A09
     03 Inside the club  A02 → A05 + A12 split → A12
     04 Amenities        23 · A13 | A08 · A10 · A15
     05 People + access  P1 | 43 · 37 · 40
     06 The ecosystem    A16 | A03 | reel 1:36
     07 The point
     08 Return + CTA     then the page scrolls normally
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const body = document.body;

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const K = RM ? 0 : 1;
  const TOUCH = matchMedia('(hover: none), (pointer: coarse)').matches;

  const stage = $('#stage');
  const thread = $('#thread');
  const W = () => stage.clientWidth;
  const H = () => stage.clientHeight;
  const pct = (v) => v + '%';
  const win = (f) => ({ '--t': pct(f[0]), '--r': pct(f[1]), '--b': pct(f[2]), '--l': pct(f[3]) });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ------------------------------------------------------------------ media */

  // Source pixel sizes, so a crop window can be fitted exactly.
  function srcSize(id) {
    if (/^am/.test(id)) return [1080, 1814];
    if (id === 'p1') return [1320, 1526];
    if (id === 'v23') return [540, 720];
    return [720, 1280];
  }
  const isStill = (id) => /^(am|s|p)/.test(id);

  function renderMedia() {
    $$('.m[data-src]').forEach((el) => {
      const id = el.dataset.src;
      const inner = isStill(id)
        ? `<img class="fit" src="media/${id}.jpg" alt="" decoding="async">`
        : `<video class="fit" src="media/${id}.mp4" poster="media/${id}.jpg" muted playsinline preload="auto"></video>`;
      el.innerHTML = `<div class="f">${inner}</div><span class="tag">${el.dataset.shot}</span>`;
    });
  }

  // Cover the frame with the largest part of the crop window that matches the
  // frame's shape, centred on the focal point. Overlays outside the window never show.
  function fitMedia() {
    $$('.m[data-src]').forEach((el) => {
      const box = $('.f', el);
      const media = box.firstElementChild;
      const cw = box.offsetWidth, ch = box.offsetHeight;
      if (!cw || !ch) return;
      const [w, h] = srcSize(el.dataset.src);
      const c = (el.dataset.crop || '0 0 1 1').split(/\s+/).map(Number);
      const op = (el.dataset.op || '50% 50%').split(/\s+/).map((v) => parseFloat(v) / 100);
      const x0 = c[0] * w, y0 = c[1] * h, rw = (c[2] - c[0]) * w, rh = (c[3] - c[1]) * h;
      const a = cw / ch;
      let sw, sh;
      if (rw / rh > a) { sh = rh; sw = rh * a; } else { sw = rw; sh = rw / a; }
      const sx = clamp(op[0] * w - sw / 2, x0, x0 + rw - sw);
      const sy = clamp(op[1] * h - sh / 2, y0, y0 + rh - sh);
      const s = cw / sw;
      Object.assign(media.style, {
        width: w * s + 'px', height: h * s + 'px',
        left: -sx * s + 'px', top: -sy * s + 'px',
      });
    });
  }

  // Is this element actually visible on the canvas right now?
  function shown(el) {
    for (let e = el; e && e !== stage; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.02) return false;
    }
    return true;
  }
  const videos = () => $$('video', stage);

  function playFromStart(v) {
    try { v.currentTime = 0; } catch (e) { /* not loaded yet */ }
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }
  // After a stop: pause what is hidden; let what is visible carry on (never restart it).
  function settleVideos() {
    videos().forEach((v) => {
      if (!shown(v)) { if (!v.paused) v.pause(); }
      else if (v.paused && !v.ended && v.currentTime > 0) v.play().catch(() => {});
    });
  }
  // After a jump: visible clips start from the top, everything else rests.
  function restartVisible() {
    videos().forEach((v) => { if (shown(v)) playFromStart(v); else v.pause(); });
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

  /* ------------------------------------------------------------------ timeline scaffolding */

  let tl = null;          // master timeline
  let stops = [];
  let dir = 1;            // direction of the current move; clips only start going forward

  // A beat is one sequence that runs from the previous stop to this one. It starts
  // just after the stop, so resting on a stop never fires the next beat's first frame.
  function beat(len, info, build) {
    const t = tl.duration() + 0.02;
    build(t);
    tl.set({}, {}, t + len);
    stops.push(Object.assign({ time: t + len }, info));
  }
  const ft = (target, from, to, at) => tl.fromTo(target, from, Object.assign({ immediateRender: false }, to), at);
  const show = (el, at) => tl.set(el, { autoAlpha: 1 }, at);
  const hide = (el, at) => tl.set(el, { autoAlpha: 0 }, at);
  const clip = (sel, at) => tl.call(() => { if (dir > 0) { const v = $(sel + ' video'); if (v) playFromStart(v); } }, null, at);

  function catIn(b, t) {
    show(b, t);
    ft($$('.ch', b), { yPercent: 112 }, { yPercent: 0, duration: 0.5, stagger: 0.025, ease: 'power3.out' }, t);
    ft($$('.cnum, .cdesc > span', b), { autoAlpha: 0, y: 10 * K }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.07, ease: 'power3.out' }, t + 0.15);
  }
  function catOut(b, t) {
    tl.to($$('.ch', b), { yPercent: -112, duration: 0.3, stagger: 0.012, ease: 'power2.in' }, t);
    tl.to($$('.cnum, .cdesc > span', b), { autoAlpha: 0, duration: 0.2, ease: 'none' }, t);
    hide(b, t + 0.4);
  }
  function mark(items, i, t) {
    tl.to(items.filter((_, j) => j !== i), { opacity: 0.3, duration: 0.25, ease: 'none' }, t);
    tl.to(items[i], { opacity: 1, duration: 0.25, ease: 'none' }, t);
  }
  function slide(from, to, t) {
    if (RM) {
      ft(to, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'none' }, t);
      hide(from, t + 0.5);
      return;
    }
    ft(to, { autoAlpha: 1, yPercent: 100 }, { yPercent: 0, duration: 0.75, ease: 'power3.inOut' }, t);
    tl.to(from, { yPercent: -28, duration: 0.75, ease: 'power3.inOut' }, t);
    tl.set(from, { autoAlpha: 0, yPercent: 0 }, t + 0.76);
  }

  /* ------------------------------------------------------------------ the film */

  function build() {
    const sA = $('#sA'), sC = $('#sC'), sB = $('#sB'), sD = $('#sD'), sE = $('#sE'), sF = $('#sF'), sG = $('#sG'), sH = $('#sH'), sI = $('#sI');

    // resting states
    gsap.set([sC, sB, sD, sE, sF, sG, sH, sI], { autoAlpha: 0 });
    gsap.set(sA, { autoAlpha: 1 });
    gsap.set('#a13', Object.assign(win([0, 50, 0, 50]), { autoAlpha: 0 }));
    gsap.set('#a-seam', { scaleY: 0 });
    gsap.set('#sA .reveal .li', { yPercent: 112 });
    gsap.set(['#sA .kicker', '#a-scrim', '#sA .cue'], { autoAlpha: 0 });

    $('#c27').classList.add('mask-soft');
    gsap.set('#c27', { '--mp': '0%' });
    gsap.set(['#c31', '#c-dim', '#sC .ctitle > *'], { autoAlpha: 0 });
    const cards = $$('.card', sC);
    const off = (c) => H() / 2 + c.offsetHeight / 2 + 40;
    cards.forEach((c) => gsap.set(c, { y: off(c), scale: 0.8 }));
    gsap.set('#b05', win([0, 0, 99.9, 0]));
    gsap.set('#b12', win([99.9, 0, 0, 0]));
    gsap.set(['#b-div', '.b-pcap', '#b-cap', '#b-cap2'], { autoAlpha: 0 });

    gsap.set('#d23', { '--p': 0 });
    gsap.set(['#d13', '#d08', '#d10', '#d15', '#d-scrim', '#d-top', '#d-idx', '.dcat'], { autoAlpha: 0 });
    gsap.set($$('.ch', sD).concat($$('.ch', sF)), { yPercent: 112 });

    gsap.set('#sE .eline .li', { yPercent: 112 });
    gsap.set(['#ep1', '#ep1-scrim', '#ep1-cap', '.ecap'], { autoAlpha: 0 });
    ['#e43', '#e37', '#e40'].forEach((s) => gsap.set(s, Object.assign(win([99.9, 0, 0, 0]), { autoAlpha: 0 })));

    gsap.set('#ff', Object.assign(win([100, 0, 0, 0]), { autoAlpha: 1 }));
    gsap.set(['#f03', '#f36', '#f-top', '#f-idx', '.fcat'], { autoAlpha: 0 });
    gsap.set($$('.idx li'), { opacity: 0.3 });
    gsap.set(thread, { autoAlpha: 0, scaleX: 1, rotation: 0, x: 0, y: 0 });

    gsap.set($$('.w', sG), { opacity: 0.12 });
    gsap.set(['#sG .point', '#sG .coda'], { autoAlpha: 0 });

    gsap.set('#sH .phead > *', { autoAlpha: 0 });
    gsap.set($$('.node', sH), { scale: 0 });
    gsap.set($$('.phase__top, .phase__desc', sH), { autoAlpha: 0 });
    gsap.set('#sH .prail', { autoAlpha: 0 });
    gsap.set(['#sH .eco__t', '#sH .eco__b'], { scaleX: 0 });
    gsap.set(['#sH .eco__l', '#sH .eco__r'], { scaleY: 0 });
    gsap.set(['#sH .eco__label', '#sH .eco__sub'], { autoAlpha: 0 });
    gsap.set('.cta__line', { scaleY: 0 });
    gsap.set('.cta__title .li', { yPercent: 112 });
    gsap.set(['.cta__sub', '.btn-pill'], { autoAlpha: 0 });

    tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
    stops = [];

    /* 01 ARRIVAL: the car is already moving when the seam opens. */
    beat(2.7, { key: 'arrival', ch: '01 / Arrival', shot: 'Shot 13 · handle masked', tr: 'I — Seam opens on the car · title builds over it' }, (t) => {
      clip('#a13', t);
      tl.to('#a-seam', { scaleY: 1, duration: 0.35, ease: 'power2.inOut' }, t);
      show('#a13', t + 0.25);
      tl.to('#a13', { '--l': '43%', '--r': '43%', duration: 0.35, ease: 'power2.out' }, t + 0.25);
      tl.to('#a-seam', { autoAlpha: 0, duration: 0.2, ease: 'none' }, t + 0.45);
      tl.to('#a13', Object.assign(win([0, 0, 0, 0]), { duration: 0.8, ease: 'power3.inOut' }), t + 0.6);
      ft('#a13 .f', { scale: 1 + 0.18 * K }, { scale: 1, duration: 1.6, ease: 'power2.out' }, t + 0.25);
      tl.to('#a-scrim', { autoAlpha: 1, duration: 0.5, ease: 'none' }, t + 1.1);
      tl.to('#sA .kicker', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 1.25);
      tl.to('#sA .reveal .li', { yPercent: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' }, t + 1.35);
      tl.to('#sA .cue', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 2.2);
    });

    /* 02 THE COLLECTION */
    beat(1.8, { key: 'c-27', ch: '02 / The collection', shot: 'Shot 27 · cropped', tr: 'B — Soft wipe up to the lot from above · clip plays once', chrome: 'immerse' }, (t) => {
      tl.to('#sA .cue', { autoAlpha: 0, duration: 0.2, ease: 'none' }, t);
      tl.to('#sA .reveal', { autoAlpha: 0, y: -24 * K, duration: 0.45, ease: 'power1.in' }, t);
      show(sC, t);
      clip('#c27', t);
      tl.to('#c27', { '--mp': '100%', duration: 1.1, ease: 'sine.inOut' }, t);
      ft('#c27 .f', { scale: 1 + 0.1 * K }, { scale: 1, duration: 1.3, ease: 'power2.out' }, t);
      tl.to('#a13 .f', { scale: 1 + 0.06 * K, duration: 1.1, ease: 'none' }, t);
      hide(sA, t + 1.15);
      tl.to('#sC .ctitle > *', { autoAlpha: 1, duration: 0.5, stagger: 0.1, ease: 'none' }, t + 0.8);
    });

    beat(3.9, { key: 'c-31', ch: '02 / The collection', shot: 'Shot 31 · cards A14, A09', tr: 'Crossfade → moving background · V — two cards pass in one run' }, (t) => {
      show('#c31', t);
      clip('#c31', t);
      ft('#c31', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, ease: 'none' }, t);
      ft('#c31 .f', { scale: 1 + 0.12 * K }, { scale: 1, duration: 1.3, ease: 'power2.out' }, t);
      tl.to('#c-dim', { autoAlpha: 1, duration: 0.7, ease: 'none' }, t + 0.3);
      tl.to('#sC .ctitle', { autoAlpha: 0.22, duration: 0.5, ease: 'none' }, t + 0.5);
      hide('#c27', t + 0.75);
      cards.forEach((c, i) => {
        const s = t + 0.6 + i * 1.0;
        ft(c, { y: () => off(c) }, { y: () => -off(c), duration: 2.2, ease: 'none' }, s);
        ft(c, { scale: 0.8 }, { scale: 1, duration: 1.1, ease: 'power1.out' }, s);
        tl.to(c, { scale: 0.8, duration: 1.1, ease: 'power1.in' }, s + 1.1);
        ft($('.f', c), { yPercent: -6 * K }, { yPercent: 6 * K, duration: 2.2, ease: 'none' }, s);
        ft($('.card__cap', c), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'none' }, s + 0.7);
        tl.to($('.card__cap', c), { autoAlpha: 0, duration: 0.25, ease: 'none' }, s + 1.35);
      });
      tl.to('#sC .ctitle', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 3.4);
    });

    /* 03 INSIDE THE CLUB */
    beat(1.4, { key: 'b-lead', ch: '03 / Inside the club', shot: 'Amenities 02 · still', tr: 'P — Page turn onto the hex hall' }, (t) => {
      show(sB, t);
      ft(sB, { yPercent: 100 * K }, { yPercent: 0, duration: 1.0, ease: 'power3.inOut' }, t);
      tl.to(sC, { scale: 1 - 0.06 * K, opacity: 0.3, duration: 1.0, ease: 'none' }, t);
      ft('#b02 .f', { scale: 1 + 0.1 * K }, { scale: 1, duration: 1.4, ease: 'power2.out' }, t);
      hide(sC, t + 1.0);
      tl.to('#b-cap', { autoAlpha: 1, duration: 0.3, ease: 'none' }, t + 0.8);
    });

    beat(3.2, { key: 'b-split', ch: '03 / Inside the club', shot: 'Amenities 05 + 12 → 12', tr: 'D — Vertical split, then the lounge takes over' }, (t) => {
      tl.to('#b05', { '--b': '50%', duration: 0.9, ease: 'power3.inOut' }, t);
      ft('#b05 .f', { yPercent: -8 * K }, { yPercent: 0, duration: 0.9, ease: 'power3.inOut' }, t);
      tl.to('#b12', { '--t': '50%', duration: 0.9, ease: 'power3.inOut' }, t + 0.08);
      ft('#b12 .f', { yPercent: 8 * K }, { yPercent: 0, duration: 0.9, ease: 'power3.inOut' }, t + 0.08);
      tl.to('#b02 .f', { scale: 1 - 0.06 * K, duration: 0.9 }, t);
      tl.to('#b-cap', { autoAlpha: 0, duration: 0.25, ease: 'none' }, t);
      tl.to(['#b-div', '.b-pcap'], { autoAlpha: 1, duration: 0.3, ease: 'none' }, t + 0.75);
      const s = t + 1.9;
      tl.to('#b12', { '--t': '0%', duration: 1.0, ease: 'power3.inOut' }, s);
      tl.to('#b05 .f', { yPercent: -8 * K, duration: 1.0, ease: 'power3.inOut' }, s);
      tl.to(['#b-div', '.b-pcap'], { autoAlpha: 0, duration: 0.25, ease: 'none' }, s);
      ft('#b12 img', { scale: 1 + 0.08 * K }, { scale: 1, duration: 1.3, ease: 'power2.out' }, s);
      tl.to('#b-cap2', { autoAlpha: 1, duration: 0.3, ease: 'none' }, s + 0.8);
    });

    /* 04 AMENITIES: one gesture plays a run of cuts, each with its word. */
    const dItems = $$('#d-idx li'), dCats = $$('.dcat');
    const dShots = ['#d23', '#d13', '#d08', '#d10', '#d15'];
    const cut = (i, t) => {
      show(dShots[i], t);
      if (i > 0) hide(dShots[i - 1], t);
      ft(dShots[i] + ' .f', { scale: 1 + 0.07 * K }, { scale: 1, duration: 1.15, ease: 'power1.out' }, t);
      if (i > 0) catOut(dCats[i - 1], t - 0.15);
      catIn(dCats[i], t + 0.05);
      mark(dItems, i, t);
    };
    beat(2.9, { key: 'd-1', ch: '04 / Amenities', shot: 'Shot 23 · Amenities 13', tr: 'B — Diagonal wipe · Race, Play as one run' }, (t) => {
      show(sD, t);
      clip('#d23', t);
      tl.to('#d23', { '--p': 1, duration: 0.7, ease: 'expo.inOut' }, t);
      ft('#d23 .f', { scale: 1 + 0.2 * K }, { scale: 1, duration: 1.0, ease: 'expo.out' }, t + 0.05);
      hide(sB, t + 0.7);
      tl.to(['#d-scrim', '#d-top', '#d-idx'], { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 0.45);
      catIn(dCats[0], t + 0.55);
      mark(dItems, 0, t + 0.55);
      cut(1, t + 1.65);
    });
    beat(3.45, { key: 'd-2', ch: '04 / Amenities', shot: 'Amenities 08 · 10 · 15', tr: 'Rapid cuts · Groom, Unwind, Host as one run' }, (t) => {
      cut(2, t + 0.1);
      cut(3, t + 1.2);
      cut(4, t + 2.3);
    });

    /* 05 PEOPLE + ACCESS */
    beat(2.9, { key: 'e-p1', ch: '05 / People + access', shot: 'P1 · still', tr: 'F — Type on black → C — pinned still' }, (t) => {
      show(sE, t);
      ft(sE, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'none' }, t);
      hide(sD, t + 0.45);
      tl.to('#sE .eline .li', { yPercent: 0, stagger: 0.12, duration: 0.6, ease: 'power3.out' }, t + 0.3);
      tl.to('#sE .eline', { autoAlpha: 0, y: -20 * K, duration: 0.35, ease: 'power1.in' }, t + 1.45);
      tl.to(['#ep1', '#ep1-scrim'], { autoAlpha: 1, duration: 0.5, ease: 'none' }, t + 1.55);
      ft('#ep1 img', { scale: 1 + 0.1 * K }, { scale: 1, duration: 1.35, ease: 'power1.out' }, t + 1.55);
      tl.to('#ep1-cap', { autoAlpha: 1, duration: 0.3, ease: 'none' }, t + 2.0);
    });

    beat(3.6, { key: 'e-seq', ch: '05 / People + access', shot: 'Shots 43 · 37 · 40 (cropped)', tr: 'Portrait page wipes · one flowing run' }, (t) => {
      let prevCap = '#ep1-cap';
      ['43', '37', '40'].forEach((n, i) => {
        const s = t + i * 1.2;
        const id = '#e' + n;
        show(id, s);
        clip(id, s);
        tl.to(id, { '--t': '0%', duration: 0.55, ease: 'power3.inOut' }, s);
        ft(id + ' .f', { yPercent: 8 * K }, { yPercent: 0, duration: 0.55, ease: 'power3.inOut' }, s);
        tl.to(prevCap, { autoAlpha: 0, duration: 0.2, ease: 'none' }, s);
        tl.to(id + '-cap', { autoAlpha: 1, duration: 0.3, ease: 'none' }, s + 0.4);
        prevCap = id + '-cap';
      });
    });

    /* 06 THE ECOSYSTEM: three categories in one shared frame */
    const fItems = $$('#f-idx li'), fCats = $$('.fcat');
    const C = [[12, 6, 40, 6], [12, 12, 40, 12], [12, 6, 40, 6]];
    beat(2.1, { key: 'f-1', ch: '06 / The ecosystem', shot: 'Amenities 16 · Workspace', tr: "Rises full screen → A′ shrinks to a shared frame" }, (t) => {
      show(sF, t);
      tl.to('#ff', { '--t': '0%', duration: 0.65, ease: 'power3.inOut' }, t);
      hide(sE, t + 0.65);
      tl.to('#f-top', { autoAlpha: 1, duration: 0.3, ease: 'none' }, t + 0.3);
      tl.to('#ff', Object.assign(win(C[0]), { duration: 0.9, ease: 'power3.inOut' }), t + 0.75);
      tl.to('#f-idx', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 1.2);
      catIn(fCats[0], t + 1.25);
      mark(fItems, 0, t + 1.25);
    });
    [['#f16', '#f03', 'Amenities 03 · Media'], ['#f03', '#f36', 'Reel 1:36 · Mentorship']].forEach(([from, to, shot], k) => {
      const i = k + 1;
      beat(1.45, { key: 'f-' + (i + 1), ch: '06 / The ecosystem', shot, tr: 'Category morph · slides within the frame' }, (t) => {
        catOut(fCats[i - 1], t);
        tl.to('#ff', Object.assign(win(C[i]), { duration: 0.75, ease: 'power3.inOut' }), t);
        slide($(from), $(to), t + 0.05);
        clip(to, t + 0.05);
        catIn(fCats[i], t + 0.35);
        mark(fItems, i, t + 0.35);
      });
    });

    /* 07 THE POINT: one read, both lines */
    const wa = $$('.pa .w', sG), wb = $$('.pb .w', sG);
    beat(3.3, { key: 'g-point', ch: '07 / The point', shot: 'No media', tr: 'I — Frame closes to a line · both lines in one read' }, (t) => {
      catOut(fCats[2], t);
      tl.to(['#f-idx', '#f-top'], { autoAlpha: 0, duration: 0.3, ease: 'none' }, t);
      tl.to('#ff', Object.assign(win([47, 0, 47, 0]), { duration: 0.5, ease: 'power2.inOut' }), t + 0.1);
      tl.to('#ff', { '--t': '49.9%', '--b': '49.9%', duration: 0.35, ease: 'power2.in' }, t + 0.6);
      ft(thread, { autoAlpha: 0 }, { autoAlpha: 0.8, duration: 0.1, ease: 'none' }, t + 0.9);
      hide(sF, t + 1.0);
      show(sG, t + 1.0);
      tl.to(thread, { scaleX: () => 64 / W(), autoAlpha: 0.5, duration: 0.6 }, t + 1.0);
      tl.to('#sG .point', { autoAlpha: 1, duration: 0.2, ease: 'none' }, t + 1.2);
      tl.to(wa, { opacity: 1, duration: 0.3, stagger: 0.06, ease: 'none' }, t + 1.3);
      tl.to(wb, { opacity: 1, duration: 0.3, stagger: 0.06, ease: 'none' }, t + 1.95);
      tl.to('#sG .coda', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 2.8);
    });

    /* 08 RETURN TO PURSUIT */
    const track = $('.ptrack', sH);
    const phases = $$('.phase', sH);
    const X = () => track.offsetLeft + 0.5 - W() / 2;
    const Y = () => track.offsetTop + track.offsetHeight / 2 - H() / 2;
    beat(2.8, { key: 'h-path', ch: '08 / Return to Pursuit', shot: 'No media', tr: 'The line turns vertical → Sell / Build / Own', chrome: 'return' }, (t) => {
      tl.to('#sG .point', { autoAlpha: 0, duration: 0.35, ease: 'power1.in' }, t);
      hide(sG, t + 0.35);
      show(sH, t);
      tl.to(thread, { rotation: 90, duration: 0.55 }, t + 0.15);
      tl.to(thread, { scaleX: () => track.offsetHeight / W(), x: X, y: Y, autoAlpha: 0.8, duration: 0.9 }, t + 0.7);
      tl.set('#sH .prail', { autoAlpha: 1 }, t + 1.6);
      hide(thread, t + 1.6);
      ft('#sH .phead > *', { autoAlpha: 0, y: 14 * K }, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.5, ease: 'power3.out' }, t + 0.45);
      phases.forEach((p, i) => {
        tl.to($('.node', p), { scale: 1, duration: 0.3, ease: 'power2.out' }, t + 1.55 + i * 0.22);
        ft([$('.phase__top', p), $('.phase__desc', p)], { autoAlpha: 0, y: 10 * K }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.4, ease: 'power3.out' }, t + 1.6 + i * 0.22);
      });
      tl.to('#sH .eco__t', { scaleX: 1, duration: 0.5 }, t + 1.75);
      tl.to(['#sH .eco__l', '#sH .eco__r'], { scaleY: 1, duration: 0.45 }, t + 2.0);
      tl.to('#sH .eco__b', { scaleX: 1, duration: 0.5 }, t + 2.2);
      tl.to('#sH .eco__label', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 1.9);
      tl.to('#sH .eco__sub', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 2.35);
    });

    beat(1.9, { key: 'cta', ch: '08 / Return to Pursuit', shot: 'No media', tr: 'Apply · the next scroll hands back to the page', chrome: 'return' }, (t) => {
      tl.to(sH, { autoAlpha: 0, duration: 0.4, ease: 'power1.in' }, t);
      show(sI, t + 0.2);
      tl.to('.cta__line', { scaleY: 1, duration: 0.6, ease: 'power2.inOut' }, t + 0.3);
      tl.to('.cta__title .li', { yPercent: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' }, t + 0.55);
      ft(['.cta__sub', '.btn-pill'], { autoAlpha: 0, y: 12 * K }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out' }, t + 1.05);
    });

    let imm = false;
    stops.forEach((s) => {
      if (s.chrome === 'immerse') imm = true;
      if (s.chrome === 'return') imm = false;
      s.immersed = imm;
    });
    if (RM) tl.timeScale(1.4);
  }

  /* ------------------------------------------------------------------ stepping */

  let ctx = null;
  let cur = -1;           // the stop we are at, or heading to
  let mover = null;       // the tween that plays the master timeline
  let free = false;       // film finished; the page scrolls normally

  const rvCh = $('.rv__ch'), rvShot = $('.rv__shot'), rvTr = $('.rv__tr'), rvBar = $('.rv__progress b');
  function updateBar() {
    const s = stops[cur];
    if (!s) return;
    rvCh.textContent = s.ch;
    rvShot.textContent = s.shot;
    rvTr.textContent = s.tr;
    rvBar.style.transform = `scaleX(${stops.length > 1 ? cur / (stops.length - 1) : 1})`;
    body.classList.toggle('is-immersed', !!s.immersed);
  }

  function toStop(i) {
    i = clamp(i, 0, stops.length - 1);
    const target = stops[i].time;
    const now = tl.time();
    if (mover) mover.kill();
    cur = i;
    updateBar();
    if (Math.abs(target - now) < 0.001) { mover = null; settleVideos(); return; }
    dir = target > now ? 1 : -1;
    // Forward plays at authored speed; a rewind is quick but still continuous.
    const dist = Math.abs(target - now) / tl.timeScale();
    const duration = dir > 0 ? dist : Math.min(0.85, Math.max(0.35, dist / 2.5));
    mover = gsap.to(tl, {
      time: target, duration, ease: dir > 0 ? 'none' : 'power1.inOut',
      onComplete: () => { mover = null; settleVideos(); },
    });
  }
  const moving = () => !!mover;

  function go(d) {
    if (free || !stops.length) return;
    if (moving()) {
      if (d === dir) mover.timeScale(3);        // same way again: hurry this sequence along
      else toStop(cur + d);                      // the other way: turn around
      return;
    }
    if (d > 0 && cur >= stops.length - 1) { release(); return; }
    if (d < 0 && cur <= 0) return;
    toStop(cur + d);
  }

  function jumpTo(i) {
    i = clamp(i, 0, stops.length - 1);
    if (mover) mover.kill();
    mover = null;
    cur = i;
    dir = 1;
    tl.time(stops[i].time, true);
    updateBar();
    restartVisible();
  }

  function lock() {
    free = false;
    root.classList.add('locked');
    body.classList.remove('is-free');
    window.scrollTo(0, 0);
  }
  function release() {
    free = true;
    root.classList.remove('locked');
    body.classList.add('is-free');
    window.scrollTo({ top: $('.foot').offsetTop, behavior: RM ? 'auto' : 'smooth' });
  }

  /* ------------------------------------------------------------------ input
     A gesture is a burst of wheel events with no gap longer than 200 ms, or one
     swipe. Each gesture moves one stop, however long the trackpad keeps
     coasting. Going back needs a firmer push than going forward. */

  let lastWheel = 0, wheelAcc = 0, wheelUsed = false;
  window.addEventListener('wheel', (e) => {
    const now = performance.now();
    const fresh = now - lastWheel > 200;
    lastWheel = now;
    if (free) {
      if (window.scrollY <= 0 && e.deltaY < 0) { e.preventDefault(); lock(); wheelUsed = true; }
      return;
    }
    e.preventDefault();
    if (fresh) { wheelAcc = 0; wheelUsed = false; }
    if (wheelUsed) return;
    wheelAcc += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (wheelAcc >= 24) { wheelUsed = true; go(1); }
    else if (wheelAcc <= -60) { wheelUsed = true; go(-1); }
  }, { passive: false });

  let t0 = null;
  window.addEventListener('touchstart', (e) => {
    t0 = e.touches.length === 1 && !e.target.closest('button') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => { if (!free) e.preventDefault(); }, { passive: false });
  window.addEventListener('touchend', (e) => {
    if (!t0) return;
    const p = e.changedTouches[0];
    const dy = t0.y - p.clientY, dx = t0.x - p.clientX;
    t0 = null;
    if (Math.abs(dy) < Math.abs(dx)) return;
    if (free) { if (window.scrollY <= 0 && dy < -60) lock(); return; }
    if (dy >= 40) go(1);
    else if (dy <= -60) go(-1);
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    const fwd = ['ArrowDown', 'PageDown', ' ', '.', 'n'].includes(k);
    const back = ['ArrowUp', 'PageUp', ',', 'p'].includes(k);
    if (k === 'l' || k === 'L') { toggleLabels(); return; }
    if (free) { if (back && window.scrollY <= 0) { e.preventDefault(); lock(); } return; }
    if (fwd || back) {
      if (k === ' ' && e.target.closest('button')) return;
      e.preventDefault();
      go(fwd ? 1 : -1);
    }
  });

  function toggleLabels() {
    const off = body.classList.toggle('no-labels');
    $('#rv-labels').setAttribute('aria-pressed', String(!off));
  }
  $('#rv-prev').addEventListener('click', () => { if (free) lock(); go(-1); });
  $('#rv-next').addEventListener('click', () => go(1));
  $('#rv-labels').addEventListener('click', toggleLabels);
  $('#apply').addEventListener('click', () => {
    const t = $('.btn-pill__txt');
    if (t.dataset.busy) return;
    const o = t.textContent;
    t.dataset.busy = '1';
    t.textContent = 'Previs · not linked';
    setTimeout(() => { t.textContent = o; delete t.dataset.busy; }, 1600);
  });
  $('#replay').addEventListener('click', () => {
    lock();
    if (mover) mover.kill();
    tl.time(0, true);
    videos().forEach((v) => { v.pause(); try { v.currentTime = 0; } catch (e) { /* ignore */ } });
    cur = -1;
    toStop(0);
  });

  /* ------------------------------------------------------------------ build + resize */

  function rebuild() {
    const at = cur;
    if (mover) mover.kill();
    mover = null;
    if (ctx) ctx.revert();
    $('#c27').classList.remove('mask-soft');
    fitMedia();
    ctx = gsap.context(build);
    if (at >= 0) { cur = at; tl.time(stops[at].time, true); updateBar(); settleVideos(); }
  }

  let lastW = window.innerWidth, lastH = window.innerHeight, rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => {
      const dw = Math.abs(window.innerWidth - lastW);
      const dh = TOUCH ? 0 : Math.abs(window.innerHeight - lastH);
      if (dw > 30 || dh > 30) { lastW = window.innerWidth; lastH = window.innerHeight; rebuild(); }
      else fitMedia();
    }, 220);
  });

  window.ClubPrevis = {
    stops: () => stops.map((s, i) => ({ i, key: s.key, time: +s.time.toFixed(2), ch: s.ch, shot: s.shot, tr: s.tr })),
    go: (key) => { const i = stops.findIndex((s) => s.key === key); if (i >= 0) jumpTo(i); },
    step: go,
    state: () => ({ cur, time: tl ? +tl.time().toFixed(3) : 0, moving: moving(), free }),
    peek: (t) => { if (mover) mover.kill(); mover = null; tl.time(t, true); },
  };

  /* ------------------------------------------------------------------ boot */

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  renderMedia();
  splitChars();
  makeGrain();

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
    rebuild();
    toStop(0);
  });
})();
