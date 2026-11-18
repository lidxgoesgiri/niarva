# Blockers

Writer: Claude. Codex reports blockers in `CODEX_HANDOFF.md`; Claude copies them here.

| ID | Raised | Blocker | Impact | Owner | Status |
|---|---|---|---|---|---|
| B-01 | 2026-11-17 | Kane CLI sometimes fails before the first step ("TMS did not return an org_id", "Token refresh failed") | The run is UNKNOWN and costs no credits. The dev runner retries once. The product worker records `AUTH_OR_CREDITS` and the server re-queues the probe. A lasting failure needs the owner to sign in again with `kane-cli login --oauth`. | Claude | mitigated |
| B-02 | 2026-11-17 | Overlapping Kane runs from both tracks on one machine | Risk of infrastructure failures, as seen in M0 | Claude | open: run lock C-09 |
| B-03 | 2026-11-17 | Desktop Kane CLI cannot verify viewports narrower than 800 px | 360/390 px layouts need a labeled manual review | Codex | accepted limitation |
| B-04 | 2026-11-18 | Kane CLI makes a direct HTTP call only for an explicit `Call POST <url> with body …` step, and a direct call never carries the browser login (objectives cookbook §3.5) | Assurance steps worded "invoke … through its API" never ran (t-7, t-8, t-10, t-20, t-23, t-32, t-33). Steps on public endpoints were reworded with the owner's approval (`67c9a2d`); steps that need the creator's login (t-20, t-23, t-33 step 3) cannot be fixed by wording | Claude | partly resolved |
| B-05 | 2026-11-18 | Kane credits: 4,152 left at 14:10 WIB | About 1,500 reserved for the final integrated regression and the demo; full verifications (~250 each) only where a P0 test needs them | Claude | watch |
