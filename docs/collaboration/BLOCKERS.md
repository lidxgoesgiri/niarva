# Blockers

Writer: Claude. Codex reports blockers in `CODEX_HANDOFF.md`; Claude copies them here.

| ID | Raised | Blocker | Impact | Owner | Status |
|---|---|---|---|---|---|
| B-01 | 2026-11-17 | Kane CLI sometimes fails before the first step ("TMS did not return an org_id", "Token refresh failed") | The run is UNKNOWN and costs no credits. The dev runner retries once. The product worker records `AUTH_OR_CREDITS` and the server re-queues the probe. A lasting failure needs the owner to sign in again with `kane-cli login --oauth`. | Claude | mitigated |
| B-02 | 2026-11-17 | Overlapping Kane runs from both tracks on one machine | Risk of infrastructure failures, as seen in M0 | Claude | open: run lock C-09 |
| B-03 | 2026-11-17 | Desktop Kane CLI cannot verify viewports narrower than 800 px | 360/390 px layouts need a labeled manual review | Codex | accepted limitation |
