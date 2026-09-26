/* ==========================================================================
   MEDIA MANIFEST
   Every placeholder in the prototype is driven from this list.

   To test real footage: drop a clip into /media and set `src`, e.g.
     src: 'media/cs-01-arrival.mp4'
   (optional) poster: 'media/cs-01-arrival.jpg'
   The placeholder slate disappears and the clip plays muted + looped.

   Fields
     id     clip code used in the edit
     label  what the shot is
     dur    suggested clip length for this moment
     shot   direction for pulling the clip from the 6-minute master
     tone   placeholder colour cast: night | cool | warm | neutral
     lx/ly  where the placeholder's light source sits (%), a hint at composition
   ========================================================================== */

window.PURSUIT_MEDIA = {
  /* 01–02 · Enter / Reveal */
  arrival: {
    id: 'CS-01', label: 'Club exterior / arrival', dur: '6–8s', tone: 'cool', lx: 58, ly: 60,
    shot: 'Wide, blue hour. A car pulls up to the entrance and the building lights hold. Must read through a narrow vertical slit, so keep the entrance near centre.',
  },

  /* 03 · Experience */
  supercar: {
    id: 'CS-02', label: 'Supercar night shot', dur: '4–6s', tone: 'night', lx: 30, ly: 70,
    shot: 'Low angle, slow push-in. Headlights and paint reflections. Motion in frame, not a parked showroom car.',
  },
  interior: {
    id: 'CS-03', label: 'Club interior', dur: '4–6s', tone: 'warm', lx: 64, ly: 40,
    shot: 'Slow lateral move through the room. Warm practical light, people in soft focus. Works cropped to half-frame.',
  },
  dinner: {
    id: 'CS-04', label: 'Founders / network dinner', dur: '10–14s', tone: 'warm', lx: 50, ly: 55,
    shot: 'Locked-off or slow drift across the table. Faces, hands, conversation. Needs to sit still under three lines of type.',
  },
  content: {
    id: 'CS-05', label: 'Videographer / content shoot', dur: '4–6s', tone: 'neutral', lx: 40, ly: 45,
    shot: 'Camera operator mid-take on a gimbal or shoulder rig. Show the crew working, not only the subject.',
  },
  photo: {
    id: 'CS-06', label: 'Photographer / portrait', dur: '3–5s', tone: 'neutral', lx: 56, ly: 34,
    shot: 'Portrait session: strobe pop, member in frame, photographer in the foreground. Vertical crop.',
  },
  detail: {
    id: 'CS-07', label: 'Content detail / monitor', dur: '2–4s', tone: 'cool', lx: 50, ly: 50,
    shot: 'Tight detail: monitor playback, lens swap, the edit. Texture, not faces.',
  },
  jet: {
    id: 'CS-08', label: 'Private jet / aviation', dur: '5–7s', tone: 'cool', lx: 50, ly: 28,
    shot: 'Tarmac walk-up or cabin. Tall composition: stairs, wing line or doorway. Crops to a vertical frame.',
  },
  travel: {
    id: 'CS-09', label: 'Travel / experience', dur: '4–6s', tone: 'neutral', lx: 70, ly: 40,
    shot: 'Destination establishing shot: coastline, skyline, window view on descent. Wide.',
  },
  drive: {
    id: 'CS-10', label: 'Supercars / desert drive', dur: '3–5s', tone: 'warm', lx: 28, ly: 62,
    shot: 'Tracking shot on an open road. Speed and landscape.',
  },
  scottsdale: {
    id: 'CS-11', label: 'Scottsdale environment', dur: '5–8s', tone: 'warm', lx: 70, ly: 30,
    shot: 'Golden hour or dusk: desert, Camelback, the city edge. Establishes place.',
  },
  event: {
    id: 'CS-12', label: 'Event / community', dur: '8–12s', tone: 'night', lx: 50, ly: 40,
    shot: 'Wide of the room at an event: crowd, host or speaker, energy. Is scaled up to full screen, so shoot or pick the widest, sharpest take.',
  },

  /* 04 · Understand (alternate angles so categories do not repeat section 03 clips) */
  network: {
    id: 'CS-04B', label: 'Founders / network dinner', dur: '4–6s', tone: 'warm', lx: 40, ly: 50,
    shot: 'Alternate angle from the dinner: a handshake, a founder mid-story, people leaning in.',
  },
  media2: {
    id: 'CS-05B', label: 'Videographer / content', dur: '3–5s', tone: 'neutral', lx: 62, ly: 44,
    shot: 'Alternate from the shoot: the member on camera, lights and crew visible.',
  },
  exp1: {
    id: 'CS-08B', label: 'Private jet', dur: '1–1.5s', tone: 'cool', lx: 50, ly: 34,
    shot: 'Montage cut 1 of 3. One strong image: wheels up, window, doorway.',
  },
  exp2: {
    id: 'CS-02B', label: 'Supercars', dur: '1–1.5s', tone: 'night', lx: 36, ly: 66,
    shot: 'Montage cut 2 of 3. A pass-by or a detail at speed.',
  },
  exp3: {
    id: 'CS-09B', label: 'Travel', dur: '1–1.5s', tone: 'neutral', lx: 66, ly: 36,
    shot: 'Montage cut 3 of 3. Destination moment.',
  },
  environment: {
    id: 'CS-03B', label: 'Club interior', dur: '5–8s', tone: 'warm', lx: 50, ly: 34,
    shot: 'The room at its best: wide, symmetrical, quiet. Few people. Architecture is the subject.',
  },
  conversation: {
    id: 'CS-13', label: 'Entrepreneur conversation', dur: '6–10s', tone: 'neutral', lx: 50, ly: 50,
    shot: 'Two people, one-on-one. Letterbox-friendly: subjects on the left and right thirds, eye line through the centre.',
  },
};
