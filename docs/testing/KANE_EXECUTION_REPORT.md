# Kane execution report

All runs below are real Kane CLI executions. Outcomes follow [`TEST_STRATEGY.md`](TEST_STRATEGY.md#3-outcome-rules): PASS needs exactly one completion event with status `passed` and exit code 0; anything without a completion event is UNKNOWN. Times are UTC. Pack digests are the first 12 hex characters of the sealed evidence pack's SHA-256 (full digests in [`EVIDENCE_INDEX.md`](EVIDENCE_INDEX.md) and [`evidence/dev-loop/`](../../evidence/dev-loop/)).

## 1. Historical executions (before the consolidation)

These ran on 17 November 2026 and were uploaded to **KaneAI Generated**, the account's default project. They stay there; they were not re-created.

### 1.1 M0 lab: Kane CLI runtime validation

28 run records against a static lab form (not NIARVA product code): 22 with `run_end = passed`, 3 with `run_end = failed`, 3 killed by the watchdog before `run_end`; 751.3 credits reported. Per-run data: [`evidence/m0/runs.json`](../../evidence/m0/runs.json); findings: [`evidence/m0/M0_REPORT.md`](../../evidence/m0/M0_REPORT.md). Their test cases are mapped in [`TEST_CASE_MAPPING.md`](TEST_CASE_MAPPING.md).

### 1.2 NIARVA development runs (`scripts/verify-kane.mjs`, `testmd run`)

| Started | Test | Outcome | Exit | Credits | Evidence ID | Pack | Revision | Note |
|---|---|---|---|---:|---|---|---|---|
| 03:08:07 | t-5 anonymous visitor | UNKNOWN | 2 | 0 | — | — | `4d1ecca` (dirty) | did not start |
| 03:08:38 | t-5 anonymous visitor | **PASS** | 0 | 26.21 | `2973d707…` | `96c11dde3cc6` | `4d1ecca` (dirty) | TM run `01M7KQRNNTY3VJSX5856VWQRNP` |
| 03:11:05 | t-6 empty workspace | **PASS** | 0 | 22.99 | `fe214043…` | `2721de0d3538` | `4d1ecca` (dirty) | TM run `01M7KQX79MTYEX4NQGPRP3GATQ` |
| 03:13:40 | t-5 + t-6 (`testrun run`, replay) | **PASS** | — | — | `238db307…` | `a99c20107be7` | — | `testrun_done = passed` |
| 09:50:43 | t-37 | UNKNOWN | 2 | 0 | — | — | `65554e7` (dirty) | did not start |
| 09:50:58 | t-44 | **PASS** | 0 | 36.93 | `0034b409…` | `d67c982386f5` | `65554e7` (dirty) | TM run `01M7MEVMKZRGJ9T22TH0NS6Y7Y` |
| 09:54:33 | t-36 | **FAIL** | 1 | 99.32 | `475eaa00…` | `13d5fcc89a2c` | `57d1627` | DEV-LOOP-01 failure |
| 10:05:22 | t-36 | **PASS** | 0 | 75.74 | `e868720f…` | `6b85fd96ab06` | `da0c5a0` | DEV-LOOP-01 retest; TM run `01M7MFXH8Q18XDA3AEPBRB0VH9` |
| 10:13:28 | t-37 | **FAIL** | 1 | 61.73 | `4ec07345…` | `0145b909b8de` | `da0c5a0` | R-01; TM run `01M7MG7YA8336CPHAFDR9RKRPA` |
| 10:18:45 | t-44 | **PASS** | 0 | 0 | `234ab9e2…` | `5a0cbfb4d40f` | `da0c5a0` | replay |
| 10:25:13 | t-37 | **FAIL** | 1 | 27.50 | `cca534b4…` | `4f07a50c0d18` | `e66e3a2` | R-02 |
| 10:37:07 | t-37 | UNKNOWN | 2 | 0 | — | — | `e860ecf` | sign-in error |
| 13:56:02 | t-37 | UNKNOWN | 2 | 0 | — | — | `e860ecf` | sign-in error |
| 14:01:22 | t-37 | UNKNOWN | — | — | — | — | — | runner interrupted before the first step (no summary) |
| 14:24:22 | t-37 | UNKNOWN | 2 | 0 | — | — | `e860ecf` | sign-in error |
| 14:27:03 | t-37 | **PASS** | 0 | 100.87 | `f0be05ef…` | `d862d269e4a6` | `e860ecf` | R-02 retest; TM run `01M7MYWC7NSXEZPGNQHH52SJWB` |
| 14:34:51 | t-44 | UNKNOWN | 2 | 0 | — | — | `e860ecf` | sign-in error |
| 14:35:16 | t-36 | UNKNOWN | 2 | 0 | — | — | `e860ecf` | sign-in error |
| 14:37:21 | t-44 | **PASS** | 0 | 0 | `35ac194c…` | `0a7a7be5343c` | `e860ecf` | replay |
| 14:41:41 | t-36 | **FAIL** | 1 | 78.79 | `34643871…` | `e2b373303b90` | `e860ecf` | step 5 inconclusive |
| 14:57:08 | t-36 | **PASS** | 0 | 13.51 | `b0922bd0…` | `d1ed0530827d` | `71564be` | TM run `01M7N0GPATPSTJ0AEMQXYY7QAP` |

Totals (21 records): **9 PASS, 4 FAIL, 8 UNKNOWN**. "(dirty)" means the working tree had uncommitted changes under `apps/` or `packages/` when the run started; those runs are foundation and early creator-workflow runs, and none of them is used as the proof of a fix.

### 1.3 Test runs in the source project

Test Manager lists 7 test runs in KaneAI Generated. Each one is the upload of an execution above:

| Test run | Name in Test Manager | Result | Evidence ID |
|---|---|---|---|
| `01M7KQRNNTY3VJSX5856VWQRNP` | Anonymous visitor receives unauthorized workspace state | 1/1 passed | `2973d707-69b3-4d72-87dc-48248d2daedc` |
| `01M7KQX79MTYEX4NQGPRP3GATQ` | Creator without forms sees an empty workspace state | 1/1 passed | `fe214043-4d45-444e-8a42-47b93ee14001` |
| `01M7MEVMKZRGJ9T22TH0NS6Y7Y` | Repair proposal waits for explicit creator approval | 1/1 passed | `0034b409-8adb-4cf0-9953-f433589279ca` |
| `01M7MFXH8Q18XDA3AEPBRB0VH9` | Approved scholarship claims generate a versioned conditional form | 1/1 passed | `e868720f-90a3-4073-a12e-ae931dc513a3` |
| `01M7MG7YA8336CPHAFDR9RKRPA` | Source-linked seeded comparator discrepancy at GPA 3.5 | 0/1 passed | `4ec07345-8e01-439b-abec-5a7d148ca232` |
| `01M7MYWC7NSXEZPGNQHH52SJWB` | Source-linked seeded comparator discrepancy at GPA 3.5 | 1/1 passed | `f0be05ef-7437-4cba-98d8-fd5fcd36ac49` |
| `01M7N0GPATPSTJ0AEMQXYY7QAP` | Approved scholarship claims generate a versioned conditional form | 1/1 passed | `b0922bd0-2c4d-49ab-a5bb-c466b75c0cc5` |

The last two were run **after** the profile was switched to the official project; they landed in the default project because their tests still had recordings bound to it (see [`MIGRATION_REPORT.md`](MIGRATION_REPORT.md#configuration-defect-found-during-the-audit)).

### 1.4 Product verification probes (verification worker, `kane-cli run`)

PROD-LOOP-01 runs the product's own verification: the worker sends probe objectives to Kane, and NIARVA's server judges each observation. These sessions went to the official project (folder 04). Sources: the worker's records (`evidence/product-loop/PROD-LOOP-01.md` and the attempt files beside it, on branch `feature/verification-worker`, commit `d28dee5`) and the worker log, from which the core track mapped each Kane session to its test case.

| Attempt | Probe | Kane session | Test case | NIARVA verdict |
|---|---|---|---|---|
| 0 (cancelled: server stopped) | D-01 | `762301c3-707d-4b98-87cf-fdea7e0d5c95` | — | UNKNOWN (`MISSING_OBSERVATION`) |
| 1 | D-01 | `4e7adc6b-c630-47ba-972e-4f0e50cdb502` | — | UNKNOWN (`AUTH_OR_CREDITS`, did not start) |
| 1 | D-01 counterexample confirmation | `ad1c0fdf-9463-4c59-ab65-8b44b3250fcc` | TC-39 | FAIL (`OBSERVATION_MISMATCH`, seeded golden defect confirmed; Kane said `passed`) |
| 1 | P-01 initial_required | `6df0252f-8412-4a0a-8854-9bf43d2d95cf` | TC-41 | PASS |
| 1 | P-02 boundary_bundle | `372b5cd1-8cfd-4a0b-8a24-7f21fa80179f` | TC-42 | PASS |
| 1 | P-03 conditional_required_empty | `b6d9b8b1-6f1e-4c86-98b0-c279d1317679` | TC-43 (by creation time) | PASS |
| 1 | P-04 hidden_exclusion | `92422026-da84-4d9e-b1c3-a22dc46ae985` | TC-44 | PASS |
| 1 | P-05 valid_submission | `87f8a649-dc26-4a72-a6f5-356a55348fe1` | TC-45 | UNKNOWN (`MISSING_OBSERVATION`, DEV-LOOP-02) |
| 1 | P-06 decimal_comma | `f14b2c4d-548b-411e-9344-e4f4e6b7bab6` | TC-46 (by creation time) | PASS |
| 1 | P-07 constraint_check | `fc9cb192-4bd4-4af7-ab17-8b0140525185` | TC-47 | PASS |
| 2 (interrupted, run cancelled) | D-01 | `4c3a2799-b4f2-4ded-99fb-06dc78dba437` | TC-64 | FAIL (`OBSERVATION_MISMATCH`, seeded defect confirmed) |
| 2 | P-01 initial_required | `2e3c99ac-cd51-45be-a700-b3bd7ea3f0e8` | TC-77 | PASS |
| 2 | P-02 boundary_bundle | `fc3c734c-7529-4f9d-814e-b3e363d9d1a7` | TC-81 | PASS |
| 2 | P-03 conditional_required_empty | `bf3621b7-7fc0-406a-ba3c-4a8e2005514b` | TC-84 | UNKNOWN (`MISSING_OBSERVATION`: Kane ended with "No start URL provided" before any step, 0 credits) |
| 2 | P-04 hidden_exclusion | `11b7dce7-4d58-4057-b061-a1246e73a456` | TC-85 | UNKNOWN (no verdict: the session never reached `run_end`; the run was cancelled) |
| 2 | P-05, P-06, P-07 | — | — | NOT RUN (cancelled before they started) |
| 3 (VERIFIED) | D-01 (diagnostic run `01a1eadc-…63dd`) | `2c149ca9-2994-4c03-bda4-8742cbe494dc` | TC-101 | FAIL (`OBSERVATION_MISMATCH`, seeded defect confirmed; Kane said `passed`) |
| 3 | P-01 initial_required | `8fbce2f3-a1c1-44fb-91d8-36b938edf382` | TC-103 | PASS |
| 3 | P-02 boundary_bundle | `d5346906-806f-4319-abf2-752a5b4a667c` | TC-104 | PASS |
| 3 | P-03 conditional_required_empty | `6c42296e-226b-4e9f-93a6-c3d3a17661bb` | TC-106 | PASS |
| 3 | P-04 hidden_exclusion | `5a3ec84b-db23-4f62-91df-a7e82494747f` | TC-108 | PASS |
| 3 | P-05 valid_submission | `62114ad6-0baf-4349-99fd-95d7508f8290` | TC-110 | PASS (the probe DEV-LOOP-02 repaired) |
| 3 | P-06 decimal_comma | `fd484a4b-314d-4f40-b458-ae6a37166853` | TC-113 | PASS |
| 3 | P-07 constraint_check | `551c74fd-8779-4e2b-91be-514251a064f0` | TC-115 | PASS |

Attempt 3 ended **VERIFIED, 8/8 required probes PASS** (full verification `01a1eade-4eef-7d44-8714-0375693a4fff`, build `71839e9`, policy `MPP-v4`, 260.41 credits). Publishing the repaired version was refused before browser proof (`409 GATE_BLOCKED`) and accepted after it (`201`); a public respondent submission then returned receipt `JBSFXZFC`. The evidence pack digest of every attempt-3 probe is in `PROD-LOOP-01.md`. These are the core track's executions; this report references them and did not run them again.

Probe P-08 is an HTTP server-contract check without Kane, so it has no test case; it passed in attempts 1, 2, and 3. The verdicts belong to NIARVA, not to Kane: for D-01, Kane reported `passed` while NIARVA, comparing the observation with the approved claim, reported the mismatch it was built to find.

TC-85, TC-103, TC-108, and TC-115 show 0 steps and stay in *Automation in progress* in Test Manager. Kane completed the three attempt-3 sessions (TC-103, TC-108, TC-115); TC-85's session was cancelled before `run_end`. For those probes the evidence is the worker's record and the pack digest, not the Test Manager test case.

Correction: the first version of these documents matched TC-84 and TC-85 by creation time to attempt 2's P-03 "and its retry". The worker log shows that TC-85 is attempt 2's P-04 session.

## 2. Retests in the official project

Run on 17 November 2026, 19:07–19:43 UTC (18 November, 02:07–02:43 WIB), with `node scripts/verify-kane.mjs … --label tms-retest` from a clean worktree of `test/kane-tms-consolidation` (no earlier recording), against a production build of `b17a767` served on `http://localhost:3300` with its own embedded database (environment id `local-retest-3300`) and freshly seeded synthetic accounts. Every run took the machine-wide Kane lock, interleaved with the verification worker and the UI track. Kane CLI 0.10.4, headless Chrome.

| Started (UTC) | Test | Outcome | Exit | Steps (authored / replayed) | Credits | Evidence pack | Recording bound to | Test case |
|---|---|---|---|---|---:|---|---|---|
| 19:07:11 | t-5 | **PASS** | 0 | 2 / 0 | 26.71 | `f7202a6f…` `12aaa39ad992` | `01M7N0CKZ90R3JR906713EHYW0` | TC-105 `01M7NEG155H11YH0RNZ2EXMAKJ` |
| 19:12:04 | t-6 | **PASS** | 0 | 2 / 0 | 30.64 | `801c6450…` `0a82ec579fef` | `01M7N0CKZ90R3JR906713EHYW0` | TC-107 `01M7NES07YV6K4BQQ8Y7083D1D` |
| 19:16:56 | t-44 | **UNKNOWN** (did not start: Token refresh failed) | 2 | — | 0 | — | — | — |
| 19:17:28 | t-44 | **PASS** | 0 | 2 / 0 | 40.68 | `30c613bb…` `00a800b9ec90` | `01M7N0CKZ90R3JR906713EHYW0` | TC-109 `01M7NF2VXG14F0PE2NGST7TC5E` |
| 19:30:12 | t-36 | **PASS** | 0 | 5 / 0 | 86.9 | `b7593a16…` `c0a987052fe2` | `01M7N0CKZ90R3JR906713EHYW0` | TC-112 `01M7NFT74HM01X7P35RHKNXEY2` |
| 19:38:34 | t-37 | **PASS** | 0 | 7 / 0 | 122.38 | `12883865…` `cf56a3af86bb` | `01M7N0CKZ90R3JR906713EHYW0` | TC-114 `01M7NG9T8ZD75HJTJ4Q01M3TRC` |

Totals: **6 executions of 5 tests — 5 PASS, 0 FAIL, 1 UNKNOWN**; 307.31 credits reported. The UNKNOWN run never started (Kane sign-in: "Token refresh failed"); the runner retried once after 20 seconds, and both records are kept.

What the retests prove:

- **Same tests, unchanged.** The test file digests are identical to the historical runs: t-36 `860858c7…5c5969`, t-37 `f95cea9e…7b20d`, t-44 `e9116090…fd8c` (see [`evidence/dev-loop/`](../../evidence/dev-loop/)).
- **Authored, not replayed.** No recording existed, so Kane decided every step again in a real browser (authored 2, 2, 2, 5, 7; replayed 0). DEV-LOOP-01 (t-36) and R-02 (t-37) stay fixed on the current stack.
- **In the right project.** Each new recording is bound to `01M7N0CKZ90R3JR906713EHYW0`; the runner recorded the binding before and after each run.
- **Code under test.** `apps/` and `packages/` at `b17a767` with no local changes (`source.dirty = false`); the last two runs record `230ed3b`, which adds only documentation and runner checks on top of `b17a767`.

Sanitized records: [`evidence/tms-migration/retests.json`](../../evidence/tms-migration/retests.json). Pack digests: [`EVIDENCE_INDEX.md`](EVIDENCE_INDEX.md#3-retests-in-the-official-project).

## 3. Status totals (records in this repository)

| Group | PASS | FAIL | BLOCKED | UNKNOWN | NOT RUN |
|---|---:|---:|---:|---:|---:|
| Development runs, 17 Nov (§1.2) | 9 | 4 | 0 | 8 | — |
| Retests in the official project (§2) | 5 | 0 | 0 | 1 | — |
| Product probes, PROD-LOOP-01 attempts 0–3, Kane sessions (§1.4, NIARVA verdicts) | 15 | 3 | 0 | 5 | 3 |
| Designed tests never executed | — | — | — | — | 59 |

The three probe FAILs are D-01 confirming the seeded defect in attempts 1, 2, and 3: the expected result, not a regression. P-08 (no Kane) is not counted in that row. M0 lab runs are reported in §1.1 because their verdicts are the lab oracle's, not Kane's status. BLOCKED is 0 here; the UI track reports its own BLOCKED landing run (TC-34 / TC-76) in `evidence/product-experience/` on its own branch.
