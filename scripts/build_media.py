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


def P(t_in, t_out, y=0.5, speed=1.0, label=None, reverse=False, src=None):
    """One part of a clip. Times are seconds in the master, trimmed a frame or two
    inside every cut. y is the vertical centre (0-1) of the 1080x810 crop used on
    landscape screens. speed < 1 is motion-interpolated slow motion; reverse plays
    the part backwards."""
    return {'in': t_in, 'out': t_out, 'y': y, 'speed': speed, 'label': label, 'reverse': reverse, 'src': src}


# Supplied footage (not from the master), identified by the client.
KYLER = ROOT / 'source-media' / 'people' / 'kyler-murray.mov'      # 720x1280, 4 s, ~24 fps


CLIPS = {
    # aerial, the first moving shot after the cover: the drone's rise off the tent,
    # reversed, so it starts high over the lot and descends. The descent quickens as it
    # nears the cars (0.4x, 0.55x, 0.75x) and stops short of the near-still frames at the
    # start of the rise, so it never settles on the McLaren. While it descends the frame
    # drifts toward the car's left side ('drift'), then a half-second blend moving the
    # same way as the flyover ('xfade', smoothleft) carries it into the glide down the row,
    # which plays its whole run at 0.75x so every car gets its moment.
    'aerial': {'parts': [P(10.10, 11.44, 0.40, speed=0.4, reverse=True),
                         P(9.70, 10.10, 0.40, speed=0.55, reverse=True),
                         P(9.35, 9.70, 0.40, speed=0.75, reverse=True),
                         P(15.86, 19.07, 0.5, speed=0.75)],
               'kinds': ['portrait', 'wide'], 'cuts': True,
               'drift': {'zoom': 0.12, 'x': 0.34}, 'xfade': 0.5},
    # the FPV flight, whole from the doorway: the front desk and the white sectionals under
    # the neon (the first beat, under "A look inside"), the event floor at normal speed, the
    # collection at 1.45x so it does not linger, then through the source's own cut (74.367)
    # into the room with the round white sofa, the Lounge, played to its own cut (76.867)
    # and never trimmed: at a steady 0.9x, no held or slowed frames at the end.
    'flight': {'parts': [P(58.42, 62.25, 0.52), P(62.25, 66.60, 0.52),
                         P(66.60, 74.35, 0.52, speed=1.45),
                         P(74.37, 76.85, 0.62, speed=0.9)],
               'kinds': ['portrait', 'wide'],
               'marks': [('The Floor', 62.25), ('The Collection', 66.60), ('The Lounge', 74.95)]},
    # people. Learn: Jeremy Miner presenting (the whole shot, at 0.45x so his name can be
    # read), then the audience. Connect: the table, the dinner, a supplied clip of Kyler
    # Murray, the room, a candid conversation.
    'p-session': {'parts': [P(27.03, 28.97, speed=0.45)], 'kinds': ['portrait']},
    'p-lounge': {'parts': [P(32.47, 35.27)], 'kinds': ['portrait']},    # teaching a small group (LOUNGE)
    'p-room': {'parts': [P(78.70, 80.22)], 'kinds': ['portrait']},      # on a microphone, a room of ~100
    'p-applause': {'parts': [P(76.95, 78.62)], 'kinds': ['portrait'], 'fps': 30, 'trim_frames': 51},
    'p-dinner': {'parts': [P(46.90, 48.40)], 'kinds': ['portrait'], 'fps': 30, 'trim_frames': 45},
    'p-kyler': {'parts': [P(0.02, 4.00, speed=0.8, src=KYLER)], 'kinds': ['portrait']},
    'p-network': {'parts': [P(30.92, 32.40)], 'kinds': ['portrait'], 'fps': 30, 'trim_frames': 45},
    'p-candid': {'parts': [P(53.95, 55.62)], 'kinds': ['portrait'], 'fps': 30, 'trim_frames': 51},
    # amenities, in three groups the page names as they play: connect (social spaces),
    # create (the podcast studio), unwind (the real amenities). Fewer, longer shots than
    # the old edit; the shortest are slowed so each one can be recognised.
    'crescendo': {
        'kinds': ['portrait', 'wide'],
        'cuts': True,
        'parts': [
            P(57.04, 58.30, 0.38, label='connect'),                 # DJ at the neon
            P(89.04, 89.42, 0.62, speed=0.5, label='connect'),      # card room
            P(88.54, 88.87, 0.62, speed=0.5, label='connect'),      # chesterfield lounge
            P(51.72, 53.85, 0.60, label='connect'),                 # the seated group on the white sofa
            P(11.62, 15.75, 0.62, label='create'),                  # podcast recording: the whole take, to the cut at 15.83
            P(84.37, 84.79, 0.58, speed=0.5, label='create'),       # podcast studio
            P(55.72, 56.95, 0.52, label='unwind'),                  # sim racing
            P(29.05, 29.80, 0.62, label='unwind'),                  # pickleball court
            P(86.74, 87.12, 0.50, speed=0.5, label='unwind'),       # barber chair
            P(87.67, 88.04, 0.40, speed=0.5, label='unwind'),       # terrace at sunset
        ],
    },
}

# Source-quality stills. 'at' is a master time, or ('last', clip) for the exact
# final frame of a clip.
STILLS = [
    {'name': 'helicopter', 'at': 0.60},
    # the value moment: a supplied photograph of a session under the hex lights, when it
    # is in source-media/value/; until then the same room from the master
    {'name': 'room', 'at': 28.40, 'file': ROOT / 'source-media' / 'value' / 'club-scottsdale-room.webp'},
    # supplied photo: Michael Lanctot and Bob Menery at Club Scottsdale
    {'name': 'lanctot', 'at': 0, 'file': ROOT / 'source-media' / 'people' / 'lanctot-menery.jpg'},
]

# The editorial cover: a supplied aerial sunset still of the building (not from the
# master). Wide screens get it as is. Phones get a composed portrait: a crop around
# the facade and sign, placed high on a tall canvas, the sky above it softly extended
# from its own top edge and the ground below fading to black under the type.
COVER = ROOT / 'source-media' / 'cover' / 'club-scottsdale-cover.webp'
COVER_TALL = {'center_x': 960, 'crop_w': 660, 'aspect': 9 / 19.5, 'top': 0.15}

H264 = ['-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
        '-g', '30', '-keyint_min', '30', '-sc_threshold', '0']
HEVC = ['-c:v', 'libx265', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-tag:v', 'hvc1',
        '-x265-params', 'keyint=30:min-keyint=30:scenecut=0:open-gop=0:log-level=error']
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
    """Lossless intermediate for a part that is slowed (motion-interpolated) and/or
    reversed. The source is trimmed frame-exact first, so nothing past the cut ends up
    at the start of a reversed part."""
    CACHE.mkdir(parents=True, exist_ok=True)
    rev = '-rev' if p['reverse'] else ''
    src = p['src'] or MASTER
    tag = '' if src == MASTER else f'{src.stem}-'
    path = CACHE / f"slow-{tag}{p['in']:.2f}-{p['out']:.2f}-{p['speed']:.2f}{rev}.mkv"
    if not path.exists():
        rate = Fraction(FPS) / Fraction(str(p['speed']))
        if src == MASTER:
            vf = f"trim=end_frame={round((p['out'] - p['in']) * FPS)},setpts=PTS-STARTPTS"
        else:   # other frame rates and full-range phone video: trim by time, bring to tv range
            vf = f"trim=duration={p['out'] - p['in']:.3f},setpts=PTS-STARTPTS,scale=in_range=pc:out_range=tv,format=yuv420p"
        if p['reverse']:
            vf += ',reverse'
        if p['speed'] > 1.0:     # faster: drop frames evenly, no interpolation needed
            vf += f",setpts=PTS/{p['speed']},fps={FPS}"
        elif p['speed'] != 1.0:
            vf += (f',minterpolate=fps={rate.numerator}/{rate.denominator}:mi_mode=mci:mc_mode=aobmc:'
                   f"me_mode=bidir:vsbmc=1,setpts=PTS/{p['speed']},fps={FPS}")
        print(f'  intermediate {p["in"]}-{p["out"]} at {p["speed"]}x{" reversed" if rev else ""} (slow)')
        run(['-ss', f"{p['in']:.3f}", '-t', f"{p['out'] - p['in'] + 0.2:.3f}", '-i', str(src),
             '-vf', vf, '-an', '-c:v', 'libx264', '-qp', '0', '-preset', 'ultrafast', str(path)])
    return path


def encode(name, spec, kind, suffix, size, codec):
    out = OUT / f'{name}.{suffix}.mp4'
    if not fresh(out):
        return out
    parts = spec['parts']
    grade = spec.get('grade', 'null')
    args, chains = [], []
    for i, p in enumerate(parts):
        if p['speed'] != 1.0 or p['reverse'] or p['src']:
            args += ['-i', str(slow_source(p))]
        else:
            args += ['-ss', f"{p['in']:.3f}", '-t', f"{p['out'] - p['in'] + 0.2:.3f}", '-i', str(MASTER)]
        # slowed parts can come out a frame or two short: pad with the last frame (at most
        # four, invisible) so the frame-exact trim always has enough
        chains.append(f"[{i}:v]{grade},{geometry(kind, p['y'])},scale={size[0]}:{size[1]}:flags=lanczos,setsar=1,"
                      f"tpad=stop_mode=clone:stop=4,trim=end_frame={spec.get('trim_frames', frames(p))},setpts=PTS-STARTPTS[v{i}]")
    if spec.get('xfade'):
        # every part but the last is one move (with an optional drift), blended into the last
        lead = parts[:-1]
        d = sum(frames(q) for q in lead) / FPS
        chains = []
        for i, q in enumerate(lead):
            chains.append(f'[{i}:v]{grade},setsar=1,trim=end_frame={frames(q)},setpts=PTS-STARTPTS[s{i}]')
        move = f"{''.join(f'[s{i}]' for i in range(len(lead)))}concat=n={len(lead)}:v=1:a=0"
        dr = spec.get('drift')
        if dr:
            z, x = dr['zoom'], dr['x']
            move += (f",scale=w='trunc(iw*(1+{z}*t/{d:.3f})/2)*2':h='trunc(ih*(1+{z}*t/{d:.3f})/2)*2':eval=frame:flags=lanczos"
                     f",crop={SRC_W}:{SRC_H}:x='(iw-{SRC_W})*(0.5+({x}-0.5)*t/{d:.3f})':y='(ih-{SRC_H})/2'")
        y0 = lead[-1]['y']
        chains.append(f"{move},{geometry(kind, y0)},scale={size[0]}:{size[1]}:flags=lanczos,setsar=1,fps={FPS}[a]")
        last = parts[-1]
        k = len(parts) - 1
        chains.append(f"[{k}:v]{grade},{geometry(kind, last['y'])},scale={size[0]}:{size[1]}:flags=lanczos,setsar=1,"
                      f"trim=end_frame={frames(last)},setpts=PTS-STARTPTS,fps={FPS}[b]")
        xf = spec['xfade']
        graph = ';'.join(chains) + f';[a][b]xfade=transition=smoothleft:duration={xf}:offset={d - xf:.3f}[out]'
    else:
        concat = ''.join(f'[v{i}]' for i in range(len(parts)))
        # (no frame rate leaves the graph unless asked for: ffmpeg then falls back to 25 fps.
        # These short clips were first built at the master's 30 fps, 'fps' keeps them there.)
        fps = f",fps={spec['fps']}" if spec.get('fps') else ''
        graph = ';'.join(chains) + f';{concat}concat=n={len(parts)}:v=1:a=0{fps}[out]'
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
        n = sum(frames(p) for p in spec['parts']) - round(spec.get('xfade', 0) * FPS)
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
        if spec.get('cuts') and spec.get('xfade'):
            lead = sum(frames(p) for p in spec['parts'][:-1]) / FPS
            entry['cuts'] = [{'t': 0.0, 'label': None}, {'t': round(lead - spec['xfade'], 3), 'label': None}]
        elif spec.get('cuts'):
            k, cuts = 0, []
            for p in spec['parts']:
                cuts.append({'t': round(k / FPS, 3), 'label': p['label']})
                k += frames(p)
            entry['cuts'] = cuts
        if spec.get('marks'):
            entry['marks'] = [{'t': to_output_time(spec['parts'], t), 'label': label} for label, t in spec['marks']]
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
        supplied = spec.get('file')
        if supplied and supplied.exists():
            written.add(src.resolve())
            from PIL import ImageOps
            ImageOps.exif_transpose(Image.open(supplied)).convert('RGB').save(src)
        elif fresh(src):
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


def build_cover():
    from PIL import ImageFilter
    src = Image.open(COVER).convert('RGB')
    W, H = src.size
    out = {'wide': [], 'tall': []}
    for w in (W, 1200):
        im = src if w == W else src.resize((w, round(H * w / W)), Image.LANCZOS)
        for fmt, ext, kw in (('AVIF', 'avif', {'quality': 70}), ('WEBP', 'webp', {'quality': 86, 'method': 6})):
            dest = OUT / f'cover-wide.{w}.{ext}'
            if fresh(dest):
                im.save(dest, fmt, **kw)
            out['wide'].append(dest.name)
    # the phone composition
    c = COVER_TALL
    cw = c['crop_w']
    x0 = max(0, min(W - cw, c['center_x'] - cw // 2))
    crop = src.crop((x0, 0, x0 + cw, H))
    ch = round(cw / c['aspect'])
    top = round(ch * c['top'])
    canvas = Image.new('RGB', (cw, ch), (0, 0, 0))
    # sky: the sky colour just under the photo's darker top edge (rows 18-40), smoothed
    # sideways and stretched upward, deepening toward the top of the screen
    row = crop.crop((0, 18, cw, 40)).resize((cw, 1), Image.BOX).filter(ImageFilter.GaussianBlur(30))
    sky = row.resize((cw, top + 160), Image.BILINEAR)
    shade = Image.linear_gradient('L').resize((cw, top + 160))     # 0 at top -> 255 at bottom
    canvas.paste(Image.composite(sky, Image.new('RGB', sky.size, (0, 0, 0)), shade.point(lambda v: 70 + v * 185 // 255)), (0, 0))
    # the photograph, from below its dark top edge, feathered into the sky over 150 px
    crop = crop.crop((0, 14, cw, H))
    ph = crop.height
    feather = Image.new('L', crop.size, 255)
    feather.paste(Image.linear_gradient('L').resize((cw, 150)), (0, 0))
    canvas.paste(crop, (0, top), feather)
    # below the photograph: black (the type sits here); feather its bottom 120 px
    fade = Image.linear_gradient('L').transpose(Image.FLIP_TOP_BOTTOM).resize((cw, 120))
    bottom = crop.crop((0, ph - 120, cw, ph))
    canvas.paste(Image.new('RGB', (cw, 120), (0, 0, 0)), (0, top + ph - 120), Image.eval(fade, lambda v: 255 - v))
    canvas.paste(bottom, (0, top + ph - 120), fade)
    for w in (1080, 720):
        im = canvas.resize((w, round(ch * w / cw)), Image.LANCZOS)
        for fmt, ext, kw in (('AVIF', 'avif', {'quality': 70}), ('WEBP', 'webp', {'quality': 86, 'method': 6})):
            dest = OUT / f'cover-tall.{w}.{ext}'
            if fresh(dest):
                im.save(dest, fmt, **kw)
            out['tall'].append(dest.name)
    print(f'  cover wide {W}x{H}, tall {cw}x{ch} (crop x {x0}-{x0 + cw}, photo at {top}px)')
    return {'wide': {'w': W, 'h': H, 'files': out['wide']},
            'tall': {'w': 1080, 'h': round(ch * 1080 / cw), 'files': out['tall']}}


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
    print('Cover')
    cover = build_cover()
    data = {'fps': FPS, 'clips': clips, 'stills': stills, 'cover': cover}
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
