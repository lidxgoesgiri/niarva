# Landing scroll reveals

GSAP ScrollTrigger reveals each heading and the main narrative copy word by word. It batches the scholarship sandbox, Semantic Gap cards, pipeline steps, loop cards, and Evidence Bento. The Semantic Gap narrative also scrubs word opacity and blur with scroll. Font completion and changes in the mounted panels refresh trigger positions. Pause, system reduced motion, or an unavailable animation bundle leave static content readable. [GSAP React integration](https://gsap.com/resources/React/) · [ScrollTrigger batch](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.batch()/).

The final local build, `JKPjK4rSMUo1bOaRgK6H1`, passed lint, typecheck, 88 native tests, and production build. Its 11 initial script references total an estimated 216,372 gzip bytes. The landing HTML contains 16 initial H1–H3 headings with motion markup and 18 initial card targets. Additional headings and cards mount when panels change.

## PE-08 chronology

The first run on build `uLQ6VJMNBhid7-IvhIYGk` reached the evidence cards, both requested tab panels, and the paused page. The analyzer read the static coral and amber accents of two different Semantic Gap cards. It captured mostly settled styles and used a direct-section selector that skipped the nested sandbox. The full objective is BLOCKED on that build. The sealed pack `16784f0cd8ba47ea367501241f57e12e41b034bb9e9c4a434d9f74a7439c9032` recorded 22 local HTTP 200 responses and zero console errors. [First Kane case](https://test-manager.lambdatest.com/projects/01M7N0CKZ90R3JR906713EHYW0/test-cases/01M7PPZT050CY540NZ1JXM9J1C/dashboard).

The retest preserves the same owner-reviewed objective and directs the analyzer to measure the same narrative word at successive scroll positions. It also uses an updated build that prepares below-viewport entrances and guards loading of the animation bundle. [Entrance repair and retest](../dev-loop/product-experience/scroll-reveal-entrance.md).

## Final-build observations

The desktop retest produced these screenshots in one real Kane run. Percentages are the on-page rail's document progress. They locate each capture and do not measure a tween's completion.

| Screenshot | Page progress | Observed |
| --- | --- | --- |
| [Semantic Gap entrance](./reveal-gap-initial.jpg) | 25% | The narrative is blurred and the approved claim heading is still masked. |
| [Scroll down](./reveal-gap-forward.jpg) | 29% | The leading words sharpen and the approved claim card is readable. The remaining narrative is still blurred. |
| [Scroll back](./reveal-gap-returned.jpg) | 25% | The same words blur again. The already revealed card stays readable. |
| [Continue downward](./reveal-gap-settled.jpg) | 39% | The full narrative and browser witness are readable. |
| [Evidence Bento entrance](./reveal-evidence-entering.jpg) | 81% | The Evidence Inspector and adjacent card begin to enter, with their headings still masked. |
| [Evidence Bento settled](./reveal-evidence-settled.jpg) | 87% | The Payload Check panel and both adjacent cards are readable. |
| [Pause and scroll back](./reveal-evidence-paused.jpg) | Paused | The lower headings and cards stay readable and the Resume animations control is available. |

Kane also opened Development Loop, read its active explanation, and reached the closing action. The full PE-08 objective remains **BLOCKED** because its structured observations contain mostly settled styles and a single terminal section-progress reading. The saved images demonstrate the sampled visual transitions. They do not measure first and settled styles for every heading and card. The final pack recorded 22 local HTTP 200 responses and zero console errors. [Kane retest case](https://test-manager.lambdatest.com/projects/01M7N0CKZ90R3JR906713EHYW0/test-cases/01M7PQHKGYEVKYMWH48103HF1R/dashboard) · [Sanitized observation record](./PE-08-scroll-reveals.json).

## Desktop regression

PE-05 **PASS** at 1905 CSS pixels on the same build. The entry capture shows the hero words moving through the masks and the actual WebGL geometry, with both actions visible. After Pause, the full headline and controls remain readable on the static portal. The Verification link reaches all three sample comparison stages after Resume. The run recorded 22 local HTTP 200 responses and zero console errors. [Hero entrance](./reveal-hero-entering.jpg) · [Paused hero](./reveal-hero-paused.jpg) · [Kane regression case](https://test-manager.lambdatest.com/projects/01M7N0CKZ90R3JR906713EHYW0/test-cases/01M7PQWNGWHJ7FMSEJ646TYHC2/dashboard) · [Sanitized regression](./PE-05-gsap-regression.json).

All 17 UI source fingerprints in both final-build runs match commit `8d29885`. The 360 px viewport, active system reduced-motion preference, and deployment smoke remain unverified.
