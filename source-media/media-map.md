# Club Scottsdale master footage — media map

Source: `source-media/club-scottsdale-master.MOV`. Immutable: nothing in this repo
writes to it. Every production asset is derived directly from it by
`scripts/build_media.py` (one generation, never from another derivative).

SHA-256 `49c643c17cf2e66d1a764283515fc96459076e7101807712d00ef7c5ad29bb53`

## File properties

| | |
|---|---|
| Container | QuickTime `.MOV` |
| Duration | 00:01:30.95 (90.95 s) |
| Video | HEVC Main, yuv420p, bt709, 1080×1920, 30 fps, ~7.8 Mbps |
| Audio | AAC-LC, 44.1 kHz stereo (not used; every clip is muted) |
| Size | 89,808,779 bytes |

**Provenance.** The container carries `encoder: Lavf57.71.100`, `te_is_reencode: 1` and a
`DreaminaMetaInfo` tag, so it has been re-encoded at least once and is not a camera
original. Its content matches the earlier selects reel and amenities recording
shot for shot, and it is cleaner than both: no Instagram handles, stickers or baked-in
titles anywhere in the 91 seconds.

**Orientation.** No rotation metadata. Two stretches were shot with the phone sideways
and need `transpose=2` (90° counter-clockwise), which turns them into true 1920×1080
landscape: **5.97–9.23 s** and **81.47–83.93 s**. Everything else is upright portrait.

## Corrected scene map

Re-watched as moving footage at 2–4 fps (and frame by frame at the edges). The first
pass was built from single mid-segment stills and got several sequences wrong;
the biggest correction is the interior flight at 58.4–74.3 s, previously logged
as a "dinner / mastermind sequence".

| In–out (s) | What happens | Notes |
|---|---|---|
| 0.00–2.93 | Helicopter parked under the lit CLUB SCOTTSDALE sign, dusk. Locked-off. | Still: `helicopter` @ 0.60 |
| 2.93–5.97 | White Huracán arrives: rolls past the hex-lit facade (2.93), pulls in under the sign (3.70), close along the door (4.47). | Three cuts |
| 5.97–9.23 | Golden-hour lineup at the building, slow push: white Corvette, R8, orange McLaren. | **Sideways**, rotate. Still: `lineup` @ 6.55 |
| 9.23–11.47 | Top-down drone over the branded tent and McLarens, rising to reveal the lot. | |
| 11.47–15.83 | Podcast in the dark studio: two hosts, orange McLaren behind; then a guest in white. | |
| 15.83–19.10 | Overhead glide down the row: Corvette, R8, McLaren, AMG, McLaren. | |
| 19.10–20.73 | Overhead: a white 911, centred, hatched bay beside it. | Still: `overhead` @ 19.90 |
| 20.73–24.30 | Elevated sweep: red Huracán, grey STO, white R8, white G-wagon, lupins in the foreground. | |
| 24.30–25.50 | White GT3 RS under the sign, daylight. | |
| 25.50–27.00 | Matte grey Huracán under the hex lights beside the Club Scottsdale neon. | Still: `matte` @ 26.55 |
| 27.00–29.00 | Session: presenter at a screen, seated room, hex ceiling. | People |
| 29.00–30.87 | Pickleball on the branded court, daylight. | |
| 30.87–32.43 | Networking under the hex lights, suits (white suit, centre). | People |
| 32.43–35.33 | LOUNGE session: speaker teaching a small seated group. | People |
| 35.33–36.73 | Whiteboard session; a red cap blocks the foreground. | Not used |
| 36.73–37.77 | Host with a mic in front of the neon. | |
| 37.80–46.03 | Evening event: the matte Huracán from behind, crowd, greetings, handshakes, a hug, dinner tables laughing. | Many short cuts |
| 46.03–49.17 | Dinner: speaker on the floor, long tables listening, guests laughing. | People |
| 49.17–51.67 | The CS / CLUB SCOTTSDALE neon on black. Clean, native video. | Still: `neon` @ 50.58 |
| 51.67–53.90 | Panel on white sofas, car footage on the screens behind. | People |
| 53.90–55.67 | Two men in conversation, candid. | People |
| 55.67–57.00 | Sim racing (F1 rig). | |
| 57.00–58.37 | DJ in front of the Club CS Scottsdale neon. | |
| **58.37–74.37** | **Continuous interior FPV flight during an evening event.** Follows guests through a doorway (58.4), glides through the lounge past the white sectionals and the neon (59.4), through a dark door frame (61.9), onto the event floor past the drinks fridge and the crowd in evening wear (62.3), over the matte Huracán (63.5–66.3), banks down the row of white cars under the yellow lifts (66.6–71), and ends low over the green AMG (71–74.3). | **Hero asset.** ~15.9 s |
| 74.37–76.87 | Gimbal glide into the hex-lit studio lounge: curved white sofa, guests, screens. | |
| 76.87–78.67 | Young attendees applauding, faces large. | People |
| 78.67–80.27 | Speaker in navy walks a room of ~100 young attendees with a mic. | People |
| 80.27–81.47 | Bearded speaker in a cap, mic, close. | |
| 81.47–83.93 | Guests at the hex wall; sim rig. | **Sideways** |
| 83.93–90.90 | Amenity edit, ~0.45 s a shot: red Huracán, podcast studio, office, lounge and cars, sim bay, white sectional, barber chair, STO and G-wagon, terrace at sunset, gallery wall, chesterfield lounge, card room, matte Aventador, window lounge with recliners, catering. | Clean to the last frame |

## Final selects (what the experience uses)

| Asset | Master in–out | Type | Use | Length | Phones |
|---|---|---|---|---|---|
| `neon` | 49.25–51.60 | video + still | Identity: glows inside the slit that opens the chapter | 2.4 s | Contained in the slit, never cropped |
| `arrival` | 2.97–5.94 | video | The entrance: rolls in inside the slit, then opens to full bleed | 3.0 s | Portrait native |
| `lineup` | 6.02–9.18 | video (rotated) | Scale at the building | 3.2 s | Cinemascope band; desktop full bleed at native 1920×1080 |
| `aerial` | 9.27–11.44 + 15.92–19.07 | video | The camera rises over the lot | 5.4 s | Portrait native |
| `flight` | 58.42–74.33 | video | Enter: the continuous flight, uncut | 15.9 s | Portrait native; desktop gets a 4:3 crop |
| `overhead` | 19.90 | still | Editorial: outside | — | 3:4 frame |
| `matte` | 26.55 | still | Editorial: inside | — | 4:5 frame |
| `p-session` | 27.03–28.85 | video | Knowledge | 1.8 s | |
| `p-lounge` | 32.47–35.27 | video | Knowledge | 2.8 s | |
| `p-room` | 78.70–80.22 | video | Knowledge | 1.5 s | |
| `p-applause` | 76.95–78.62 | video | Knowledge, the response | 1.7 s | |
| `p-network` | 30.92–32.40 | video | Connection | 1.5 s | |
| `p-dinner` | 46.90–48.40 | video | Connection | 1.5 s | |
| `p-panel` | 51.72–53.85 | video | Connection | 2.1 s | |
| `p-candid` | 53.95–55.62 | video | Connection | 1.7 s | |
| `helicopter` | 0.60 | still | Access: emerges from darkness | — | Full bleed; desktop tall column |
| `crescendo` | 17 parts, see `scripts/build_media.py` | video | Sim, decks, podcast, court, then 13 rooms cutting 0.42 → 0.30 s, landing on the matte car | 8.6 s | Desktop gets per-shot crops |

Not used, deliberately: the whiteboard session (foreground blocked), micro-cuts under
0.5 s from the event montage, catering (weak last image), the sideways 81–84 s stretch,
the GT3 RS daylight shot (the helicopter does that job better), the podcast studio glide
(74–77 s; strong, but a second glide right after the hero flight would dilute it).

## Production media

`public/media/club-scottsdale/`, all generated:

| Variant | Size | Codecs | Who gets it |
|---|---|---|---|
| `p1080` | 1080×1920 | HEVC (`hvc1`) + H.264 | Phones and portrait tablets |
| `p720` | 720×1280 | H.264 | Save-Data, 2G/3G, small screens |
| `w1080` | 1080×810, per-shot crop | HEVC + H.264 | Landscape screens, for full-bleed clips |
| `l1920` / `l960` | 1920×1080 / 960×540 | HEVC + H.264 / H.264 | The rotated lineup |
| stills | 1080 + 720 (1920 + 960 landscape) | AVIF + WebP | Everyone, via `<picture>` |
| posters | first frame of each variant | WebP | Everyone |

Safari and iOS pick HEVC (roughly half the size of H.264 at the same quality);
everything else plays H.264. All clips are muted, have a 1 s GOP and faststart, and
are loaded only when their chapter is within 1.5 screens.
