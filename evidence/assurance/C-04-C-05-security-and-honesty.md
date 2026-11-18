# C-04 and C-05: access security and verification honesty (Kane CLI Assurance tests)

> Assurance-designed tests run unchanged with `node scripts/verify-kane.mjs` (Kane CLI 0.10.4) against the verification server on `http://localhost:3200`, one at a time under the machine-wide Kane lock. PASS needs exactly one `test_md_done` with `overall_status = passed` and exit code 0. Every run is listed.

## Batch 1: 2026-11-18, server build `71839e9` (`apps/web` and `packages` unchanged through `4c98e5b`)

| Test | What it checks | Started (UTC) | Outcome | Credits | Evidence pack SHA-256 |
|---|---|---|---|---|---|
| t-1 | anonymous access to a private version and private evidence | 02:09:44 | FAIL | 28.08 | `0718f36a3a081dbd87749a764157a1cfd5ea18ac7f9b18d5f98ff372a19f6640` |
| t-2 | signed-in non-owner cannot read another creator's form | 02:13:21 | FAIL | 35.32 | `3861d18c658ff4f5fda8b04997b31936d2a5579486f10f1c317de4e3fca47d39` |
| t-48 | anonymous and other-owner response access | 02:15:59 | FAIL | 14.07 | `9464dbd15c99453ab01b32d8baadefb12ea5f4133638681c607f922d2b3464ec` |
| t-54 | arbitrary evidence path discloses no private file | 02:18:14 | FAIL | 46.97 | `dad88056ea0f75c5afdc4109c202a903087422604aeb7945bc5b9f718b02a479` |
| t-14 | a missing observation is UNKNOWN, not a false PASS | 02:21:48 | **PASS** | 76.68 | `521b049981efad284ab8520ef3229ea091a6282dea5cedea81478aca8260dad4` |
| t-46 | an UNKNOWN run offers no automatic repair or publish | 02:28:51 | **PASS** | 85.55 | `e5d3cb42e537aca649b77390867bb2fa56f705d5a1493798ac2adb267c72b683` |
| t-57 | zero executed tests never yield VERIFIED | 02:39:17 | FAIL | 49.28 | `c0705ec5c8e21611a178339ac606bc58e6cf8e6b55468d8d4f8bc6a966b7778e` |
| t-39 | an unrequested generated rule is reported in the Intent Trace | 02:45:50 | **PASS** | 33.46 | `421ab4b3e09794e1820413ad7ae0d0a8b1b124ae9d7ae600c237b8cd488a4100` |
| t-40 | a missing generated rule is reported in the Intent Trace | 02:50:38 | **PASS** | 32.58 | `b8f4d463d47d18e86a6eaaafed6dd5838ba91fcc97e0451c7ee74428910700a7` |
| t-41 | a matching rule without browser observation is not browser proof | 02:55:25 | **PASS** | 57.91 | `69f5596f801fa2686c55d739e08e32a9919aa631e5e543b17de38f283671fe0d` |
| t-43 | forbidden repair operations never become accepted patches | 03:00:06 | FAIL | 43.81 | `ad51ae7ce87b4093247723b02e2666468ddf12990a9e31f55e15a8920b1ce0b7` |
| t-15 | the GPA 3.5 proof rejects an empty required certificate | 03:05:57 | FAIL | 75.82 | `6c95678ef6c8be743bda07ebf991cbca19df9718e53f9e87c6ab7b26b5b678fa` |
| t-32 | a public respondent cannot alter the creator's configuration | 03:10:43 | FAIL | 11.65 | `ff8f01d30371873b26ef439e88830d61bb102d34366bce2a5bbb0c941a093ba3` |
| t-33 | executable rule expressions are not accepted as DSL | 03:14:21 | FAIL | 51.65 | `01d7e220be12313633acaa10edd194c2e638572d2d89425141eed67aa502fd4e` |

### Classification of each failure

| Test | Kane's account (shortened) | Classification | Action |
|---|---|---|---|
| t-1 | signed-out request redirected to sign-in "as intended"; the checkpoint could not inspect the response | inconclusive: assertion mechanics | retested |
| t-2 | the private URL "showed a 404 message instead of the expected denial" | **product clarity gap**: the generic "page does not exist" page did not say access was denied | `db315d5`: explicit access-denied page, same HTTP 404 for missing and foreign forms; retested |
| t-48 | the form name stayed an unresolved placeholder | inconclusive: Kane did not substitute `{{response_form_name}}`, although the value is set; a cause in the value (it contains a colon) is suspected, not proven | owed |
| t-54 | the agent requested a verification to obtain an evidence reference; the queued run did not start during the test | inconclusive. NIARVA has no file-serving evidence route; evidence is digests in the owner's state, so there is no path to traverse. | owed |
| t-57 | "only the upper part of the page was inspected" | inconclusive, plus a **product gap**: the run report lacked the freshness key, timeline, policy, executed count, and gate/instability details | `459a6bc`: sanitized run report; retested |
| t-43 | "the repair proposal screen has [no] place to enter arbitrary code" | not applicable through the UI: proposals come only from the engine's allowlist, and the API accepts only a proposal id and a decision | covered natively (core repair tests) |
| t-15 | steps 1–3 passed (certificate visible and required at 3.5, empty submit blocked); step 4 waited for a fresh verification that no worker could run | inconclusive: a test that starts a verification cannot complete while it holds the machine-wide Kane lock that the worker also needs | owed |
| t-32 | "the test … steps do not supply" name and GPA; no configuration request was attempted | inconclusive | owed |
| t-33 | step 2 passed in Kane's judgement; step 3 used browser navigation (GET) instead of an API call → 405 | **real defect found**: the `alert(1)` edit Kane typed in step 2 was stored as a version, and the form's workspace then failed with HTTP 500 → **DEV-LOOP-03** | fixed in `b3a89bd`, `4c88995`; retested |

Pattern: the steps that require Kane to send a request itself (direct API calls) did not run. Kane makes a direct call only for an explicit `Call POST https://… with body …` instruction. The Assurance steps say "invoke … directly through its API", and the agent fell back to browser navigation or gave up. Rewording those steps is an Assurance decision for the repository owner; no test file was edited.

### Side effect, recorded

During this batch, the verification worker had not actually stopped: its stop command failed silently. The verifications requested by t-54 (02:20 UTC) and t-15 (03:09 UTC) were therefore executed between tests with real Kane runs:

- Run `01a1ec74-b7aa-7d12-b327-f0693458eb40` on "Kane Verified Scholarship B": **VERIFIED 8/8**, 257.53 credits.
- Run `01a1eca1-44a3-7e0a-9110-5de0a24a1065`: canceled after 2 probes (23.68 credits), because it duplicated a fresh VERIFIED proof.

The worker was then stopped. Because the canceled run is now the latest full run of that version, the publish gate for that form is closed (fail-closed), as the verification rules require.

## Retests after the fixes

Pending. Recorded below when the batch finishes.
