// A media host on a bad connection, for glitch tests: serves the WebM proxies under the
// clips' .mp4 names with byte ranges, but drips each response out at RATE KB/s and freezes it
// now and then (random stalls), like a busy phone connection.
//   node slow_server.js <proxy dir> <port> <KB/s> <seed> [stallEveryKB stallMs]
const http = require('http'), fs = require('fs'), path = require('path');
const [,, dir, port, rate, seedArg, stallKB = '400', stallMs = '1500'] = process.argv;
let seed = +seedArg || 1;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
http.createServer((req, res) => {
  const base = path.basename(new URL(req.url, 'http://x').pathname);
  const f = path.join(dir, base.replace(/\.mp4$/, '.webm'));
  if (!fs.existsSync(f)) { res.writeHead(404, { 'Access-Control-Allow-Origin': '*' }); return res.end(); }
  const buf = fs.readFileSync(f);
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  let a = 0, b = buf.length - 1, status = 200;
  const h = { 'Content-Type': 'video/webm', 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' };
  if (m) { a = m[1] === '' ? buf.length - +m[2] : +m[1]; b = Math.min(m[1] !== '' && m[2] !== '' ? +m[2] : buf.length - 1, buf.length - 1); status = 206; h['Content-Range'] = `bytes ${a}-${b}/${buf.length}`; }
  h['Content-Length'] = b - a + 1;
  res.writeHead(status, h);
  let pos = a, sent = 0, closed = false;
  req.on('close', () => { closed = true; });
  const CH = 16 * 1024, every = CH / (+rate * 1024) * 1000;
  const step = () => {
    if (closed || pos > b) { if (!closed) res.end(); return; }
    const end = Math.min(pos + CH, b + 1);
    res.write(buf.subarray(pos, end));
    sent += end - pos; pos = end;
    const stall = sent >= +stallKB * 1024 && rnd() < 0.35 ? (sent = 0, +stallMs * (0.5 + rnd())) : 0;
    setTimeout(step, every + stall);
  };
  step();
}).listen(+port);
