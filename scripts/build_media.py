#!/usr/bin/env python3
"""Derive every Club Scottsdale production asset from the master footage.

The master (source-media/club-scottsdale-master.MOV) is read, never written.
Every output is one generation from it, never from another derivative.

Writes:
  source-media/stills/<name>.png        source-quality still extracts (lossless)
  public/media/club-scottsdale/         clips, posters, stills and manifest.js

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
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / 'source-media' / 'club-scottsdale-master.MOV'
STILLS_SRC = ROOT / 'source-media' / 'stills'
OUT = ROOT / 'public' / 'media' / 'club-scottsdale'
FORCE = '--force' in sys.argv

SRC_W, SRC_H = 1080, 1920
FPS = 30

# Each part is (in, out, wide_y). Times are seconds in the master, trimmed a
# frame or two inside every cut. wide_y is the vertical centre (0-1) of the
# 1080x810 crop used for landscape screens.
CLIPS = {
    # identity: the CS neon in the dark
    'neon': {'parts': [(49.25, 51.60, 0.45)], 'kinds': ['portrait']},
    # arrival: white Huracán. Re-ordered so it ends, and holds, on the car
    # pulled in under the sign: close pass, wide past the facade, under the sign.
    'arrival': {'parts': [(4.50, 5.94, 0.62), (2.97, 3.68, 0.60), (3.72, 4.45, 0.55)], 'kinds': ['portrait', 'wide']},
    # the lineup at the building, shot with the phone sideways
    'lineup': {'parts': [(6.02, 9.18, 0.5)], 'kinds': ['landscape'], 'rotate': True},
    # aerial: rise over the lot, then the glide over the collection
    'aerial': {'parts': [(9.27, 11.44, 0.55), (15.92, 19.07, 0.5)], 'kinds': ['portrait', 'wide']},
    # the continuous FPV flight: doorway, lounge, event floor, the collection
    'flight': {'parts': [(58.42, 74.33, 0.52)], 'kinds': ['portrait', 'wide']},
    # people: knowledge
    'p-session': {'parts': [(27.03, 28.85, 0.5)], 'kinds': ['portrait']},
    'p-lounge': {'parts': [(32.47, 35.27, 0.5)], 'kinds': ['portrait']},
    'p-room': {'parts': [(78.70, 80.22, 0.5)], 'kinds': ['portrait']},
    'p-applause': {'parts': [(76.95, 78.62, 0.5)], 'kinds': ['portrait']},
    # people: connection
    'p-network': {'parts': [(30.92, 32.40, 0.5)], 'kinds': ['portrait']},
    'p-dinner': {'parts': [(46.90, 48.40, 0.5)], 'kinds': ['portrait']},
    'p-panel': {'parts': [(51.72, 53.85, 0.5)], 'kinds': ['portrait']},
    'p-candid': {'parts': [(53.95, 55.62, 0.5)], 'kinds': ['portrait']},
    # crescendo: a lead-in of activity, then the rooms, cutting faster and faster
    'crescendo': {
        'kinds': ['portrait', 'wide'],
        'labels': True,
        'parts': [
            (55.72, 56.95, 0.52, 'sim racing'),
            (57.04, 58.30, 0.38, 'DJ at the neon'),
            (12.05, 12.85, 0.62, 'podcast recording'),
            (29.05, 29.80, 0.62, 'pickleball court'),
            (84.37, 84.79, 0.58, 'podcast studio'),
            (85.74, 86.14, 0.60, 'sim bay'),
            (86.74, 87.12, 0.50, 'barber chair'),
            (89.04, 89.42, 0.62, 'card room'),
            (87.67, 88.04, 0.40, 'terrace at sunset'),
            (88.10, 88.44, 0.42, 'gallery wall'),
            (88.54, 88.87, 0.62, 'chesterfield lounge'),
            (85.27, 85.59, 0.50, 'lounge and cars'),
            (89.94, 90.24, 0.60, 'window lounge, recliners'),
            (86.24, 86.54, 0.56, 'white sectional'),
            (87.21, 87.51, 0.62, 'white car, yellow SUV'),
            (83.97, 84.27, 0.56, 'red car, hex lights'),
            (89.51, 89.88, 0.60, 'matte car, hex reflections'),
        ],
    },
}

# Source-quality stills: (name, time, rotate)
STILLS = [
    ('helicopter', 0.60, False),
    ('overhead', 19.90, False),
    ('matte', 26.55, False),
    ('neon', 50.58, False),
    ('lineup', 6.55, True),
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
    'landscape': [
        ('l1920.hevc', (1920, 1080), HEVC + ['-crf', '26']),
        ('l1920', (1920, 1080), H264 + ['-crf', '22', '-maxrate', '6M', '-bufsize', '12M']),
        ('l960', (960, 540), H264 + ['-crf', '25', '-maxrate', '2M', '-bufsize', '4M']),
    ],
}

YUV_TO_RGB = 'scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24'


def ffmpeg():
    exe = os.environ.get('FFMPEG') or shutil.which('ffmpeg')
    if not exe:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
    return exe


def run(args):
    subprocess.run([ffmpeg(), '-hide_banner', '-v', 'error', '-y'] + args, check=True)


def frames(start, end):
    """Whole frames in a part. Trims are frame-exact so cut times stay in sync."""
    return round((end - start) * FPS)


def fresh(path):
    return FORCE or not path.exists()


def part_filter(kind, wide_y, rotate):
    """Per-part filter: source frame -> this variant's geometry (before scaling)."""
    if rotate:
        return 'transpose=2'
    if kind == 'wide':
        y = round(min(max(wide_y * SRC_H - 405, 0), SRC_H - 810))
        return f'crop=1080:810:0:{y}'
    return 'null'


def encode(name, spec, kind, suffix, size, codec):
    out = OUT / f'{name}.{suffix}.mp4'
    if not fresh(out):
        return out
    parts = spec['parts']
    args, chains = [], []
    for i, p in enumerate(parts):
        start, end, wide_y = p[0], p[1], p[2]
        args += ['-ss', f'{start:.3f}', '-t', f'{end - start + 0.2:.3f}', '-i', str(MASTER)]
        geo = part_filter(kind, wide_y, spec.get('rotate'))
        chains.append(f'[{i}:v]{geo},scale={size[0]}:{size[1]}:flags=lanczos,setsar=1,'
                      f'trim=end_frame={frames(start, end)},setpts=PTS-STARTPTS[v{i}]')
    concat = ''.join(f'[v{i}]' for i in range(len(parts)))
    graph = ';'.join(chains) + f';{concat}concat=n={len(parts)}:v=1:a=0[out]'
    run(args + ['-filter_complex', graph, '-map', '[out]'] + codec + TAGS + [str(out)])
    return out


def poster(clip_path, dest_stem, widths):
    """First frame of a clip -> WebP poster(s)."""
    png = OUT / '_poster.png'
    run(['-i', str(clip_path), '-frames:v', '1', '-vf', YUV_TO_RGB, str(png)])
    img = Image.open(png)
    names = []
    for w in widths:
        dest = OUT / f'{dest_stem}.{w}.webp'
        names.append(dest.name)
        if fresh(dest):
            h = round(img.height * w / img.width)
            img.resize((w, h), Image.LANCZOS).save(dest, 'WEBP', quality=80, method=6)
    png.unlink()
    return names


def duration(path):
    out = subprocess.run([ffmpeg(), '-hide_banner', '-i', str(path)], capture_output=True, text=True).stderr
    hms = out.split('Duration: ')[1].split(',')[0]
    h, m, s = hms.split(':')
    return round(int(h) * 3600 + int(m) * 60 + float(s), 3)


def build_clips():
    manifest = {}
    for name, spec in CLIPS.items():
        entry = {'variants': {}, 'posters': {}}
        for kind in spec['kinds']:
            for suffix, size, codec in VARIANTS[kind]:
                path = encode(name, spec, kind, suffix, size, codec)
                entry['variants'][suffix] = {'src': path.name, 'w': size[0], 'h': size[1],
                                             'kb': round(path.stat().st_size / 1024)}
                print(f'  {path.name:28s} {size[0]}x{size[1]}  {path.stat().st_size / 1e6:5.2f} MB')
            first = {'portrait': 'p1080', 'wide': 'w1080', 'landscape': 'l1920'}[kind]
            widths = {'portrait': [1080, 720], 'wide': [1080], 'landscape': [1920, 960]}[kind]
            entry['posters'][kind] = poster(OUT / f'{name}.{first}.mp4', f'{name}.{kind}', widths)
            entry['duration'] = duration(OUT / f'{name}.{first}.mp4')
        if spec.get('labels'):
            n, cuts = 0, []
            for p in spec['parts']:
                cuts.append({'t': round(n / FPS, 3), 'label': p[3]})
                n += frames(p[0], p[1])
            entry['cuts'] = cuts
        manifest[name] = entry
    return manifest


def build_stills():
    STILLS_SRC.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for name, t, rotate in STILLS:
        src = STILLS_SRC / f'{name}.png'
        if fresh(src):
            vf = ('transpose=2,' if rotate else '') + YUV_TO_RGB
            run(['-ss', f'{t:.3f}', '-i', str(MASTER), '-frames:v', '1', '-vf', vf, str(src)])
        img = Image.open(src).convert('RGB')
        widths = [1920, 960] if img.width > img.height else [1080, 720]
        files = []
        for w in widths:
            h = round(img.height * w / img.width)
            im = img.resize((w, h), Image.LANCZOS) if w != img.width else img
            for fmt, ext, kw in (('AVIF', 'avif', {'quality': 62}), ('WEBP', 'webp', {'quality': 82, 'method': 6})):
                dest = OUT / f'still-{name}.{w}.{ext}'
                if fresh(dest):
                    im.save(dest, fmt, **kw)
                files.append(dest.name)
        manifest[name] = {'w': img.width, 'h': img.height, 'files': files, 'master_time': t}
        print(f'  still {name:12s} {img.width}x{img.height} @ {t}s')
    return manifest


def main():
    if not MASTER.exists():
        sys.exit(f'Master not found: {MASTER}')
    OUT.mkdir(parents=True, exist_ok=True)
    print('Clips')
    clips = build_clips()
    print('Stills')
    stills = build_stills()
    data = {'clips': clips, 'stills': stills}
    (OUT / 'manifest.js').write_text(
        '/* Generated by scripts/build_media.py. Do not edit. */\n'
        f'window.CS_MEDIA = {json.dumps(data, indent=1)};\n')
    total = sum(f.stat().st_size for f in OUT.iterdir())
    print(f'Done. {len(list(OUT.iterdir()))} files, {total / 1e6:.1f} MB in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
