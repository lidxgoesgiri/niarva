# VERCEL-PROD-01: production deployment on Vercel with Neon Postgres

> The web app from `main` deployed to Vercel, backed by a Neon Postgres database from the Vercel Marketplace, with the verification worker and Kane CLI on the owner's machine.
> Every check below was actually executed on 18 November 2026. Times are UTC. Secrets are never recorded; only variable names and digests appear here.

## 1. Deployment

| Item | Value |
|---|---|
| Production URL | https://niarva.vercel.app |
| Vercel project | `niarva` (`prj_yQNhRB6ggMIExotvtMEFcOIeOH2D`), owner account `lidxgoesgiri`, Hobby plan |
| Git connection | GitHub `lidxgoesgiri/niarva`, production branch `main` |
| Root Directory | `apps/web` (the pnpm workspace is installed from the repository root) |
| Framework / build | Next.js; `pnpm run vercel-build` (database migrations, then `next build`) from `apps/web/vercel.json` |
| Node.js | 24.x (project setting aligned with `engines` in `apps/web/package.json`) |
| Package manager | pnpm 12.11.2 through Corepack (`ENABLE_EXPERIMENTAL_COREPACK=1`); lockfile passed pnpm's supply-chain policy check (630 entries) |
| Deployment | `dpl_FxRHnbGk4gQDNyPCaxfPGvHsvoJR`, target `production`, state **READY** (promoted) |
| Source | Commit `92d80c91f34f70331853f188e491a1d135c982c8` on `main` (GitHub-verified commit by `lidxgoesgiri`), requested through the Vercel API from the connected GitHub repository; created by `lidxgoesgiri` |
| Timeline | created 07:51:40, build started 07:51:42, ready 07:52:34 (build 53 s, region `iad1`) |
| Build log | `Migrations applied.` before `next build`; `Compiled successfully` |
| Deployment Protection | Standard: `niarva.vercel.app` is public; deployment-specific URLs (`niarva-<hash>-ida-bagus.vercel.app`) require Vercel sign-in |

## 2. Database

| Item | Value |
|---|---|
| Provider | Neon Postgres through the Vercel Marketplace integration, resource `niarva-db`, Free plan, region `iad1` (same region as the functions), Neon Auth off (the app uses Better Auth) |
| Connected environments | **Production only**. Preview deployments get no database, so a feature-branch build cannot run migrations against production data; such a build fails by design (see §7). |
| `DATABASE_URL` | Pooled connection (host contains `-pooler`), `sslmode=require`; `DATABASE_POOL_MAX=3` |
| Migrations | 2 of 2 applied (`0000_init`, `0001_immutability_guards`), checked in `drizzle.__drizzle_migrations` |
| Schema | 22 tables in `public` (forms, versions, claim sets, probes, probe runs, verification runs, publications, submissions, workers, audit events, auth tables, …) |

## 3. Environment variables (Production)

Names only. Values were generated on the owner's machine by `pnpm prepare:deploy` (fresh secrets, nothing reused from local development) and sent to Vercel through standard input; secrets are stored as **Sensitive** and cannot be read back.

| Variable | Type |
|---|---|
| `BETTER_AUTH_SECRET`, `PREVIEW_TOKEN_SECRET`, `IP_HASH_SECRET`, `WORKER_SHARED_TOKEN`, `OPENROUTER_API_KEY` | Sensitive |
| `NIARVA_BASE_URL` (`https://niarva.vercel.app`), `NIARVA_ENVIRONMENT_ID` (`vercel-production`), `DATABASE_POOL_MAX`, `KANE_MAX_RUNS_PER_VERIFICATION`, `DEMO_MODE` (`false`), `OPENROUTER_MODEL`, `ENABLE_EXPERIMENTAL_COREPACK` | Plain |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PG*`, `POSTGRES_*`, `NEON_PROJECT_ID` | Added by the Neon integration |

## 4. Native checks (no browser)

| Check | Result |
|---|---|
| `GET /api/v1/health` | **200** `{"status":"ok","environment":"vercel-production","database":"pg","engineVersion":"1.3.0","probePolicyVersion":"MPP-v4","ai":"configured"}` (first call 12.3 s cold start, then ≈ 0.4 s) |
| `GET /` | **200**, security headers present (CSP, `X-Frame-Options: DENY`, HSTS) |
| `POST /api/v1/worker/lease` without a token | **401** `WORKER_UNAUTHORIZED` |
| `POST /api/v1/worker/lease` with a wrong token | **401** `WORKER_UNAUTHORIZED` |
| `POST /api/v1/worker/lease` with the worker token, empty queue | **200** `{"lease":null}` |
| Synthetic fixtures (`pnpm seed:kane https://niarva.vercel.app`) | 3 synthetic accounts (`*@niarva.test`) and 4 fixture forms created through the public API (sign-up, template form, claim approval, version generation) |

## 5. Verification worker

The worker (`apps/worker`, `local-worker-vercel`, Kane CLI 0.10.4) runs on the owner's machine with `pnpm worker:vercel` and reaches the deployment over HTTPS with the shared worker token. It started only after confirming that Kane uploads to the official Test Manager project `01M7N0CKZ90R3JR906713EHYW0`; otherwise it exits with code 78.

### 5.1 Product closed loop on production (PROD-LOOP-VERCEL)

Driver `scripts/run-product-loop.mjs https://niarva.vercel.app`, the same loop as [`PROD-LOOP-01`](../product-loop/PROD-LOOP-01.md), now against the deployment: environment id `vercel-production`, Neon Postgres, renderer `r1-6b8a9a7ac0dd0397`, probe policy `MPP-v4`, Kane CLI 0.10.4 headless through the worker. Kane observes; NIARVA's server decides every verdict.

**Attempt 1: interrupted (infrastructure).** Form `01a1eda8-9d49-…`, seeded v1 (static FAILED), diagnostic run `01a1eda8-a404-…`. At 07:57:56 the driver's poll of the form state failed with a client-side `ConnectTimeoutError` to `niarva.vercel.app:443`; the deployment answered normally seconds later (connect ≈ 0.02 s). The worker kept going: D-01 **FAIL `OBSERVATION_MISMATCH`** (Kane said `passed`), session `06be7448-7929-4a6c-9127-f1263746b894`, 25.21 credits, pack `bbf00d1a60ae1f11afa57f59c99656e00bf0c531eb93f4ace97f178994260655`. Record: [`prod-loop-vercel-01-attempt-1-interrupted.json`](../product-loop/prod-loop-vercel-01-attempt-1-interrupted.json). The driver now retries a read (never a write) after a transient network error; attempt 2 ran the whole loop again on a new form.

**Attempt 2: VERIFIED.** Record: [`prod-loop-vercel-01-attempt-2.json`](../product-loop/prod-loop-vercel-01-attempt-2.json) (its `loop` field carries the driver's built-in name `PROD-LOOP-01`; `base` is the deployment).

| Time (UTC) | Step | Result |
|---|---|---|
| 07:59:22 | Seeded version v1 (`a8ebe142…`) of form `01a1edaa-e0d9-…` | Static verdict **FAILED**. Counterexample: GPA = 3.50, certificate expected visible and required, actually hidden. |
| 07:59:23 → 08:01:03 | Diagnostic run `01a1edaa-e7be-…0d23` | **D-01 FAIL `OBSERVATION_MISMATCH`**: Kane reported `passed`; its observations showed the certificate hidden and not required at GPA 3.50, so NIARVA judged FAIL. Session `dd4a4355-eb94-4ee9-9558-25d6a79a5e16`, 21.76 credits, pack `bb70b2f4efe0b8c70bee8885a63cbe0fc5dc0204cd2bb9fb1fbda81bbf85f1bb`. |
| 08:01:06 | Repair proposals | `ALIGN_OPERATOR` (`set_operator rule_d0c84c42: gt → gte`) and `REGENERATE_FROM_CLAIM` |
| 08:01:07 | Creator approves `ALIGN_OPERATOR` | New version **v2** (`9796f3da…`); **claims hash unchanged** (`5bec6abf…3af7`); static verdict PASS |
| 08:01:07 | Publish v2 before browser proof | **409 `GATE_BLOCKED`** (`BROWSER_UNVERIFIED`) |
| 08:01:07 → 08:18:30 | Full verification `01a1edac-80b3-78d4-b4f1-5efba89ff186` | **VERIFIED: 8/8 required probes PASS**, 0 FAIL, 0 UNKNOWN, 261.62 credits |
| 08:18:43 | Publish v2 after proof | **201**, slug `product-loop-scholarship-2026-11-18t07-5-11fb6a` |
| 08:18:44 | Public respondent submission (GPA 3.5 with certificate) | **201**, receipt `VCBFQ6AM` |

| Probe | Kind | Golden | Claims | Verdict | Kane session | Credits | Evidence pack SHA-256 |
|---|---|---|---|---|---|---:|---|
| P-01 | initial state and empty submit | K-04 | C-01, C-02, C-GPA | PASS | `6ff31baa-2560-4644-9cf1-805b5e93e986` | 23.66 | `b2a2f957656c0721ccf95d351dd019bfd7c1e62c72588a8cf0c9ef4aafb52b2a` |
| P-02 | boundary 3.49 / 3.50 / 3.51 | K-01, K-02, K-03 | C-GPA | PASS | `d4df303f-01b1-405d-a0a5-dd2bf152e6a3` | 45.04 | `a6455884efb14922c0c28d73a240c5a4c80ea9b8c1cd626e46205cf716f07644` |
| P-03 | conditional required, empty | K-02 | C-GPA | PASS | `e2503415-a86e-4816-b7d2-80116921714b` | 50.20 | `7618ffb6501e285d559f45ddd1fc3dc13551bee2a77b36c31e6d81da7f2d00ae` |
| P-04 | hidden value excluded | K-05 | C-GPA | PASS | `b6ed0d97-a268-41f2-990a-8be43ab3b2e0` | 47.96 | `200211f4332641455eee511f87e1949fb674123ea9bb583c8c051d9f03c881bd` |
| P-05 | valid submission | K-06 | C-01, C-02, C-04, C-GPA | PASS | `1495aab8-3568-4926-b4ca-d289c28f6cc1` | 33.12 | `1851094ca31076102ba6ad3f9b2f4ee9b26b268e1093047d4eef9272a929bb7b` |
| P-06 | decimal comma | K-02 | C-GPA | PASS | `9fda2954-1acf-4749-a504-0ef99c9be6c9` | 24.99 | `5c01e8d0cbc74264bffa4693a9b6e7695b7ca0adf6b6568210872f9e07b71711` |
| P-07 | GPA constraint | — | C-04 | PASS | `6662b639-69bd-4a3c-9ecd-8acc9a05ff16` | 36.65 | `da203bfe2340b463a05a3a79468166df1ade1723bac6292182cc9cc409728fa6` |
| P-08 | server contract (HTTP, no browser) | K-04, K-05, K-06 | C-01, C-02, C-04, C-GPA | PASS | — | 0 | — |

What this proves on the deployment: the worker leases, runs, and reports probes over HTTPS; the server stores raw observations in Neon and computes verdicts (it overruled Kane's `passed` on D-01); a repair keeps the approved claims; the publish gate refuses unproven versions inside the backend and accepts the proven one; a respondent can submit to the published form. The claim is exact: one version of the golden scholarship form, environment `vercel-production`, probe policy `MPP-v4`.

## 6. Kane CLI production smoke

The same five Assurance-designed tests that passed in the official project's retests ([`KANE_EXECUTION_REPORT.md`](../../docs/testing/KANE_EXECUTION_REPORT.md) §2), run unchanged against the deployment with `node scripts/verify-kane.mjs t-5 t-6 t-44 t-36 t-37`: Kane CLI 0.10.4, headless Chrome, the machine-wide Kane lock, `start_url = https://niarva.vercel.app`, synthetic fixtures from §4. Source under test: `92d80c9` with no local changes under `apps/` or `packages/`. Uploads go to the official project `01M7N0CKZ90R3JR906713EHYW0`.

### 6.1 First batch: BLOCKED (test configuration)

All five runs stopped at step 1 because Kane opened `http://localhost:3000` (`net::ERR_CONNECTION_REFUSED`); the deployment was never reached. Cause: a backup copy of the local variables file, still holding `start_url = http://localhost:3000`, had been placed in `.testmuai/variables/`, and Kane CLI loads every JSON file in that folder. Kane's own status was `failed`; because the application was never reached, these runs are recorded as **BLOCKED** and prove nothing about the product. The backup and the five recordings were moved out of the test folders (kept privately), and the same five tests were run again without any change to a test file.

| Started | Test | Outcome | Exit | Steps (authored / replayed) | Credits | Evidence pack | Test case | Execution |
|---|---|---|---|---|---:|---|---|---|
| 08:19:17 | t-5 | BLOCKED | 1 | 2 / 0 | 17.56 | `6ceb8d714d61` | `01M7PVTAFTJW7Y8NK0EHF0JDHD` | `0bb7f1ac-113b-4589-ab77-322ddebeb404` |
| 08:21:27 | t-6 | BLOCKED | 1 | 2 / 0 | 14.73 | `0e0d77331ab6` | — | `7c8ea7da-db99-47ed-84af-4f270b659cb5` |
| 08:23:18 | t-44 | BLOCKED | 1 | 2 / 0 | 17.51 | `d7a54c9d5219` | `01M7PW1NV4W1Y0K6398BMG1E1A` | `6b94cbe5-dbc4-459d-8d96-85ed08429e32` |
| 08:25:49 | t-36 | BLOCKED | 1 | 5 / 0 | 12.64 | `22c4f836a702` | `01M7PW69RAFWZ3N6ECYYRNKFRH` | `2abb19c4-6baa-4c4a-9c5e-b76f06411f05` |
| 08:27:42 | t-37 | BLOCKED | 1 | 7 / 0 | 18.14 | `22230475e6a8` | `01M7PW9R4MTSP9CJMKC4EHRF2G` | `dc24b565-e594-42fb-aaa4-3628f5ca0db9` |

### 6.2 Rerun: 5 of 5 PASS

| Started | Test | Outcome | Exit | Steps (authored / replayed) | Credits | Evidence pack SHA-256 | Recording bound to | Execution |
|---|---|---|---|---|---:|---|---|---|
| 08:30:31 | t-5 anonymous visitor gets the unauthorized workspace state | **PASS** | 0 | 2 / 0 | 21.29 | `eb65975fe35c9ccfb1b04849a29b594e19bfce6238bc0c5d98874e0dac4b40c8` | `01M7N0CKZ90R3JR906713EHYW0` (TC `01M7PWEYJ59HDJ3C911FXEVQXT`) | `416c4156-34d5-4948-92b3-dbf39b4c89cc` |
| 08:32:48 | t-6 creator without forms sees the empty workspace | **PASS** | 0 | 2 / 0 | 25.41 | `4d6a5ef7cf0b2267537091ba480feb6003c0b03c5e0467b2b62fb10afca8ba21` | not recorded by the runner | `b4697c45-fe9b-43ca-a8d8-68419ad55ff8` |
| 08:35:08 | t-44 repair proposal waits for explicit creator approval | **PASS** | 0 | 2 / 0 | 29.60 | `03866cd2c183f72770c568eb3d7a9e944fb3b4201b40b4c309a6b48bd7cf0635` | `01M7N0CKZ90R3JR906713EHYW0` | `315bae85-ff63-4e17-83e6-746f6643b653` |
| 08:38:16 | t-36 approved scholarship claims generate a versioned conditional form | **PASS** | 0 | 5 / 0 | 89.68 | `eba1b152d32de1d6d6d0deb65067d6d83cc4baaa89669f6d92272a1b05bf84e7` | `01M7N0CKZ90R3JR906713EHYW0` | `fe91df96-2aab-4a0d-9f80-e74ddb76eaa8` |
| 08:44:28 | t-37 seeded comparator discrepancy at GPA 3.5 is source-linked | **PASS** | 0 | 7 / 0 | 118.30 | `04451f0209bc5e5009da6c9c6a6985f39401d8c733806995f91f30a6e712bb14` | `01M7N0CKZ90R3JR906713EHYW0` (TC `01M7PX8F5F9E5P7TWJ21K8WE1M`) | `5bceef0c-b025-47af-a936-2fc9000a2689` |

Every PASS has exactly one completion event with status `passed` and exit code 0. Test file digests are identical to the earlier runs (t-5 `8957cc30…`, t-6 `d5a4a31b…`, t-44 `e9116090…`, t-36 `860858c7…`, t-37 `f95cea9e…`). No recording existed, so Kane decided every step again against the deployment. Raw streams and sealed packs stay on the owner's machine (`evidence/private/dev/*-vercel-prod-rerun-*`).

### 6.3 Credits

Kane-reported consumption for the whole production verification: 308.59 (product loop, both attempts) + 80.58 (blocked batch) + 284.28 (rerun) = **673.45**. The account balance went from 3,664.28 (07:55:21) to 2,904.77 (08:49:53); the difference beyond the reported figure is not attributed, because the account is shared.

## 7. Limits

- **Worker on the owner's machine.** Verifications of the deployment progress only while `pnpm worker:vercel` runs there; Chrome and Kane CLI cannot run inside Vercel functions.
- **Previews have no database** (by design, §2). A pull request's preview build stops at the migration step.
- **Coverage.** This record proves the golden scholarship loop and five browser tests on the deployment. The other Assurance-designed tests keep the status in [`KANE_EXECUTION_REPORT.md`](../../docs/testing/KANE_EXECUTION_REPORT.md); they were not rerun here. Layouts narrower than 800 px are not provable with desktop Kane CLI.
- **Release identity.** Proof is bound to the renderer build `r1-6b8a9a7ac0dd0397` and the environment `vercel-production`. A later deployment that changes the renderer makes this proof STALE by design; a deployment that changes only other code keeps the renderer identity but should be smoke-checked again.
- **Fixtures.** Synthetic accounts and forms (`*@niarva.test`) now exist in the production database.
- **Credits exposure.** While the worker runs, any signed-up creator can start a verification that spends the owner's Kane credits (at most `KANE_MAX_RUNS_PER_VERIFICATION` probes each, with no limit on the number of verifications in this build). The worker is stopped by default after this record (§9).

## 8. Final release build (`8136ce3`)

After this record was first written, the owner merged PR #6 (landing page) and PR #9 (this record) into `main`. Each merge redeployed production through the Git integration:

| Deployment | Commit | Source | Creator | State |
|---|---|---|---|---|
| `dpl_8LxBxerAGVdr4ujgncdUt7r1wjRw` | `cb45587` (PR #6) | git | `lidxgoesgiri` | READY |
| `dpl_AFWDUNXdqyLvpEy1DAL69nbKAEBb` | `8136ce3` (PR #9) | git | `lidxgoesgiri` | READY, promoted to `niarva.vercel.app` at 08:55:40 |

Between `92d80c9` and `8136ce3` nothing changed under the renderer sources (`apps/web/src/features/form-renderer`, `apps/web/src/app/preview`, `apps/web/src/app/f`, `packages/core/src/{eval,dsl,decimal}`), `packages/`, `apps/worker`, or `apps/web/src/server`. The renderer identity `r1-6b8a9a7ac0dd0397` and the product-loop proof of §5.1 therefore stay valid. `GET /api/v1/health` on the final build: **200** (`vercel-production`, `pg`).

The smoke tests ran again on the final build from a clean checkout of `8136ce3`. Recordings from §6.2 existed, so Kane **replayed** them where it could; a replay is still a real browser run against the deployment.

| Started | Test | Outcome | Exit | Steps (authored / replayed) | Credits | Evidence pack SHA-256 |
|---|---|---|---|---|---:|---|
| 08:57 | all five | refused by the project guard before any run: t-6's recording from §6.2 was incomplete and bound to no project; it was moved out | — | — | 0 | — |
| 08:57:54 | t-5 | **PASS** | 0 | 0 / 2 | 0 | `70592c3dfeb66f0b75bbbb97c5ce94122e0c498639034431bae477d4165929aa` |
| 08:59:29 | t-6 | **PASS** | 0 | 2 / 0 | 21.50 | `030900cbf1f2088d00bf834a974c925ab9e3170f2eddaa2f7648e139d559d3ce` |
| 09:02:11 | t-44 | **UNKNOWN** (did not start: "TMS did not return an org_id") | 2 | — | 0 | — |
| 09:02:43 | t-44 (retry) | **PASS** | 0 | 0 / 2 | 0 | `8a58949687feb1d78f9a11373a3b56c5af3a7c33d9c5de54f60896f026ed892c` |
| 09:04:42 | t-36 | **FAIL** (replay) | 1 | 0 / 5 | 0 | `68fa2c349ec6b02666874cbe6a3d6bcde69ddf34cc986268bcef2e8880a7302f` |
| 09:10:10 | t-37 | **PASS** | 0 | 0 / 7 | 0 | `7bed63560e67295fa743ad5f03cd718021b40935e8a709adecd20c63fce968ca` |
| 09:14:20 | t-36 (authored) | **PASS** | 0 | 5 / 0 | 82.82 | `2943755a6c07933a3b87b4cb9441cb4b053bc4e2b3b4a803a0c449c688bbd90b` |

**t-36 diagnosis.** The replay failed on the step 4 assertion in 0.1 s. Its screenshot shows the rule view of the newly generated form: generated rule `gte(gpa, 3.5) → show achievement_certificate_number`, expectation from approved claim C-03 `gte(gpa, 3.5) → achievement_certificate_number visible AND required`, operator `≥ (gte)` and value 3.5 in the declarative editor, and the 3.49 / 3.50 / 3.51 boundary rows all agreeing. Kane's own triage: `replay_failure`, category `automation_bug/config_issue`, "the recording's assertion does not match the current healthy rule presentation". The test file was not changed. The stale recording was moved out of the test folder (kept privately) and the same test ran again with Kane deciding every step: **PASS**. Classification: test infrastructure (stale replay), not a product defect.

Result on the final build: **t-5, t-6, t-44, t-36, t-37 PASS**; the replay FAIL and the UNKNOWN are kept above. Kane-reported credits for this round: 104.32.

## 9. Live use observed during verification

At 09:01:51 an account that is not one of the synthetic fixtures signed up on the deployment, created two scholarship forms, and requested a full verification (09:02:43), a diagnostic (09:08:13), and a second full verification (09:08:19). The running worker served the first full run (P-08, P-01, P-02, P-03 judged PASS) on the owner's Kane credits. Because any signed-up creator could start a verification that spends those credits, the worker was stopped at 09:23:58, right after P-03 and nine seconds into P-04 (its lease expires and the probe returns to the queue). The remaining runs stay queued and continue when the owner starts `pnpm worker:vercel` again. These runs are not part of this record's evidence.
