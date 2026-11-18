# Cinematic landing verification

PE-05 verified the desktop landing at 1920 px on local build `Ht8pfDR5t3PM8Fo9Kbqtr`. The hero rendered the WebGL knot and particles. Activating **Pause animations** removed the moving scene and left the static CSS portal and primary action visible. **Resume animations** and the Verification link remained usable. The Semantic Gap comparison showed the approved boundary, the draft operator, and a missing test field keeping publication blocked in the labelled sample.

![Kane screenshot of the desktop hero with WebGL](./cinematic-hero.jpg)

[Paused hero](./cinematic-paused.jpg) · [Semantic Gap](./cinematic-semantic-gap.jpg) · [Run identity and observations](./PE-05-desktop.json) · [Test Manager case](https://test-manager.lambdatest.com/projects/01M7N0CKZ90R3JR906713EHYW0/test-cases/01M7PFQZW2FP6WD4146JFDVV6R/dashboard)

The first two attempts loaded stale assets from the previous preview server on IPv6 localhost. Their browser evidence shows HTTP 500 responses and missing hydration. After stopping that listener, the same PE-05 objective passed on the same production build. The successful pack recorded 21 first-party HTTP 200 responses and zero console errors. The earlier attempts remain [BLOCKED for hero](./PE-05-preview-conflict.json) and [BLOCKED for GPA](./PE-01-redesign-preview-conflict.json).

Lint, typecheck, production build and all 88 native tests passed. The build prerenders both the landing and the judge guide. Seven new text and focus color pairs meet their measured contrast targets. Initial JavaScript is estimated at 213,065 gzip bytes from production HTML references. The shader loads separately when the hero is visible.

The actual 360 px viewport and active reduced-motion preference remain BLOCKED. Production smoke is NOT RUN. The paused desktop screenshot demonstrates the static portal without establishing that the system reduced-motion setting was exercised.
