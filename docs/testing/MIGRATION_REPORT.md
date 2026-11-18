# Migration report: consolidating NIARVA testing into one Test Manager project

| | |
|---|---|
| Date | 17–18 November 2026 (UTC times below) |
| Source | **KaneAI Generated**, `01M7K3YXN5X28FCVQCMV3F4HN5` (the account's default project) |
| Destination (official) | **NIARVA intent verification**, `01M7N0CKZ90R3JR906713EHYW0` |
| Performed by | Claude Code (test consolidation session) under the repository owner's account; Codex and the core-track Claude session were informed and kept their own work running |
| Tools | Kane CLI 0.10.4 (`projects`, `folders`, `config`, `testmd`/`testrun` via the repository runners) and the Test Manager web interface for the operations Kane CLI does not offer (copy, rename, folder rename). The browser was used only to administer Test Manager, never to test NIARVA. |

## 1. Starting point (verified before any change)

| Project | Test cases | Test runs | Checked |
|---|---:|---:|---|
| KaneAI Generated | 35 | 7 | 2026-11-17 ~15:45 UTC, Test Manager list view (2 pages) |
| NIARVA intent verification | 12 | 0 | same time; it had grown from 7 because the verification worker was creating probe sessions |

The destination kept growing during the migration (worker probes and UI-track sessions). Nothing that was already there was removed. At 19:50 UTC it held **80 test cases**, and at 01:43 UTC on 18 November **84**; the folder-by-folder list is in [`TEST_CASE_INVENTORY.md`](TEST_CASE_INVENTORY.md). The source still held **35 test cases and 7 test runs** after the migration (re-checked at about 19:35 UTC).

## 2. What the platform supports (checked first, nothing assumed)

| Need | Kane CLI 0.10.4 | Test Manager (TestMu AI docs) | Used |
|---|---|---|---|
| List / create projects and folders | `projects list|create`, `folders list|create --project` | yes | Kane CLI for listing and creating; web UI for renaming folders |
| Choose where new sessions upload | `config project <id>`, `config folder <id>` (profile-wide) | — | Kane CLI |
| List test cases of a project | **no command** | list view, CSV export | web UI list view |
| Copy or move test cases between projects | **no command** | Bulk Actions → Copy / Move ([docs](https://www.testmuai.com/support/docs/copy-and-move-support-for-test-cases/)) | **Copy** in the web UI |
| Move or copy test runs between projects | **no command** | **not supported**: "Test runs cannot be moved or copied to another project" ([docs](https://www.testmuai.com/support/docs/test-run-bulk-actions/)) | — (kept as historical references) |
| Per-run project for `run`, `testmd run`, `testrun run` | **no flag** | — | profile setting plus repository guards (§5) |

No undocumented endpoint was called. Kane CLI's own Test Manager API calls were not reused outside the CLI.

## 3. Decisions

1. **Copy, not Move.** Move keeps the ID but removes the test case from the source before the result is verified. Copy leaves the source untouched; the copy gets a new ID that is recorded in [`TEST_CASE_MAPPING.md`](TEST_CASE_MAPPING.md).
2. **Historical execution stays where it happened.** Test runs cannot leave their project. The 7 source test runs remain in KaneAI Generated and are referenced by run ID, evidence ID, and evidence pack digest ([`EVIDENCE_INDEX.md`](EVIDENCE_INDEX.md)). No history was recreated by hand.
3. **Real retests in the destination.** The five product test cases were run again with Kane CLI in the official project. These are new executions with their own IDs and are reported as retests, never as the historical runs ([`KANE_EXECUTION_REPORT.md`](KANE_EXECUTION_REPORT.md)).
4. **Folders by product area.** Existing folder IDs were kept (renamed only) so no configuration broke. Areas without an executed test case got no folder.
5. **Inbox for new sessions.** Kane's folder setting is one value for the whole machine, shared by the worker, Codex, and the core track. New sessions land in `00 — Inbox` and are filed afterwards, so no area folder receives sessions that do not belong to it.

## 4. Changes made in Test Manager

### Folders (destination)

| Folder ID | Before | After |
|---|---|---|
| `01M7N0CQTQ5E4V0XPEHDYRZCMM` | Assurance regression tests | 01 — Landing Page & Navigation |
| `01M7N0D3PD11V10MF39MV20PQF` | Product verification probes | 04 — Deterministic Verification (Product Probes) |
| `01M7N0DCDQKKT0MH965V8HQVCF` | M0 feasibility lab | 12 — Infrastructure & Feasibility Testing (M0 Lab) |
| `01M7N3K1M2ZNS7M32821R1PDYG` | — | 00 — Inbox: Unfiled New Kane Sessions (new) |
| `01M7N3KHV619T237TXMBBVAN16` | — | 02 — Creator Workflow (new, `kane-cli folders create`) |
| `01M7N3KMRV3Y7ZHT9WGFQEFNNH` | — | 03 — AI Intent Extraction & Form Generation (new) |
| `01M7N3KRAK3X0SFKNSFFQNEVXG` | — | 05 — Claim-Rule Discrepancies & Intent Trace (new) |
| `01M7N3KW763P0SG04TZQEQH0M7` | — | 06 — Repair Proposals & Human Review (new) |
| `01M7N3KZKPPT65DK7KXJ37CRVJ` | — | 09 — Security & Negative Testing (new) |

### Test cases

| Operation | Count | Result |
|---|---:|---|
| Copy to destination (7 bulk operations, ~16:10–16:25 UTC) | 35 attempted | **31 copied**; 4 refused by the platform |
| Copy retried for a refused case (TC-25 alone) | 1 | refused again: "Test cases are in automation or could not be copied" |
| Rename of copied M0 test cases with generic or repeated titles | 24 | all 24 confirmed by reading the title back from Test Manager; each rename is a version-history commit naming the source test case and stating that steps, assertions, and results are unchanged |
| Rename of product-probe sessions (verification worker) and one unattributed session | 18 | TC-38, TC-39, TC-41–TC-47, TC-64, TC-77, TC-81, TC-84, TC-101, TC-104, TC-106, TC-110, TC-113; all confirmed by reading the title back; commit messages name the probe, attempt, and Kane session (or state that the session is unattributed) |
| Rename of live retest test cases to their designed test | 5 | TC-105, TC-107, TC-109, TC-112, TC-114 (`t-n: <designed test title>`); all confirmed by reading the title back |
| Move within the destination | 23 | 13 UI-track sessions from 04 to 01; 5 live retest test cases from the Inbox to their area folders; 4 attempt-3 probe sessions (TC-104, TC-106, TC-110, TC-113) from the Inbox to 04; UI-track TC-111 from the Inbox to 01 |
| Move refused by the platform | 2 | TC-108, TC-115 ("Remaining test cases are in automation"); they stay in the Inbox |
| Renames that reported success but did not persist | 10 | Test Manager showed "Test case updated successfully" and a new version, but the page had re-rendered and dropped the typed title. Detected by an audit of the list view, redone with a read-back check, and verified. The extra versions in those test cases' history are title-only no-ops |
| Source test cases modified, archived, or deleted | 0 | — |

The four refused test cases (TC-17, TC-18, TC-22, TC-25) are sessions that Kane never finished: the M0 watchdog killed two timeout probes and one boundary run, and one run stopped at a confirmed lab fault. Test Manager still lists them as *Automation in progress*.

### Duplicates

None removed. Repeated titles were M0 repeatability runs (the same objective run three times on purpose) and three viewport set-ups; each copy now names its run. See [`TEST_CASE_MAPPING.md`](TEST_CASE_MAPPING.md#duplicates).

## 5. Configuration

| Item | Before | After |
|---|---|---|
| Kane profile project | `01M7N0CKZ90R3JR906713EHYW0` (already set on 17 Nov by the core track; cached label still said "KaneAI Generated") | unchanged |
| Kane profile folder | `01M7N0D3PD11V10MF39MV20PQF` (probes) | `01M7N3K1M2ZNS7M32821R1PDYG` (Inbox), 2026-11-17 19:05 UTC |
| Repository runners | no project check | `scripts/lib/kane-project.mjs`; `verify-kane.mjs` and `kane-locked.mjs` refuse a run when the profile is not the official project or a selected test's recording is bound to another project |
| Run records | no Test Manager binding | `summary.json` → `testManager` (profile project and folder, recording binding before and after, test case IDs from `test_url`) |
| Documentation | README and `evidence/dev-loop/regression.md` said every session uploaded to the new project from 17 Nov evening | corrected (see §6) |

### Configuration defect found during the audit

Switching the profile project was not enough. A test that already has a local recording (`.testmuai/tests/output-<test>/.internal/meta.json`) keeps publishing replays and heals to the project stored in that recording. All five recorded product tests were bound to KaneAI Generated, so two runs made after the switch still landed there:

| Execution (evidence ID) | Test | Time (UTC) | Landed in |
|---|---|---|---|
| `f0be05ef-7437-4cba-98d8-fd5fcd36ac49` | t-37 | 2026-11-17 14:27 | KaneAI Generated, test run `01M7MYWC7NSXEZPGNQHH52SJWB` |
| `b0922bd0-2c4d-49ab-a5bb-c466b75c0cc5` | t-36 | 2026-11-17 14:57 | KaneAI Generated, test run `01M7N0GPATPSTJ0AEMQXYY7QAP` |

Fix: recordings are no longer tracked in git (`0073c11`, core track), the retests ran from a clean worktree without recordings, and the repository guards now refuse any test whose recording points elsewhere.

## 6. Corrected statements

| File | Before | After |
|---|---|---|
| `README.md` | "From 17 November 2026 (evening, WIB), Kane CLI sessions upload to … NIARVA intent verification." | Names the official project and ID, states that two later runs of recorded tests still went to the default project, and points here |
| `evidence/dev-loop/regression.md` | "From this point, Kane CLI sessions are uploaded to … folder 'Assurance regression tests'." | Same correction, with the two affected executions |

## 7. Coordination

- Codex was informed of the official project ID; its runner already refuses any other project and does not change Kane's global settings. Codex asked that its two historical landing test cases (TC-34, TC-35) stay in the source with their history: they were copied, not moved.
- The core-track session agreed that this session owns the migration and folder policy, keeps the global project unchanged, and takes the machine-wide Kane lock for every run. Retests here used port 3300 and their own embedded database.

## 8. Acceptance criteria

| Criterion | Status |
|---|---|
| All source test cases inventoried | **Met**: 35/35, with origin run for 33 and an explicitly ambiguous pair (TC-17/TC-18) |
| Migrated test cases present in the destination | **Met for 31**: 4 refused by the platform and documented |
| Pre-existing destination test cases still available | **Met**: none removed; they were filed into area folders |
| Source → destination mapping complete | **Met**: [`TEST_CASE_MAPPING.md`](TEST_CASE_MAPPING.md) |
| Duplicates handled without losing history | **Met**: none deleted; repeated runs labelled |
| Original execution history preserved or referenced | **Met by reference**: test runs cannot be moved; 7 runs referenced with evidence IDs and digests |
| New tests directed to the official project | **Met**: profile and repository guards; see [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) for the profile being machine-wide |
| Evidence verifiable against real executions | **Met**: [`EVIDENCE_INDEX.md`](EVIDENCE_INDEX.md) |
| No fabricated evidence, no misleading claims | **Met**: two inaccurate statements found and corrected (§6) |
| Claude and Codex use the same project configuration | **Met**: same profile project; Codex's runner checks it; repository runners check it |
