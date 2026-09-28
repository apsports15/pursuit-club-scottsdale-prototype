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
| 5.97–9.23 | Golden-hour lineup at the building, slow push: white Corvette, R8, orange McLaren. | **Sideways**, rotate. Not used in the film |
| 9.23–11.47 | Top-down drone over the branded tent and McLarens, rising to reveal the lot. | |
| 11.47–15.83 | Podcast in the dark studio: two hosts, orange McLaren behind; then a guest in white. | |
| 15.83–19.10 | Overhead glide down the row: Corvette, R8, McLaren, AMG, McLaren. | |
| 19.10–20.73 | Overhead: a white 911, centred, hatched bay beside it. | Still: `overhead` @ 19.90 |
| 20.73–24.30 | Elevated sweep: red Huracán, grey STO, white R8, white G-wagon, lupins in the foreground. | |
| 24.30–25.50 | White GT3 RS under the sign, daylight. | |
| 25.50–27.00 | Matte grey Huracán under the hex lights beside the Club Scottsdale neon. | Not used in the film |
| 27.00–29.00 | Session: presenter at a screen, seated room, hex ceiling. | People |
| 29.00–30.87 | Pickleball on the branded court, daylight. | |
| 30.87–32.43 | Networking under the hex lights, suits (white suit, centre). | People |
| 32.43–35.33 | LOUNGE session: speaker teaching a small seated group. | People |
| 35.33–36.73 | Whiteboard session; a red cap blocks the foreground. | Not used |
| 36.73–37.77 | Host with a mic in front of the neon. | |
| 37.80–46.03 | Evening event: the matte Huracán from behind, crowd, greetings, handshakes, a hug, dinner tables laughing. | Many short cuts |
| 46.03–49.17 | Dinner: speaker on the floor, long tables listening, guests laughing. | People |
| 49.17–51.67 | The CS / CLUB SCOTTSDALE neon on black. Clean, native video. | Not used since the cover replaced it |
| 51.67–53.90 | Panel on white sofas, car footage on the screens behind. | People |
| 53.90–55.67 | Two men in conversation, candid. | People |
| 55.67–57.00 | Sim racing (F1 rig). | |
| 57.00–58.37 | DJ in front of the Club CS Scottsdale neon. | |
| **58.37–74.37** | **Continuous interior FPV flight during an evening event.** Follows guests through a doorway (58.4), glides through the lounge past the white sectionals and the neon (59.4), through a dark door frame (61.9), onto the event floor past the drinks fridge and the crowd in evening wear (62.3), over the matte Huracán (63.5–66.3), banks down the row of white cars under the yellow lifts (66.6–71), and ends low over the green AMG (71–74.3). | **Hero asset.** ~15.9 s |
| 74.37–76.87 | Glide down a corridor into the hex-lit room with the round white sofa: guests seated, screens. | Ends the flight in the film |
| 76.87–78.67 | Young attendees applauding, faces large. | People |
| 78.67–80.27 | Speaker in navy walks a room of ~100 young attendees with a mic. | People |
| 80.27–81.47 | Bearded speaker in a cap, mic, close. | |
| 81.47–83.93 | Guests at the hex wall; sim rig. | **Sideways** |
| 83.93–90.90 | Amenity edit, ~0.45 s a shot: red Huracán, podcast studio, office, lounge and cars, sim bay, white sectional, barber chair, STO and G-wagon, terrace at sunset, gallery wall, chesterfield lounge, card room, matte Aventador, window lounge with recliners, catering. | Clean to the last frame |

## Final selects (what the film uses)

The chapter is a single guided film (see `README.md`). In running order:

| Asset | Master in–out | Type | Use | Length |
|---|---|---|---|---|
| `neon` still | 51.583 (the clip's exact last frame, same grade) | still | The sign splits open on this frame, in two halves | — |
| `cover` | supplied still, `source-media/cover/` | still | The editorial cover. Not from the master: a different day and car line-up, so the film cuts to black before the drone. | — |
| `aerial` | **reversed: 10.10–11.44 at 0.4×, 9.70–10.10 at 0.55×, 9.35–9.70 at 0.75×** + 15.92–19.07 | video | The first moving shot: the drone's rise off the tent played backwards, so it starts high and descends, quickening near the cars and stopping short of the near-still frames at the start of the rise. The frame drifts toward the McLaren's left side (zoom to 1.12×), then a 0.5 s smoothleft blend carries it into the glide over the cars. | 7.2 s |
| `flight` | 58.42–74.35 + 74.37–76.83 | video | Step inside: the flight at normal speed, doorway to the collection, then on through the source's own cut (74.367) into the room with the round white sofa, up to the cut to the applause (76.867). The last room's landscape crop sits lower (y .62) so the sofa and the people stay in frame. Room marks: The lounge 0.98, The floor 3.83, The collection 8.18, The inner room 15.93 s (output time). | 18.4 s |
| `room` | supplied photo, `source-media/value/club-scottsdale-room.webp` (1320×1526) | still | The value: a session under the hex lights, the speaker in a white shirt and hat by the screen, the group on the sofa and chairs. Phones crop to its left side, keeping the speaker; desktop shows it whole. | — |
| `p-session` … `p-candid` | as before (27.03–28.85, 32.47–35.27, 78.70–80.22, 76.95–78.62, 30.92–32.40, 46.90–48.40, 51.72–53.85, 53.95–55.62) | video | In the room, around the table | 1.5–2.8 s each |
| `helicopter` | 0.60 | still | Access | — |
| `crescendo` | 17 parts, see `scripts/build_media.py` | video | The amenities, cutting 0.42 → 0.30 s, landing on the matte car | 8.5 s |

**Dropped for the film:** the white Huracán arrival (2.93–5.97) and the sideways lineup
(5.97–9.23, the horizontal Corvette shot), the `matte` and `lineup` stills. Old shot
labels: 15 (white car overhead / door pass) is not used; 23 (sim racing) opens the
amenities; 47 is not used.

**The tent match.** The CS logo on the tent is about 97 px wide in the 1080 px source
frame (at 710, 438 in the first aerial frame); the neon's CS is about 760 px. A size
match would need an ~8× blow-up of the source, which the footage can't support
sharply. The page does a positional match instead: the tent logo starts exactly where
the neon's CS was, at about 2.4× (1.8× on desktop), dissolving in behind the split,
then the drone pulls back to 1×.

Also not used, deliberately: the whiteboard session (foreground blocked), micro-cuts
under 0.5 s from the event montage, catering (weak last image), the sideways 81–84 s
stretch, the GT3 RS daylight shot.

## Production media

`public/media/club-scottsdale/`, all generated by `scripts/build_media.py`:

| Variant | Size | Codecs | Who gets it |
|---|---|---|---|
| `p1080` | 1080×1920 | HEVC (`hvc1`) + H.264 | Phones and portrait tablets |
| `p720` | 720×1280 | H.264 | Save-Data, 2G/3G, small screens |
| `w1080` | 1080×810, per-shot crop | HEVC + H.264 | Landscape screens, for the full-bleed clips (aerial, flight, crescendo) |
| stills | 1080 + 720 | AVIF + WebP | Everyone, via `<picture>` |
| posters | first frame of each variant | WebP | Everyone |

Safari and iOS pick HEVC (roughly half the size of H.264 at the same quality);
everything else plays H.264. All clips are muted, have a 1 s GOP and faststart. The
film loads each clip about 11 s before it plays and releases it 15 s after. The whole
HEVC set is about 13 MB (H.264 1080: about 20 MB).
