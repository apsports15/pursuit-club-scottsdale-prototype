#!/usr/bin/env python3
"""Derive every Club Scottsdale production asset from the master footage.

The master (source-media/club-scottsdale-master.MOV) is read, never written.
Every output is one generation from it, never from another derivative. (Slow
motion goes through a lossless intermediate in build/cache, so the delivered
files are still one lossy generation from the master.)

Writes:
  source-media/stills/<name>.png        source-quality still extracts (lossless)
  public/media/club-scottsdale/         clips, posters, stills and manifest.js

Anything in those two folders that this script no longer produces is deleted.

Usage:
  python3 scripts/build_media.py            build everything missing
  python3 scripts/build_media.py --force    rebuild everything

Needs ffmpeg with libx264 + libx265 (FFMPEG env var, PATH, or imageio-ffmpeg)
and Pillow with AVIF + WebP support.
"""
import json
import os
import shutil
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / 'source-media' / 'club-scottsdale-master.MOV'
STILLS_SRC = ROOT / 'source-media' / 'stills'
OUT = ROOT / 'public' / 'media' / 'club-scottsdale'
CACHE = ROOT / 'build' / 'cache'
FORCE = '--force' in sys.argv

SRC_W, SRC_H = 1080, 1920
FPS = 30


def P(t_in, t_out, y=0.5, speed=1.0, label=None):
    """One part of a clip. Times are seconds in the master, trimmed a frame or two
    inside every cut. y is the vertical centre (0-1) of the 1080x810 crop used on
    landscape screens. speed < 1 is motion-interpolated slow motion."""
    return {'in': t_in, 'out': t_out, 'y': y, 'speed': speed, 'label': label}


# The neon's black is lifted (about RGB 4,5,8). Pull it to true black so the sign
# sits on the page's #000 with no visible frame edge.
NEON_GRADE = 'colorlevels=rimin=0.035:gimin=0.035:bimin=0.05'

CLIPS = {
    # identity: the CS neon in the dark. Portrait only: the page splits the sign open
    # on the neon still, which has to line up with the video exactly on every screen.
    # logo is the centre of the CS mark (source px).
    'neon': {'parts': [P(49.25, 51.60)], 'kinds': ['portrait'], 'grade': NEON_GRADE,
             'points': {'logo': (550, 702)}},
    # aerial: the drone rises slowly off the tent's CS logo (the whole rise, at half
    # speed), then glides over the collection at speed. tent_logo is where that logo
    # sits in the first frame (source px); the page matches it to the neon sign.
    'aerial': {'parts': [P(9.25, 11.44, 0.32, speed=0.5), P(15.92, 19.07, 0.5)], 'kinds': ['portrait', 'wide'],
               'points': {'tent_logo': (710, 438)}},
    # the FPV flight, uncut and at speed: doorway, the lounge, the event floor, the
    # collection, and on (the source's own cut at 74.367) into the room with the round
    # white sofa, up to the cut to the applause at 76.867. The last room gets its own
    # landscape crop, lower, so the sofa and the people in it stay in frame.
    'flight': {'parts': [P(58.42, 74.35, 0.52), P(74.37, 76.83, 0.62)],
               'kinds': ['portrait', 'wide'],
               'marks': [('The lounge', 59.40), ('The floor', 62.25), ('The collection', 66.60), ('The inner room', 74.37)]},
    # people: in the room
    'p-session': {'parts': [P(27.03, 28.85)], 'kinds': ['portrait']},
    'p-lounge': {'parts': [P(32.47, 35.27)], 'kinds': ['portrait']},
    'p-room': {'parts': [P(78.70, 80.22)], 'kinds': ['portrait']},
    'p-applause': {'parts': [P(76.95, 78.62)], 'kinds': ['portrait']},
    # people: around the table
    'p-network': {'parts': [P(30.92, 32.40)], 'kinds': ['portrait']},
    'p-dinner': {'parts': [P(46.90, 48.40)], 'kinds': ['portrait']},
    'p-panel': {'parts': [P(51.72, 53.85)], 'kinds': ['portrait']},
    'p-candid': {'parts': [P(53.95, 55.62)], 'kinds': ['portrait']},
    # amenities: a lead-in of activity, then the rooms, cutting faster and faster
    'crescendo': {
        'kinds': ['portrait', 'wide'],
        'cuts': True,
        'parts': [
            P(55.72, 56.95, 0.52, label='sim racing'),
            P(57.04, 58.30, 0.38, label='DJ at the neon'),
            P(12.05, 12.85, 0.62, label='podcast recording'),
            P(29.05, 29.80, 0.62, label='pickleball court'),
            P(84.37, 84.79, 0.58, label='podcast studio'),
            P(85.74, 86.14, 0.60, label='sim bay'),
            P(86.74, 87.12, 0.50, label='barber chair'),
            P(89.04, 89.42, 0.62, label='card room'),
            P(87.67, 88.04, 0.40, label='terrace at sunset'),
            P(88.10, 88.44, 0.42, label='gallery wall'),
            P(88.54, 88.87, 0.62, label='chesterfield lounge'),
            P(85.27, 85.59, 0.50, label='lounge and cars'),
            P(89.94, 90.24, 0.60, label='window lounge, recliners'),
            P(86.24, 86.54, 0.56, label='white sectional'),
            P(87.21, 87.51, 0.62, label='white car, yellow SUV'),
            P(83.97, 84.27, 0.56, label='red car, hex lights'),
            P(89.51, 89.88, 0.60, label='matte car, hex reflections'),
        ],
    },
}

# Source-quality stills. 'at' is a master time, or ('last', clip) for the exact
# final frame of a clip (the neon still is what the sign splits open on).
STILLS = [
    {'name': 'helicopter', 'at': 0.60},
    {'name': 'overhead', 'at': 19.90},
    {'name': 'neon', 'at': ('last', 'neon'), 'grade': NEON_GRADE},
]

H264 = ['-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
        '-g', '30', '-keyint_min', '30', '-sc_threshold', '0']
HEVC = ['-c:v', 'libx265', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-tag:v', 'hvc1',
        '-x265-params', 'keyint=30:min-keyint=30:scenecut=0:log-level=error']
TAGS = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
        '-color_range', 'tv', '-movflags', '+faststart', '-an']

# kind -> list of (suffix, output WxH, codec args)
VARIANTS = {
    'portrait': [
        ('p1080.hevc', (1080, 1920), HEVC + ['-crf', '27']),
        ('p1080', (1080, 1920), H264 + ['-crf', '23', '-maxrate', '5M', '-bufsize', '10M']),
        ('p720', (720, 1280), H264 + ['-crf', '25', '-maxrate', '2.2M', '-bufsize', '4.4M']),
    ],
    'wide': [
        ('w1080.hevc', (1080, 810), HEVC + ['-crf', '27']),
        ('w1080', (1080, 810), H264 + ['-crf', '23', '-maxrate', '4M', '-bufsize', '8M']),
    ],
}
POSTER = {'portrait': ('p1080', [1080, 720]), 'wide': ('w1080', [1080])}

YUV_TO_RGB = 'scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24'

written = set()


def ffmpeg():
    exe = os.environ.get('FFMPEG') or shutil.which('ffmpeg')
    if not exe:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
    return exe


def run(args):
    subprocess.run([ffmpeg(), '-hide_banner', '-v', 'error', '-y'] + args, check=True)


def frames(p):
    """Whole output frames in a part. Trims are frame-exact so cut times stay in sync."""
    return round((p['out'] - p['in']) * FPS / p['speed'])


def fresh(path):
    written.add(path.resolve())
    return FORCE or not path.exists()


def wide_top(y):
    return round(min(max(y * SRC_H - 405, 0), SRC_H - 810))


def geometry(kind, y):
    return f'crop=1080:810:0:{wide_top(y)}' if kind == 'wide' else 'null'


def slow_source(p):
    """Lossless, motion-interpolated slow-motion intermediate for one part."""
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"slow-{p['in']:.2f}-{p['out']:.2f}-{p['speed']:.2f}.mkv"
    if not path.exists():
        rate = Fraction(FPS) / Fraction(str(p['speed']))
        vf = (f'minterpolate=fps={rate.numerator}/{rate.denominator}:mi_mode=mci:mc_mode=aobmc:'
              f"me_mode=bidir:vsbmc=1,setpts=PTS/{p['speed']},fps={FPS}")
        print(f'  slow motion {p["in"]}-{p["out"]} at {p["speed"]}x (slow)')
        run(['-ss', f"{p['in']:.3f}", '-t', f"{p['out'] - p['in'] + 0.2:.3f}", '-i', str(MASTER),
             '-vf', vf, '-c:v', 'libx264', '-qp', '0', '-preset', 'ultrafast', str(path)])
    return path


def encode(name, spec, kind, suffix, size, codec):
    out = OUT / f'{name}.{suffix}.mp4'
    if not fresh(out):
        return out
    parts = spec['parts']
    grade = spec.get('grade', 'null')
    args, chains = [], []
    for i, p in enumerate(parts):
        if p['speed'] != 1.0:
            args += ['-i', str(slow_source(p))]
        else:
            args += ['-ss', f"{p['in']:.3f}", '-t', f"{p['out'] - p['in'] + 0.2:.3f}", '-i', str(MASTER)]
        chains.append(f"[{i}:v]{grade},{geometry(kind, p['y'])},scale={size[0]}:{size[1]}:flags=lanczos,setsar=1,"
                      f'trim=end_frame={frames(p)},setpts=PTS-STARTPTS[v{i}]')
    concat = ''.join(f'[v{i}]' for i in range(len(parts)))
    graph = ';'.join(chains) + f';{concat}concat=n={len(parts)}:v=1:a=0[out]'
    run(args + ['-filter_complex', graph, '-map', '[out]'] + codec + TAGS + [str(out)])
    return out


def poster(clip_path, dest_stem, widths):
    """First frame of a clip -> WebP poster(s)."""
    dests = [OUT / f'{dest_stem}.{w}.webp' for w in widths]
    need = [fresh(d) for d in dests]
    if any(need):
        png = CACHE / '_poster.png'
        CACHE.mkdir(parents=True, exist_ok=True)
        run(['-i', str(clip_path), '-frames:v', '1', '-vf', YUV_TO_RGB, str(png)])
        img = Image.open(png)
        for w, dest in zip(widths, dests):
            h = round(img.height * w / img.width)
            img.resize((w, h), Image.LANCZOS).save(dest, 'WEBP', quality=80, method=6)
        png.unlink()
    return [d.name for d in dests]


def duration(path):
    out = subprocess.run([ffmpeg(), '-hide_banner', '-i', str(path)], capture_output=True, text=True).stderr
    hms = out.split('Duration: ')[1].split(',')[0]
    h, m, s = hms.split(':')
    return round(int(h) * 3600 + int(m) * 60 + float(s), 3)


def to_output_time(parts, t):
    """A master time inside a clip -> seconds into the finished clip."""
    n = 0
    for p in parts:
        if p['in'] <= t < p['out'] or (t == p['out'] and p is parts[-1]):
            return round((n + (t - p['in']) * FPS / p['speed']) / FPS, 3)
        n += frames(p)
    raise ValueError(f'{t} is not inside the clip')


def build_clips():
    manifest = {}
    for name, spec in CLIPS.items():
        n = sum(frames(p) for p in spec['parts'])
        entry = {'frames': n, 'duration': round(n / FPS, 3), 'variants': {}, 'posters': {}}
        for kind in spec['kinds']:
            for suffix, size, codec in VARIANTS[kind]:
                path = encode(name, spec, kind, suffix, size, codec)
                entry['variants'][suffix] = {'src': path.name, 'w': size[0], 'h': size[1],
                                             'kb': round(path.stat().st_size / 1024)}
                print(f'  {path.name:28s} {size[0]}x{size[1]}  {path.stat().st_size / 1e6:5.2f} MB')
            first, widths = POSTER[kind]
            entry['posters'][kind] = poster(OUT / f'{name}.{first}.mp4', f'{name}.{kind}', widths)
        encoded = duration(OUT / f'{name}.p1080.mp4')
        if abs(encoded - entry['duration']) > 1.5 / FPS:
            sys.exit(f'{name}: encoded {encoded}s, expected {entry["duration"]}s')
        if spec.get('cuts'):
            k, cuts = 0, []
            for p in spec['parts']:
                cuts.append({'t': round(k / FPS, 3), 'label': p['label']})
                k += frames(p)
            entry['cuts'] = cuts
        if spec.get('marks'):
            entry['marks'] = [{'t': to_output_time(spec['parts'], t), 'label': label} for label, t in spec['marks']]
        if spec.get('points'):
            p0 = spec['parts'][0]
            entry['points'] = {
                key: {'portrait': [x / SRC_W, y / SRC_H],
                      'wide': [x / SRC_W, (y - wide_top(p0['y'])) / 810]}
                for key, (x, y) in spec['points'].items()}
        manifest[name] = entry
    return manifest


def still_source(spec):
    """The master time to seek to and the frame to take from there."""
    at = spec['at']
    if isinstance(at, tuple):
        parts = CLIPS[at[1]]['parts']
        last = parts[-1]
        assert last['speed'] == 1.0
        return last['in'], frames(last) - 1
    return at, 0


def build_stills():
    STILLS_SRC.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for spec in STILLS:
        name = spec['name']
        src = STILLS_SRC / f'{name}.png'
        t, n = still_source(spec)
        if fresh(src):
            vf = f"select=eq(n\\,{n}),{spec.get('grade', 'null')},{YUV_TO_RGB}"
            run(['-ss', f'{t:.3f}', '-i', str(MASTER), '-vf', vf, '-frames:v', '1', '-fps_mode', 'passthrough', str(src)])
        img = Image.open(src).convert('RGB')
        files = []
        for w in (1080, 720):
            h = round(img.height * w / img.width)
            im = img.resize((w, h), Image.LANCZOS) if w != img.width else img
            for fmt, ext, kw in (('AVIF', 'avif', {'quality': 62}), ('WEBP', 'webp', {'quality': 82, 'method': 6})):
                dest = OUT / f'still-{name}.{w}.{ext}'
                if fresh(dest):
                    im.save(dest, fmt, **kw)
                files.append(dest.name)
        manifest[name] = {'w': img.width, 'h': img.height, 'files': files,
                          'master_time': round(t + n / FPS, 3)}
        print(f'  still {name:12s} {img.width}x{img.height} @ {t + n / FPS:.3f}s')
    return manifest


def remove_stale():
    for folder in (OUT, STILLS_SRC):
        for f in folder.iterdir():
            if f.is_file() and f.resolve() not in written:
                print(f'  removed {f.relative_to(ROOT)}')
                f.unlink()


def main():
    if not MASTER.exists():
        sys.exit(f'Master not found: {MASTER}')
    OUT.mkdir(parents=True, exist_ok=True)
    print('Clips')
    clips = build_clips()
    print('Stills')
    stills = build_stills()
    data = {'fps': FPS, 'clips': clips, 'stills': stills}
    manifest = OUT / 'manifest.js'
    written.add(manifest.resolve())
    manifest.write_text(
        '/* Generated by scripts/build_media.py. Do not edit. */\n'
        f'window.CS_MEDIA = {json.dumps(data, indent=1)};\n')
    remove_stale()
    total = sum(f.stat().st_size for f in OUT.iterdir())
    print(f'Done. {len(list(OUT.iterdir()))} files, {total / 1e6:.1f} MB in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
