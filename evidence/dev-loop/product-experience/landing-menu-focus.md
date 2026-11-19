# Landing menu focus repair

UI-AC-19 · PE-09 · 18 November 2026.

1. Kane measured 960 CSS px on baseline build `sh-e4-JRCsd28LIwjSZzW`. Tab and Enter opened the compact menu and later activated Verification. The URL was `/#verification`, but the check `region.contains(document.activeElement)` returned `false`. The baseline dialog was unnamed in source and the analyzer only confirmed nearby text. [Baseline evidence](../../product-experience/PE-09-landing-menu.md).
2. The close handler always focused Menu, including after choosing a fragment. The repair names the dialog via its visible title and keeps the selected fragment until the close event. Dismissal restores Menu focus. Fragment links focus the matching section, which has `tabIndex={-1}` and a visible keyboard focus style. Lint, typecheck, 103 native tests, and the production build passed. [Source diff](https://github.com/lidxgoesgiri/niarva/commit/284c4c91e8301e515aa90a8ef40d1be6158945e2).
3. The same objective on `bz0_uctcmUgJGhahw0mQP` found the named dialog and verified the active element after Escape and after fragment navigation. The earlier focus mismatch was repaired. The corrected capture did not establish that the heading was in view or directly measure the scroll lock states, so the combined result remains BLOCKED. [Retest scope and archived case](../../product-experience/PE-09-landing-menu.md).
