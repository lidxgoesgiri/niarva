# Task board

Writer: Claude. Last updated: 2026-11-18 14:10 WIB.
Codex claims tasks and requests changes in `CODEX_HANDOFF.md`.

Priorities:
- **P0:** required features, critical bugs, blockers.
- **P1:** integration, stability, security, functional testing.
- **P2:** UI/UX polish, accessibility, motion.
- **P3:** optional.

Deadlines:
- Internal freeze: 19 November 2026, 21:00 WIB.
- Hard cutoff: 20 November 2026, 01:29 WIB. Nothing is pushed after it.

## Done (with evidence)

| Area | Requirement IDs | Evidence |
|---|---|---|
| Engine: rule DSL, exact decimals, partition analysis, repair, probes, verdicts, gate | FR-05, FR-06, FR-08, FR-09, FR-16 | core 56 tests; PR #3 |
| Creator workflow: template / AI / manual intake, claim approval, versions, repair approval, publish gate, idempotent submissions | FR-01–FR-04, FR-09–FR-15 | web 28 integration tests; PR #4 |
| AI extraction guard (no auto-acknowledged manual checks) | FR-02, FR-19 | DEV-LOOP-01 (t-36 FAIL → fix `cfc28b8` → PASS) |
| Intent Trace ledger and version identity header | FR-05 | t-37 PASS on `e860ecf`, t-36 PASS on `71564be` (`evidence/dev-loop/regression.md`) |
| Kane runtime validation | Kane rules | `evidence/m0/` |
| Verification worker | FR-07, FR-08 | PR #5 |
| PROD-LOOP-01: diagnostic FAIL → approved repair → fresh full suite VERIFIED (8/8) → publish 201 → respondent receipt | FR-07–FR-11, FR-13, FR-14 | `evidence/product-loop/PROD-LOOP-01.md` (`d28dee5`); DEV-LOOP-02 closed |

## In progress

| ID | Task | Pri | Owner | Status | Depends on |
|---|---|---|---|---|---|
| C-11 | Test Manager consolidation: one official project, numbered area folders, source→destination mapping, title clean-up, project guards in the runners, five real retests in the official project, docs/testing/ | P1 | Claude (test consolidation session) | PR from `test/kane-tms-consolidation` (stacked on feature/creator-workflow) | — |
| X-01 | Landing page: boundary demonstration, motion, accessibility (PR #6) | P2 | Codex | PR open, under review by Claude | — |

## To do

| ID | Task | Pri | Owner | Depends on |
|---|---|---|---|---|
| C-02 | Fixtures for the remaining Assurance tests: **done** for published form, private page/evidence pointers, config endpoint, response form, UNKNOWN run, unrequested / missing / matching rule forms, zero-run form (`d4f2cc4`, `5324dbe`). **Owed:** unstable form (t-16, needs FAILED + two fresh VERIFIED full runs, ~500 credits), diagnostic-only pass (t-58, cannot occur for a real defect by design), scoped judge account (t-55, t-62) | P0 | Claude | — |
| C-03 | Kane: publish and respondent flows — t-4, t-11, t-18 **PASS**; t-7, t-8, t-10, t-20 FAIL, classified inconclusive (Kane did not capture or send the raw request, or could not discover the API endpoint; product behavior is proven elsewhere). Evidence: `evidence/assurance/C-03-publish-and-respondent.md` (`1cddebd`). Owed: t-9, t-12, t-19, t-22, t-31 (need more full verifications) | P0 | Claude | — |
| C-04 | Kane: security and access — **running** (t-1, t-2, t-48, t-54, t-32, t-33, t-43); t-23 owed (API endpoint not discoverable, same as t-20) | P1 | Claude | — |
| C-05 | Kane: verification honesty — **running** (t-14, t-15, t-39, t-40, t-41, t-46, t-57). Owed: t-13 (starts a run inside the test, which would deadlock on the Kane lock), t-16 and t-17 (need extra full verifications), t-38 (a matching rule that fails in the browser cannot occur by design), t-58 | P1 | Claude | — |
| C-06 | Kane: AI intake and provider outage (t-25–t-30, t-61) | P1 | Claude | C-02 |
| C-12 | Owner-approved Assurance edits: explicit API and denial wording for t-1, t-2, t-7, t-10, t-32, t-48 (step bodies only; headings, @verifies, and pins unchanged), then rerun | P0 | Claude | — |
| C-07 | Assurance coverage report (`kane-cli cover`): proven vs owed, in `evidence/assurance/` | P0 | Claude | C-03–C-06 |
| C-08 | Integration: review and merge PR #6 into the stack; integrated Kane regression; fresh clone check; README claim audit | P1 | Claude | X-01, C-03 |
| C-09 | Machine-wide Kane run lock — **done** (`558e818` scripts, `dc70b5d` worker); use `node scripts/kane-locked.mjs <kane args>` | P1 | Claude | — |
| C-10 | FR-18 evidence: lineage, expected vs observed, objective text **implemented** (`4498cbf`), Kane check pending. Owner responses and judge views (t-3, t-49–t-53, t-55, t-56, t-59, t-60, t-62–t-64): verify, then fix gaps | P0 | Claude | C-01 |
| X-02 | Judge demo guide page `/demo`. The local branch `feature/interactive-landing` has an earlier version to reuse; it is not pushed and will not be merged as is. Name the golden claim `C-GPA`, not `C-03`. | P2 | Codex | — |
| X-03 | Creator workspace visual polish (intent, form, verification, responses). Keep every hook and text in `docs/integration/API_CONTRACT.md` §4. | P2 | Codex | announce files first |
| X-04 | Responsive and accessibility pass: workspace, preview, public form at 360/390/800/1280 px; keyboard; reduced motion. Kane runs at 800 px and wider, so narrower widths are reviewed manually and labeled as such. | P2 | Codex | — |
| X-05 | Hero wording: change to "Verified with Kane CLI" only after Claude records a VERIFIED product run in `CLAUDE_HANDOFF.md` | P2 | Codex | C-01 |
| X-06 | Public form and receipt page presentation (respondent experience) | P2 | Codex | — |

## Rules for every task

- Browser behavior is tested with Kane CLI. Never edit a test to make it pass, and never claim a result without a recorded run.
- One Kane run at a time on this machine (see C-09). Use your own port and database.
- Commit messages and pull requests in English, under the owner's identity, with no agent trailers.
