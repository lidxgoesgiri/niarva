# Regression after DEV-LOOP-01

> Every Kane CLI run after the DEV-LOOP-01 repair, in order, including failures and runs that ended without a verdict.
> Each test file was designed by Kane Assurance and approved at the design review. **No test file was edited**: the SHA-256 of each file is the same in every run below.
> Runner: `node scripts/verify-kane.mjs <id>` → `kane-cli testmd run <file> --agent --headless` (Kane CLI 0.10.4), one run at a time, against the production build on `http://localhost:3000` with synthetic accounts.
> Outcome rule: PASS needs exactly one `test_md_done` with `overall_status = passed` **and** exit code 0. A missing completion event is UNKNOWN and is never counted as a pass.

## Tests

| ID | Test file | SHA-256 |
|---|---|---|
| t-37 | `source-linked-seeded-comparator-discrepancy-at-gpa-3-5_test.md` | `f95cea9e3311b39d8cdf23bfa501c1e2c7436f658fa739a0b0d23c2c37e7b20d` |
| t-44 | `repair-proposal-waits-for-explicit-creator-approval_test.md` | `e9116090a19ba34648ab09555b460659732ae6b9a73e1c7c8aa11fb13603fd8c` |
| t-36 | `approved-scholarship-claims-generate-a-versioned-conditional_test.md` | `860858c7a5f4e502af83624025105eafc3698630fb3b255e9e3783d68d5c5969` |

## 1. Regression on the DEV-LOOP-01 build (`da0c5a0`)

| Started (UTC) | Test | Outcome | Exit | Credits | Evidence pack SHA-256 |
|---|---|---|---|---|---|
| 2026-11-17 10:13:28 | t-37 | **FAIL** | 1 | 61.73 | `0145b909b8de5a06f5c8cabd730a54f64e3bfaf7be69a3f1a7bcfa2b0eecc16e` |
| 2026-11-17 10:18:45 | t-44 | PASS | 0 | 0.00 reported | `5a0cbfb4d40fad9175821ecf8df1bb46c7d645df825a787b0ea2fe293f38aa9e` |

### Defect R-01: the golden boundary claim had the wrong name

- **Kane observation (t-37, step 2, `assertion_error.step_not_achievable`):** the test looks for the approved claim **C-GPA**; the product listed the GPA boundary claim as **C-03**.
- **Classification:** source defect. The requirement names the golden boundary claim `C-GPA`; the test is correct.
- **Repair:**
  - `4a3a45b` `fix(core): name the golden boundary claim C-GPA as the requirement does`. The template claim key is now `C-GPA`, and the claim-key grammar accepts short readable names (`C-[A-Z][A-Z0-9-]{1,11}`) as well as `C-01` style keys.
  - `e66e3a2` `test(kane): rebuild fixture forms when the template generation changes`. Fixture forms are recreated from the current template; they are named with generation suffix `B`.
- **Native tests after the repair:** core 46/46, web 25/25.

## 2. Retest on `e66e3a2`

| Started (UTC) | Test | Outcome | Exit | Credits | Evidence pack SHA-256 |
|---|---|---|---|---|---|
| 2026-11-17 10:25:13 | t-37 | **FAIL** | 1 | 27.50 | `4f07a50c0d182c71fc68773544933ad44fac484c853d66d0cd8a02703c73147e` |

R-01 is fixed: Kane found `C-GPA`. The run then failed at the same step for a different reason.

### Defect R-02: the Intent Trace did not exist

- **Kane observation (t-37, step 2, `assertion_error.step_not_achievable`):** "expected an Intent Trace workspace that was not available on the current approved-claims review screen."
- **Kane's suggestion:** update the test to use the static counterexample details instead. **Rejected.** The Intent Trace is a P0 requirement (FR-05 / AC-05; the per-claim ledger is FR-VER-09). The workspace showed counterexamples but had no per-claim trace linking source sentence, claim, rule, static result, browser result, and evidence. Changing the test would have hidden a missing feature.
- **Classification:** source defect (missing required feature).
- **Repair:**
  - `5411b9f` `feat(core): build the Intent Trace from approved claims, generated rules, and analysis`. Pure functions `buildIntentTrace` and `claimBrowserStatus`. Expectations come only from the approved claims. A boundary table (t − ε, t, t + ε) compares the approved claim with the generated form. Unrequested and missing rules are flagged. Browser status comes only from the latest full run, so a diagnostic run is never proof. 10 new unit tests.
  - `e860ecf` `feat(workspace): show the Intent Trace ledger and open it from each approved claim`. The ledger sits at the top of the verification workspace. Every approved claim gets an "Intent Trace" button. Static and browser status are separate badges. The discrepancy shows the witness, the source reference, the demonstration label, and the observed consequence; no applicant rejection is claimed. 3 new integration tests.
- **Native tests after the repair:** core 56/56, web 28/28, typecheck and lint clean.

## 3. Retest on `e860ecf`

| Started (UTC) | Test | Outcome | Exit | Credits | Evidence pack SHA-256 | Note |
|---|---|---|---|---|---|---|
| 2026-11-17 10:37:07 | t-37 | UNKNOWN | 2 | 0 | — | Kane CLI sign-in: "TMS did not return an org_id" |
| 2026-11-17 13:56:02 | t-37 | UNKNOWN | 2 | 0 | — | Kane CLI sign-in: "Token refresh failed" |
| 2026-11-17 14:01:22 | t-37 | UNKNOWN | — | — | — | runner interrupted before the first step; no completion event |
| 2026-11-17 14:24:22 | t-37 | UNKNOWN | 2 | 0 | — | Kane CLI sign-in: "TMS did not return an org_id" |
| | | | | | | repository owner signed in again (`kane-cli login --oauth`) |
| 2026-11-17 14:27:03 | t-37 | **PASS** | 0 | 100.87 | `d862d269e4a60433455f71741d3cdc7682b96f93aa666223febe4ca6f847d851` | all 7 steps passed |

The four UNKNOWN runs never opened a browser and are not verdicts about NIARVA. They are listed because nothing is left out.

What Kane confirmed in the passing run (step summaries):

1. Signed in and opened the seeded-defect fixture form.
2. Opened the **C-GPA Intent Trace** from the approved-claims review. The probe expectation is based on the approved `gte(gpa, 3.5)`, with the certificate visible and required, and not on the generated `gt(gpa, 3.5)` rule.
3. GPA 3.5 is the witness for approved `gte` versus generated `gt`.
4. The mismatch is linked to the approved C-GPA claim and its cited source sentence.
5. "Seeded defect for demonstration" is displayed.
6. The explanation of the missing certificate field does not claim an applicant rejection that was never observed.
7. The structural comparison is not presented as established browser correctness.

Kane decisions in the passing run: 1 replayed, 6 authored, no adaptive heal.

## 4. Regression of neighbouring tests on `e860ecf`

The Intent Trace changed the verification panel, so the tests that use it were run again on the same build.

| Started (UTC) | Test | Outcome | Exit | Credits | Kane decisions | Evidence pack SHA-256 | Note |
|---|---|---|---|---|---|---|---|
| 2026-11-17 14:34:51 | t-44 | UNKNOWN | 2 | 0 | — | — | did not start: "TMS did not return an org_id" |
| 2026-11-17 14:35:16 | t-36 | UNKNOWN | 2 | 0 | — | — | did not start: same sign-in error |
| 2026-11-17 14:37:21 | t-44 | PASS | 0 | 0 | 2 replayed, 0 authored | `0a7a7be5343cfe64e2a8c3dcb73a66775cfcc334faa3226cf7b9b4d5505fc9f9` | replayed recorded actions in a real browser, so no AI credits |
| 2026-11-17 14:41:41 | t-36 | **FAIL** | 1 | 78.79 | 5 replayed, 0 authored, adaptive heal | `e2b373303b90990aeab454031c4d398959995b9fe552442398be819f85ebf6c2` | steps 1–4 passed; step 5 `step_not_achievable` |

### t-36 step 5: inconclusive assertion, recorded as FAIL

- **Kane observation:** "The saved generated form version was visible, but the visual check ran out of its allowed turn budget before it could finish." Kane suggested replacing the test's assertion with a direct check. **Rejected**: test files are not edited.
- **What passed in the same run:** generation from the approved claims, the Name and GPA fields, and the declarative rule `gte(gpa, 3.5) → certificate visible AND required` mapped to C-GPA.
- **Classification:** not a proven product defect. The outcome stays FAIL because Kane's completion event says failed.
- **Related product gap that was fixed anyway:** the verification column showed the version only as `v1`. The proof layout in the requirements asks for a version identity header (version, specification hash, definition hash, engine). That header was added. It is recorded here because it touches the same step; it is not claimed as the cause of the failure.

## Notes

- Evidence packs and raw NDJSON streams stay private (`evidence/private/`, gitignored) because they contain the local environment URL and the synthetic account session. The digests above identify them.
- Credits are taken from the `run_end` events. Both t-44 runs were full replays of recorded actions (2 replayed, 0 authored), so they used no AI credits.
- Since `scripts/verify-kane.mjs` was updated, every summary records Kane's replay and author decision counts. A run that never starts because of Kane's sign-in check is retried once after 20 seconds; both attempts keep their own records.
