# PE-09 compact landing menu keyboard navigation

Requirement UI-AC-19. Local Next.js production builds in Chrome with Kane CLI 0.10.4. The tested route was `/`, with no credentials or form submission. The execution used the same approved objective throughout. Its SHA-256 is `a069e512493f8dc89ab6b43c5b33961c4eb97b766d77b06dfba6b0a633bb2e24`.

| Recorded result | Build and source | Browser observation | Kane session and Test Manager case | Credits |
| --- | --- | --- | --- | ---: |
| BLOCKED | `sh-e4-JRCsd28LIwjSZzW` (`7149c9a`) | Viewport 1920 CSS px. The compact Menu was unavailable. | `eb81963e-b76f-4984-a2d8-2d1c38485352` · [Viewport capability check](https://test-manager.lambdatest.com/projects/01M7N0CKZ90R3JR906713EHYW0/test-cases/01M7Q8WEKS5YE3JS9MV5FJSSKS/dashboard) | 14.734150 |
| FAIL | `sh-e4-JRCsd28LIwjSZzW` (`7149c9a`) | Viewport 960 CSS px. The URL reached `/#verification`, and the DOM check found focus outside the Verification region. | `37a8b434-6add-4fc1-af86-c5ee9eb1d471` · [Keyboard focus baseline](https://test-manager.lambdatest.com/projects/01M7N0CKZ90R3JR906713EHYW0/test-cases/01M7Q9EFMB9ZN2962YW78F3Z7N/dashboard) | 53.012500 |
| BLOCKED | `bz0_uctcmUgJGhahw0mQP` (`284c4c9`) | Viewport reported as 960 CSS px. The named dialog, Escape focus return, and destination focus were observed. The final frame was blank and the scroll lock readings were visual estimates. | `a31f6b15-9ca2-47d9-b898-e9bf822bd6aa` · [Keyboard focus retest](https://test-manager.lambdatest.com/projects/01M7N0CKZ90R3JR906713EHYW0/test-cases/01M7QA0WQP9N8F37CPT6FAJRXY/dashboard) | 51.470462 |

The retest began on 18 November 2026 at 12:27 UTC. Kane recorded 22 completed steps, one `run_end` with status `passed`, and zero console errors. Its role-and-name locator matched the open dialog “Explore NIARVA”. The DOM check matched `document.activeElement` and `:focus-visible` on Menu after Escape. At `/#verification`, the focused region had `id="verification"`. The heading was present and its own display and visibility styles were enabled. The captured frame did not show the heading. The run classified scroll lock as engaged while open and released after both exits. Those readings had no captured overflow values or scroll-position checks on the corrected build. The combined objective remains BLOCKED.

The run used an isolated Chrome profile. Its result covers the reported 960 CSS px; the 360 px layout and system reduced motion have separate acceptance criteria. The production release requires its own smoke evidence.

| Sealed pack | SHA-256 |
| --- | --- |
| Viewport capability check | `f105eb9a63217123f5b9e5311d3353c7d5d621f70fab0bc3f159bf1882ad37b1` |
| Keyboard focus baseline | `ea50e7bcd52eb796d3292cae03f4b339e55453e777532db4cd60174459b27263` |
| Keyboard focus retest | `981de1b8862085122c87fec421e9348c83e31dada5985bfa9fd5334b386d1795` |

[Source repair chronology](../dev-loop/product-experience/landing-menu-focus.md).
