# Test strategy

## 1. Principles

1. **Kane CLI is the only browser runner.** Browser, end-to-end, acceptance, UI behavior, responsive, keyboard, and production smoke checks run through Kane CLI. No other browser automation is used to verify NIARVA, neither instead of Kane nor as a pre-check.
2. **Kane is a sensor, not a judge.** Kane reports what it did and observed. For product probes, NIARVA's server computes the verdict from typed observations against an oracle derived from the creator's approved claims. A Kane `passed` status alone is never proof: the M0 lab showed three seeded mismatches that Kane reported as `passed` while its observations were correct ([`evidence/m0/M0_REPORT.md`](../../evidence/m0/M0_REPORT.md) §3.1).
3. **Tests come from requirements, not from the implementation.** Development tests are designed by Kane Assurance (`kane-cli design tests`) from the requirements, reviewed by the repository owner, and stored as `.testmuai/tests/*_test.md`. A test file is never edited to make it pass; the SHA-256 of each test file is recorded with every run.
4. **A failure is fixed in the source.** A Kane failure is diagnosed (product, test, or infrastructure). A product defect is repaired in the source, and the **same** test is run again, followed by the affected regression set.
5. **Nothing is invented.** Every reported result has a Kane session or execution ID, a timestamp, the revision under test, and a sealed evidence pack digest. Missing metadata is reported as unavailable.

## 2. Layers

| Layer | Tool | Proves | Where results are |
|---|---|---|---|
| Engine and contracts | Vitest unit tests | rule DSL, exact decimals, partition analysis, repair, verdict rules, hashing | CI, `packages/core/test` |
| API, database, security | Vitest integration tests | access control, idempotent submissions, publish gate transaction, AI output guard | CI, `apps/web/tests/integration` |
| Browser behavior of the product | Kane CLI (`testmd run` of Assurance-designed tests) | what a creator, respondent, or visitor sees and can do | official Test Manager project, [`KANE_EXECUTION_REPORT.md`](KANE_EXECUTION_REPORT.md) |
| Product verification probes | Kane CLI (`run`, started by the verification worker) | that a generated form behaves in a real browser as the approved claims require | official project, folder 04; verdicts in the NIARVA database |
| Kane runtime itself | Kane CLI on a static lab form | stream shape, observation capture, timeouts, secrets, viewport limits | [`evidence/m0/`](../../evidence/m0/), folder 12 |

## 3. Outcome rules

| Status | Meaning |
|---|---|
| `PASS` | exactly one completion event with status `passed`, and exit code 0 |
| `FAIL` | the completion event reports `failed` |
| `BLOCKED` | the run could not reach the application or a precondition (environment, network, missing fixture) |
| `UNKNOWN` | no completion event, a watchdog kill, a sign-in failure before the first step, or an overlap with another run |
| `NOT RUN` | designed but never executed |

`UNKNOWN`, `BLOCKED`, and `NOT RUN` are never counted as `PASS`. A retry after an infrastructure failure keeps both records.

## 4. Organization in Test Manager

All new sessions go to the official project **NIARVA intent verification** (`01M7N0CKZ90R3JR906713EHYW0`). New sessions land in `00 — Inbox` and are filed into an area folder. Area folders follow the product scope, not the tool: see [`README.md`](README.md#area-folders-in-the-official-project).

Test case titles are written in English and name the behavior under test. Test Manager generates a title automatically after each upload; when it is generic (for example `Web || <user> || TC-40`), it is renamed. A rename changes the title only: steps, assertions, and results stay as recorded, and the rename is committed in the test case's version history with its reason.

## 5. Execution discipline

- One Kane run at a time per machine (`~/.niarva/kane-run.lock`), because overlapping runs caused infrastructure failures in M0.
- Each agent uses its own port and database: core track 3200, UI track 3101, test consolidation retests 3300.
- Synthetic accounts only (`*@niarva.test`). Secrets and preview URLs are passed as secret variables and never appear in objectives or committed files.
- Raw streams and evidence packs stay private because they contain local URLs and synthetic session cookies; committed records carry their SHA-256 digests.
