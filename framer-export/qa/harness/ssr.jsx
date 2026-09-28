// Server render, as Framer's static site generation does: no window, no document.
import React from 'react';
import { renderToString } from 'react-dom/server';
import ClubScottsdaleChapter from '../../ClubScottsdaleChapter.tsx';
import { harnessProps } from './props.js';

export function render(q) {
  if (typeof window !== 'undefined' || typeof document !== 'undefined') throw new Error('SSR ran with a DOM');
  return renderToString(<ClubScottsdaleChapter {...harnessProps(q)} />);
}
