# Sign In hero

Drop the photographic flat-lay here as:

    hero-flatlay.jpg

The Sign In screen renders `<img src="assets/images/auth/hero-flatlay.jpg">` and the tag
removes itself if the file is missing, revealing the CSS composition underneath. No code
change is needed when the file lands.

Brief for the shot: black dumbbells, folded premium towel, stainless steel water bottle,
resistance band, jump rope, running shoes, protein shaker, healthy green plant, wooden
tabletop, warm morning sunlight, soft shadows, luxury lifestyle aesthetic. No people, no
faces, no gym interior.

Practical notes:
- The visible area is the upper 55% of a 20:9 panel. Shoot or crop wider than you think —
  `object-fit: cover` with `object-position: center 40%` will take the middle.
- The bottom third sits under a gradient into #0D0D0D, so keep the subject in the upper two
  thirds. Anything below that is scrim.
- Target roughly 1240x1000 and keep it under ~400 KB. It is bundled into the APK and
  precached by the service worker, so its weight is paid on every install.
