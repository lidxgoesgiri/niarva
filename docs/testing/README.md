# NIARVA testing

NIARVA verifies browser behavior with **Kane CLI** (TestMu AI, formerly LambdaTest) and nothing else. Native tools cover what a browser cannot prove: unit, property, integration, and security tests of the engine and the API. This folder explains how the testing is organized, where every result lives, and how to trace each claim back to a real execution.

## Official Test Manager project

| | |
|---|---|
| Project | **NIARVA intent verification** |
| Project ID | `01M7N0CKZ90R3JR906713EHYW0` |
| URL | https://test-manager.lambdatest.com/projects/01M7N0CKZ90R3JR906713EHYW0/test-cases |
| Default folder for new sessions | `00 — Inbox: Unfiled New Kane Sessions` (`01M7N3K1M2ZNS7M32821R1PDYG`), filed into an area folder afterwards |

This is the only project new NIARVA sessions may go to. The account's default project, **KaneAI Generated** (`01M7K3YXN5X28FCVQCMV3F4HN5`), holds the history from before 17 November 2026 and is kept unchanged as a historical reference. See [`MIGRATION_REPORT.md`](MIGRATION_REPORT.md).

Every Kane entry point in this repository checks the project before it runs (see [Configuration](#configuration)).

## Documents

| Document | Contents |
|---|---|
| [`TEST_STRATEGY.md`](TEST_STRATEGY.md) | What Kane proves, what native tests prove, how a verdict is reached, status vocabulary |
| [`TEST_CASE_INVENTORY.md`](TEST_CASE_INVENTORY.md) | Every test case in the official project, by area folder, and the designed tests in the repository |
| [`MIGRATION_REPORT.md`](MIGRATION_REPORT.md) | The consolidation into the official project: capabilities checked, method, counts, refusals, verification |
| [`TEST_CASE_MAPPING.md`](TEST_CASE_MAPPING.md) | Source test case → destination test case, for all 35 source test cases |
| [`KANE_EXECUTION_REPORT.md`](KANE_EXECUTION_REPORT.md) | Every recorded Kane execution: historical (source project) and retests (official project) |
| [`DEFECT_TRACEABILITY.md`](DEFECT_TRACEABILITY.md) | Defects Kane found → root cause → fix commit → Kane retest |
| [`REGRESSION_REPORT.md`](REGRESSION_REPORT.md) | Regression runs after each fix, and the current state of the regression set |
| [`EVIDENCE_INDEX.md`](EVIDENCE_INDEX.md) | Claim → execution → evidence pack digest → Test Manager record |
| [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) | What the platform could not do, what is not proven, and open items |

Evidence that already existed keeps its place; nothing is duplicated here:

| Evidence | Location |
|---|---|
| Kane runtime validation (M0 lab) | [`evidence/m0/`](../../evidence/m0/) |
| Development closed loop: failure → source repair → retest | [`evidence/dev-loop/`](../../evidence/dev-loop/) |
| Retests in the official project after the consolidation | [`evidence/tms-migration/`](../../evidence/tms-migration/) |
| Raw NDJSON streams and sealed evidence packs | local only (`evidence/private/`, `.testmuai/evidence/`); identified by SHA-256 digest |

## Area folders in the official project

| Folder | Scope |
|---|---|
| 00 — Inbox: Unfiled New Kane Sessions | Default landing folder for new sessions until they are filed |
| 01 — Landing Page & Navigation | Public landing page, boundary demonstration, navigation (UI track) |
| 02 — Creator Workflow | Creator access, workspace states, form lifecycle |
| 03 — AI Intent Extraction & Form Generation | Prompt → claims → approval → generated form and version |
| 04 — Deterministic Verification (Product Probes) | Browser probes started by the verification worker (Kane is the sensor; NIARVA judges) |
| 05 — Claim-Rule Discrepancies & Intent Trace | Approved claim versus generated rule, Intent Trace ledger |
| 06 — Repair Proposals & Human Review | Repair proposals that wait for explicit creator approval |
| 09 — Security & Negative Testing | Access control and negative paths |
| 12 — Infrastructure & Feasibility Testing (M0 Lab) | Kane CLI runtime validation on a static lab form |

Folders 07 (Publication Gate), 08 (End-to-End User Workflows), 10 (Accessibility & Responsive), and 11 (Regression) are not created yet because no executed test case belongs to them. Regression is tracked as Kane test runs, not as a folder. Designed tests for those areas exist in the repository and are listed as `NOT RUN` in [`TEST_CASE_INVENTORY.md`](TEST_CASE_INVENTORY.md) until they are executed.

## Configuration

| Item | Where | Value |
|---|---|---|
| Official project constant and checks | [`scripts/lib/kane-project.mjs`](../../scripts/lib/kane-project.mjs) | `OFFICIAL_TMS_PROJECT.id = 01M7N0CKZ90R3JR906713EHYW0` |
| Development runner | [`scripts/verify-kane.mjs`](../../scripts/verify-kane.mjs) | refuses to start unless the profile project is official and no selected test has a recording bound to another project; records the binding in `summary.json` |
| Locked wrapper for any Kane command | [`scripts/kane-locked.mjs`](../../scripts/kane-locked.mjs) | the same checks for `run`, `generate`, `testmd run`, `testrun run` (exit code 78 when refused) |
| Kane CLI profile (per machine, shared by every agent) | `kane-cli config show --agent` | `project_id = 01M7N0CKZ90R3JR906713EHYW0`, `folder_id = 01M7N3K1M2ZNS7M32821R1PDYG` |

Kane CLI has no per-run project flag for `run`, `testmd run`, or `testrun run`. A session without a recording uploads to the profile's project; a test that already has a local recording keeps publishing to the project stored in that recording. Both are checked. Details: [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md).

## Running Kane tests

```bash
# one or more Assurance-designed tests, under the machine-wide Kane lock
node scripts/verify-kane.mjs <test file | t-id | substring> [...] --label <name>

# any other Kane command, under the same lock and project checks
node scripts/kane-locked.mjs testmd run .testmuai/tests/<name>_test.md --agent --headless
```

A run is **PASS** only with exactly one `test_md_done` whose `overall_status` is `passed` **and** exit code 0. A missing completion event, a timeout, or a sign-in failure is **UNKNOWN**, never a pass.
