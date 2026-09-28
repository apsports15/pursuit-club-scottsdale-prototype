// Checks a hosted copy of the media folder the way browsers will use it.
//   node framer-export/cdn/check.mjs https://<your-site>/club-scottsdale/
// For every file: it is there, it is the same size as the local copy, it has the right type,
// and it answers byte-range requests (Safari will not play video from a host that does not).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.argv[2];
if (!base) { console.error('usage: node framer-export/cdn/check.mjs https://<your-site>/club-scottsdale/'); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../../public/media/club-scottsdale');
const TYPES = { mp4: 'video/mp4', webp: 'image/webp', avif: 'image/avif' };
const files = fs.readdirSync(SRC).filter((f) => TYPES[f.split('.').pop()]);
const root = base.endsWith('/') ? base : base + '/';
let bad = 0;
for (const f of files) {
  const size = fs.statSync(path.join(SRC, f)).size;
  let msg = '';
  try {
    const r = await fetch(root + f, { headers: { Range: 'bytes=0-1' } });
    const type = (r.headers.get('content-type') || '').split(';')[0].trim();
    const total = +((r.headers.get('content-range') || '').split('/')[1] || r.headers.get('content-length') || 0);
    if (r.status !== 206) msg = `status ${r.status} (needs 206: byte ranges)`;
    else if (total !== size) msg = `size ${total}, expected ${size} (an old or partial upload?)`;
    else if (type !== TYPES[f.split('.').pop()]) msg = `type ${type || 'none'}, expected ${TYPES[f.split('.').pop()]}`;
    await r.body?.cancel();
  } catch (e) { msg = 'unreachable: ' + e.message; }
  if (msg) { bad++; console.log('FAIL ' + f + ': ' + msg); }
}
console.log(bad ? `${bad} of ${files.length} files have a problem.` : `All ${files.length} files OK at ${root}`);
process.exit(bad ? 1 : 0);
