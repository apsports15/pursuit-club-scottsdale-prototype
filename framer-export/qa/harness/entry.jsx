// The QA harness page's script: mounts ClubScottsdaleChapter the way Framer does
// (React 18; hydrated over server-rendered HTML when the page has it).
import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import ClubScottsdaleChapter from '../../ClubScottsdaleChapter.tsx';
import { harnessProps } from './props.js';

const q = new URLSearchParams(location.search);
if (q.get('canvas')) window.__renderTarget = 'CANVAS';
const props = harnessProps(q);
const slot = document.getElementById('slot');
let root = null;
window.__hydrationErrors = [];

// ?strict=1: React.StrictMode (development build): effects mount, unmount and mount again.
const el = (p) => (q.get('strict') ? <React.StrictMode><ClubScottsdaleChapter {...p} /></React.StrictMode> : <ClubScottsdaleChapter {...p} />);

function mount() {
  if (window.__ssr) {
    root = hydrateRoot(slot, el(props), {
      onRecoverableError: (e) => window.__hydrationErrors.push(String(e && e.message || e)),
    });
  } else {
    root = createRoot(slot);
    root.render(el(props));
  }
}
window.__unmount = () => { if (root) root.unmount(); root = null; };
window.__remount = () => { window.__ssr = false; window.__unmount(); mount(); };
window.__rerender = (p) => root && root.render(el({ ...props, ...p }));
if (q.get('defer')) window.__mount = mount; else mount();
