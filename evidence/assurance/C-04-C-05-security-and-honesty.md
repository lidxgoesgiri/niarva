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

Batch label `retest-after-fixes`, 2026-11-18 06:37–07:04 UTC, same runner and lock as batch 1. Server: production build `WUeJG6ZD2Q3DMMH6XZjk8` on `http://localhost:3200`, built at 06:35:50 UTC from `be71f6b`, which contains the fixes `b3a89bd`, `4c88995` (DEV-LOOP-03), `db315d5` (access-denied page), and `459a6bc` (run report). The worktree commits recorded by the runner (`be71f6b`, `a102f19`, `d58db3b`) have identical `apps/` and `packages/`. t-7 and t-8 belong to C-03 and are listed here because they ran in this batch.

**Test text.** Every retest used the same test file as its first run (same SHA-256 prefix as batch 1 and C-03: t-1 `1c10ef000643`, t-2 `0521654fa75e`, t-7 `35ef38c465b7`, t-8 `7f89fa777f73`, t-33 `73dba047215d`, t-57 `b1106355676d`). The owner-approved rewording of t-1, t-2, t-7 (`71f84cd`) and t-10, t-32, t-48 (`67c9a2d`) was committed during or after this batch, so **the reworded tests have not been executed yet**. Current digests: t-1 `399f0ab4a8d5`, t-2 `c1ec3f7382d1`, t-7 `9ef6a77b34ce`.

| Started (UTC) | Test | Outcome | Exit | Kane decisions (authored / replayed) | Credits | Evidence pack SHA-256 | Execution |
|---|---|---|---|---|---:|---|---|
| 06:37:02 | t-33 | FAIL | 1 | 2 / 2 | 0 | `4f61dd0b339f0c7190e44f9d2c4402f66c9c5f23ca53d30ecd07103f148907eb` | `e3f81b73-d8f0-4f11-b8e4-aaacdab052f6` |
| 06:39:23 | t-2 | FAIL | 1 | 2 / 1 | 35.62 | `a234d6145f39e04d3775307abb560bc1835a6f1d74bc8fd9c755054d922a4fda` | `09cb0f1f-b841-40e6-bfa5-eb213a797fbe` |
| 06:42:49 | t-2 | UNKNOWN | — | — | not reported | — (no pack) | — |
| 06:45:01 | t-57 | FAIL | 1 | 1 / 1 | 17.74 | `e50b89422a2d483b8b73d40f1446096b904d69b8e7710f0a4f76c4d7804dafa6` | `f8149699-0c0d-45eb-935f-cfb1f8c8f533` |
| 06:48:02 | t-1 | FAIL | 1 | 2 / 1 | 20.84 | `769e003ce140c3e87a9716605c5d9409f57f810bb22811cb951f6de8446134cb` | `7987c319-daa8-46b5-905c-ebfb04f636db` |
| 06:50:45 | t-7 | FAIL | 1 | 2 / 3 | 39.59 | `1546c0e3b68a6178662e017a64ed7356af27779c3d83214d4588f5789de10621` | `046a69c8-dd67-42d4-8d19-5b0942e5b13e` |
| 07:01:24 | t-8 | FAIL | 1 | 3 / 1 | 35.87 | `5464271c2ec9ed802dd7d49ca814e749ae80e44fa9d6fbb5d4e42e8f227cfb96` | `7a8e7339-5a94-478e-a372-bc23ca915d35` |

Totals: 7 executions of 6 tests, **0 PASS, 6 FAIL, 1 UNKNOWN**, 149.66 credits reported. The UNKNOWN t-2 run has a stream that stops at a pending checkpoint without `run_end` or `test_md_done`, and the runner wrote no summary: it was interrupted, so it counts as UNKNOWN, never as a result.

### Classification

| Test | Failing step | Kane's account | Classification | What else covers the behavior |
|---|---|---|---|---|
| t-33 | 1, then 2 | Replaying the earlier recording opened a KaneAI page instead of NIARVA (Kane: `automation_bug`, `config_issue`); the second replay stopped while scrolling, before the save-and-assert steps | **Inconclusive: replay of a stale recording.** Steps 3–4 never ran, so the fix is not proven by Kane yet. | `apps/web/tests/integration/invalid-edit.test.ts` (the `alert(1)` edit is refused with `422 VALIDATION_FAILED`, and a stored invalid version no longer breaks the workspace) |
| t-2 | 2 | "The run reached the expected access-denied page but did not transition to completion" (`stuck.ap_stuck`) | **Inconclusive: assertion mechanics.** Kane observed the intended denial page, but the test produced no PASS. | `apps/web/tests/integration/auth-workspace.test.ts` (tenant isolation, a foreign resource is reported as missing); access-denied page `db315d5` |
| t-57 | 2 | The agent asserted every report requirement after recording only one cache-flag observation (`assertion_error.final_verification`) | **Inconclusive: incomplete observation.** | `packages/core/test/verdict.test.ts` "aggregates runs fail-closed": a full run with no probe results is UNVERIFIED, never VERIFIED |
| t-1 | 2 | The private page was denied correctly; the network-response check timed out (`assertion_error.step_not_achievable`) | **Inconclusive: Kane could not complete the response check.** | `apps/web/tests/integration/auth-workspace.test.ts` ("resolves no actor without a session and rejects protected calls") |
| t-7 | 3 and 7 | Step 3: replayed assertion disagreed with a form that was "visibly in the expected below-threshold state" (`automation_bug`); step 7: the raw request had completed before inspection started (`timing_sync`) | **Inconclusive: request capture**, as in the first run (C-03). A receipt was issued. | PROD-LOOP-01 and VERCEL-PROD-01 P-04 `hidden_exclusion` PASS; P-08 server contract PASS |
| t-8 | 2 | The submission succeeded with a receipt, but the request body needed for the replay was not retained (`assertion_error.step_not_achievable`) | **Inconclusive: request capture**, as in the first run. | Idempotency integration tests (`apps/web/tests/integration/golden-flow.test.ts`) |

No product defect was found in this batch, and none is claimed fixed by it. Every one of these tests stays **FAIL** in every count until a later run passes with the same objective and oracle; an inconclusive run is never a pass. No test file or expected result was changed to obtain a different outcome.

### What remains owed

- Run the **reworded** t-1, t-2, t-7, t-10, t-32, t-48 (never executed).
- t-33: rerun without the stale recording so that Kane authors every step against the current build.
- t-57: rerun; if Kane again inspects only part of the report, record it as a Kane observation limit.
- t-8 and the request-body steps of t-7 depend on Kane retaining a completed request body; this is listed in [`docs/testing/KNOWN_LIMITATIONS.md`](../../docs/testing/KNOWN_LIMITATIONS.md).
