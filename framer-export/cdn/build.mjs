// Prepares the film's media for a static host.
//   node framer-export/cdn/build.mjs
// Writes framer-export/cdn/dist/ (not committed):
//   _headers            response headers (Cloudflare Pages / Netlify)
//   club-scottsdale/    every file of public/media/club-scottsdale/, copied byte for byte
// Upload the dist folder (or let Cloudflare Pages run this script from the repository, with
// dist as the output folder). The component's Media URL is then
//   https://<your-site>/club-scottsdale/
// It also checks that every file the component asks for is there, and that no file is over
// Cloudflare Pages' 25 MiB limit.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SRC = path.join(ROOT, 'public/media/club-scottsdale');
const OUT = path.join(HERE, 'dist');
const DEST = path.join(OUT, 'club-scottsdale');

// What the component requests: the manifest's clips, posters and stills, and the cover in the markup.
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(SRC, 'manifest.js'), 'utf8'), ctx);
const need = new Set();
const walk = (o) => {
  if (typeof o === 'string') { if (/\.(mp4|webp|avif)$/.test(o)) need.add(o); }
  else if (o && typeof o === 'object') Object.values(o).forEach(walk);
};
walk(ctx.window.CS_MEDIA);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
for (const m of html.matchAll(/public\/media\/club-scottsdale\/([\w.-]+\.(?:mp4|webp|avif))/g)) need.add(m[1]);

const files = fs.readdirSync(SRC).filter((f) => fs.statSync(path.join(SRC, f)).isFile());
const missing = [...need].filter((f) => !files.includes(f));
if (missing.length) throw new Error('missing from ' + SRC + ': ' + missing.join(', '));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
fs.copyFileSync(path.join(HERE, '_headers'), path.join(OUT, '_headers'));
let bytes = 0, largest = ['', 0];
for (const f of files) {
  const size = fs.statSync(path.join(SRC, f)).size;
  if (size > 25 * 1024 * 1024) throw new Error(f + ' is over 25 MiB');
  fs.copyFileSync(path.join(SRC, f), path.join(DEST, f));
  bytes += size;
  if (size > largest[1]) largest = [f, size];
}
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
console.log(`dist ready: ${files.length} files, ${mb(bytes)} (largest ${largest[0]}, ${mb(largest[1])}); ${need.size} of them are requested by the component.`);
console.log('Upload framer-export/cdn/dist. Media URL: https://<your-site>/club-scottsdale/');
