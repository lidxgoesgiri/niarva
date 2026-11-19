# UX-03: a draft with a queued run on an earlier version can be canceled and deleted

> Reported by the owner on the live deployment on 19 November 2026 and checked with Kane CLI against a local production build the same day. Times are UTC. Synthetic data only; the account password and share links are not recorded.

## Report

On https://niarva.vercel.app the owner canceled the visible run of a draft, then tried to delete the draft. The delete was refused with "A browser verification of this draft is queued or running. Cancel it before deleting the draft."

Diagnosis:
- The run still queued belonged to an **earlier version**. Cancel controls existed only for runs of the current version, so it could never be canceled.
- The only Cancel run control was a small ghost button that was easy to miss.

## Change

| Commit | Change |
|---|---|
| `e0890ee` | **Delete.** Deleting a draft cancels its queued or running verifications on any version, in the same transaction, and audits each cancellation (`verification.canceled`); the confirmation says so. **Cancel run.** Every active run card has a red **Cancel run** button, including runs of earlier versions in "Earlier versions and their proof". The current version's active run also gets a full-size **Cancel this run** button below the run button. |
| `ff3bf14` | Run cards read **Show full report**. The report has a **Full verification report** heading and an **Evidence** line saying what is sanitized (t-56, t-55). Timestamps carry their time zone (t-49). |

Native: `delete-draft.test.ts` reproduces the report: a run queued on v1, then an edit makes v2 current. The deletion succeeds, the v1 run is `CANCELED`, and the cancellation is audited. Lint, typecheck, and build pass; 120 tests pass.

## Kane CLI check

| Item | Value |
|---|---|
| Server | `next start --port 3600`, embedded PGlite, environment `local-judge-3600`, branch `fix/kane-ux-findings` |
| Fixture (the owner's case) | a new synthetic account. Form "Queued Run Draft": v1 seeded with a diagnostic run **QUEUED**, then an edit made v2 current with no runs |
| Run | `node scripts/kane-locked.mjs run … --agent --headless` |
| Kane status | `passed`, 218 s, 59.45 credits; session `05b310b0-1979-4db1-b7c0-ce82b6da0083`; evidence pack SHA-256 `bbbe73917f1721ad399837509aae2f496014c24fb2f800d2829ba614cce58f2c` (private) |
| Kane steps | found "Earlier versions and their proof", checked for a **Cancel run** button, clicked it, and checked the earlier run's status |
| `confirm_text` | "Delete this draft? Any queued verification is canceled. The draft disappears from your forms; its versions and audit trail are kept." |
| `listed_after_delete` | `false` |
| `cancel_visible`, `run_status_after_cancel` | **not in Kane's final state.** The objective was split into sub-tasks, and their stored values did not reach the final state. Not counted as Kane observations. |
| Server audit (local database, read after the run) | 08:14:18 `verification.requested`; **08:16:35 `verification.canceled`** from its own request (the Cancel run click); 08:17:32 `form.deleted` from a separate request. The run is `CANCELED`, and the form is `archived`. |
| **Verdict** | **PASS** for the confirmation and the deletion (Kane observations). The cancel button's visibility and effect are confirmed by Kane's step log and the server's audit trail, not by Kane's final state |
