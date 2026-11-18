# Task board

Writer: Claude. Last updated: 2026-11-18 19:20 WIB.
Codex claims tasks and requests changes in `CODEX_HANDOFF.md`.

Priorities:
- **P0:** required features, critical bugs, blockers.
- **P1:** integration, stability, security, functional testing.
- **P2:** UI/UX polish, accessibility, motion.
- **P3:** optional.

## Deadlines

The organizers extended the deadline from 19 to 26 November ([official site](https://www.kaneclihack.sh/), re-read 18 November 2026). Product scope is unchanged.

| When (WIB) | Milestone |
|---|---|
| Mon 23 Nov, 23:59 | **Renderer freeze.** Last change to `apps/web/src/features/form-renderer`, `apps/web/src/app/preview`, `apps/web/src/app/f`, `packages/core/src/{eval,dsl,decimal}`. Any later change makes production proof STALE. |
| Tue 24 Nov, 21:00 | **Code freeze** for `apps/` and `packages/`. Documentation and evidence only after this. |
| Wed 25 Nov | Final production proof on the release SHA: product closed loop and Kane smoke on https://niarva.vercel.app. |
| Thu 26 Nov, 18:00 | Submission sent, launch posts published. |
| Thu 26 Nov, 22:00 | Last push. |
| Fri 27 Nov, 01:29 | **Official cutoff** (26 Nov 23:59 IST). Nothing is pushed after it. |

## Schedule

| Days | Claude | Codex | Owner |
|---|---|---|---|
| Wed 18 Nov | Audit after the extension; this schedule; review PR #14 | X-07 submission drafts; PR #14 | Schedule, scope, and judge-account decisions; Kane credit top-up request |
| Thu 19 – Sat 21 Nov | C-12 reruns, C-04/C-05 reruns, C-06, C-10; every real FAIL goes through a source fix and the same test again | X-03, X-04, X-06 with Kane checks | Review and merge PRs |
| Sun 22 – Mon 23 Nov | C-02 (if approved), remaining NOT RUN tests by priority, integrated local Kane regression | Finish renderer-affecting work before the renderer freeze | Review and merge PRs |
| Tue 24 Nov | C-07 coverage report, traceability refresh, full local regression on the release candidate | Documentation only after 21:00 | Merge release PRs before 21:00 |
| Wed 25 Nov | C-15 final production proof; evidence and README counts | README screenshots | Start the worker; record the video |
| Thu 26 Nov | Submission text with final counts; documentation fixes only | — | Posts, portal submission |

## Kane credits

Balance 2,555.95 on 18 Nov, 18:58 WIB. Reserved: 800 for C-15. Codex cap: 300. The rest funds the test plan below in priority order; a top-up from the organizers (they ask to be contacted on Slack) would fund the remaining NOT RUN tests. Every run goes through `node scripts/kane-locked.mjs` or `pnpm verify:kane`.

## Done (with evidence)

| Area | Requirement IDs | Evidence |
|---|---|---|
| Engine: rule DSL, exact decimals, partition analysis, repair, probes, verdicts, gate | FR-05, FR-06, FR-08, FR-09, FR-16 | PR #3 |
| Creator workflow: template / AI / manual intake, claim approval, versions, repair approval, publish gate, idempotent submissions | FR-01–FR-04, FR-09–FR-15 | PR #4 |
| AI extraction guard (no auto-acknowledged manual checks) | FR-02, FR-19 | DEV-LOOP-01 (t-36 FAIL → fix `cfc28b8` → PASS) |
| Intent Trace ledger and version identity header | FR-05 | t-37, t-36 PASS (`evidence/dev-loop/regression.md`) |
| Kane runtime validation | Kane rules | `evidence/m0/` |
| Verification worker | FR-07, FR-08 | PR #5 |
| Product closed loop, local: diagnostic FAIL → approved repair → VERIFIED 8/8 → publish 201 → receipt | FR-07–FR-11, FR-13, FR-14 | `evidence/product-loop/PROD-LOOP-01.md`; DEV-LOOP-02 |
| C-11 Test Manager consolidation and project guards in the runners | Kane rules | PR #7, `docs/testing/` |
| C-13 Vercel deployment with Neon Postgres; production loop VERIFIED 8/8, receipt `VCBFQ6AM`; Kane smoke on the final build | Kane rules (deployment) | PR #8, #9, #11; `evidence/deploy/VERCEL-PROD-01.md` |
| X-01, X-02 Landing page and judge demo guide | UI-AC | PR #6 |
| C-09 Machine-wide Kane run lock | Kane rules | `scripts/kane-locked.mjs` |
| Assurance retests recorded; status of all 64 designed tests (13 PASS, 13 FAIL, 38 NOT RUN) | FR-20 | PR #10; `docs/testing/KANE_EXECUTION_REPORT.md` §5 |
| N-12 Kane credit budget per workspace and per deployment | Security | PR #12; `evidence/budget/KANE-BUDGET-01.md` |
| C-08 README evidence links, verification status, fresh clone check | H-05, H-07 | PR #13; `evidence/fresh-clone/FRESH-CLONE-01.md` |

## In progress

| ID | Task | Pri | Owner | Status |
|---|---|---|---|---|
| X-08 | `/demo` links the pinned production evidence; PE-06 rerun with the same oracle | P1 | Codex | PR #14, review by Claude |
| X-07 | Video script and launch post drafts (private, not committed) | P0 | Codex | Drafting |

## To do

| ID | Task | Pri | Owner | When |
|---|---|---|---|---|
| C-12 | Rerun the owner-approved reworded tests t-1, t-2, t-7, t-10, t-32, t-48 (never run yet) | P0 | Claude | 19 Nov |
| C-04 | Rerun t-33 so Kane authors every step against the current build; t-23 owed (API endpoint not discoverable, same as t-20) | P1 | Claude | 19 Nov |
| C-05 | Rerun t-57. Owed: t-13 (starts a run inside the test, which deadlocks on the Kane lock), t-16 and t-17 (need extra full verifications), t-38 and t-58 (cannot occur by design; documented) | P1 | Claude | 19–20 Nov |
| C-06 | Kane: AI intake and provider outage (t-25–t-30, t-61) | P0 | Claude | 20 Nov |
| C-10 | Kane: owner workspace, response views, and FR-18 evidence (t-3, t-49–t-53, t-56, t-59, t-60); fix every gap found | P0 | Claude | 20–21 Nov |
| C-16 | Kane: rule validation and repair (t-34, t-35, t-42, t-45, t-47) | P1 | Claude | 21 Nov |
| C-03 | Kane: remaining publish and respondent tests t-9, t-12, t-19, t-21, t-22, t-24, t-31 (need more full verifications) | P1 | Claude | 21–22 Nov |
| C-02 | Scoped judge access (t-55, t-62, t-63, t-64), only after the owner decides whether judges get a dedicated synthetic account | P0 | Claude | 22 Nov |
| C-17 | Inconclusive FAILs t-8, t-15, t-20, t-43, t-54: propose step wording that Kane can observe (owner checkpoint); rerun only after approval, otherwise they stay FAIL | P1 | Claude + owner | 22 Nov |
| C-07 | Assurance coverage report (`kane-cli cover`): proven vs owed, in `evidence/assurance/` | P0 | Claude | 24 Nov |
| C-14 | Row-by-row traceability refresh | P1 | Claude | 24 Nov |
| C-15 | Final production proof on the release SHA: product closed loop and Kane smoke, recorded in `evidence/deploy/` | P0 | Claude | 25 Nov |
| X-03 | Creator workspace visual polish (intent, form, verification, responses). Keep every hook and text in `docs/integration/API_CONTRACT.md` §4. | P2 | Codex | 19–21 Nov |
| X-04 | Responsive and accessibility pass: workspace, preview, public form at 360/390/800/1280 px; keyboard; reduced motion. Kane runs at 800 px and wider, so narrower widths are reviewed manually and labeled as such. | P2 | Codex | 19–22 Nov |
| X-05 | Hero wording "Verified with Kane CLI": unblocked, production and local VERIFIED runs are recorded | P2 | Codex | 19 Nov |
| X-06 | Public form and receipt page presentation. Touches renderer paths: must land before the renderer freeze. | P2 | Codex | 19–23 Nov |
| X-09 | README screenshots: proposal in `CODEX_HANDOFF.md`, inserted by Claude | P2 | Codex | 25 Nov |

## Rules for every task

- Browser behavior is tested with Kane CLI. Never edit a test to make it pass, and never claim a result without a recorded run.
- One Kane run at a time on this machine (see C-09). Use your own port and database.
- Commit messages and pull requests in English, under the owner's identity, with no agent trailers.
