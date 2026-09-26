# Club Scottsdale master footage — media map

Source: `source-media/club-scottsdale-master.MOV` (immutable, not modified by this map).

## File properties (verified with ffmpeg/ffprobe)

| | |
|---|---|
| Container | QuickTime `.MOV` (mov,mp4,m4a,3gp,3g2,mj2) |
| Duration | 00:01:30.95 (90.95s) |
| Video codec | HEVC (Main profile), yuv420p, bt709 |
| Coded size | 1080×1920 (portrait) — one segment's content is native landscape, see Orientation below |
| Frame rate | 30 fps (30 tbr) |
| Video bitrate | ~7.77 Mbps |
| Audio | AAC-LC, 44.1 kHz, stereo, ~122 kbps |
| Overall bitrate | ~7.9 Mbps |
| File size | 89,808,779 bytes (~85.6 MB) |

**Provenance note:** the container metadata carries `encoder: Lavf57.71.100`, `te_is_reencode: 1`, and a `DreaminaMetaInfo` tag (Dreamina is a third-party AI video tool). This means the file has passed through at least one re-encode/re-mux step rather than being an untouched camera original — it is not a raw phone/camera file. That said, I cross-checked its visual content frame-by-frame against the previously-analyzed selects reel and amenities recording: the people, cars, spaces and events all match, so the content itself is authentic footage from the same shoot, just re-encoded at some point. Flagging this so it's not assumed to be a byte-for-byte camera original.

**Quality vs. earlier sources:** this file is visibly cleaner than the "selects reel" used for the current previs build — no Instagram handle overlays, no music stickers, no baked-in titles were found in any sampled frame (~30 frames checked across the full duration). It is effectively the same tier of clean source as the amenities recording, but ~10x longer and covering both the cars/arrival content and the event/amenities content in one file.

## Orientation

The container reports no rotation metadata (tkhd matrix is identity on both tracks) and no rotation side-data. Content is portrait (matches the coded 1080×1920) for the entire file **except**:

- **5.97s–9.23s** (segment 4 below): shot with the phone held sideways (landscape content in the portrait-coded frame). Confirmed fix: `-vf transpose=2` (rotate 90° counter-clockwise) recovers correct upright 1920×1080 landscape framing. Verified by re-encoding a test clip and inspecting the output frame.

All other sampled segments (~30 timestamps spread across 0–91s, including the aerial/drone lot shots which can look ambiguous at a glance) were confirmed upright without correction. If further segments turn out to need rotation when cutting final clips, verify per-clip rather than assuming — this file mixes orientations exactly like the original selects reel did.

## Extraction confirmed working

- **Full-resolution stills:** `ffmpeg -ss <t> -i club-scottsdale-master.MOV -frames:v 1 -q:v 1 out.png` → clean 1080×1920 PNG stills, no artifacts.
- **Derived clips:** `ffmpeg -ss <in> -to <out> -i club-scottsdale-master.MOV -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k clip.mp4` → clean re-encoded H.264 clips, correct duration, playable, audio intact.
- **Rotation-corrected clips:** same as above with `-vf transpose=2` added for the one landscape segment — verified correct output orientation.

## Timestamped segment map

65 segments detected by scene-cut analysis (`ffmpeg select='gt(scene,0.15)'`), each with a first-pass description from a mid-segment still. These are quick-look descriptions for planning — re-check the actual frame before committing to a shot, especially for the short (<0.5s) montage cuts in the 40–49s and 83–90s bands, and cross-reference against the previously catalogued reel shots where noted.

| # | Start–End (s) | Len | Description | Notes |
|---|---|---|---|---|
| 0 | 0.00–2.93 | 2.93 | Helicopter parked under the lit "CLUB SCOTTSDALE" sign, dusk. | Matches old reel shot 1. |
| 1 | 2.93–3.70 | 0.77 | White Huracán arriving at the building, dusk, signage visible. | |
| 2 | 3.70–4.47 | 0.77 | White Huracán, closer angle, same arrival. | |
| 3 | 4.47–5.97 | 1.50 | White Huracán low tracking shot, glass facade with hex-light reflections. | |
| 4 | 5.97–9.23 | 3.27 | Car-stacker/lift system, palm trees, building plaque "14982". | **Landscape** — needs `transpose=2`. |
| 5 | 9.23–11.47 | 2.23 | Aerial/rooftop parking, hex-marked spots, orange + green cars from above. | |
| 6 | 11.47–15.83 | 4.37 | Two men in a studio/podcast setting, one presenting to the other, screens behind. | |
| 7 | 15.83–19.10 | 3.27 | Top-down drone over the lot: Porsche, black car, rooftop edge. | |
| 8 | 19.27–19.53 | 0.27 | Building exterior / palm trees, quick cut. | |
| 9 | 19.53–20.73 | 1.20 | Building entrance, daytime, glass facade, "CLUB SCOTTSDALE" sign. | |
| 10 | 20.77–21.37 | 0.60 | Aerial lot, people walking among rows of cars (red, orange). | |
| 11 | 21.40–24.30 | 2.90 | Top-down drone: white R8, Corvette, McLaren, palm trees. | Confirmed upright; initial spot-check reading was wrong. |
| 12 | 24.30–25.50 | 1.20 | Building entrance signage, ground level. | |
| 13 | 25.50–27.00 | 1.50 | Matte gray/black Lamborghini under hex lights, interior. | |
| 14 | 27.00–29.00 | 2.00 | Speaker presenting to a seated crowd, screen behind. | |
| 15 | 29.00–30.87 | 1.87 | Pickleball court exterior, "CS" branding on the fence. | |
| 16 | 30.87–32.43 | 1.57 | Men networking under hex lights, business-casual. | |
| 17 | 32.43–35.33 | 2.90 | "LOUNGE" sign visible, speaker addressing a small seated group. | Same setup used for previs shot 40. |
| 18 | 35.33–36.73 | 1.40 | Speaker at a whiteboard/flip chart, hex ceiling. | |
| 19 | 36.73–37.77 | 1.03 | Mixed group mingling under hex lights. | |
| 20 | 37.80–38.53 | 0.73 | Men networking, event attire. | |
| 21 | 38.57–39.70 | 1.13 | Group of ~6 networking under hex lights. | |
| 22 | 39.70–40.07 | 0.37 | Two men in close conversation. | |
| 23 | 40.07–40.87 | 0.80 | Larger crowd mingling, women in event dresses. | |
| 24 | 40.87–41.23 | 0.37 | Crowd continues, different angle. | |
| 25 | 41.23–41.63 | 0.40 | Group chatting, casual polos. | |
| 26 | 41.63–42.43 | 0.80 | Two men greeting. | |
| 27 | 42.43–43.23 | 0.80 | Crowd milling under hex lights. | |
| 28 | 43.23–43.63 | 0.40 | Group in green polos talking, quick cut. | |
| 29 | 43.63–44.00 | 0.37 | Same group, continuing. | |
| 30 | 44.23–44.57 | 0.33 | Networking, short montage cut. | |
| 31 | 44.57–45.27 | 0.70 | Pickup truck close-up in a garage bay. | |
| 32 | 45.27–46.03 | 0.77 | Crowd scene, event tables, candid. | |
| 33 | 46.03–46.87 | 0.83 | Dinner/seated crowd, long table. | |
| 34 | 46.87–47.67 | 0.80 | Seated crowd, speaker visible in background. | |
| 35 | 47.67–48.43 | 0.77 | Audience clapping/reacting. | |
| 36 | 48.43–49.17 | 0.73 | Man in a red cap in the crowd. | |
| 37 | 49.17–51.67 | 2.50 | "CS" neon logo on a black wall — clean, no overlay. | Candidate replacement for the old still-only logo-wall shot; this one is native video. |
| 38 | 51.67–53.90 | 2.23 | Dinner/reception, monitors showing event graphics, MC talking. | |
| 39 | 53.90–55.67 | 1.77 | People networking, seated area. | |
| 40 | 55.67–57.00 | 1.33 | Racing sim rig, DJ booth, "Club CS Scottsdale" neon visible. | |
| 41 | 57.00–58.37 | 1.37 | Lounge, white sectional sofas, guests mingling. | |
| 42 | 58.37–61.90 | 3.53 | Aerial/wide of the car collection + lounge area. | Good hero candidate for a "collection" chapter. |
| 43 | 61.90–74.37 | 12.47 | Long dinner/mastermind sequence: seated crowd, speaker addressing the room. | Longest segment — worth sub-dividing into multiple cuts on a closer pass. |
| 44 | 74.40–76.87 | 2.47 | DJ booth / lounge continues. | |
| 45 | 76.90–78.67 | 1.77 | Reception area, more seating, guests arriving. | |
| 46 | 78.67–80.27 | 1.60 | Audience seated, two screens with car content behind the speaker. | |
| 47 | 80.27–81.47 | 1.20 | Camera operator filming a seated interview — behind-the-scenes/content shot. | Good "Media" amenity candidate. |
| 48 | 81.47–82.67 | 1.20 | Two men talking, one in a white shirt. | |
| 49 | 82.67–83.93 | 1.27 | Same pair, continuing. | |
| 50 | 83.93–84.33 | 0.40 | DJ performing on turntables, "Club CS Scottsdale" neon sign. | Strong events/nightlife shot. |
| 51 | 84.33–84.80 | 0.47 | Reception/lounge, guests walking past. | |
| 52 | 84.80–85.23 | 0.43 | Hex-ceiling wide shot, monitor with car content, lounge crowd. | Good "Media" amenity candidate, cleaner than the mastermind-session clip used in the current previs Ecosystem chapter. |
| 53 | 85.23–85.70 | 0.47 | Audience clapping. | |
| 54 | 85.70–86.20 | 0.50 | Man presenting, crowd clapping. | |
| 55 | 86.20–86.70 | 0.50 | Bearded man speaking, close on the mic. | Candid speaker portrait. |
| 56 | 86.70–87.17 | 0.47 | Racing simulator, VR/sim rig with monitors above. | |
| 57 | 87.17–87.63 | 0.47 | Red Huracán under hex lights. | |
| 58 | 87.63–88.07 | 0.43 | Home-office desk setup: monitor, chair, flag, hex lights. | Matches the "Workspace" amenity still used in the current previs (am16). |
| 59 | 88.07–88.50 | 0.43 | White sectional sofas, media screen, neon "Scottsdale" sign. | |
| 60 | 88.50–89.00 | 0.50 | Racing simulators row, barber-chair cover partially visible. | |
| 61 | 89.00–89.47 | 0.47 | Card/poker table, green felt, dark room. | Matches the "Play" amenity still used in the current previs (am13). |
| 62 | 89.47–89.90 | 0.43 | Matte gray/black Aventador-style car, garage bay. | |
| 63 | 89.90–90.37 | 0.47 | Rooftop terrace at sunset, lounge seating, city view. | Matches the "Unwind" amenity still used in the current previs (am10). |
| 64 | 90.37–90.90 | 0.53 | Framed car photos on a black wall. | Matches the gallery-wall amenity still (am12). |

## Next steps (not yet done)

This map is inspection-only, per instructions — no previs files were changed. Before using this footage in the build:

1. Re-review each candidate segment at its native frame rate (some of the <0.5s cuts in the 20–49s and 50–90s bands are quick montage cuts inside longer camera takes — the scene-cut detector may have split a single pan/whip into several "segments" that are really one shot).
2. Decide which segments replace/supplement the clips currently used in `previs/media/` (several strong candidates are noted above, e.g. #37, #47, #52, #55 for cleaner alternatives to existing previs shots).
3. Re-run the same rotation spot-check on any segment before cutting it, since orientation is per-clip, not global.
