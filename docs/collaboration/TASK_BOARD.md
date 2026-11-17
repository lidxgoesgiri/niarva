# Task board

Writer: Claude. Last updated: 2026-11-17 22:45 WIB.
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
| Verification worker | FR-07, FR-08 | PR #5; PROD-LOOP-01 in progress |

## In progress

| ID | Task | Pri | Owner | Status | Depends on |
|---|---|---|---|---|---|
| C-01 | PROD-LOOP-01: diagnostic FAIL → approved repair → fresh full suite → publish → respondent, with a real worker and Kane | P0 | Claude | running on the isolated verification server | — |
| X-01 | Landing page: boundary demonstration, motion, accessibility (PR #6) | P2 | Codex | PR open, under review by Claude | — |

## To do

| ID | Task | Pri | Owner | Depends on |
|---|---|---|---|---|
| C-02 | Seed the fixtures that the remaining Assurance tests need: published form, response records, scoped judge account, unstable / race / zero-run / diagnostic-only forms, provider-outage switch | P0 | Claude | — |
| C-03 | Kane: publish and respondent flows (t-4, t-7, t-8, t-9, t-10, t-11, t-12, t-18, t-19, t-20, t-22, t-31) | P0 | Claude | C-02 |
| C-04 | Kane: security and access (t-1, t-2, t-23, t-32, t-33, t-43, t-48, t-54) | P1 | Claude | C-02 |
| C-05 | Kane: verification honesty (t-13, t-14, t-15, t-16, t-17, t-38–t-41, t-46, t-57, t-58) | P1 | Claude | C-01, C-02 |
| C-06 | Kane: AI intake and provider outage (t-25–t-30, t-61) | P1 | Claude | C-02 |
| C-07 | Assurance coverage report (`kane-cli cover`): proven vs owed, in `evidence/assurance/` | P0 | Claude | C-03–C-06 |
| C-08 | Integration: review and merge PR #6 into the stack; integrated Kane regression; fresh clone check; README claim audit | P1 | Claude | X-01, C-03 |
| C-09 | Machine-wide Kane run lock so the two tracks never overlap Kane runs | P1 | Claude | — |
| C-10 | Owner responses view and evidence views for judges (t-3, t-49–t-53, t-55, t-56, t-59, t-60, t-62–t-64): verify, then fix gaps | P1 | Claude | C-02 |
| X-02 | Judge demo guide page `/demo`. The local branch `feature/interactive-landing` has an earlier version to reuse; it is not pushed and will not be merged as is. Name the golden claim `C-GPA`, not `C-03`. | P2 | Codex | — |
| X-03 | Creator workspace visual polish (intent, form, verification, responses). Keep every hook and text in `docs/integration/API_CONTRACT.md` §4. | P2 | Codex | announce files first |
| X-04 | Responsive and accessibility pass: workspace, preview, public form at 360/390/800/1280 px; keyboard; reduced motion. Kane runs at 800 px and wider, so narrower widths are reviewed manually and labeled as such. | P2 | Codex | — |
| X-05 | Hero wording: change to "Verified with Kane CLI" only after Claude records a VERIFIED product run in `CLAUDE_HANDOFF.md` | P2 | Codex | C-01 |
| X-06 | Public form and receipt page presentation (respondent experience) | P2 | Codex | — |

## Rules for every task

- Browser behavior is tested with Kane CLI. Never edit a test to make it pass, and never claim a result without a recorded run.
- One Kane run at a time on this machine (see C-09). Use your own port and database.
- Commit messages and pull requests in English, under the owner's identity, with no agent trailers.
