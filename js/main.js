/* ==========================================================================
   Club Scottsdale — scroll film
   Structure
     Reel 1 (pinned)   01 Enter · 02 Reveal · 03 first wipe
     Reel 2 (pinned)   03 split → single · pinned overheard · black cut
     Reel 3 (native)   03 stacked editorial frames
     Reel 4 (pinned)   03 horizontal → zoom · 04 ecosystem · 05 the point · 06 path
     CTA    (native)   07 Your Pursuit starts here
   Every pinned reel is one GSAP timeline scrubbed by ScrollTrigger.
   Timeline "units" map to viewport heights of scroll: 1 unit = mode.len × 100vh.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const body = document.body;

  if (!window.gsap || !window.ScrollTrigger) {
    body.classList.add('is-ready');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const query = new URLSearchParams(location.search);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || query.get('rm') === '1';
  const K = RM ? 0 : 1; // multiplies every translate / scale offset
  const TOUCH = matchMedia('(hover: none), (pointer: coarse)').matches;
  body.classList.toggle('rm', RM);
  body.classList.toggle('touch', TOUCH);

  /* ------------------------------------------------------------------ modes */

  const MODES = {
    cinematic: {
      label: 'Cinematic', len: 0.9, scrub: 1.1, lerp: 0.075,
      ease: 'sine.inOut', out: 'power2.out', zoomEase: 'power2.inOut', hEase: 'sine.inOut',
      inner: 1.16, slit: 2.4, titleScale: 1.04,
      wipe: 'soft', cut: 'fade', catSwap: 'fade',
      hold: 1.0, catMorph: 1.0, catHold: 1.1, letter: 0.02, hSpeed: 1.2,
      push: 0.06, parallax: 0.6, stackSpeed: 0.8, zoomFadeOthers: true, cta: 0.85,
    },
    editorial: {
      label: 'Editorial', len: 0.78, scrub: 0.7, lerp: 0.1,
      ease: 'power3.inOut', out: 'power3.out', zoomEase: 'power3.inOut', hEase: 'none',
      inner: 1.06, slit: 1.4, titleScale: 1,
      wipe: 'page', cut: 'cut', catSwap: 'slide',
      hold: 0.8, catMorph: 0.9, catHold: 0.9, letter: 0.012, hSpeed: 1.0,
      push: 0.02, parallax: 1, stackSpeed: 1, zoomFadeOthers: true, cta: 1,
    },
    aggressive: {
      label: 'Aggressive', len: 0.55, scrub: 0.3, lerp: 0.14,
      ease: 'expo.inOut', out: 'expo.out', zoomEase: 'expo.inOut', hEase: 'power1.in',
      inner: 1.45, slit: 0.7, titleScale: 1.14,
      wipe: 'diagonal', cut: 'hard', catSwap: 'cut',
      hold: 0.55, catMorph: 0.7, catHold: 0.7, letter: 0.035, hSpeed: 0.8,
      push: 0.12, parallax: 1.8, stackSpeed: 2.2, zoomFadeOthers: false, cta: 1.6,
    },
  };
  const MODE_KEYS = Object.keys(MODES);

  /* ------------------------------------------------------------------ compositions
     Window insets are [top, right, bottom, left] in % of the stage. */

  const FR1 = { // Reveal frame
    cinematic: { landscape: [17, 25, 17, 25], portrait: [18, 9, 26, 9] },
    editorial: { landscape: [13, 7, 19, 50], portrait: [12, 7, 44, 20] },
    aggressive: { landscape: [37, 41, 37, 41], portrait: [36, 28, 40, 28] },
  };

  const SPLIT = {
    cinematic: {
      landscape: { a: [0, 50, 0, 0], b: [0, 0, 0, 50], divider: true },
      portrait: { a: [0, 0, 50, 0], b: [50, 0, 0, 0], divider: true },
    },
    editorial: {
      landscape: { a: [20, 55, 13, 7], b: [11, 7, 26, 49] },
      portrait: { a: [12, 26, 54, 7], b: [51, 7, 13, 30] },
    },
    aggressive: {
      landscape: { a: [0, 50, 0, 0], b: [0, 0, 0, 50], divider: true },
      portrait: { a: [0, 0, 50, 0], b: [50, 0, 0, 0], divider: true },
    },
  };

  // Stacked frames: top (vh from section top), left (vw), width (vw), aspect ratio, speed, z
  const STACK = {
    cinematic: {
      landscape: { h: 250, f: [
        { top: 40, left: 4, w: 32, ar: '4 / 5', sp: 0.12, z: 3 },
        { top: 86, left: 30, w: 42, ar: '16 / 10', sp: -0.06, z: 1 },
        { top: 150, left: 62, w: 33, ar: '4 / 5', sp: 0.16, z: 1 },
      ] },
      portrait: { h: 240, f: [
        { top: 32, left: 6, w: 74, ar: '4 / 5', sp: 0.08, z: 3 },
        { top: 96, left: 28, w: 66, ar: '3 / 4', sp: -0.06, z: 1 },
        { top: 156, left: 6, w: 88, ar: '16 / 10', sp: 0.12, z: 1 },
      ] },
    },
    editorial: {
      landscape: { h: 270, f: [
        { top: 30, left: 44, w: 24, ar: '3 / 4', sp: 0.1, z: 3 },
        { top: 72, left: 72, w: 22, ar: '4 / 5', sp: -0.12, z: 1 },
        { top: 146, left: 30, w: 38, ar: '16 / 10', sp: 0.18, z: 1 },
      ] },
      portrait: { h: 250, f: [
        { top: 30, left: 38, w: 54, ar: '3 / 4', sp: 0.08, z: 3 },
        { top: 96, left: 8, w: 50, ar: '4 / 5', sp: -0.08, z: 1 },
        { top: 158, left: 20, w: 72, ar: '16 / 10', sp: 0.14, z: 1 },
      ] },
    },
    aggressive: {
      landscape: { h: 230, f: [
        { top: 22, left: 2, w: 54, ar: '16 / 10', sp: 0.2, z: 3, grow: true },
        { top: 70, left: 46, w: 46, ar: '4 / 5', sp: -0.16, z: 1 },
        { top: 126, left: 8, w: 62, ar: '16 / 9', sp: 0.24, z: 1, grow: true },
      ] },
      portrait: { h: 220, f: [
        { top: 26, left: 0, w: 92, ar: '4 / 5', sp: 0.14, z: 3, grow: true },
        { top: 88, left: 20, w: 80, ar: '3 / 4', sp: -0.12, z: 1 },
        { top: 140, left: 4, w: 96, ar: '16 / 10', sp: 0.18, z: 1, grow: true },
      ] },
    },
  };

  const ZOOM = { // Size of the frame the camera travels into (vw × vh)
    cinematic: { landscape: { w: 64, h: 72 }, portrait: { w: 84, h: 54 } },
    editorial: { landscape: { w: 40, h: 54 }, portrait: { w: 72, h: 42 } },
    aggressive: { landscape: { w: 24, h: 34 }, portrait: { w: 54, h: 30 } },
  };

  // Text anchors for the category blocks
  const P = {
    bl: (b = '14vh') => ({ pos: { left: 'var(--gut)', bottom: `calc(${b} + var(--vb))` } }),
    br: (b = '14vh') => ({ pos: { right: 'var(--gut)', bottom: `calc(${b} + var(--vb))` }, cls: 'cat--right' }),
    at: (top, left) => ({ pos: { top, left } }),
    center: () => ({ pos: { left: '0', right: '0', top: '0', bottom: '0' }, cls: 'cat--center' }),
    bottomC: (b = '7vh') => ({ pos: { left: '0', right: '0', bottom: `calc(${b} + var(--vb))` }, cls: 'cat--centerx' }),
    spread: (t = '11vh', b = '10vh') => ({ pos: { left: '0', right: '0', top: t, bottom: `calc(${b} + var(--vb))` }, cls: 'cat--spread' }),
  };

  const COMPS = {
    cinematic: {
      landscape: [
        { f: [0, 0, 0, 42], x: P.bl() },
        { f: [0, 42, 0, 0], x: P.br() },
        { f: [0, 0, 0, 0], x: P.center() },
        { f: [0, 0, 0, 0], x: P.bl() },
        { f: [25, 0, 25, 0], x: P.spread('9vh', '8vh') },
      ],
      portrait: [
        { f: [0, 0, 44, 0], x: P.bl('9vh') },
        { f: [0, 0, 44, 0], x: P.br('9vh') },
        { f: [0, 0, 0, 0], x: P.center() },
        { f: [0, 0, 0, 0], x: P.bl('9vh') },
        { f: [32, 0, 36, 0], x: P.spread('13vh', '9vh') },
      ],
    },
    editorial: {
      landscape: [
        { f: [15, 6, 15, 47], x: P.bl('15vh') },
        { f: [22, 54, 12, 7], x: P.at('24vh', '52vw') },
        { f: [0, 0, 0, 0], x: P.center() },
        { f: [15, 23, 30, 23], x: P.bottomC('7vh') },
        { f: [37, 0, 37, 0], x: P.spread('12vh', '11vh') },
      ],
      portrait: [
        { f: [15, 6, 46, 18], x: P.bl('9vh') },
        { f: [15, 22, 46, 6], x: P.br('9vh') },
        { f: [0, 0, 0, 0], x: P.center() },
        { f: [19, 12, 44, 12], x: P.bl('9vh') },
        { f: [34, 0, 38, 0], x: P.spread('14vh', '9vh') },
      ],
    },
    aggressive: {
      landscape: [
        { f: [0, 0, 0, 0], x: P.center() },
        { f: [18, 30, 18, 30], x: P.center() },
        { f: [0, 0, 0, 0], x: P.center() },
        { f: [0, 56, 0, 0], x: P.br('16vh') },
        { f: [42, 0, 42, 0], x: P.spread('14vh', '14vh') },
      ],
      portrait: [
        { f: [0, 0, 0, 0], x: P.center() },
        { f: [22, 10, 30, 10], x: P.center() },
        { f: [0, 0, 0, 0], x: P.center() },
        { f: [0, 0, 50, 0], x: P.bl('10vh') },
        { f: [42, 0, 42, 0], x: P.spread('16vh', '12vh') },
      ],
    },
  };

  /* ------------------------------------------------------------------ state */

  let mode = initialMode();
  let M = MODES[mode];
  let layout = getLayout();
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  let ctx = null;
  let cleanups = [];
  let markers = [];
  let pending = [];
  let lastIdx = -1;
  let lenis = null;
  let introTl = null;

  function initialMode() {
    const h = location.hash.slice(1).toLowerCase();
    if (MODE_KEYS.includes(h)) return h;
    try {
      const s = localStorage.getItem('cs-mode');
      if (MODE_KEYS.includes(s)) return s;
    } catch (e) { /* storage unavailable */ }
    return 'cinematic';
  }

  function getLayout() {
    const w = window.innerWidth, h = window.innerHeight;
    return (w < 700 || w / h < 0.9) ? 'portrait' : 'landscape';
  }

  /* ------------------------------------------------------------------ helpers */

  const pct = (v) => v + '%';
  const win = (f) => ({ '--t': pct(f[0]), '--r': pct(f[1]), '--b': pct(f[2]), '--l': pct(f[3]) });
  const U = () => M.len * window.innerHeight;

  // Plain style writes that are undone on rebuild (layout, not animation)
  function css(el, props) {
    if (!el) return;
    const prev = {};
    Object.keys(props).forEach((k) => { prev[k] = el.style[k]; el.style[k] = props[k]; });
    cleanups.push(() => Object.keys(prev).forEach((k) => { el.style[k] = prev[k]; }));
  }

  function beat(tl, key, at, info) {
    tl.addLabel(key, at);
    pending.push(Object.assign({ key, tl }, info));
  }

  function pinReel(el, tl, opts = {}) {
    const st = ScrollTrigger.create({
      trigger: el,
      pin: true,
      pinSpacing: opts.pinSpacing !== false,
      start: 'top top',
      end: () => '+=' + Math.round(tl.duration() * U()),
      scrub: RM ? true : M.scrub,
      animation: tl,
      anticipatePin: 1,
    });
    pending.forEach((b) => { b.st = st; markers.push(b); });
    pending = [];
    return st;
  }

  /* ------------------------------------------------------------------ placeholders */

  const TONES = {
    night: ['#16181d', '#0d0e11', 'rgba(160, 176, 204, 0.3)'],
    cool: ['#1c1f24', '#111316', 'rgba(186, 196, 212, 0.28)'],
    warm: ['#201c17', '#13110e', 'rgba(204, 186, 150, 0.26)'],
    neutral: ['#1d1d1f', '#121213', 'rgba(226, 223, 216, 0.22)'],
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function renderMedia() {
    const lib = window.PURSUIT_MEDIA || {};
    $$('.media[data-media]').forEach((el, n) => {
      const d = lib[el.dataset.media];
      if (!d) return;
      const tone = TONES[d.tone] || TONES.neutral;
      el.style.setProperty('--ph-top', tone[0]);
      el.style.setProperty('--ph-bot', tone[1]);
      el.style.setProperty('--ph-glow', tone[2]);
      el.style.setProperty('--lx', (d.lx ?? 50) + '%');
      el.style.setProperty('--ly', (d.ly ?? 45) + '%');
      const fill = d.src
        ? `<video class="media__video" src="${esc(d.src)}"${d.poster ? ` poster="${esc(d.poster)}"` : ''} muted loop playsinline preload="metadata"></video>`
        : `<div class="media__glow" style="animation-delay:-${(n * 2.7) % 15}s"></div><div class="media__vig"></div>`;
      el.innerHTML =
        `<div class="media__fill">${fill}</div>` +
        `<div class="media__frame">` +
          `<svg class="media__diag" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="0" x2="100" y2="100"/><line x1="100" y1="0" x2="0" y2="100"/></svg>` +
          `<i class="media__crop tl"></i><i class="media__crop tr"></i><i class="media__crop bl"></i><i class="media__crop br"></i>` +
          `<div class="media__slate">` +
            `<div class="media__meta"><span>${esc(d.id)}</span><span>${d.src ? 'Clip' : 'Placeholder'} · ${esc(d.dur)}</span></div>` +
            `<div class="media__name">[ ${esc(d.label)} ]</div>` +
            `<div class="media__note">${esc(d.shot)}</div>` +
          `</div>` +
          `<div class="media__tc"><span class="tc">00:00:00:00</span></div>` +
        `</div>`;
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', `${d.src ? 'Clip' : 'Placeholder'}: ${d.label}. ${d.shot}`);
      el.classList.toggle('has-video', !!d.src);
    });
  }

  function watchMedia() {
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target.querySelector('video');
        if (e.isIntersecting) {
          visible.add(e.target);
          if (v) v.play().catch(() => {});
        } else {
          visible.delete(e.target);
          if (v) v.pause();
        }
      });
    });
    $$('.media[data-media]').forEach((m) => io.observe(m));
    if (RM) return;
    const pad = (x) => String(x).padStart(2, '0');
    const t0 = performance.now();
    setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      visible.forEach((m) => {
        if (!m._tc) { m._tc = m.querySelector('.tc'); m._off = Math.random() * 40; }
        if (!m._tc) return;
        const t = s + m._off;
        m._tc.textContent = `00:${pad(Math.floor(t / 60) % 60)}:${pad(Math.floor(t) % 60)}:${pad(Math.floor((t % 1) * 24))}`;
      });
    }, 1000 / 12);
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

  function splitWords() {
    $$('[data-split]').forEach((el) => {
      const txt = el.textContent.trim();
      el.setAttribute('aria-label', txt);
      el.innerHTML = Array.from(txt).map((ch) => `<span class="ch" aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    });
  }

  /* ------------------------------------------------------------------ transitions */

  // B · mask / wipe. Returns its length in units.
  function wipe(tl, inc, out, t) {
    const iF = $('.media__fill', inc);
    const oF = $('.media__fill', out);
    const type = RM ? 'fade' : M.wipe;
    inc.classList.remove('mask-soft', 'clip-diag');
    cleanups.push(() => inc.classList.remove('mask-soft', 'clip-diag'));

    if (type === 'soft') {
      inc.classList.add('mask-soft');
      gsap.set(inc, { '--mp': '0%' });
      tl.to(inc, { '--mp': '100%', duration: 1.3, ease: 'sine.inOut' }, t);
      tl.fromTo(iF, { scale: 1.1, yPercent: 4 }, { scale: 1, yPercent: 0, duration: 1.6, ease: 'power2.out' }, t);
      tl.to(oF, { scale: 1.06, duration: 1.3, ease: 'none' }, t);
      return 1.3;
    }
    if (type === 'page') {
      const edge = $('#r1-edge');
      gsap.set(inc, { '--l': '100%' });
      gsap.set(edge, { left: '100%', autoAlpha: 0 });
      tl.to(inc, { '--l': '0%', duration: 1.0, ease: 'power3.inOut' }, t);
      tl.to(edge, { autoAlpha: 1, duration: 0.08, ease: 'none' }, t);
      tl.to(edge, { left: '0%', duration: 1.0, ease: 'power3.inOut' }, t);
      tl.to(edge, { autoAlpha: 0, duration: 0.12, ease: 'none' }, t + 0.9);
      tl.to(oF, { xPercent: -10, duration: 1.0, ease: 'power3.inOut' }, t);
      tl.fromTo(iF, { xPercent: 12 }, { xPercent: 0, duration: 1.0, ease: 'power3.inOut' }, t);
      return 1.0;
    }
    if (type === 'diagonal') {
      inc.classList.add('clip-diag');
      gsap.set(inc, { '--p': 0 });
      tl.to(inc, { '--p': 1, duration: 0.7, ease: 'expo.inOut' }, t);
      tl.fromTo(iF, { scale: 1.4 }, { scale: 1, duration: 0.9, ease: 'expo.out' }, t + 0.1);
      tl.to(oF, { scale: 1.25, duration: 0.7, ease: 'expo.in' }, t);
      return 0.85;
    }
    tl.fromTo(inc, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'none', immediateRender: false }, t);
    return 0.8;
  }

  function swapLayer(tl, from, to, t, type) {
    if (!from || !to || from === to) return;
    type = RM ? 'fade' : type;
    if (type === 'slide') {
      tl.fromTo(to, { autoAlpha: 1, yPercent: 100 }, { autoAlpha: 1, yPercent: 0, duration: 0.8, ease: 'power3.inOut', immediateRender: false }, t);
      tl.to(from, { yPercent: -28, duration: 0.8, ease: 'power3.inOut' }, t);
      tl.set(from, { autoAlpha: 0, yPercent: 0 }, t + 0.8);
    } else if (type === 'cut') {
      tl.set(to, { autoAlpha: 1 }, t);
      tl.set(from, { autoAlpha: 0 }, t);
    } else {
      tl.to(to, { autoAlpha: 1, duration: 0.6, ease: 'none' }, t);
      tl.to(from, { autoAlpha: 0, duration: 0.6, ease: 'none' }, t);
    }
  }

  function catIn(tl, b, t) {
    tl.set(b, { autoAlpha: 1 }, t);
    tl.to($$('.cat__word .ch', b), { yPercent: 0, duration: 0.6, stagger: M.letter, ease: M.out }, t);
    tl.to($('.cat__num', b), { autoAlpha: 1, duration: 0.3, ease: 'none' }, t);
    tl.fromTo($$('.cat__desc > span', b), { autoAlpha: 0, y: 12 * K }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.07, ease: M.out }, t + 0.2);
  }

  function catOut(tl, b, t) {
    tl.to($$('.cat__word .ch', b), { yPercent: -112, duration: 0.4, stagger: M.letter * 0.6, ease: 'power2.in' }, t);
    tl.to([$('.cat__num', b)].concat($$('.cat__desc > span', b)), { autoAlpha: 0, duration: 0.25, ease: 'none' }, t);
    tl.set(b, { autoAlpha: 0 }, t + 0.5);
  }

  function highlight(tl, items, i, t) {
    tl.to(items.filter((_, j) => j !== i), { opacity: 0.3, duration: 0.3, ease: 'none' }, t);
    tl.to(items[i], { opacity: 1, duration: 0.3, ease: 'none' }, t);
  }

  function placeBlock(b, x) {
    b.classList.remove('cat--right', 'cat--center', 'cat--centerx', 'cat--spread');
    css(b, Object.assign({ left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' }, x.pos));
    if (x.cls) {
      b.classList.add(x.cls);
      cleanups.push(() => b.classList.remove(x.cls));
    }
  }

  // Editorial frames get the caption underneath; edge-to-edge panels get it inside.
  function placeCaption(cap, f) {
    const [, , b, l] = f;
    if (b > 8 && l > 3) {
      css(cap, { top: `calc(${100 - b}% + 16px)`, bottom: 'auto', left: `${l}%` });
    } else {
      const lift = b > 8 ? `calc(${b}% + 3.5vh)` : `calc(5.5vh + var(--vb))`;
      css(cap, { top: 'auto', bottom: lift, left: `calc(${l}% + var(--gut))` });
    }
  }

  /* ------------------------------------------------------------------ REEL 1 */

  function buildR1() {
    const el = $('#r1');
    const stage = $('.stage', el);
    const arrival = $('#r1-arrival');
    const car = $('#r1-car');
    const aFill = $('.media__fill', arrival);
    const F = FR1[mode][layout];
    const s = M.slit;
    const h = M.hold;

    gsap.set(arrival, { '--t': '0%', '--b': '0%', '--l': pct(50), '--r': pct(50), autoAlpha: 0 });
    gsap.set(car, { autoAlpha: 0 });
    gsap.set(aFill, { scale: 1 + (M.inner - 1) * 1.8 * K });
    gsap.set('.r1-reveal .line-inner', { yPercent: 112 });
    gsap.set('.r1-reveal__kicker', { autoAlpha: 0 });
    gsap.set('#r1-scrim', { opacity: 0 });
    gsap.set('#cap-car', { autoAlpha: 0 });

    const tl = gsap.timeline({ defaults: { ease: M.ease } });

    beat(tl, 'r1-enter', 0, { scene: '01', sceneName: 'Enter', code: '', name: 'Scroll to enter' });
    tl.to('.cue', { autoAlpha: 0, y: 10 * K, duration: 0.25, ease: 'power1.out' }, 0);
    tl.to('.r1-intro', { autoAlpha: 0, y: () => -window.innerHeight * 0.05 * K, duration: 0.7, ease: 'power1.in' }, 0.05);
    tl.to('.seam', { top: '0%', height: '100%', duration: 0.75, ease: 'power2.inOut' }, 0);
    tl.to('#r1 .sheen', { xPercent: -6 * K, opacity: 0.35, duration: 1.8, ease: 'none' }, 0);

    let t = 0.7;
    beat(tl, 'r1-slit', t, { scene: '01', sceneName: 'Enter', code: 'I', name: 'Slit reveal · the door opens' });
    tl.set(arrival, { autoAlpha: 1 }, t);
    tl.to(arrival, { '--l': pct(50 - s), '--r': pct(50 - s), duration: 0.55, ease: 'power2.inOut' }, t);
    tl.to('.seam', { autoAlpha: 0, duration: 0.3, ease: 'none' }, t + 0.2);
    t += 0.55 + 0.3 * h;

    beat(tl, 'r1-frame', t, { scene: '02', sceneName: 'Reveal', code: 'A', name: 'Slit → editorial frame' });
    tl.to(arrival, Object.assign(win(F), { duration: 1.0 }), t);
    tl.to(aFill, { scale: 1 + (M.inner - 1) * K, duration: 1.0 }, t);
    tl.to('.r1-reveal__kicker', { autoAlpha: 1, duration: 0.5, ease: 'none' }, t + 0.45);
    tl.to('.r1-reveal .line-inner', { yPercent: 0, duration: 0.7, stagger: 0.12, ease: M.out }, t + 0.5);
    t += 1.2 + 0.6 * h;

    beat(tl, 'r1-full', t, { scene: '02', sceneName: 'Reveal', code: 'A', name: 'Frame → full bleed', chrome: 'immerse' });
    tl.to(arrival, Object.assign(win([0, 0, 0, 0]), { duration: 1.15 }), t);
    tl.to(aFill, { scale: 1, duration: 1.15 }, t);
    tl.to('.r1-reveal__kicker', { autoAlpha: 0, duration: 0.35, ease: 'none' }, t);
    tl.to('#r1-scrim', { opacity: 1, duration: 1.0, ease: 'none' }, t);
    tl.to('.r1-reveal__title', { scale: M.titleScale, duration: 1.15 }, t);
    t += 1.15 + 0.9 * h;

    tl.to('.r1-reveal', { autoAlpha: 0, y: -16 * K, duration: 0.45, ease: 'power1.in' }, t);
    tl.to('#r1-scrim', { opacity: 0, duration: 0.45, ease: 'none' }, t);
    t += 0.5;

    const wipeName = { soft: 'soft feathered mask', page: 'page wipe', diagonal: 'diagonal wipe', fade: 'crossfade' }[RM ? 'fade' : M.wipe];
    beat(tl, 'r1-wipe', t, { scene: '03', sceneName: 'Experience', code: 'B', name: 'Mask / wipe · ' + wipeName });
    tl.set(car, { autoAlpha: 1 }, t);
    t += wipe(tl, car, arrival, t);
    tl.to('#cap-car', { autoAlpha: 1, duration: 0.35, ease: 'none' }, t - 0.1);
    t += 0.9 * h;

    // Last viewport of the pin: reel 2 slides over this one.
    beat(tl, 'r1-cover', t, { scene: '03', sceneName: 'Experience', code: 'P', name: 'Page turn · next scene slides over' });
    tl.to(stage, { scale: 1 - 0.06 * K, opacity: 0.3, duration: 1 / M.len, ease: 'none' }, t);

    const spacer = $('#r1-spacer');
    // With pinSpacing off, this spacer places reel 2 so it arrives exactly as the pin ends.
    const setSpacer = () => { spacer.style.height = Math.max(0, Math.round(tl.duration() * U() - el.offsetHeight)) + 'px'; };
    setSpacer();
    ScrollTrigger.addEventListener('refreshInit', setSpacer);
    cleanups.push(() => { ScrollTrigger.removeEventListener('refreshInit', setSpacer); spacer.style.height = ''; });

    pinReel(el, tl, { pinSpacing: false });
  }

  /* ------------------------------------------------------------------ REEL 2 */

  function buildR2() {
    const el = $('#r2');
    const A = $('#r2-a');
    const B = $('#r2-b');
    const aF = $('.media__fill', A);
    const bF = $('.media__fill', B);
    const S = SPLIT[mode][layout];
    const h = M.hold;
    const land = layout === 'landscape';

    gsap.set(A, win(S.a));
    gsap.set(B, win(S.b));
    placeCaption($('#r2-cap-a'), S.a);
    placeCaption($('#r2-cap-b'), S.b);
    gsap.set('.r2-divider', { autoAlpha: S.divider ? 1 : 0 });
    gsap.set(['.r2-overheard', '.q1', '.q2', '.q3'], { autoAlpha: 0 });
    gsap.set('.blackcut', { autoAlpha: 0 });
    gsap.set('#r2-scrim', { opacity: 0 });

    const tl = gsap.timeline({ defaults: { ease: M.ease } });

    beat(tl, 'r2-split', 0, { scene: '03', sceneName: 'Experience', code: 'D', name: 'Split screen' });
    let t = 0.55 * h;

    beat(tl, 'r2-overtake', t, { scene: '03', sceneName: 'Experience', code: 'D', name: 'Split → single frame' });
    tl.to(B, Object.assign(win([0, 0, 0, 0]), { duration: 1.1 }), t);
    tl.fromTo(bF, { scale: 1 + (M.inner - 1) * 0.6 * K }, { scale: 1, duration: 1.1 }, t);
    tl.to(A, { autoAlpha: 0.2, duration: 1.0, ease: 'none' }, t);
    if (M.wipe === 'diagonal') {
      tl.to(aF, { xPercent: land ? -22 * K : 0, yPercent: land ? 0 : -22 * K, duration: 1.0 }, t);
    } else {
      tl.to(aF, { xPercent: land ? -5 * K : 0, yPercent: land ? 0 : -5 * K, duration: 1.0 }, t);
    }
    tl.to(['#r2-cap-a', '#r2-cap-b', '.r2-divider'], { autoAlpha: 0, duration: 0.3, ease: 'none' }, t);
    t += 1.3;

    beat(tl, 'r2-pinned', t, { scene: '03', sceneName: 'Experience', code: 'C', name: 'Pinned media · overheard' });
    tl.to(bF, { scale: 1 + M.push * K, duration: 5.2, ease: 'none' }, t);
    tl.to('#r2-scrim', { opacity: 1, duration: 0.6, ease: 'none' }, t);
    tl.to('.r2-overheard', { autoAlpha: 1, duration: 0.4, ease: 'none' }, t + 0.2);
    t += 0.45;
    const qd = 0.4, qh = 0.55 * h + 0.25;
    ['.q1', '.q2'].forEach((q) => {
      tl.fromTo(q, { autoAlpha: 0, y: 18 * K }, { autoAlpha: 1, y: 0, duration: qd, ease: M.out }, t);
      tl.to(q, { autoAlpha: 0, y: -10 * K, duration: 0.35, ease: 'power1.in' }, t + qd + qh);
      t += qd + qh + 0.4;
    });
    tl.fromTo('.q3', { autoAlpha: 0, y: 18 * K }, { autoAlpha: 1, y: 0, duration: 0.5, ease: M.out }, t);
    t += 0.5 + 0.9 * h;

    const cut = RM ? 'fade' : M.cut;
    beat(tl, 'r2-cut', t, { scene: '03', sceneName: 'Experience', code: 'F', name: 'Black cut · ' + { fade: 'fade to black', cut: 'hard cut, editorial set', hard: 'hard cut, slam' }[cut] });
    const cd = cut === 'fade' ? 0.6 : 0.02;
    tl.to([B, A, '#r2-scrim', '.r2-overheard', '.q3'], { autoAlpha: 0, duration: cd, ease: 'power1.inOut' }, t);
    t += cd + (cut === 'fade' ? 0.4 : cut === 'cut' ? 0.3 : 0.1);
    tl.set('.blackcut', { autoAlpha: 1 }, t);
    if (cut === 'fade') {
      tl.fromTo('.blackcut .display', { autoAlpha: 0, letterSpacing: '0.05em' }, { autoAlpha: 1, letterSpacing: '-0.01em', duration: 0.9, ease: 'power2.out' }, t);
      tl.fromTo('.blackcut__rule', { scaleX: 0 }, { scaleX: 1, duration: 0.6 }, t + 0.3);
    } else if (cut === 'cut') {
      tl.fromTo('.blackcut__rule', { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'power3.inOut' }, t);
      tl.fromTo('.blackcut .line-inner', { yPercent: 112 }, { yPercent: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }, t + 0.2);
    } else {
      tl.fromTo('.blackcut .display', { autoAlpha: 0, scale: 1.12 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'expo.out' }, t);
    }
    t += 1.0 + 0.9 * h;
    tl.to({}, { duration: 0.01 }, t);

    pinReel(el, tl);
  }

  /* ------------------------------------------------------------------ REEL 3 (native scroll) */

  function buildR3() {
    const el = $('#r3');
    const cfg = STACK[mode][layout];
    css(el, { height: cfg.h + 'vh' });
    const range = { trigger: el, start: 'top bottom', end: 'bottom top', scrub: RM ? true : Math.min(M.scrub, 0.8), invalidateOnRefresh: true };

    $$('.sframe', el).forEach((f, i) => {
      const c = cfg.f[i];
      css(f, { top: c.top + 'vh', left: c.left + 'vw', width: c.w + 'vw', aspectRatio: c.ar, zIndex: String(c.z) });
      const sp = c.sp * M.stackSpeed * K;
      gsap.fromTo(f, { y: () => sp * window.innerHeight }, { y: () => -sp * window.innerHeight, ease: 'none', scrollTrigger: Object.assign({}, range) });
      gsap.fromTo($('.media__fill', f),
        { yPercent: -5 * K * M.parallax, scale: 1.14 },
        { yPercent: 5 * K * M.parallax, scale: 1.14, ease: 'none', scrollTrigger: Object.assign({}, range) });
      if (c.grow && !RM) {
        gsap.fromTo(f, { scale: 0.88 }, { scale: 1.1, ease: 'none', scrollTrigger: Object.assign({}, range) });
      }
    });

    const title = $('.r3__title', el);
    const st = ScrollTrigger.create({ trigger: el, start: 'top 60%', end: 'top 5%' });
    gsap.fromTo(title, { autoAlpha: 0, y: 30 * K }, { autoAlpha: 1, y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top 60%', end: 'top 5%', scrub: true } });
    gsap.fromTo(title, { autoAlpha: 1 }, { autoAlpha: 0, ease: 'none', immediateRender: false, scrollTrigger: { trigger: el, start: 'bottom 95%', end: 'bottom 45%', scrub: true } });
    markers.push({ key: 'r3', st, scene: '03', sceneName: 'Experience', code: 'E', name: 'Stacked editorial frames · native scroll' });
  }

  /* ------------------------------------------------------------------ REEL 4 */

  function buildR4() {
    const el = $('#r4');
    const track = $('#r4-track');
    const target = $('.hframe--target', track);
    const cat = $('#r4-cat');
    const layer = (k) => $(`[data-layer="${k}"]`, cat);
    const comps = COMPS[mode][layout];
    const blocks = $$('.cat', el);
    const items = $$('.cat-index li', el);
    const thread = $('#thread');
    const land = layout === 'landscape';
    const h = M.hold;
    const Z = ZOOM[mode][layout];

    css(target, { width: Z.w + 'vw', height: Z.h + 'vh' });
    blocks.forEach((b, i) => placeBlock(b, comps[i].x));

    gsap.set(cat, Object.assign({ autoAlpha: 0 }, win([0, 0, 0, 0])));
    gsap.set($$('.media', cat), { autoAlpha: 0 });
    gsap.set(layer('event'), { autoAlpha: 1 });
    gsap.set(blocks, { autoAlpha: 0 });
    gsap.set($$('.cat__word .ch', el), { yPercent: 112 });
    gsap.set($$('.cat__desc > span, .cat__num', el), { autoAlpha: 0 });
    gsap.set('.cat-index', { autoAlpha: 0 });
    gsap.set(items, { opacity: 0.3 });
    gsap.set(['#r4-scrim', '#cap-room'], { autoAlpha: 0 });
    gsap.set(thread, { scaleX: 0, autoAlpha: 0 });
    gsap.set('.point', { autoAlpha: 0 });
    gsap.set('.point .w', { opacity: 0.1 });
    gsap.set('.point__coda', { autoAlpha: 0 });
    gsap.set('.path__head > *', { autoAlpha: 0 });
    gsap.set('.phase__node', { scale: 0 });
    gsap.set('.phase__top, .phase__desc', { autoAlpha: 0 });
    gsap.set('.path__vline', { scaleY: 0 });
    gsap.set('.eco__edge--t, .eco__edge--b', { scaleX: 0 });
    gsap.set('.eco__edge--l, .eco__edge--r', { scaleY: 0 });
    gsap.set('.eco__label, .eco__sub', { autoAlpha: 0 });

    const tl = gsap.timeline({ defaults: { ease: M.ease } });

    /* H · horizontal spread */
    const dist = () => target.offsetLeft + target.offsetWidth / 2 - window.innerWidth / 2;
    const HD = Math.max(1.4, (dist() / window.innerHeight) * M.hSpeed * 0.9);
    tl.set(track, { transformOrigin: () => `${target.offsetLeft + target.offsetWidth / 2}px ${target.offsetTop + target.offsetHeight / 2}px` }, 0);

    beat(tl, 'r4-h', 0, { scene: '03', sceneName: 'Experience', code: 'H', name: 'Horizontal spread' });
    tl.to(track, { x: () => -dist(), duration: HD, ease: M.hEase }, 0);
    $$('.hframe:not(.hframe--target) .media__fill', track).forEach((f) => {
      tl.fromTo(f, { xPercent: 6 * K * M.parallax, scale: 1.16 }, { xPercent: -6 * K * M.parallax, scale: 1.16, duration: HD, ease: 'none' }, 0);
    });
    let t = HD + 0.3 * h;

    /* G · zoom through */
    beat(tl, 'r4-zoom', t, { scene: '03', sceneName: 'Experience', code: 'G', name: 'Zoom through' });
    const ZD = 1.3;
    const zs = () => Math.max(window.innerWidth / target.offsetWidth, window.innerHeight / target.offsetHeight) * 1.004;
    tl.to([$('.media__frame', target), $('figcaption', target)], { autoAlpha: 0, duration: 0.3, ease: 'none' }, t);
    if (!RM) {
      tl.to(track, { scale: zs, duration: ZD, ease: M.zoomEase }, t);
      tl.fromTo($('.media__fill', target), { scale: 1.12 }, { scale: 1, duration: ZD, ease: M.zoomEase }, t);
      if (M.zoomFadeOthers) {
        tl.to($$('.hframe:not(.hframe--target), .hcard', track), { autoAlpha: 0, duration: ZD * 0.6, ease: 'power1.in' }, t);
      }
      tl.to(cat, { autoAlpha: 1, duration: 0.2, ease: 'none' }, t + ZD - 0.15);
      t += ZD + 0.05;
    } else {
      tl.to(cat, { autoAlpha: 1, duration: 0.6, ease: 'none' }, t);
      t += 0.65;
    }
    tl.set(track, { autoAlpha: 0 }, t);
    tl.to('#cap-room', { autoAlpha: 1, duration: 0.3, ease: 'none' }, t);
    t += 0.7 * h + 0.2;
    tl.to('#cap-room', { autoAlpha: 0, duration: 0.25, ease: 'none' }, t - 0.2);

    /* 04 · the ecosystem, decoded */
    const names = ['Network', 'Media', 'Experiences', 'Environment', 'Opportunity'];
    const firstLayer = ['c0', 'c1', 'c2a', 'c3', 'c4'];
    const lastLayer = ['c0', 'c1', 'c2c', 'c3', 'c4'];
    const swapName = { fade: 'crossfade', slide: 'slide within frame', cut: 'hard cut' }[RM ? 'fade' : M.catSwap];

    beat(tl, 'r4-cats', t, { scene: '04', sceneName: 'Understand', code: 'A′', name: 'Full bleed → frame · Network' });
    tl.to(cat, Object.assign(win(comps[0].f), { duration: 1.1 }), t);
    swapLayer(tl, layer('event'), layer('c0'), t + 0.2, 'fade');
    tl.to('#r4-scrim', { autoAlpha: 1, duration: 0.6, ease: 'none' }, t);
    tl.to('.cat-index', { autoAlpha: 1, duration: 0.5, ease: 'none' }, t + 0.4);
    catIn(tl, blocks[0], t + 0.45);
    highlight(tl, items, 0, t + 0.45);
    t += 1.1 + M.catHold;

    for (let i = 1; i < 5; i++) {
      const extra = i === 2 ? 0.4 : 0;
      beat(tl, 'r4-cat' + i, t, {
        scene: '04', sceneName: 'Understand', code: i === 4 ? 'I' : '',
        name: `${names[i]} · frame morph + ${swapName}${i === 2 ? ' · montage cuts' : ''}${i === 4 ? ' · letterbox' : ''}`,
      });
      catOut(tl, blocks[i - 1], t);
      tl.to(cat, Object.assign(win(comps[i].f), { duration: M.catMorph }), t);
      swapLayer(tl, layer(lastLayer[i - 1]), layer(firstLayer[i]), t + 0.1, M.catSwap);
      catIn(tl, blocks[i], t + 0.3);
      highlight(tl, items, i, t + 0.3);
      if (i === 4) tl.to('.cat-index', { autoAlpha: 0, duration: 0.3, ease: 'none' }, t);
      if (i === 2) {
        const span = M.catMorph + M.catHold + extra - 0.3;
        swapLayer(tl, layer('c2a'), layer('c2b'), t + 0.3 + span * 0.36, RM ? 'fade' : 'cut');
        swapLayer(tl, layer('c2b'), layer('c2c'), t + 0.3 + span * 0.7, RM ? 'fade' : 'cut');
      }
      t += M.catMorph + M.catHold + extra;
    }

    /* 05 · the point. The letterbox closes into a single line. */
    beat(tl, 'r4-collapse', t, { scene: '05', sceneName: 'The point', code: 'I', name: 'Letterbox closes to a line' });
    catOut(tl, blocks[4], t);
    tl.to('#r4-scrim', { autoAlpha: 0, duration: 0.4, ease: 'none' }, t);
    tl.to(cat, { '--t': '49.9%', '--b': '49.9%', duration: 1.0, ease: 'power2.inOut' }, t + 0.2);
    tl.fromTo(thread,
      { scaleX: () => window.innerWidth / thread.offsetWidth, autoAlpha: 0 },
      { scaleX: () => window.innerWidth / thread.offsetWidth, autoAlpha: 0.75, duration: 0.25, ease: 'none', immediateRender: false }, t + 0.95);
    tl.set(cat, { autoAlpha: 0 }, t + 1.25);
    t += 1.4;
    tl.to(thread, { scaleX: () => 96 / thread.offsetWidth, autoAlpha: 0.5, duration: 1.0, ease: 'power2.inOut' }, t);
    tl.to('.point', { autoAlpha: 1, duration: 0.6, ease: 'none' }, t + 0.6);
    t += 1.0 + 0.6 * h;

    const wa = $$('.point__a .w');
    const wb = $$('.point__b .w');
    beat(tl, 'r4-point', t, { scene: '05', sceneName: 'The point', code: '', name: 'Pursuit builds the skills and capital' });
    tl.to(wa, { opacity: 1, duration: 0.35, stagger: 0.16, ease: 'none' }, t);
    t += 0.35 + 0.16 * (wa.length - 1) + 1.0 * h;

    beat(tl, 'r4-point-b', t, { scene: '05', sceneName: 'The point', code: '', name: 'The ecosystem expands what you can do' });
    tl.to(wa, { opacity: 0.4, duration: 0.6, ease: 'none' }, t);
    tl.to(wb, { opacity: 1, duration: 0.35, stagger: 0.15, ease: 'none' }, t + 0.1);
    t += 0.1 + 0.35 + 0.15 * (wb.length - 1) + 0.4;
    tl.to('.point__coda', { autoAlpha: 1, duration: 0.6, ease: 'none' }, t);
    t += 0.6 + 1.2 * h;

    /* 06 · return to the Pursuit path. The divider becomes the path. */
    beat(tl, 'r4-return', t, { scene: '06', sceneName: 'Return to Pursuit', code: '', name: 'Divider → the Pursuit path', chrome: 'return' });
    tl.to('.point', { autoAlpha: 0, duration: 0.6, ease: 'power1.in' }, t);
    if (land) {
      tl.to(thread, { scaleX: 1, autoAlpha: 0.7, duration: 1.1 }, t + 0.3);
    } else {
      tl.to(thread, { autoAlpha: 0, duration: 0.4, ease: 'none' }, t + 0.2);
      tl.to('.path__vline', { scaleY: 1, duration: 1.1 }, t + 0.5);
    }
    tl.fromTo('.path__head > *', { autoAlpha: 0, y: 16 * K }, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.5, ease: M.out }, t + 0.5);
    const pt = t + 1.1;
    $$('.phase').forEach((p, i) => {
      tl.to($('.phase__node', p), { scale: 1, duration: 0.3, ease: 'power2.out' }, pt + i * 0.45);
      tl.fromTo([$('.phase__top', p), $('.phase__desc', p)], { autoAlpha: 0, y: 12 * K }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08, ease: M.out }, pt + i * 0.45 + 0.05);
    });
    t = pt + 3 * 0.45 + 0.6;

    beat(tl, 'r4-eco', t, { scene: '06', sceneName: 'Return to Pursuit', code: '', name: 'The ecosystem frames the whole path' });
    tl.to('.eco__edge--t', { scaleX: 1, duration: 0.7 }, t);
    tl.to('.eco__edge--l, .eco__edge--r', { scaleY: 1, duration: 0.6 }, t + 0.35);
    tl.to('.eco__edge--b', { scaleX: 1, duration: 0.7 }, t + 0.6);
    tl.to('.eco__label', { autoAlpha: 1, duration: 0.5, ease: 'none' }, t + 0.25);
    tl.to('.eco__sub', { autoAlpha: 1, duration: 0.5, ease: 'none' }, t + 0.95);
    t += 1.5 + 1.2 * h;
    tl.to({}, { duration: 0.01 }, t);

    pinReel(el, tl);
  }

  /* ------------------------------------------------------------------ 07 CTA (native scroll) */

  function buildCTA() {
    const el = $('#cta');
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tl.fromTo('.cta__line', { scaleY: 0 }, { scaleY: 1, duration: 0.9, ease: 'power2.inOut' })
      .fromTo('.cta__title .line-inner', { yPercent: 112 }, { yPercent: 0, duration: 1.2, stagger: 0.12 }, 0.35)
      .fromTo(['.cta__sub', '.btn-pill', '.cta__url'], { autoAlpha: 0, y: 14 * K }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, 0.9);
    tl.timeScale(RM ? 3 : M.cta);
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 62%',
      onEnter: () => tl.play(),
      onLeaveBack: () => tl.reverse(),
    });
    if (st.progress > 0 || window.scrollY > st.start) tl.progress(1);
    markers.push({ key: 'cta', st, scene: '07', sceneName: 'Your Pursuit', code: '', name: 'Native scroll resumes · apply' });
  }

  /* ------------------------------------------------------------------ markers / HUD / chrome */

  function resolveMarkers() {
    markers.forEach((m) => {
      if (m.tl) {
        const d = m.tl.duration() || 1;
        m.y = m.st.start + (m.tl.labels[m.key] / d) * (m.st.end - m.st.start);
      } else {
        m.y = m.st.start;
      }
    });
    markers.sort((a, b) => a.y - b.y);
    let immersed = false;
    markers.forEach((m) => {
      if (m.chrome === 'immerse') immersed = true;
      if (m.chrome === 'return') immersed = false;
      m.immersed = immersed;
    });
    lastIdx = -1;
  }

  function currentIndex(y) {
    let i = 0;
    for (let j = 0; j < markers.length; j++) {
      if (markers[j].y <= y + 2) i = j;
      else break;
    }
    return i;
  }

  const hudScene = $('.hud__scene');
  const hudBeat = $('.hud__beat');
  const hudMode = $('.hud__mode');
  const bar = $('.progress i');

  function onScroll() {
    const y = window.scrollY;
    const max = ScrollTrigger.maxScroll(window) || 1;
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, y / max))})`;
    if (!markers.length) return;
    const i = currentIndex(y);
    if (i === lastIdx) return;
    lastIdx = i;
    const m = markers[i];
    hudScene.textContent = `${m.scene} · ${m.sceneName}`;
    hudBeat.textContent = (m.code ? m.code + ' — ' : '') + m.name;
    body.classList.toggle('is-immersed', !!m.immersed);
  }

  new IntersectionObserver((es) => body.classList.toggle('at-end', es[0].isIntersecting)).observe($('.foot'));

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  }, { passive: true });

  ScrollTrigger.addEventListener('refresh', () => { resolveMarkers(); onScroll(); });

  /* ------------------------------------------------------------------ build / rebuild */

  function getAnchor() {
    if (!markers.length) return null;
    const y = window.scrollY;
    const i = currentIndex(y);
    const m = markers[i];
    const n = markers[i + 1];
    const f = n ? Math.min(1, Math.max(0, (y - m.y) / Math.max(1, n.y - m.y))) : Math.max(0, (y - m.y) / window.innerHeight);
    return { key: m.key, f, bounded: !!n };
  }

  function scrollToAnchor(a) {
    const i = markers.findIndex((m) => m.key === a.key);
    if (i < 0) return;
    const m = markers[i];
    const n = markers[i + 1];
    jump(n && a.bounded ? m.y + a.f * (n.y - m.y) : m.y + a.f * window.innerHeight);
  }

  function jump(y, smooth) {
    y = Math.max(0, Math.round(y));
    if (lenis) lenis.scrollTo(y, smooth ? { duration: 1.6, force: true } : { immediate: true, force: true });
    else window.scrollTo({ top: y, behavior: smooth && !RM ? 'smooth' : 'auto' });
  }

  function rebuild(anchor) {
    if (ctx) ctx.revert();
    cleanups.forEach((fn) => fn());
    cleanups = [];
    markers = [];
    pending = [];
    layout = getLayout();
    lastW = window.innerWidth;
    lastH = window.innerHeight;
    body.dataset.mode = mode;
    body.dataset.layout = layout;
    updateDevUI();

    ctx = gsap.context(() => {
      buildR1();
      buildR2();
      buildR3();
      buildR4();
      buildCTA();
    });
    if (lenis) lenis.options.lerp = M.lerp;
    ScrollTrigger.refresh();
    if (lenis) lenis.resize();
    if (anchor) scrollToAnchor(anchor);
    ScrollTrigger.update();
    lastIdx = -1;
    onScroll();
  }

  function setMode(next) {
    if (!MODES[next] || next === mode) return;
    const anchor = getAnchor();
    mode = next;
    M = MODES[mode];
    try { localStorage.setItem('cs-mode', mode); } catch (e) { /* storage unavailable */ }
    try { history.replaceState(null, '', '#' + mode); } catch (e) { /* ignore */ }
    rebuild(anchor);
  }

  function updateDevUI() {
    $$('[data-set-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setMode === mode)));
    hudMode.textContent = 'Mode · ' + M.label + (RM ? ' · reduced motion' : '');
  }

  function toggle(which) {
    const cls = which === 'hud' ? 'no-hud' : 'no-labels';
    const off = body.classList.toggle(cls);
    const btn = $(`[data-toggle="${which}"]`);
    if (btn) btn.setAttribute('aria-pressed', String(!off));
  }

  function step(d) {
    if (!markers.length) return;
    const i = currentIndex(window.scrollY + 4);
    const m = markers[Math.max(0, Math.min(markers.length - 1, i + d))];
    if (m) jump(m.y + 3, true);
  }

  /* ------------------------------------------------------------------ intro (time-based) */

  function intro() {
    if (RM || window.scrollY > 10) return;
    introTl = gsap.timeline({ delay: 0.3 });
    introTl
      .from('.site-head__in', { autoAlpha: 0, duration: 1.2, ease: 'none' }, 0.6)
      .from('.r1-intro__in .chapter__rule', { scaleX: 0, duration: 1.3, ease: 'power3.inOut' }, 0)
      .from('.r1-intro__in .chapter__num', { autoAlpha: 0, duration: 1.0, ease: 'none' }, 0.35)
      .from('.r1-intro__in .chapter__name', { autoAlpha: 0, letterSpacing: '0.6em', duration: 1.4, ease: 'power2.out' }, 0.5)
      .from('.r1-intro__in .line-inner', { yPercent: 112, duration: 1.3, stagger: 0.14, ease: 'power3.out' }, 0.75)
      .from('.seam__draw', { scaleY: 0, duration: 1.1, ease: 'power2.inOut' }, 1.4)
      .from('.cue__in', { autoAlpha: 0, y: 8, duration: 0.9, ease: 'power2.out' }, 1.9);
  }

  /* ------------------------------------------------------------------ boot */

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  renderMedia();
  splitWords();
  makeGrain();
  watchMedia();

  if (!RM && window.Lenis) {
    lenis = new window.Lenis({ lerp: M.lerp, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  $$('[data-set-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.setMode)));
  $$('[data-toggle]').forEach((b) => b.addEventListener('click', () => toggle(b.dataset.toggle)));

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    const k = e.key.toLowerCase();
    if (k === '1') setMode('cinematic');
    else if (k === '2') setMode('editorial');
    else if (k === '3') setMode('aggressive');
    else if (k === 'h') toggle('hud');
    else if (k === 'l') toggle('labels');
    else if (k === '.' || k === 'n') step(1);
    else if (k === ',' || k === 'p') step(-1);
  });

  $('#apply').addEventListener('click', () => {
    const txt = $('.btn-pill__txt');
    if (txt.dataset.busy) return;
    const original = txt.textContent;
    txt.dataset.busy = '1';
    txt.textContent = 'Prototype · not linked';
    setTimeout(() => { txt.textContent = original; delete txt.dataset.busy; }, 1800);
  });

  $('#replay').addEventListener('click', () => {
    jump(0);
    ScrollTrigger.update();
    setTimeout(() => { if (introTl) introTl.restart(true); }, 60);
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const dw = Math.abs(window.innerWidth - lastW);
      const dh = TOUCH ? 0 : Math.abs(window.innerHeight - lastH);
      if (getLayout() !== layout || dw > 30 || dh > 30) rebuild(getAnchor());
    }, 260);
  });

  // Console access for reviewing, e.g. ClubScottsdale.go('r2-cut')
  window.ClubScottsdale = {
    setMode,
    beats: () => markers.map((m) => ({ key: m.key, y: Math.round(m.y), scene: m.scene, code: m.code, name: m.name })),
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
