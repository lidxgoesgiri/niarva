# UX-04: the landing never scrolls sideways, and the motion control is removed

> Requested by the owner on 19 November 2026 after a screenshot of https://niarva.vercel.app showing a horizontal scrollbar, with the hero heading cut off on the left. Checked the same day with Kane CLI against a local production build. Times are UTC.

## Change (`apps/web/src/features/landing/`)

- **Overflow.** `.landing` now sets `overflow-x: clip`.
  - The landing has many decorative and animated layers: the 3D portal with negative margins, drop shadows, skew and perspective transforms during scroll. At some widths and browser zoom levels they could reach past the right edge and make the whole page scroll sideways.
  - `clip` contains them without creating a scroll container, so the sticky navigation keeps working.
- **Motion control.** The fixed **Pause animations** button is removed, as the owner asked.
  - Motion still stops for visitors whose system asks for reduced motion (`prefers-reduced-motion`: all landing animations and transitions are disabled) and while the tab is hidden.
  - There is no longer an on-page control to pause motion for visitors without that system setting (WCAG 2.2.2 recommends one for motion longer than five seconds). This is the owner's decision.
- Earlier records that exercised the button (`PE-03K`, `PE-04`, `cinematic-landing.md`, `landing-reveals.md`) describe earlier builds and are left unchanged.

Native: lint, typecheck, and build pass; 103 tests pass on this branch's base (stacked on PR #16).

## Kane CLI check

| Item | Value |
|---|---|
| Server | `next start --port 3600`, branch `fix/landing-overflow` (stacked on PR #16) |
| Window | Kane's fixed 1920×1080 window. The owner's screenshot came from a zoomed or scaled browser, a width this setup cannot reproduce; the check covers the configured width only |
| Kane status | `passed`, 100 s, 37.80 credits; session `557c2ddd-799a-4a92-b768-4a128b550415`; evidence pack SHA-256 `27314cbd1ab1a456799c978ecaac1e214fb8f0fa4b1317060de0c2afb9cfd5db` (private) |
| `pause_button_visible` | `false` |
| `horizontal_scrollbar_visible` after Right-arrow and horizontal scroll attempts | `false` |
| `heading_fully_visible` | `true` |
| `horizontal_scroll_anywhere` while scrolling to the bottom | `false` |
| **Verdict (NIARVA's oracle: no pause control, no horizontal scroll, heading fully visible)** | **PASS** at 1920×1080. The zoomed case is covered by the CSS containment, not by a Kane observation |
