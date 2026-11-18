# Scroll choreography and pipeline

The browser's scroll position advances and reverses the hero camera, word illumination, pipeline beam, and page progress rail. A sticky panel follows the active chapter on desktop. Direct selection takes precedence during that visit so an active control can keep focus. The loop previews drift into a stack and the evidence columns shift in opposite directions.

The implementation uses the browser's native scroll and a scheduled read/write pass for the DOM. The WebGL core reads the same hero progress and stays in the visible hero. The fixed CSS light field carries the palette into later chapters. The shader and DOM scrubbing stop with the motion pause control or the system reduced-motion preference. The earlier motionless portal continues to provide a fallback.

| Reference | Pattern applied |
| --- | --- |
| [Lusion WebGL Scroll Sync](https://github.com/lusionltd/WebGL-Scroll-Sync) and [live demo](https://webgl-scroll-sync.lusion.co/) | Align the graphic with the same scroll progress used by the text. |
| [Lenis + GSAP Scroll Lab](https://github.com/creativoma/lenis-gsap-lab) | Bound the velocity response and ease it back to rest. |
| [Codrops kinetic typography](https://tympanus.net/codrops/2026/11/10/kinetic-typography-gsap/) | Scrub the intensity of words while retaining readable text. |
| [Codrops On-Scroll Columns and Rows](https://github.com/codrops/OnScrollColumnsRows) | Give neighboring columns opposing offsets. |
| [Reflect](https://reflect.app/) and [Oryzo](https://oryzo.ai/) | Visual references for atmosphere and section choreography. |

The current production build estimates 214,587 gzip bytes of initial JavaScript across 11 script references. This is a local asset measurement. Lint, typecheck, the production build, and 88 native tests passed.

The first [PE-07 attempt](./PE-07-incomplete.json) moved through the visible pipeline, then stopped before activating the version-change control. The screenshot also showed repeated SVG dashes instead of a continuous highlight. The animated path now draws a single normalized dash in the SVG coordinate space. The retry uses the same objective and adds observation guidance for each scroll position and the version-change button.

## Observed desktop scroll sequence

The corrected build `2R8sHDGmJJL_PyBrE6eJp` produced the following images in the same Kane run before any stage was clicked. The beam is filled continuously in the middle image and recedes on the return.

| Capture | Rail | Selected stage and visible panel |
| --- | --- | --- |
| [Early](./scroll-early.jpg) | 47% | Approve intent |
| [After scrolling down](./scroll-later.jpg) | 58% | Gate publishing |
| [After scrolling back up](./scroll-returned.jpg) | 47% | Approve intent |

The [full PE-07 retest](./PE-07-scroll-observations.json) remains BLOCKED. Its structured extraction retained the final 47% position only. All three submitted images were read from the same sealed pack. That pack recorded zero browser console errors and 21 first-party HTTP 200 responses. [Beam repair chronology](../dev-loop/product-experience/scroll-beam.md).

Kane's installed desktop viewport setting accepts widths from 800 to 3840 px. A rendered 360 CSS-pixel check remains BLOCKED. System reduced motion and production smoke remain open.
