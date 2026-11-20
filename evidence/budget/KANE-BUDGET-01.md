# KANE-BUDGET-01: the Kane credit budget refuses a verification in the browser and queues nothing

> Every check below was executed on 18 November 2026. Times are UTC. Synthetic data only; secrets and share links are not recorded.

## Change under test

Sign-up is open on the public deployment, and every Kane browser probe spends credits from the operator's account. Commit `0b1a6ac` (branch `fix/kane-probe-budget`) makes the backend refuse a new verification run with `429 RATE_LIMITED`, queuing nothing, when its Kane probes would exceed the rolling 24-hour budget of the workspace (`KANE_PROBE_BUDGET_PER_WORKSPACE_24H`, default 24) or of the deployment (`KANE_PROBE_BUDGET_GLOBAL_24H`, default 48). It changes no file that feeds the renderer identity, so existing browser proof stays FRESH.

## Environment

| Item | Value |
|---|---|
| Source | `0b1a6ac` on top of `main` `8136ce3`, production build (`next build`, then `next start --port 3400`) |
| Server | `http://localhost:3400`, embedded PGlite, environment id `local-budget-3400`, `KANE_PROBE_BUDGET_PER_WORKSPACE_24H=0`, `KANE_PROBE_BUDGET_GLOBAL_24H=48` |
| Fixtures | `node scripts/seed-kane-fixtures.mjs http://localhost:3400`: synthetic `*@niarva.test` accounts and the owner's form "Kane Verified Scholarship B" (static verdict PASS, 7 Kane probes and 1 server probe, never verified) |
| Kane CLI | 0.10.4, headless Chrome, `node scripts/kane-locked.mjs run … --agent` (machine-wide lock, official Test Manager project `01M7N0CKZ90R3JR906713EHYW0`) |

## Native checks

| Check | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | pass |
| `pnpm test` | 103 tests pass: core 59, worker 5, web 39, including 6 in `apps/web/tests/integration/kane-budget.test.ts` (within budget, deduplicated request not charged, workspace limit, deployment limit, 24-hour window, budget 0) |
| Direct API: `POST /api/v1/forms/{id}/versions/{versionId}/verify` as the owner | **429** `RATE_LIMITED`, message "Browser verification budget reached: this workspace queued 0 Kane probes in the last 24 hours, this run needs 7 more, and the limit is 0. Nothing was queued. Try again later."; verification runs on the form before 0, after 0 |

## Kane CLI run

Objective (variables resolved from the local, git-ignored variables file; the password is a secret variable):

> Go to {{start_url}}/sign-in and sign in to NIARVA with {{owner_email}} and {{owner_password}}. In the workspace, open the form named {{owned_form_name}}. In its verification column, click the 'Run browser verification' button once. Then verify that an alert appears whose text contains 'Browser verification budget reached' and 'Nothing was queued', store the full alert text as 'budget_alert', and verify that the button still reads 'Run browser verification' and no 'Verification running' text is shown.

Oracle (NIARVA's, not Kane's status): the stored alert text contains both phrases, the button text is unchanged, no running state is shown, and the server holds no new verification run.

| Item | Value |
|---|---|
| Started | 2026-11-18 09:33:03 |
| Kane status / exit | `passed` / 0, one `run_end`, duration 79.9 s, 24.84 credits |
| Observations (`final_state`) | `budget_alert` = "Browser verification budget reached: this workspace queued 0 Kane probes in the last 24 hours, this run needs 7 more, and the limit is 0. Nothing was queued. Try again later."; `verification_button_text` = "Run browser verification"; `verification_running` = "false" |
| Server after the run | 0 verification runs on the form (direct API read) |
| **Verdict** | **PASS**: every oracle item observed |
| Kane session | `456afa04-7cf5-49ec-9b00-74f093117df0` |
| Test case | `01M7Q024XW8MMQQF85T3ANAD7D` |
| Evidence pack SHA-256 | `01730961fa3576cc77693d57a69b48a2fbf5fbcf5eb6736fe950e6f4b4576f6b` (pack and raw stream stay private) |

## Limits

- This proves the workspace limit in the browser. The deployment-wide limit and the 24-hour window are proven by the native tests only.
- The budget counts queued Kane probes, not retries of a probe; a probe retried once after an infrastructure error can spend more than its share.
- The budget protects production only after this change is merged and deployed. Until then, browser verification on the deployment depends on whether the operator's worker is running.
