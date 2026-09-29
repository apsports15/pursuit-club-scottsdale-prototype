"""Compare two vr_capture.js runs frame by frame.

    python3 vr_compare.py <baselineDir> <candidateDir> <reportPrefix>

For each frame: the share of pixels that differ by more than 24 (out of 255) in any channel,
and the mean absolute difference. Writes <reportPrefix>.json and, when anything differs,
<reportPrefix>-worst.jpg (baseline | candidate | amplified difference, worst frames first).
"""
import json
import os
import sys

from PIL import Image, ImageChops, ImageDraw

base, cand, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
bi = json.load(open(os.path.join(base, 'index.json')))
ci = json.load(open(os.path.join(cand, 'index.json')))
names = [n for n in bi['shots'] if n in ci['shots']]
rows = []
for n in names:
    a = Image.open(os.path.join(base, n + '.png')).convert('RGB')
    b = Image.open(os.path.join(cand, n + '.png')).convert('RGB')
    if a.size != b.size:
        rows.append({'frame': n, 'size': [a.size, b.size], 'changed': 1.0, 'mean': 255.0})
        continue
    d = ImageChops.difference(a, b)
    hist = d.convert('L').point(lambda v: 255 if v > 24 else 0).histogram()
    changed = hist[255] / float(a.size[0] * a.size[1])
    stat = d.convert('L').histogram()
    mean = sum(i * c for i, c in enumerate(stat)) / float(a.size[0] * a.size[1])
    rows.append({'frame': n, 'changed': round(changed, 6), 'mean': round(mean, 4)})
worst = sorted(rows, key=lambda r: (-r['changed'], -r['mean']))
summary = {
    'baseline': base, 'candidate': cand, 'frames': len(rows),
    'identical': sum(1 for r in rows if r['changed'] == 0 and r['mean'] == 0),
    'over_0.1pct': sum(1 for r in rows if r['changed'] > 0.001),
    'max_changed': worst[0]['changed'] if worst else 0,
    'max_mean': max((r['mean'] for r in rows), default=0),
    'worst': worst[:8],
    'missing': [n for n in bi['shots'] if n not in ci['shots']],
}
json.dump({'summary': summary, 'rows': rows}, open(prefix + '.json', 'w'), indent=1)
print(json.dumps(summary))
bad = [r for r in worst if r['changed'] > 0][:6]
if bad:
    tiles = []
    for r in bad:
        a = Image.open(os.path.join(base, r['frame'] + '.png')).convert('RGB')
        b = Image.open(os.path.join(cand, r['frame'] + '.png')).convert('RGB')
        d = ImageChops.difference(a, b).point(lambda v: min(255, v * 6)) if a.size == b.size else Image.new('RGB', a.size, 'red')
        W = 260
        H = int(a.size[1] * W / a.size[0])
        t = Image.new('RGB', (W * 3, H + 18), '#222')
        for i, im in enumerate((a, b, d)):
            t.paste(im.resize((W, H)), (i * W, 18))
        ImageDraw.Draw(t).text((4, 3), '%s changed %.4f mean %.3f' % (r['frame'], r['changed'], r['mean']), fill='yellow')
        tiles.append(t)
    sheet = Image.new('RGB', (tiles[0].size[0], sum(t.size[1] for t in tiles)), '#222')
    y = 0
    for t in tiles:
        sheet.paste(t, (0, y))
        y += t.size[1]
    sheet.save(prefix + '-worst.jpg', quality=82)
