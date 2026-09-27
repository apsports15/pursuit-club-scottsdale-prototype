/* ==========================================================================
   Club Scottsdale · Pursuit 05 / The ecosystem

   A guided film on one stage. The first scroll (or tap, or key) starts it and
   locks the page. From there one clock drives everything: a paused GSAP
   timeline is set to the film time every frame, and every clip is slaved to
   that same time. While a clip carries the picture, the clock follows the
   clip, so a clip that is still buffering holds the film instead of drifting
   out of sync; a clip that fails is skipped. The film is a pure function of
   its time, so seeking in either direction is just setting the time.

   Arrival      neon → the sign splits → tent logo → the drone rises slowly and pulls back
   Step inside  the flight wipes in, already moving: lounge, floor, collection, inner room
   Who's inside the 911 from above → It's who's inside.
   In the room / Around the table   people, as page wipes (phone) or columns (desktop)
   Access       the helicopter → hard cut into the amenities
   The point    two lines → Your Pursuit starts here. The page scrolls again.
   ========================================================================== */
(function () {
  'use strict';

  const MEDIA = window.CS_MEDIA;
  const BASE = 'public/media/club-scottsdale/';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const body = document.body;
  const stage = $('#club-scottsdale');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pct = (v) => v + '%';
  const win = (f) => ({ '--t': pct(f[0]), '--r': pct(f[1]), '--b': pct(f[2]), '--l': pct(f[3]) });
  const D = (name) => MEDIA.clips[name].duration;

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const K = RM ? 0 : 1;
  const DEBUG = /[?&]debug\b/.test(location.search);

  const PRELOAD = 11;      // s: a clip starts loading this far ahead of its start (the flight during the opening screen)
  const UNLOAD = 15;       // s: a clip this far behind the playhead gives its buffers back
  const STALL_START = 2.5; // s a clip may take to start before the film moves on without it
  const STALL_MID = 5;     // s a clip may buffer mid-play before the film moves on

  const wideNow = () => innerWidth >= 900 && innerWidth / innerHeight >= 1.05;
  let WIDE = wideNow();
  root.classList.toggle('wide', WIDE);

  const conn = navigator.connection || {};
  const LOW = !!(conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '')) ||
    Math.min(screen.width, screen.height) * (window.devicePixelRatio || 1) < 800;
  const HEVC = (() => {
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
      const sizes = WIDE && !el.classList.contains('split__img') ? '50vh' : '100vw';
      el.style.setProperty('--op', opOf(el));
      el.innerHTML = `<div class="f"><picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` +
        `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
        `<img src="${BASE}still-${name}.720.webp" alt="${el.dataset.alt || ''}" decoding="async" width="${s.w}" height="${s.h}"></picture></div>`;
    });
  }

  function load(v) {
    if (v._loaded) return;
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

  function splitChars(el, txt) {
    el.setAttribute('aria-label', txt);
    el.innerHTML = Array.from(txt).map((c) => `<span class="c" aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    return $$('.c', el);
  }

  /* ------------------------------------------------------------------ geometry */

  // Where a source pixel of a cover-fitted video/image lands in a W×H box.
  function coverMap(W, H, vw, vh, op) {
    const [px, py] = op.split(' ').map((s) => parseFloat(s) / 100);
    const s = Math.max(W / vw, H / vh);
    const ox = (W - vw * s) * px, oy = (H - vh * s) * py;
    return { s, ox, oy, w: vw * s, h: vh * s, at: (x, y) => [ox + x * s, oy + y * s] };
  }
  function dims(v) {
    const s = variantFor(v._name, v._kind);
    return [s.v.w, s.v.h];
  }

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

  const lift = (sel, at, o = {}) => FT(sel, { yPercent: 112 }, { yPercent: 0, duration: o.d || 1.0, stagger: o.st || 0.12, ease: 'power3.out' }, at);
  const drop = (sel, at, o = {}) => tl.to(sel, { yPercent: -112, duration: o.d || 0.5, stagger: o.st || 0.05, ease: 'power2.in' }, at);

  /* ------------------------------------------------------------------ the film */

  function compose() {
    const W = stage.clientWidth, H = stage.clientHeight;
    CH = [];
    clips = [];
    marks = {};

    // Everything starts hidden except the gate and, beneath it, the neon.
    gsap.set(['#s-aerial', '#s-split', '#s-cap', '#s-inside', '#s-over', '#s-pivot', '#s-people', '#s-heli', '#s-reel', '#s-point', '.cta', '.p-head', '#p-scrim', '#s-rooms', '#h-scrim', '#h-txt .micro'], { autoAlpha: 0 });
    gsap.set('#s-neon', { autoAlpha: 1 });
    gsap.set('#s-gate', { autoAlpha: 1 });
    gsap.set(['.gate__in', '.gate__cue'], { autoAlpha: 1, y: 0 });
    gsap.set(['#s-step .li', '#s-over-line .li', '.pivot .li', '.p-head .li', '#h-txt .li', '.point .li', '.cta__title .li'], { yPercent: 112 });

    /* ---------------- Arrival: the neon, the split, the drone */
    chapter('Arrival', 0);
    const nv = $('#s-neon')._v;
    const nmap = coverMap(W, H, 1080, 1920, opOf($('#s-neon')));
    // The sign fills the screen: by the end of its slow push-in the lettering (the widest
    // part, ~800 source px) spans 90% of a phone's width; on landscape screens the whole
    // sign fits the height. The clip's black is graded to #000, so when the frame is
    // smaller than the screen its edges disappear into the page.
    const [bx, by] = nmap.at(550, 900);                   // centre of the whole sign
    const fEnd = clamp(Math.min((0.9 * W) / (800 * nmap.s), (0.8 * H) / (700 * nmap.s)), 0.5, 1.35);
    const fill = K ? fEnd / 1.05 : fEnd;
    const dy = H / 2 - by;
    // The clip and the still are laid out at their full frame (not cropped to the screen),
    // so scaling below cover reveals the whole sign rather than a shrunken crop of it.
    gsap.set(['#s-neon .f', '.split__img'], {
      left: nmap.ox, top: nmap.oy, width: nmap.w, height: nmap.h, right: 'auto', bottom: 'auto',
      transformOrigin: `${bx - nmap.ox}px ${by - nmap.oy}px`,
    });
    gsap.set('#s-neon .f', { scale: fill, y: dy });
    gsap.set('.split__img', { scale: fEnd, y: dy });
    const logo = MEDIA.clips.neon.points.logo.portrait;
    const [lx0, ly0] = nmap.at(logo[0] * 1080, logo[1] * 1920);
    const Pn = [bx + fEnd * (lx0 - bx), by + dy + fEnd * (ly0 - by)];
    const sx = Pn[0];

    tl.to('.gate__in', { autoAlpha: 0, y: -14 * K, duration: 0.6, ease: 'power2.in' }, 0.001);
    tl.to('.gate__cue', { autoAlpha: 0, duration: 0.35, ease: 'none' }, 0.001);
    tl.to('#s-gate', { autoAlpha: 0, duration: 0.9, ease: 'power1.inOut' }, 0.2);
    const N0 = 0.35;
    addClip($('#s-neon'), N0, true);
    FT('#s-neon .f', { scale: fill }, { scale: fEnd, duration: D('neon') + N0, ease: 'none' }, 0.001);

    // The sign splits open down the middle of the CS, on its own last frame.
    const Sp = N0 + D('neon');
    gsap.set('#s-half-l', { clipPath: `inset(0px ${W - sx}px 0px 0px)`, x: 0 });
    gsap.set('#s-half-r', { clipPath: `inset(0px 0px 0px ${sx}px)`, x: 0 });
    gsap.set('#s-seam', { left: sx, scaleY: 0, autoAlpha: 0 });
    S('#s-split', { autoAlpha: 1 }, Sp);
    S('#s-neon', { autoAlpha: 0 }, Sp + 0.06);
    FT('#s-seam', { scaleY: 0, autoAlpha: 1 }, { scaleY: 1, duration: 0.35, ease: 'power2.out' }, Sp);
    const O = Sp + 0.28;
    if (K) {
      tl.to('#s-half-l', { x: -(sx + 40), duration: 1.3, ease: 'power3.inOut' }, O);
      tl.to('#s-half-r', { x: W - sx + 40, duration: 1.3, ease: 'power3.inOut' }, O);
    } else {
      tl.to(['#s-half-l', '#s-half-r'], { autoAlpha: 0, duration: 0.8, ease: 'none' }, O);
    }
    tl.to('#s-seam', { autoAlpha: 0, duration: 0.3, ease: 'none' }, O + 0.12);
    S('#s-split', { autoAlpha: 0 }, O + 1.35);

    // Behind it, the tent's CS logo sits where the neon's was, and the drone pulls back.
    // (The tent logo is ~97 px wide in the source, so this is a positional match with a
    // dissolve, not a size match.)
    const av = $('#s-aerial')._v;
    const [aw, ah] = dims(av);
    const amap = coverMap(W, H, aw, ah, opOf($('#s-aerial')));
    const tent = MEDIA.clips.aerial.points.tent_logo[av._kind];
    const Pt = amap.at(tent[0] * aw, tent[1] * ah);
    const need = Math.max(Pn[0] / Pt[0], Pn[1] / Pt[1], (W - Pn[0]) / (W - Pt[0]), (H - Pn[1]) / (H - Pt[1]));
    const Z = K ? clamp(Math.max(WIDE ? 1.8 : 2.4, need * 1.03), 1, 4) : 1;
    gsap.set('#s-aerial .f', { transformOrigin: `${Pt[0]}px ${Pt[1]}px` });
    FT('#s-aerial', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'none' }, O);
    const ae = addClip($('#s-aerial'), O, true);
    // The pull-back spans the whole slow rise off the tent (the clip's first 4.4 s).
    FT('#s-aerial .f', { x: K ? Pn[0] - Pt[0] : 0, y: K ? Pn[1] - Pt[1] : 0, scale: Z }, { x: 0, y: 0, scale: 1, duration: 4.4, ease: 'power2.inOut' }, O + 0.12);
    FT('#s-cap', { autoAlpha: 0, y: 8 * K }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out' }, O + 4.7);

    /* ---------------- Step inside: the flight wipes up over the drone, already moving */
    // Same page turn as the other chapters: full screen, never cropped, no hold.
    const F0 = ae.end - 0.95;
    chapter('Step inside', F0);
    tl.to('#s-cap', { autoAlpha: 0, duration: 0.4, ease: 'none' }, F0 - 0.2);
    S('#s-inside', { autoAlpha: 1 }, F0);
    FT('#s-inside', { '--t': '100%' }, { '--t': '0%', duration: 0.95, ease: 'power3.inOut' }, F0);
    FT('#s-flight .f', { yPercent: 10 * K }, { yPercent: 0, duration: 0.95, ease: 'power3.inOut' }, F0);
    const fl = addClip($('#s-flight'), F0, true);
    S('#s-aerial', { autoAlpha: 0 }, F0 + 1.0);
    lift('#s-step .li', F0 + 0.3, { d: 0.9, st: 0.1 });
    drop('#s-step .li', F0 + 1.35);
    // Room names take over from the title as the camera reaches the lounge.
    FT('#s-rooms', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: 'none' }, F0 + 1.4);
    marks.flight = fl;
    marks.roomsFrom = 1.45;

    /* ---------------- Who's inside: the 911 from above, then the pivot */
    const O1 = fl.end - 0.95;
    chapter("Who's inside", O1);
    tl.to('#s-rooms', { autoAlpha: 0, duration: 0.35, ease: 'none' }, O1 - 0.25);
    S('#s-over', { autoAlpha: 1 }, O1);
    FT('#s-over', { '--t': '100%' }, { '--t': '0%', duration: 0.95, ease: 'power3.inOut' }, O1);
    FT('#s-over .still .f', { yPercent: 10 * K }, { yPercent: 0, duration: 0.95, ease: 'power3.inOut' }, O1);
    FT('#s-over .still .f', { scale: 1 + 0.02 * K }, { scale: 1 + 0.08 * K, duration: 4.6, ease: 'none' }, O1);
    S('#s-inside', { autoAlpha: 0 }, O1 + 1.0);
    lift('#s-over-line .li', O1 + 0.75, { st: 0.1 });

    const P0 = O1 + 3.55;
    drop('#s-over-line .li', P0);
    tl.to('#s-over .still', { autoAlpha: 0, duration: 0.8, ease: 'power1.inOut' }, P0 + 0.1);
    S('#s-pivot', { autoAlpha: 1 }, P0 + 0.2);
    lift('.pivot .li', P0 + 0.3, { d: 1.1, st: 0.14 });

    /* ---------------- In the room, around the table */
    const K0 = P0 + 2.3;
    chapter('In the room', K0);
    drop('.pivot .li', K0, { d: 0.55, st: 0.06 });
    S('#s-people', { autoAlpha: 1 }, K0 + 0.3);
    S('#s-over', { autoAlpha: 0 }, K0 + 0.7);

    const wipe = (m, at) => {
      FT(m, { '--t': '100%' }, { '--t': '0%', duration: 0.7, ease: 'power3.inOut' }, at);
      FT(m.firstElementChild, { yPercent: 12 * K }, { yPercent: 0, duration: 0.7, ease: 'power3.inOut' }, at);
    };
    const all = $$('#s-people .m').sort((a, b) => a.dataset.seq - b.dataset.seq);
    all.forEach((m) => gsap.set(m, win([100, 0, 0, 0])));
    const run0 = K0 + 0.45;
    let peopleEnd, swapAt;
    if (!WIDE) {
      // One frame. Each clip wipes up over the last one 0.35 s before it ends.
      let at = run0;
      all.forEach((m, j) => {
        m.style.zIndex = j + 1;
        wipe(m, at);
        addClip(m, at, true);
        if (m.dataset.clip === 'p-network') swapAt = at;
        peopleEnd = at + D(m.dataset.clip);
        at = peopleEnd - 0.35 + (j === 0 ? 0.2 : 0);
      });
    } else {
      // Three columns, each wiping through its own clips. The chapter ends before
      // the first column runs out, so no column ever holds a frozen frame.
      const ends = [];
      $$('#s-people .col').forEach((col, k) => {
        let at = run0 + k * 0.16;
        $$('.m', col).forEach((m, j) => {
          m.style.zIndex = j + 1;
          wipe(m, at);
          addClip(m, at, false);
          if (k === 0 && j === 1) swapAt = at;
          at += D(m.dataset.clip) - 0.35 + (j === 0 ? 0.15 : 0);
        });
        ends.push(at + 0.35);
      });
      peopleEnd = Math.min.apply(null, ends);
    }
    FT('#p-scrim', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'none' }, K0 + 0.8);
    const headIn = (h, at) => {
      S(h, { autoAlpha: 1 }, at);
      lift(h + ' .li', at, { d: 0.9, st: 0.1 });
      FT(h + ' .micro', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'none' }, at + 0.2);
    };
    const headOut = (h, at) => {
      drop(h + ' .li', at);
      tl.to(h + ' .micro', { autoAlpha: 0, duration: 0.3, ease: 'none' }, at);
      S(h, { autoAlpha: 0 }, at + 0.6);
    };
    headIn('#p-head-know', K0 + (WIDE ? 0.6 : 1.0));
    S('#s-pivot', { autoAlpha: 0 }, K0 + 1.2);
    // Desktop runs all three columns at once, so the chapter is short: space the titles evenly.
    if (WIDE) swapAt = K0 + 0.6 + (peopleEnd - 1.0 - K0 - 0.6) / 2;
    chapter('Around the table', swapAt);
    headOut('#p-head-know', swapAt);
    headIn('#p-head-conn', swapAt + 0.55);

    /* ---------------- Access: the helicopter, then the amenities */
    const H0 = peopleEnd - 1.0;
    chapter('Access', H0);
    FT('#s-heli', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.0, ease: 'power1.inOut' }, H0);
    FT('#s-heli .still .f', { scale: 1 + 0.08 * K }, { scale: 1, duration: 4.2, ease: 'power2.out' }, H0);
    headOut('#p-head-conn', H0 + (WIDE ? 0.5 : 0));
    S('#s-people', { autoAlpha: 0 }, H0 + 1.05);
    FT('#h-scrim', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'none' }, H0 + 0.9);
    lift('#h-txt .li', H0 + 1.0);
    FT('#h-txt .micro', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'none' }, H0 + 1.2);

    // hard cut
    const R0 = H0 + 3.9;
    S('#s-reel', { autoAlpha: 1 }, R0);
    const reel = addClip($('#r-reel'), R0, true);
    S('#s-heli', { autoAlpha: 0 }, R0 + 0.05);
    marks.reel = reel;

    /* ---------------- The point, then Pursuit */
    const Re = reel.end;
    chapter('The point', Re);
    S('#s-point', { autoAlpha: 1 }, Re);
    S('#s-reel', { autoAlpha: 0 }, Re + 0.05);
    lift('.point--a .li', Re, { d: 0.8, st: 0.1 });
    drop('.point--a .li', Re + 1.65);
    lift('.point--b .li', Re + 1.85, { d: 0.9, st: 0.12 });
    drop('.point--b .li', Re + 3.45);
    S('.cta', { autoAlpha: 1 }, Re + 3.6);
    FT('.cta__path', { autoAlpha: 0, y: 8 * K }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, Re + 3.6);
    lift('.cta__title .li', Re + 3.7, { d: 1.0, st: 0.12 });
    FT(['.cta__btn', '.cta__replay'], { autoAlpha: 0, y: 10 * K }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out' }, Re + 4.1);
    TOTAL = Re + 4.9;
    tl.set({}, {}, TOTAL);
    marks.header = TOTAL - 0.8;

    buildUI();
  }

  /* ------------------------------------------------------------------ UI bound to film time */

  const roomList = $('#s-room-list');
  const roomNow = $('#s-now');
  let ROOMS = [];
  let roomIdx = -2;
  let cutIdx = -1;

  function buildUI() {
    ROOMS = MEDIA.clips.flight.marks.map((mk, i) => ({ at: mk.t, name: mk.label, n: String(i + 1).padStart(2, '0') }));
    roomList.innerHTML = ROOMS.map((r) => `<li><span>${r.n}</span>${r.name}</li>`).join('');
    ROOMS.forEach((r, i) => { r.li = roomList.children[i]; });
    roomIdx = -2;
    $('#r-total').textContent = '/ ' + String(MEDIA.clips.crescendo.cuts.length).padStart(2, '0');
    $('#ctl-ticks').innerHTML = CH.slice(1).map((c) => `<i style="left:${((c.t / TOTAL) * 100).toFixed(3)}%"></i>`).join('');
  }

  function updateUI(animate) {
    // rooms, keyed to the flight's own time
    const fl = marks.flight;
    const ft = T - fl.start;
    let i = -1;
    if (T >= fl.start - 0.01 && T < fl.end) for (let k = 0; k < ROOMS.length; k++) if (ft >= Math.max(ROOMS[k].at, marks.roomsFrom)) i = k;
    if (i !== roomIdx) {
      roomIdx = i;
      ROOMS.forEach((r, k) => { r.li.classList.toggle('is-on', k === i); r.li.classList.toggle('is-near', k === i + 1); });
      if (i >= 0) {
        const cs = splitChars(roomNow, ROOMS[i].name);
        if (animate && K) gsap.fromTo(cs, { yPercent: 105, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, stagger: 0.025, ease: 'power3.out', overwrite: true });
      } else roomNow.textContent = '';
    }
    // amenities counter, keyed to the cuts
    const rt = T - marks.reel.start;
    let c = 0;
    const cuts = MEDIA.clips.crescendo.cuts;
    for (let k = 0; k < cuts.length; k++) if (rt >= cuts[k].t - 0.01) c = k;
    if (c !== cutIdx) { cutIdx = c; $('#r-num').textContent = String(c + 1).padStart(2, '0'); }

    // controls
    const p = clamp(T / TOTAL, 0, 1);
    $('#ctl-fill').style.transform = `scaleX(${p.toFixed(4)})`;
    $('#ctl-knob').style.left = (p * 100).toFixed(3) + '%';
    const ch = chapterAt(T);
    const label = CH[ch].label;
    const chapEl = $('#ctl-chap');
    if (chapEl.textContent !== label) chapEl.textContent = label;
    const track = $('#ctl-track');
    const now = Math.round(p * 100);
    if (track.getAttribute('aria-valuenow') !== String(now)) {
      track.setAttribute('aria-valuenow', String(now));
      track.setAttribute('aria-valuetext', `${fmt(T)} of ${fmt(TOTAL)}, ${label}`);
    }
    body.classList.toggle('is-playing', state !== 'gate' && !(state === 'ended' || T >= marks.header));
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
    if (blocked) return;
    blocked = true;
    // Refused on the very first clip: finish clearing the opening title so the button
    // sits over the neon, not over the words.
    if (T < 1.15) { T = 1.15; render(false); }
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
      const ok = v._loaded && !v.seeking && (v.ended || (!v.paused && (v.readyState >= 3 || (nearEnd && v.readyState >= 2))));
      if (v.ended) {
        // ran out a frame early: let the clock finish the beat
      } else if (!ok) {
        lead.stall += dt;
        step = 0;
        if (lead.stall > (lead.played ? STALL_MID : STALL_START)) { fail(lead); return; }
      } else {
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
  function frame(now) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    try {
      if (state === 'playing' && !scrubbing) {
        advance(dt);
        if (T >= TOTAL) finish();
        // Watchdog: if the clock has not moved for 8 s while playing, move on.
        else if (now - lastAdvance > 8000) { lastAdvance = now; const l = leadClip(); if (l) fail(l); else T = Math.min(TOTAL, T + 0.5); }
      }
      if (state !== 'gate') render(state === 'playing');
    } catch (err) {
      console.error(err);
      if (locked) { state = 'ended'; unlockPage(); setClasses(); }
    }
    requestAnimationFrame(frame);
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
    root.classList.add('is-locked');
    if (scrollY !== 0) scrollTo(0, 0);
  }
  function unlockPage() {
    locked = false;
    root.classList.remove('is-locked');
  }

  function start() {
    if (state !== 'gate') return;
    state = 'playing';
    T = 0;
    lastAdvance = performance.now();
    lockPage();
    setClasses();
    render(true);
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
    clips.forEach((c) => { c.stall = 0; c.played = false; if (T < c.end) c.failed = !!c.v._failed; });
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
  function skip() { seek(TOTAL); }
  function replay() { state = 'playing'; lockPage(); seek(0); }

  /* ------------------------------------------------------------------ input */

  const SCROLL_KEYS = new Set([' ', 'Spacebar', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End']);
  const inCtl = (el) => el && el.closest && el.closest('.ctl, .cta, .skip, .tap');

  function onWheel(e) {
    if (!locked) return;
    e.preventDefault();
    if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 4) return;
    if (state === 'gate') start();
    else if (state === 'paused' && performance.now() - pausedAt > 700) resume();
  }
  let touchY = null, touchUsed = false;
  function onTouchStart(e) { touchY = e.touches[0].clientY; touchUsed = false; }
  function onTouchMove(e) {
    if (!locked) return;
    if (e.cancelable) e.preventDefault();
    if (touchY === null || touchUsed || inCtl(e.target)) return;
    if (Math.abs(e.touches[0].clientY - touchY) > 12) {
      touchUsed = true;
      if (state === 'gate') start();
      else if (state === 'paused' && performance.now() - pausedAt > 700) resume();
    }
  }
  function onKey(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const onButton = e.target && /^(BUTTON|A|INPUT)$/.test(e.target.tagName);
    const onTrack = e.target && e.target.id === 'ctl-track';
    if (state === 'gate') {
      if (['ArrowDown', 'PageDown', ' ', 'Spacebar', 'Enter'].includes(e.key) && !onButton) { e.preventDefault(); start(); }
      else if (locked && SCROLL_KEYS.has(e.key) && !onButton) e.preventDefault();
      return;
    }
    if (onTrack) return;
    if ((e.key === ' ' || e.key === 'k') && !onButton && state !== 'ended') { e.preventDefault(); toggle(); return; }
    if (locked && SCROLL_KEYS.has(e.key) && !onButton) e.preventDefault();
  }
  function onScroll() { if (locked && scrollY !== 0) scrollTo(0, 0); }

  function bindInput() {
    addEventListener('wheel', onWheel, { passive: false });
    addEventListener('touchstart', onTouchStart, { passive: true });
    addEventListener('touchmove', onTouchMove, { passive: false });
    addEventListener('keydown', onKey);
    addEventListener('scroll', onScroll, { passive: true });

    // Every real interaction unlocks the clips (see unlockMedia). The touch that ends a
    // swipe also resumes a film that the phone refused to start.
    const unlockOn = (e) => {
      unlockMedia();
      if (e.type === 'touchend' && blocked && state === 'paused') { resume(); resumedAt = performance.now(); }
    };
    ['touchend', 'click', 'keydown', 'pointerup'].forEach((t) => addEventListener(t, unlockOn, { capture: true, passive: true }));
    $('#tap-play').addEventListener('click', () => { if (state === 'paused') resume(); });

    // A tap on the picture: starts the film, then pauses and resumes it.
    stage.addEventListener('click', (e) => {
      if (inCtl(e.target) || performance.now() - resumedAt < 600) return;
      if (state === 'gate') start();
      else if (state === 'playing' || state === 'paused') toggle();
    });
    $('#gate-cue').addEventListener('click', (e) => { e.stopPropagation(); start(); });
    $('#ctl-play').addEventListener('click', toggle);
    $('#ctl-skip').addEventListener('click', skip);
    $('#replay').addEventListener('click', replay);
    $('#skip-link').addEventListener('click', (e) => { e.preventDefault(); skip(); $('#cta').focus({ preventScroll: true }); });

    // Timeline: tap or drag to seek; arrows step 5 s; Page keys step chapters.
    const track = $('#ctl-track');
    let wasPlaying = false;
    const at = (x) => { const r = track.getBoundingClientRect(); return clamp((x - r.left) / r.width, 0, 1) * TOTAL; };
    track.addEventListener('pointerdown', (e) => {
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
    track.addEventListener('pointermove', (e) => {
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
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('keydown', (e) => {
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

    document.addEventListener('visibilitychange', () => {
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
    });
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

  function init() {
    history.scrollRestoration = 'manual';
    scrollTo(0, 0);
    renderMedia();
    build();
    lockPage();          // the opening screen: the first scroll starts the film
    setClasses();
    bindInput();
    // The split halves must be decoded before the sign splits.
    $$('.split__img img').forEach((img) => { if (img.decode) img.decode().catch(() => {}); });

    let rT, lastW = stage.clientWidth, lastH = stage.clientHeight;
    addEventListener('resize', () => {
      clearTimeout(rT);
      rT = setTimeout(() => {
        const nowWide = wideNow();
        const w = stage.clientWidth, h = stage.clientHeight;
        if (nowWide === WIDE && Math.abs(w - lastW) < 40 && Math.abs(h - lastH) < 60) return;
        lastW = w; lastH = h;
        if (nowWide !== WIDE) {
          WIDE = nowWide;
          root.classList.toggle('wide', WIDE);
          $$('video', stage).forEach(unload);
          renderMedia();
        }
        build();
        if (state === 'ended') finish();
      }, 200);
    });
    requestAnimationFrame(frame);

    window.ClubScottsdale = {
      state: () => ({ state, t: +T.toFixed(3), total: +TOTAL.toFixed(3), chapter: CH[chapterAt(T)].label, locked, htmlLocked: root.classList.contains('is-locked'), scrollY, wide: WIDE, low: LOW, hevc: HEVC, blocked }),
      chapters: () => CH.map((c) => ({ label: c.label, t: +c.t.toFixed(3) })),
      clips: () => clips.map((c) => ({ name: c.name, start: +c.start.toFixed(3), end: +c.end.toFixed(3), t: +c.v.currentTime.toFixed(3), paused: c.v.paused, ended: c.v.ended, rs: c.v.readyState, loaded: !!c.v._loaded, failed: c.failed, src: (c.v.currentSrc || '').split('/').pop() })),
      start, pause: () => pause(false), resume, seek, skip, replay,
    };
  }

  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise((r) => setTimeout(r, 1200))]).then(init);
})();
