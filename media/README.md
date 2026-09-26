# media/

Drop selected Club Scottsdale clips here, then point the matching entry in
`js/media.js` at the file:

```js
arrival: {
  id: 'CS-01',
  ...
  src: 'media/cs-01-arrival.mp4',
  poster: 'media/cs-01-arrival.jpg', // optional
},
```

The placeholder slate for that shot disappears and the clip plays muted and
looped wherever it is used. H.264 MP4, 1080p, 6–10 Mbps is plenty for testing.
