/* ==========================================================================
   Club Scottsdale · Pursuit 05 / The ecosystem

   Native scroll throughout. Each chapter is a sticky stage with a paused GSAP
   timeline; its beats sit at scroll positions (data-beats, in vh from the
   moment the stage pins). Scroll decides which beat is active. The timeline
   then plays to that beat in real time, so transitions and clips play forward
   once and are never scrubbed or restarted by a wobble. Scrolling back past a
   beat rewinds it quickly.

   01 arrive   neon slit → arrival → lineup → aerial
   02 flight   the door → continuous FPV flight → close to black
   03 spread   editorial stills (native scroll)
   04 people   It's who's inside → knowledge → connection → black
   05 access   helicopter → hard cut to the crescendo → stop
   06 meaning  two lines → the Pursuit path inside the environment frame
   ========================================================================== */
(function () {
  'use strict';

  const MEDIA = window.CS_MEDIA;
  const BASE = 'public/media/club-scottsdale/';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const body = document.body;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pct = (v) => v + '%';
  const win = (f) => ({ '--t': pct(f[0]), '--r': pct(f[1]), '--b': pct(f[2]), '--l': pct(f[3]) });

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const K = RM ? 0 : 1;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const HYST = 5; // vh either side of a beat before it flips

  const wideNow = () => innerWidth >= 900 && innerWidth / innerHeight >= 1.05;
  let WIDE = wideNow();
  root.classList.toggle('wide', WIDE);

  const conn = navigator.connection || {};
  const LOW = !!(conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '')) ||
    Math.min(screen.width, screen.height) * (window.devicePixelRatio || 1) < 800;
  const HEVC = (() => {
    try { return document.createElement('video').canPlayType('video/mp4; codecs="hvc1"') !== ''; } catch (e) { return false; }
  })();

  let motionOn = !RM;

  /* ------------------------------------------------------------------ media */

  function kindOf(el) {
    if (el.hasAttribute('data-landscape')) return 'landscape';
    return WIDE && el.hasAttribute('data-wide') ? 'wide' : 'portrait';
  }

  function sourceFor(name, kind) {
    const v = MEDIA.clips[name].variants;
    let key = kind === 'wide' ? 'w1080' : kind === 'landscape' ? (LOW ? 'l960' : 'l1920') : (LOW ? 'p720' : 'p1080');
    if (!v[key]) key = Object.keys(v).find((k) => !k.endsWith('.hevc'));
    const hevc = v[key + '.hevc'];
    return BASE + (HEVC && hevc ? hevc.src : v[key].src);
  }

  function posterFor(name, kind) {
    const p = MEDIA.clips[name].posters;
    const list = p[kind] || p.portrait || p.landscape;
    return BASE + (LOW && list[1] ? list[1] : list[0]);
  }

  function renderMedia() {
    $$('.m[data-clip]').forEach((el) => {
      const name = el.dataset.clip;
      const kind = kindOf(el);
      el.style.setProperty('--op', (WIDE && el.dataset.opWide) || el.dataset.op || '50% 50%');
      el.innerHTML = '<div class="f"><video muted playsinline preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1"></video></div>';
      const v = $('video', el);
      v.muted = true;
      v.defaultMuted = true;
      v._poster = posterFor(name, kind);
      v._src = sourceFor(name, kind);
      v._name = name;
      el._v = v;
    });
    $$('[data-still]').forEach((el) => {
      const name = el.dataset.still;
      const s = MEDIA.stills[name];
      const ws = s.w > s.h ? [1920, 960] : [1080, 720];
      const set = (ext) => ws.map((w) => `${BASE}still-${name}.${w}.${ext} ${w}w`).join(', ');
      const sizes = el.closest('.acc__img') ? (WIDE ? '50vh' : '100vw') : (WIDE ? '42vw' : '90vw');
      el.innerHTML = `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` +
        `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
        `<img src="${BASE}still-${name}.${ws[1]}.webp" alt="${el.dataset.alt || ''}" loading="lazy" decoding="async" width="${s.w}" height="${s.h}"></picture>`;
    });
  }

  const video = (sel) => { const el = typeof sel === 'string' ? $(sel) : sel; return el && el._v; };

  // Poster and clip are both deferred until the chapter is within ~1.5 screens.
  function load(v) {
    if (v && !v._loaded) { v._loaded = true; v.poster = v._poster; v.preload = 'auto'; v.src = v._src; }
  }
  function play(v, from0 = true) {
    if (!v) return;
    load(v);
    v._want = true;
    if (from0) { try { v.currentTime = 0; } catch (e) { /* not ready */ } }
    v.playbackRate = 1;
    if (!motionOn) return;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }
  function stop(v) { if (v) { v._want = false; v.pause(); } }

  // Is this element actually visible inside its stage right now?
  function shown(el) {
    for (let e = el; e && !e.classList.contains('stage'); e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.02) return false;
    }
    return true;
  }
  // After a beat settles: hidden clips rest; visible clips that were playing carry on.
  function settle(ch) {
    $$('video', ch.el).forEach((v) => {
      if (!ch.onscreen || !shown(v)) { if (!v.paused) v.pause(); return; }
      if (motionOn && v._want && v.paused && !v.ended) v.play().catch(() => {});
    });
  }

  function splitChars(el, txt) {
    el.setAttribute('aria-label', txt);
    el.innerHTML = Array.from(txt).map((c) => `<span class="c" aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    return $$('.c', el);
  }

  function makeGrain() {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    const img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    $('.grain').style.backgroundImage = `url(${c.toDataURL('image/png')})`;
  }

  /* ------------------------------------------------------------------ chapters */

  const chapters = [];
  const byId = {};
  let stageH = innerHeight;

  function chapter(id, build, onFrame) {
    const el = $('#' + id);
    const ch = { id, el, stage: $('.stage', el), beats: el.dataset.beats.split(',').map(Number),
      build, onFrame, cur: -1, floor: -1, mover: null, dir: 1, tl: null, stops: [], top: 0, range: 0, onscreen: false };
    chapters.push(ch);
    byId[id] = ch;
    return ch;
  }

  // One beat = one sequence, from the previous stop to this one. It starts just
  // after the stop so resting on a stop never fires the next beat's first frame.
  // fn may return its own length (a run of clips whose length depends on the edit).
  function beat(ch, len, fn) {
    const t = ch.tl.duration() + 0.02;
    const own = fn(t);
    const L = typeof own === 'number' ? own : len;
    ch.tl.set({}, {}, t + L);
    ch.stops.push(t + L);
  }
  const ft = (tl, target, from, to, at) => tl.fromTo(target, from, Object.assign({ immediateRender: false }, to), at);
  const clip = (ch, sel, at) => ch.tl.call(() => { if (ch.dir > 0) play(video(sel)); }, null, at);
  const halt = (ch, sel, at) => ch.tl.call(() => { if (ch.dir > 0) stop(video(sel)); }, null, at);

  function go(ch, i) {
    const target = i < 0 ? 0 : ch.stops[i];
    const now = ch.tl.time();
    const from = ch.cur;
    ch.cur = i;
    if (ch.mover) ch.mover.kill();
    ch.mover = null;
    if (Math.abs(target - now) < 0.001) { settle(ch); return; }
    ch.dir = target > now ? 1 : -1;
    const dist = Math.abs(target - now);
    let dur;
    if (ch.dir > 0) dur = dist / (i - from > 1 ? 2.4 : 1);
    else dur = clamp(dist / 3, 0.3, 0.9);
    if (!motionOn) dur = Math.min(dur, 0.35);
    ch.mover = gsap.to(ch.tl, {
      time: target, duration: dur, ease: ch.dir > 0 ? 'none' : 'power1.inOut',
      onComplete: () => { ch.mover = null; settle(ch); },
    });
  }
  function jump(ch, i) {
    if (ch.mover) ch.mover.kill();
    ch.mover = null;
    ch.cur = i;
    ch.dir = 1;
    ch.tl.time(i < 0 ? 0 : ch.stops[i], true);
  }

  /* ------------------------------------------------------------------ geometry helpers */

  const W = (ch) => ch.stage.clientWidth;
  const H = (ch) => ch.stage.clientHeight;

  // A portrait opening in the middle of the stage, as clip insets in %.
  function doorInsets(ch, hFrac, maxW, yShift = 0) {
    const w = W(ch), h = H(ch);
    const dh = h * hFrac;
    const dw = Math.min(w * maxW, dh * 0.5);
    const top = (h - dh) / 2 + h * yShift;
    const t = (top / h) * 100, b = ((h - top - dh) / h) * 100, lr = ((w - dw) / 2 / w) * 100;
    return [t, lr, b, lr];
  }

  /* ------------------------------------------------------------------ 01 arrive */

  function buildArrive(ch) {
    const tl = ch.tl;
    const slit = doorInsets(ch, 0.56, WIDE ? 0.2 : 0.58, 0.02);

    // The neon sits in its own box the size of the slit, so the whole sign shows.
    gsap.set('#a-seam', { scaleY: 0, autoAlpha: 1 });
    gsap.set('#a-neon', Object.assign(win([0, 50, 0, 50]), { top: pct(slit[0]), right: pct(slit[1]), bottom: pct(slit[2]), left: pct(slit[3]), autoAlpha: 1 }));
    gsap.set('#a-arrival', Object.assign(win(slit), { autoAlpha: 0 }));
    gsap.set('#a-lineup', { autoAlpha: 0, yPercent: 0 });
    gsap.set('#a-aerial', { autoAlpha: 0, yPercent: 100 * K, zIndex: 0 });
    gsap.set(['.a-intro', '#a-cap'], { autoAlpha: 0 });
    if (WIDE) {
      $('#a-lineup').classList.add('mask-soft');
      gsap.set('#a-lineup', { '--mp': '0%' });
    } else {
      $('#a-lineup').classList.add('win');
      gsap.set('#a-lineup', win([50, 0, 50, 0]));
    }

    // b0 · the Pursuit hairline draws down, opens into a slit, the neon glows inside
    beat(ch, 2.1, (t) => {
      tl.to('#a-seam', { scaleY: 1, duration: 0.8, ease: 'power2.inOut' }, t);
      tl.fromTo('.a-intro', { autoAlpha: 0, y: 10 * K }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out', immediateRender: false }, t + 0.35);
      clip(ch, '#a-neon', t + 0.6);
      tl.to('#a-neon', { '--l': '0%', '--r': '0%', duration: 0.9, ease: 'power3.inOut' }, t + 0.7);
      ft(tl, '#a-neon .f', { scale: 1 + 0.08 * K }, { scale: 1, duration: 1.4, ease: 'power2.out' }, t + 0.7);
      tl.to('#a-seam', { autoAlpha: 0, duration: 0.4, ease: 'none' }, t + 1.2);
    });

    // b1 · enter: the Huracán rolls in inside the slit, the slit opens to full bleed
    beat(ch, 2.3, (t) => {
      tl.set('#a-arrival', { autoAlpha: 1 }, t);
      clip(ch, '#a-arrival', t);
      tl.to('#a-neon', { autoAlpha: 0, duration: 0.5, ease: 'none' }, t);
      halt(ch, '#a-neon', t + 0.5);
      tl.to('.a-intro', { autoAlpha: 0, y: -12 * K, duration: 0.5, ease: 'power1.in' }, t);
      tl.to('#a-arrival', Object.assign(win([0, 0, 0, 0]), { duration: 1.5, ease: 'power3.inOut' }), t + 0.35);
      ft(tl, '#a-arrival .f', { scale: 1 + 0.16 * K }, { scale: 1, duration: 2.1, ease: 'power2.out' }, t + 0.2);
      tl.to('#a-cap', { autoAlpha: 1, duration: 0.6, ease: 'none' }, t + 1.7);
    });

    // b2 · the lineup at the building: full bleed on desktop, a cinemascope band on phones
    beat(ch, 1.8, (t) => {
      tl.to('#a-cap', { autoAlpha: 0, duration: 0.3, ease: 'none' }, t);
      tl.set('#a-lineup', { autoAlpha: 1 }, t);
      clip(ch, '#a-lineup', t + 0.1);
      if (WIDE) {
        tl.to('#a-lineup', { '--mp': '100%', duration: 1.3, ease: 'sine.inOut' }, t);
        ft(tl, '#a-lineup .f', { scale: 1 + 0.08 * K }, { scale: 1, duration: 1.7, ease: 'power2.out' }, t);
        tl.to('#a-arrival .f', { scale: 1 + 0.05 * K, duration: 1.3, ease: 'none' }, t);
        tl.set('#a-arrival', { autoAlpha: 0 }, t + 1.35);
      } else {
        tl.to('#a-arrival', { autoAlpha: 0, duration: 0.7, ease: 'power1.in' }, t);
        tl.to('#a-arrival .f', { scale: 1 - 0.05 * K, duration: 0.7, ease: 'power1.in' }, t);
        tl.to('#a-lineup', Object.assign(win([0, 0, 0, 0]), { duration: 1.1, ease: 'power3.inOut' }), t + 0.45);
        ft(tl, '#a-lineup .f', { scale: 1 + 0.1 * K }, { scale: 1, duration: 1.5, ease: 'power2.out' }, t + 0.45);
      }
      halt(ch, '#a-arrival', t + 1.4);
    });

    // b3 · the camera rises: the aerial comes up from below over the lot
    beat(ch, 1.5, (t) => {
      tl.set('#a-aerial', { autoAlpha: 1, zIndex: 3 }, t);
      clip(ch, '#a-aerial', t + 0.05);
      tl.to('#a-aerial', { yPercent: 0, duration: 1.25, ease: 'power3.inOut' }, t);
      ft(tl, '#a-aerial .f', { scale: 1 + 0.12 * K }, { scale: 1, duration: 1.5, ease: 'power2.out' }, t);
      tl.to('#a-lineup', { yPercent: -22 * K, autoAlpha: 0, duration: 1.25, ease: 'power3.inOut' }, t);
      halt(ch, '#a-lineup', t + 1.3);
    });
  }

  /* ------------------------------------------------------------------ 02 flight */

  const ROOMS = $$('#f-rooms li').map((li) => ({ li, at: parseFloat(li.dataset.at), name: li.textContent.replace(/^\d+/, '').trim() }));
  let roomIdx = -1;

  function buildFlight(ch) {
    const tl = ch.tl;
    const door = doorInsets(ch, 0.6, WIDE ? 0.2 : 0.42, 0.03);
    gsap.set('#f-flight', Object.assign(win(door), { autoAlpha: 1 }));
    gsap.set('#f-label', { autoAlpha: 0 });
    gsap.set('#f-rooms', { autoAlpha: 0 });
    roomIdx = -1;

    // b0 · a lit doorway in the dark: a still of guests walking through
    beat(ch, 2.4, (t) => {
      tl.fromTo('#f-label', { autoAlpha: 0, y: 8 * K }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out', immediateRender: false }, t + 0.2);
      ft(tl, '#f-flight .f', { scale: 1 + 0.1 * K }, { scale: 1 + 0.03 * K, duration: 2.4, ease: 'power1.out' }, t);
    });

    // b1 · the still becomes motion and the door opens until the site is the footage
    beat(ch, 2.0, (t) => {
      clip(ch, '#f-flight', t);
      tl.to('#f-label', { autoAlpha: 0, duration: 0.4, ease: 'none' }, t);
      tl.to('#f-flight', Object.assign(win([0, 0, 0, 0]), { duration: 1.7, ease: 'power3.inOut' }), t + 0.1);
      tl.to('#f-flight .f', { scale: 1, duration: 1.8, ease: 'power2.out' }, t + 0.1);
      tl.to('#f-rooms', { autoAlpha: 1, duration: 0.6, ease: 'none' }, t + 1.4);
    });

    // b2 · the frame closes to a letterbox, then to black
    beat(ch, 1.6, (t) => {
      tl.to('#f-rooms', { autoAlpha: 0, duration: 0.3, ease: 'none' }, t);
      tl.to('#f-flight', Object.assign(win([37, 0, 37, 0]), { duration: 0.8, ease: 'power3.inOut' }), t);
      tl.to('#f-flight', { autoAlpha: 0, duration: 0.6, ease: 'power1.in' }, t + 0.8);
      halt(ch, '#f-flight', t + 1.4);
    });
  }

  // Scroll gives the flight a little throttle. It never seeks and never reverses.
  function flightFrame(ch, pv) {
    const v = video('#f-flight');
    if (!v) return;
    if (ch.cur >= 1 && !v.paused && motionOn) {
      const dur = v.duration || MEDIA.clips.flight.duration;
      const target = clamp((pv - ch.beats[1]) / (ch.beats[2] - ch.beats[1] - 20), 0, 1) * dur;
      const lag = target - v.currentTime;
      const rate = lag > 1.6 ? 2 : lag > 0.45 ? 1.5 : 1;
      if (Math.abs(v.playbackRate - rate) > 0.01) v.playbackRate = rate;
    }
    const t = v.currentTime || 0;
    let i = 0;
    for (let k = 0; k < ROOMS.length; k++) if (t >= ROOMS[k].at) i = k;
    if (ch.cur < 1) i = -1;
    if (i !== roomIdx) {
      roomIdx = i;
      ROOMS.forEach((r, k) => { r.li.classList.toggle('is-on', k === i); r.li.classList.toggle('is-near', k === i + 1); });
      const now = $('#f-now');
      if (i >= 0) {
        const cs = splitChars(now, ROOMS[i].name);
        if (K) gsap.fromTo(cs, { yPercent: 105, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, stagger: 0.025, ease: 'power3.out' });
      } else now.textContent = '';
    }
    const dur = v.duration || MEDIA.clips.flight.duration;
    $('#f-bar').style.transform = `scaleX(${clamp(t / dur, 0, 1)})`;
  }

  /* ------------------------------------------------------------------ 04 people */

  const dur = (el) => MEDIA.clips[el.dataset.clip].duration;

  function buildPeople(ch) {
    const tl = ch.tl;
    const groups = ['#p-know', '#p-conn'].map((g) => $(g));
    const heads = ['#p-head-know', '#p-head-conn'];
    gsap.set('#p-pivot .li', { yPercent: 112 });
    gsap.set(['#p-scrim', '#p-black'], { autoAlpha: 0 });
    heads.forEach((h) => { gsap.set(h, { autoAlpha: 0 }); gsap.set(h + ' .li', { yPercent: 112 }); });
    groups.forEach((g) => {
      gsap.set(g, { autoAlpha: 0 });
      $$('.col', g).forEach((c) => gsap.set(c, win(WIDE ? [100, 0, 0, 0] : [0, 0, 0, 0])));
      $$('.m', g).forEach((m) => { m.classList.add('win'); gsap.set(m, Object.assign(win(WIDE ? [0, 0, 0, 0] : [100, 0, 0, 0]), { autoAlpha: WIDE ? 0 : 1 })); });
    });

    const headIn = (h, t) => {
      tl.set(h, { autoAlpha: 1 }, t);
      tl.to(h + ' .li', { yPercent: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' }, t);
      tl.fromTo(h + ' .micro', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'none', immediateRender: false }, t + 0.2);
    };
    const headOut = (h, t) => {
      tl.to(h + ' .li', { yPercent: -112, duration: 0.5, stagger: 0.05, ease: 'power2.in' }, t);
      tl.to(h + ' .micro', { autoAlpha: 0, duration: 0.3, ease: 'none' }, t);
      tl.set(h, { autoAlpha: 0 }, t + 0.6);
    };

    // Plays one group. Phones: one frame, the clips run as page wipes, one after
    // another. Desktop: the columns rise side by side; a column with two clips
    // crossfades to its second when the first ends. Returns the run's length.
    const runGroup = (g, t) => {
      tl.set(g, { autoAlpha: 1 }, t);
      if (WIDE) {
        let end = 0;
        $$('.col', g).forEach((col, k) => {
          const s = t + k * 0.16;
          tl.to(col, { '--t': '0%', duration: 1.1, ease: 'power3.inOut' }, s);
          const ms = $$('.m', col);
          let at = s + 0.15;
          ms.forEach((m, j) => {
            if (j === 0) { tl.set(m, { autoAlpha: 1 }, s); ft(tl, m.firstElementChild, { yPercent: 10 * K }, { yPercent: 0, duration: 1.1, ease: 'power3.inOut' }, s); }
            else tl.to(m, { autoAlpha: 1, duration: 0.5, ease: 'none' }, at - 0.25);
            clip(ch, m, at);
            at += dur(m) - 0.25;
          });
          end = Math.max(end, at);
        });
        return end - t;
      }
      let at = t;
      $$('.m', g).forEach((m, j) => {
        tl.to(m, { '--t': '0%', duration: 0.7, ease: 'power3.inOut' }, at);
        ft(tl, m.firstElementChild, { yPercent: 12 * K }, { yPercent: 0, duration: 0.7, ease: 'power3.inOut' }, at);
        clip(ch, m, at);
        at += (j === 0 ? 0.2 : 0) + dur(m) - 0.35;
      });
      return at - t + 0.35;
    };

    // b0 · on black: It's who's inside.
    beat(ch, 1.3, (t) => {
      tl.to('#p-pivot .li', { yPercent: 0, duration: 1.1, stagger: 0.14, ease: 'power3.out' }, t);
    });

    // b1 · knowledge
    beat(ch, 0, (t) => {
      tl.to('#p-pivot .li', { yPercent: -112, duration: 0.55, stagger: 0.06, ease: 'power2.in' }, t);
      const len = runGroup(groups[0], t + 0.45);
      tl.to('#p-scrim', { autoAlpha: 1, duration: 0.8, ease: 'none' }, t + 0.8);
      headIn(heads[0], t + 1.0);
      return Math.max(0.45 + len, 2.2);
    });

    // b2 · connection, turning over the knowledge frames
    beat(ch, 0, (t) => {
      headOut(heads[0], t);
      const len = runGroup(groups[1], t + 0.15);
      headIn(heads[1], t + 0.7);
      tl.set(groups[0], { autoAlpha: 0 }, t + 1.6);
      return Math.max(0.15 + len, 2.2);
    });

    // b3 · fade to black
    beat(ch, 1.1, (t) => {
      tl.to('#p-black', { autoAlpha: 1, duration: 1.0, ease: 'power1.inOut' }, t);
    });
  }

  /* ------------------------------------------------------------------ 05 access + crescendo */

  const CUTS = MEDIA.clips.crescendo.cuts;
  let cutIdx = -1;

  function buildAccess(ch) {
    const tl = ch.tl;
    gsap.set('#c-img', { autoAlpha: 0 });
    gsap.set(['#c-scrim', '#c-txt .micro'], { autoAlpha: 0 });
    gsap.set('#c-txt .li', { yPercent: 112 });
    gsap.set(['#r-reel', '#r-scrim', '#r-line', '#r-count', '#r-black'], { autoAlpha: 0 });
    $('#r-total').textContent = '/ ' + String(CUTS.length).padStart(2, '0');
    cutIdx = -1;

    // b0 · the helicopter emerges from the dark
    beat(ch, 2.2, (t) => {
      tl.to('#c-img', { autoAlpha: 1, duration: 1.8, ease: 'power1.inOut' }, t);
      ft(tl, '#c-img img', { scale: 1 + 0.1 * K }, { scale: 1, duration: 2.2, ease: 'power2.out' }, t);
    });

    // b1 · Access changes perspective.
    beat(ch, 1.4, (t) => {
      tl.to('#c-scrim', { autoAlpha: 1, duration: 0.8, ease: 'none' }, t);
      tl.to('#c-txt .li', { yPercent: 0, duration: 1.0, stagger: 0.12, ease: 'power3.out' }, t + 0.1);
      tl.to('#c-txt .micro', { autoAlpha: 1, duration: 0.6, ease: 'none' }, t + 0.3);
    });

    // b2 · hard cut into the crescendo
    beat(ch, 0.3, (t) => {
      tl.set(['#r-reel', '#r-scrim', '#r-line', '#r-count'], { autoAlpha: 1 }, t);
      tl.set(['#c-img', '#c-txt', '#c-scrim'], { autoAlpha: 0 }, t + 0.05);
      clip(ch, '#r-reel', t);
    });

    // b3 · stop. Black. (Also fires by itself when the crescendo ends.)
    beat(ch, 0.3, (t) => {
      tl.set('#r-black', { autoAlpha: 1 }, t);
      tl.set(['#r-line', '#r-count'], { autoAlpha: 0 }, t);
      halt(ch, '#r-reel', t);
    });

    const v = video('#r-reel');
    v.onended = () => { if (ch.cur === 2) { ch.floor = 3; go(ch, 3); } };
  }

  function accessFrame(ch) {
    const v = video('#r-reel');
    if (!v || ch.cur !== 2) return;
    const t = v.currentTime || 0;
    let i = 0;
    for (let k = 0; k < CUTS.length; k++) if (t >= CUTS[k].t - 0.01) i = k;
    if (i !== cutIdx) { cutIdx = i; $('#r-num').textContent = String(i + 1).padStart(2, '0'); }
  }

  /* ------------------------------------------------------------------ 06 meaning + return */

  function buildMeaning(ch) {
    const tl = ch.tl;
    const thread = '#m-thread';
    const track = $('.path__track', ch.el);
    const phases = $$('.phase', ch.el);
    gsap.set(['.mean__a .li', '.mean__b .li'], { yPercent: 112 });
    gsap.set('.mean__a', { opacity: 1 });
    gsap.set(thread, { autoAlpha: 0, scaleX: 0, rotation: 0, x: 0, y: 0 });
    gsap.set('.path__head', { autoAlpha: 0 });
    gsap.set('.path__rail', { autoAlpha: 0 });
    gsap.set($$('.phase__node', ch.el), { scale: 0 });
    gsap.set($$('.phase > :not(.phase__node)', ch.el), { autoAlpha: 0 });
    gsap.set(['.env__t', '.env__b'], { scaleX: 0 });
    gsap.set(['.env__l', '.env__r'], { scaleY: 0 });
    gsap.set(['.env__label', '.env__sub', '#m-coda'], { autoAlpha: 0 });

    beat(ch, 1.3, (t) => {
      tl.to('.mean__a .li', { yPercent: 0, duration: 1.2, stagger: 0.14, ease: 'power3.out' }, t);
    });
    beat(ch, 1.4, (t) => {
      tl.to('.mean__a', { opacity: 0.32, duration: 0.8, ease: 'none' }, t);
      tl.to('.mean__b .li', { yPercent: 0, duration: 1.2, stagger: 0.14, ease: 'power3.out' }, t + 0.2);
    });

    // b2 · the words leave, a line remains, and the line becomes the Pursuit path
    beat(ch, 0, (t) => {
      tl.to(['.mean__a .li', '.mean__b .li'], { yPercent: -112, duration: 0.6, stagger: 0.05, ease: 'power2.in' }, t);
      tl.fromTo(thread, { autoAlpha: 0.9, scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power3.inOut', immediateRender: false }, t + 0.45);
      const s = t + 1.2;
      if (WIDE) {
        tl.to(thread, { scaleX: () => track.offsetWidth / W(ch), x: () => track.offsetLeft + track.offsetWidth / 2 - W(ch) / 2, y: () => track.offsetTop - H(ch) / 2, duration: 0.8, ease: 'power3.inOut' }, s);
      } else {
        tl.to(thread, { scaleX: () => 72 / W(ch), duration: 0.5, ease: 'power2.inOut' }, s);
        tl.to(thread, { rotation: 90, duration: 0.5, ease: 'power2.inOut' }, s + 0.4);
        tl.to(thread, { scaleX: () => track.offsetHeight / W(ch), x: () => track.offsetLeft + 0.5 - W(ch) / 2, y: () => track.offsetTop + track.offsetHeight / 2 - H(ch) / 2, duration: 0.8, ease: 'power3.inOut' }, s + 0.85);
      }
      const railAt = WIDE ? s + 0.82 : s + 1.67;
      tl.set('.path__rail', { autoAlpha: 1 }, railAt);
      tl.set(thread, { autoAlpha: 0 }, railAt);
      tl.fromTo('.path__head', { autoAlpha: 0, y: 10 * K }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', immediateRender: false }, s);
      phases.forEach((p, k) => {
        tl.to($('.phase__node', p), { scale: 1, duration: 0.35, ease: 'power2.out' }, railAt + k * 0.2);
        ft(tl, $$(':scope > :not(.phase__node)', p), { autoAlpha: 0, y: 10 * K }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, railAt + 0.05 + k * 0.2);
      });
      return railAt - t + 1.4;
    });

    // b3 · the environment frame draws around the path; the closing line
    beat(ch, 2.0, (t) => {
      tl.to('.env__t', { scaleX: 1, duration: 0.7, ease: 'power3.inOut' }, t);
      tl.to(['.env__l', '.env__r'], { scaleY: 1, duration: 0.6, ease: 'power3.inOut' }, t + 0.4);
      tl.to('.env__b', { scaleX: 1, duration: 0.7, ease: 'power3.inOut' }, t + 0.75);
      tl.to('.env__label', { autoAlpha: 1, duration: 0.5, ease: 'none' }, t + 0.3);
      tl.to('.env__sub', { autoAlpha: 1, duration: 0.5, ease: 'none' }, t + 1.1);
      ft(tl, '#m-coda', { autoAlpha: 0, y: 14 * K }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, t + 1.1);
    });
  }

  /* ------------------------------------------------------------------ spread (native scroll) */

  function spreadFrame() {
    const vhNow = innerHeight;
    $$('.spread .st__img').forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vhNow + 100) return;
      const off = (r.top + r.height / 2 - vhNow / 2) / vhNow;
      el.style.transform = K ? `translate3d(0, ${(-off * 6).toFixed(2)}%, 0)` : '';
    });
  }

  /* ------------------------------------------------------------------ scroll loop */

  function measure() {
    stageH = chapters[0].stage.offsetHeight || innerHeight;
    chapters.forEach((ch) => {
      ch.top = ch.el.getBoundingClientRect().top + scrollY;
      ch.range = ((ch.el.offsetHeight - stageH) / stageH) * 100;
    });
  }

  // Forward past a beat needs HYST vh beyond it; back past it needs HYST vh before it.
  function targetIndex(ch, pv) {
    let i = ch.cur;
    while (i + 1 < ch.beats.length && pv >= ch.beats[i + 1] + HYST) i++;
    while (i >= 0 && pv < ch.beats[i] - HYST) i--;
    return i;
  }

  let ticking = false;
  function update() {
    ticking = false;
    const y = scrollY;
    chapters.forEach((ch) => {
      const pv = ((y - ch.top) / stageH) * 100;
      ch.pv = pv;
      const near = pv > -110 && pv < ch.range + 110;
      let i = targetIndex(ch, pv);
      if (ch.id === 'ch-access') {
        if (i < 2) ch.floor = -1;
        i = Math.max(i, ch.floor);
      }
      if (i !== ch.cur) (near ? go : jump)(ch, i);
      if (near && ch.onFrame) ch.onFrame(ch, pv);
    });
    spreadFrame();

    const a = byId['ch-arrive'], m = byId['ch-meaning'];
    const inCS = a.pv > a.beats[0] - 20 && m.pv < m.range + 40;
    body.classList.toggle('in-cs', inCS);
    body.classList.toggle('is-immersed', inCS && a.cur >= 1 && m.cur < 2 && m.pv < m.range);
    if (DEBUG) debug();
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  // Some chapters also need every frame while they are on screen (clip-synced UI).
  function frameLoop() {
    const f = byId['ch-flight'], c = byId['ch-access'];
    if (f.onscreen) flightFrame(f, f.pv);
    if (c.onscreen) accessFrame(c);
    requestAnimationFrame(frameLoop);
  }

  let dbg = null;
  function debug() {
    if (!dbg) { dbg = document.createElement('div'); dbg.className = 'dbg'; body.appendChild(dbg); }
    dbg.textContent = chapters.map((ch) => `${ch.id.padEnd(11)} beat ${String(ch.cur).padStart(2)}  ${ch.pv.toFixed(0).padStart(5)}vh${ch.onscreen ? '  ●' : ''}`).join('\n') +
      `\nwide ${WIDE}  low ${LOW}  hevc ${HEVC}  motion ${motionOn}`;
  }

  /* ------------------------------------------------------------------ build / rebuild */

  let ctx = null;

  function build() {
    const keep = chapters.map((ch) => ch.cur);
    if (ctx) ctx.revert();
    chapters.forEach((ch) => { if (ch.mover) ch.mover.kill(); ch.mover = null; ch.stops = []; });
    $('#a-lineup').classList.remove('mask-soft', 'win');
    ctx = gsap.context(() => {
      chapters.forEach((ch) => {
        ch.tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
        ch.build(ch);
      });
    });
    measure();
    chapters.forEach((ch, k) => { if (keep[k] >= 0) jump(ch, keep[k]); settle(ch); });
    update();
  }

  function init() {
    renderMedia();
    makeGrain();

    chapter('ch-arrive', buildArrive);
    chapter('ch-flight', buildFlight);
    chapter('ch-people', buildPeople);
    chapter('ch-access', buildAccess);
    chapter('ch-meaning', buildMeaning);

    // Load a chapter's clips when it is within ~1.5 screens; pause them once it is off screen.
    const lazy = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) $$('video', e.target).forEach(load);
    }), { rootMargin: '150% 0px 150% 0px' });
    const seen = new IntersectionObserver((es) => es.forEach((e) => {
      const ch = chapters.find((c) => c.el === e.target);
      if (!ch) return;
      ch.onscreen = e.isIntersecting;
      settle(ch);
    }), { rootMargin: '0px' });
    chapters.forEach((ch) => { lazy.observe(ch.el); seen.observe(ch.el); });

    // Editorial stills reveal once, as they arrive.
    const rev = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); rev.unobserve(e.target); }
    }), { rootMargin: '0px 0px -18% 0px' });
    $$('.reveal').forEach((el) => rev.observe(el));

    const btn = $('#motion');
    btn.setAttribute('aria-pressed', String(motionOn));
    btn.setAttribute('aria-label', motionOn ? 'Pause motion' : 'Play motion');
    btn.addEventListener('click', () => {
      motionOn = !motionOn;
      btn.setAttribute('aria-pressed', String(motionOn));
      btn.setAttribute('aria-label', motionOn ? 'Pause motion' : 'Play motion');
      if (!motionOn) $$('video').forEach((v) => v.pause());
      else chapters.forEach(settle);
    });

    build();
    addEventListener('scroll', onScroll, { passive: true });
    let rT, lastW = innerWidth, lastH = innerHeight;
    addEventListener('resize', () => {
      clearTimeout(rT);
      rT = setTimeout(() => {
        const nowWide = wideNow();
        const touch = matchMedia('(hover: none)').matches;
        const bigChange = Math.abs(innerWidth - lastW) > 40 || (!touch && Math.abs(innerHeight - lastH) > 40);
        if (nowWide !== WIDE) {
          WIDE = nowWide;
          root.classList.toggle('wide', WIDE);
          renderMedia();
          $$('.ch').forEach((el) => $$('video', el).forEach((v) => { if (el.getBoundingClientRect().top < innerHeight * 2.5) load(v); }));
        }
        if (bigChange || nowWide !== WIDE) { lastW = innerWidth; lastH = innerHeight; build(); } else { measure(); update(); }
      }, 200);
    });
    requestAnimationFrame(frameLoop);

    window.ClubScottsdale = {
      chapters: () => chapters.map((ch) => ({ id: ch.id, beat: ch.cur, beats: ch.beats, pv: Math.round(ch.pv), top: Math.round(ch.top), range: Math.round(ch.range), stops: ch.stops.map((s) => +s.toFixed(2)) })),
      scrollToBeat: (id, i) => { const ch = byId[id]; scrollTo(0, ch.top + ((ch.beats[i] + 8) / 100) * stageH); },
      peek: (id, t) => { const ch = byId[id]; if (ch.mover) ch.mover.kill(); ch.mover = null; ch.tl.time(t, true); },
      state: () => ({ wide: WIDE, low: LOW, hevc: HEVC, motion: motionOn, busy: chapters.some((c) => c.mover), immersed: body.classList.contains('is-immersed') }),
      video: (sel) => { const v = video(sel); return v ? { t: +v.currentTime.toFixed(2), paused: v.paused, ended: v.ended, rate: v.playbackRate, src: v.currentSrc.split('/').pop() } : null; },
    };
  }

  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise((r) => setTimeout(r, 1200))]).then(init);
})();
