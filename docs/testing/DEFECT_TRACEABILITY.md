# Defect traceability

Each row follows one chain: **Kane run that failed → evidence → root cause → source fix (commit) → the same test run again → regression**. Only defects that a real Kane run exposed are listed as Kane findings. Seeded lab faults and findings from audits or native tests are kept apart and labelled.

Evidence packs are private (they contain local URLs and synthetic session cookies); they are identified by SHA-256. Execution IDs are Kane evidence IDs; "TM run" is the Test Manager test run in the project where the run was recorded (KaneAI Generated for everything before 18 November 2026, see [`MIGRATION_REPORT.md`](MIGRATION_REPORT.md)).

## 1. Product defects found by Kane

### DEV-LOOP-01 — AI extraction dropped the conditional certificate requirement

| Step | Record |
|---|---|
| Test | t-36 `approved-scholarship-claims-generate-a-versioned-conditional_test.md` (designed by Kane Assurance, file SHA-256 `860858c7…5c5969`, unchanged in every run) |
| Kane failure | 2026-11-17 09:54:33 UTC, `test_md_done = failed`, exit 1, step 4 `assertion_error.final_verification`; Kane session `d392a9ca-43ff-4940-978e-f13d819ee849`; evidence `475eaa00-5b39-4e94-a6f7-4b2d65f95526`, pack SHA-256 `13d5fcc8…bffc08d` |
| Observation | the generated form had Name and GPA only; the certificate requirement had become two manual-check claims |
| Root cause | extraction instructions classified "must provide a certificate" as an upload (manual claim); the model's `acknowledged: true` was accepted without a creator decision |
| Fix | `cfc28b8` fix(ai): keep provided documents as conditional fields and never auto-acknowledge manual checks; native regression test `d79ea57` (4/4) |
| Same test again | 2026-11-17 ~10:05 UTC on `da0c5a0`, **PASS**, exit 0; evidence `e868720f-90a3-4073-a12e-ae931dc513a3`, pack `6b85fd96…f3210`; TM run `01M7MFXH8Q18XDA3AEPBRB0VH9` |
| Full record | [`evidence/dev-loop/DEV-LOOP-01.md`](../../evidence/dev-loop/DEV-LOOP-01.md) |

### R-01 — the golden boundary claim had the wrong key

| Step | Record |
|---|---|
| Test | t-37 `source-linked-seeded-comparator-discrepancy-at-gpa-3-5_test.md` (SHA-256 `f95cea9e…7b20d`) |
| Kane failure | 2026-11-17 10:13:28 UTC, FAIL, exit 1, step 2 `step_not_achievable`; evidence `4ec07345-8e01-439b-abec-5a7d148ca232`, pack `0145b909…cc16e`; TM run `01M7MG7YA8336CPHAFDR9RKRPA` (0/1 passed) |
| Root cause | the template named the golden claim `C-03`; the requirement names it `C-GPA` |
| Fix | `4a3a45b` fix(core): name the golden boundary claim C-GPA; `e66e3a2` rebuild fixture forms |
| Same test again | 10:25:13 UTC: R-01 confirmed fixed (Kane found `C-GPA`), run failed for a new reason (R-02) |

### R-02 — the Intent Trace did not exist

| Step | Record |
|---|---|
| Kane failure | 2026-11-17 10:25:13 UTC, t-37 FAIL, exit 1, step 2; evidence `cca534b4-ec0b-4647-b98a-f34911d81f43`, pack `4f07a50c…3147e` |
| Root cause | a required feature was missing: no per-claim ledger linking source sentence, claim, rule, static result, browser result, and evidence |
| Kane's suggestion | change the test to use the static counterexample view; **rejected**, the test was not edited |
| Fix | `5411b9f` feat(core): build the Intent Trace; `e860ecf` feat(workspace): show the Intent Trace ledger |
| Same test again | 14:27:03 UTC on `e860ecf`, **PASS** (7/7 steps), exit 0; evidence `f0be05ef-7437-4cba-98d8-fd5fcd36ac49`, pack `d862d269…7d851`; TM run `01M7MYWC7NSXEZPGNQHH52SJWB`. Four earlier attempts never reached a verdict and are recorded as UNKNOWN: three Kane sign-in errors (10:37, 13:56, 14:24) and one runner interruption before the first step (14:01) |

### DEV-LOOP-02 — a product probe looked for a conditional field too early

| Step | Record |
|---|---|
| Kane run | PROD-LOOP-01 attempt 1, probe P-05 `valid_submission`, 2026-11-17 15:48 UTC; Kane session `87f8a649-dc26-4a72-a6f5-356a55348fe1`; destination test case TC-45 |
| NIARVA verdict | **UNKNOWN** (`MISSING_OBSERVATION`): Kane searched for the certificate field before entering the GPA that reveals it |
| Root cause | NIARVA's generated probe objective did not state that conditional fields appear only after the answer that reveals them |
| Fix | `4359d55` fix(probes): tell the browser agent that conditional fields appear only after the answers that reveal them (policy `MPP-v4`; earlier proofs become stale by design) |
| Retest | PROD-LOOP-01 attempts 2 and 3 (core track); status in the task board |

## 2. Not a proven defect

| Run | What happened | Classification |
|---|---|---|
| t-36, 2026-11-17 14:41:41 UTC, evidence `34643871-e4d1-4059-b1b1-bf7f9cb6c2f9`, pack `e2b37330…f6c2` | steps 1–4 passed; step 5 ran out of its visual-check budget | **FAIL as recorded**, not a proven product defect. A related gap (version identity header, `7cdc71b`) was fixed; the next run passed on `71564be` (evidence `b0922bd0-2c4d-49ab-a5bb-c466b75c0cc5`, pack `d1ed0530…09fe`, TM run `01M7N0GPATPSTJ0AEMQXYY7QAP`). The fix is not claimed as the cause |

## 3. Seeded faults (labelled, not product defects)

| Where | Fault | What Kane observed |
|---|---|---|
| M0 lab page `?bug=gt` | certificate shown only for GPA > 3.50 | GPA 3.50 → certificate not visible; Kane reported `passed`; observation correct |
| M0 lab page `?bug=comma` | `3,5` read as `3` | certificate not visible; Kane reported `passed`; observation correct |
| M0 lab page `?bug=reqoff` | empty required certificate accepted | Kane reported `failed` (`confirmed_product_bug`) |
| M0 lab page `?multi=1&bug=leakB` | hidden second field submitted | submitted keys included the hidden field; Kane reported `passed`; observation correct |
| NIARVA golden form (demo) | approved `gte(gpa, 3.5)`, generated `gt(gpa, 3.5)` | probe D-01 confirmed the counterexample; NIARVA verdict FAIL (`OBSERVATION_MISMATCH`) while Kane reported `passed` — this is the product working as intended |

These faults exist on purpose to show that Kane observes real mismatches and that NIARVA, not Kane's own status, decides the verdict. They are never counted as product defects found by Kane.

## 4. Testing-infrastructure defect found by audit (not by Kane)

| Finding | Detail |
|---|---|
| Found by | audit of Kane's local recording metadata during the Test Manager consolidation (18 Nov 2026) |
| Defect | tests with a local recording kept publishing to the default project after the profile project changed; two runs (`f0be05ef…`, `b0922bd0…`) landed in KaneAI Generated |
| Fix | recordings untracked (`0073c11`); project guards in `scripts/lib/kane-project.mjs`, `verify-kane.mjs`, `kane-locked.mjs` (this branch) |
| Verification | retests from a clean worktree recorded `project_id = 01M7N0CKZ90R3JR906713EHYW0` in each new recording ([`KANE_EXECUTION_REPORT.md`](KANE_EXECUTION_REPORT.md#2-retests-in-the-official-project)) |

## 5. Kane CLI limitations found by Kane runs (M0)

Not NIARVA defects; they shaped the runner design. See [`evidence/m0/M0_REPORT.md`](../../evidence/m0/M0_REPORT.md) and [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md): `--timeout` does not stop a run (external watchdog required); runs killed before `run_end` report no credits; secret variables are masked in the stream but present inside the sealed pack; viewports below 800 px cannot be set.
