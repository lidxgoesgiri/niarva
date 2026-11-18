# PROD-ASSURANCE-01: Assurance-designed tests on the live deployment, 18 November 2026

> Kane CLI 0.10.4 ran the Assurance-designed tests below against `https://niarva.vercel.app` (environment `vercel-production`, Neon Postgres). Every run went through `node scripts/verify-kane.mjs` (machine-wide lock, official Test Manager project `01M7N0CKZ90R3JR906713EHYW0`). Times are UTC. Synthetic data only; secrets, share links, and preview URLs are not recorded.
>
> **How to read the outcomes.** The outcome is Kane's completion status for the test file, read without changes. An inconclusive run (Kane could not perform or observe a step, or stopped) counts as **FAIL**. A run that never started is UNKNOWN. Native coverage of the same behavior is named separately and never counted as Kane proof.

## 1. Deployments under test

The tests drive the deployment, not a local build. The runner records the commit of the checkout it ran from (`7149c9a`, branch `feature/landing-cockpit` of the main checkout, clean). The deployed `main` commit for each batch is:

| Batch | Deployed `main` | Contents |
|---|---|---|
| C-12 reruns, production batches A and B | `7149c9a` | PR #1–#13 |
| Judge batch, t-50 and t-49 reruns | `38083bc` | + PR #17 (owner responses view, DEV-LOOP-04) and PR #18 (scoped judge access) |
| Proof-history rerun | `b457993` | + PR #19 (earlier versions keep their runs and repairs, DEV-LOOP-05) |

None of these merges changed the renderer identity (`r1-6b8a9a7ac0dd0397`), so the production proof in `evidence/deploy/VERCEL-PROD-01.md` stays FRESH.

## 2. Fixtures (synthetic, on the deployment)

- **Accounts:** the existing synthetic accounts (`kane-owner`, `kane-nonowner`, and `kane-empty-owner`, all `@niarva.test`), plus the judge account `judge@niarva.test`, created with `pnpm seed:judge`. The judge's password lives only in the gitignored variables file.
- **Judge access settings:** `DEMO_MODE=true`, `DEMO_JUDGE_EMAILS=judge@niarva.test`, and `DEMO_SHOWCASE_FORM_IDS` set to the production loop form.
- **`node scripts/seed-derived-fixtures.mjs https://niarva.vercel.app --loop evidence/product-loop/prod-loop-vercel-01-attempt-2.json`:**
  - created four owner forms: unrequested rule, missing rule, matching rule, and zero-run;
  - queued one full run on the zero-run form and canceled it before any probe ran (the production worker was stopped, so no Kane credits were spent);
  - set the pointer variables to the production loop form (form `01a1edaa-e0d9-7694-b60b-59ca816433c6`, published version `01a1edac-7c15-7cbc-923c-60a712c23dfd`).
- **Paging fixture (t-50):** 26 synthetic submissions to the published loop form through the public endpoint (receipts `G7Z4HUAB` … `LXFY4GLL`). With the earlier responses this gives two pages of 25.
- **Read-only judge tests:** for the batch, `owned_form_name` and `seeded_gt_form_name` pointed at the showcase form (the production loop form) and were restored afterwards. For t-3 and t-56, `owned_form_name` pointed at the same form.

## 3. Results

### 3.1 C-12: reworded tests and owed reruns (`7149c9a`)

| Test | Test file | Started | Outcome | Credits | Execution | Evidence pack SHA-256 | Kane's reason, classification |
|---|---|---|---|---|---|---|---|
| t-1 | `1daef816fe3d` | 12:41:37 | **PASS** | 31.95 | `00e04da4-1c10-4d4a-900b-a511a04b81d7` | `be10151f90786775…` | every step passed |
| t-2 | `0f23c63c4a1e` | 12:48:05 | **FAIL** | 40.43 | `f8de629d-5025-4882-8e95-ad839fcdf071` | `de3416fc41a1e5c5…` | step 2: Kane saw the access-denied result and no private marker, then left its own checks pending. **Inconclusive** |
| t-7 | `a01a2e29dcae` | 12:58:10 | **FAIL** | 43.55 | `2a1c742f-57c2-4a46-ae90-4374a9db6604` | `6e30978e025c0a99…` | step 3: Kane reopened the public form in its submitted state (receipt) and could not edit it. **Inconclusive** |
| t-10 | `727539c03de9` | 13:09:40 | **FAIL** | 72.95 | `cdc19e65-ca9d-4d2b-9be2-b0a72c85bf61` | `1b2a8f371cd18186…` | step 3: Kane reported that all three incomplete submissions were rejected with 422, then marked the step not achievable. **Inconclusive** |
| t-32 | `336798529e35` | 13:18:33 | **FAIL** | 16.03 | `556f4ec6-6a5d-4d7f-a574-6e49d45389de` | `0f8cbd6155895fc6…` | step 1: the test supplies no name or GPA. **Inconclusive** (test data) |
| t-48 | `54ddaae2c69c` | 13:21:42 | **FAIL** | 47.15 | `8cdf7d12-172b-475b-9c26-bb936660ffbd` | `62d66d9365ba8476…` | step 2: the non-owner got "not found" for the owner's form (the correct denial), and Kane read it as a broken fixture. **Inconclusive** |
| t-33 | `73dba047215d` | 13:27:00 | **PASS** | 77.99 | `e2dfa4ea-f283-4fd2-9044-ad18a3d9084e` | `e249872507b47e7a…` | every step passed; the DEV-LOOP-03 repair now also holds in Kane |
| t-57 | `b1106355676d` | 13:34:12 | **PASS** | 40.47 | `8f9b5677-2c5a-49e8-be21-0757fa8861d6` | `d3f70dd5bb0bd808…` | every step passed |

Owner decision N-14 (18 Nov): the five inconclusive FAILs above are accepted as recorded, with no further rewording or rerun. Kane credits go to tests that were never run. Native coverage, reported separately: t-2 and t-48 by `apps/web/tests/integration/auth-workspace.test.ts` (no session rejected, foreign workspace resources reported as missing); t-7 by `golden-flow.test.ts` (hidden answers are never stored) and t-10 by the server contract probe P-08 (the server validates every submission again). t-32 has no dedicated native test beyond the session and ownership checks above.

### 3.2 Production batches A and B (`7149c9a`)

| Test | Test file | Started | Outcome | Credits | Execution | Evidence pack SHA-256 | Kane's reason, classification |
|---|---|---|---|---|---|---|---|
| t-50 | `e823d7ea5f89` | 13:38:29 | **FAIL** | 44.44 | `e6add4be-e301-4625-ae6c-112e6b27abc8` | `91167d26d9802702…` | step 2: Kane's extraction did not anchor on the visible receipt rows. **Inconclusive**: it never reached a later page, so it does not confirm the missing paging found by review (repaired in PR #17) |
| t-49 | `b6de90ccbe72` | 13:42:53 | **FAIL** | 41.89 | `9bdb58a5-76ab-4299-a9f2-e88e0ffdb8d4` | `1fe36ee8c416da3b…` | step 2: the fixture gave the time with milliseconds and UTC, while the view shows local time to the second. **Fixture error**, rerun in §3.3 |
| t-35 | `3e1adeec8ce0` | 13:47:03 | **FAIL** | 57.32 | `d3f7958f-b6f4-42e9-9c1b-99a368795e41` | `80f7c9f1420cb324…` | step 2: Kane changed the approved rule to `= 3.5` instead of adding a new condition; the editor correctly flagged it as differing from the claim. **Inconclusive** |
| t-3 | `3977c1cf7384` | 13:51:07 | **PASS** | 67.87 | `8bd341ae-af02-4afb-8c63-0805d492cac3` | `967124296b8870d3…` | the owner's list shows the form, "Published", and the latest evidence (run `01a1edac-80b3-78d4-b4f1-5efba89ff186`) |
| t-56 | `de916aa4de36` | 13:55:35 | **FAIL** | 40.49 | `6f336e43-37a6-49d5-a684-6caf1d38fa1f` | `d099169e22eea354…` | step 2: Kane checked the report fields on the overview without opening the run report. **Inconclusive** |

### 3.3 Scoped judge tests and reruns (`38083bc`)

The judge tests sign in as `judge@niarva.test`. Before the batch, a direct API check confirmed the scope:
- the judge reads the showcase form (`access: judge`);
- approving claims on it returns `404`, and so does its responses list;
- another owner's form returns `404`;
- the forms page lists "Demo examples (read-only)".

| Test | Test file | Started | Outcome | Credits | Execution | Evidence pack SHA-256 | Kane's reason, classification |
|---|---|---|---|---|---|---|---|
| t-62 | `cd084aa1ce9b` | 14:01:35 | **PASS** | 21.99 | `bf450821-9fdb-48c7-a3a5-a15f787e70c5` | `b7f3b58c6f08b568…` | the judge reaches the synthetic demo without any provider secret |
| t-59 | `9e404f5836e4` | 14:04:59 | **FAIL** | 57.72 | `88205550-24cc-4a52-ba8a-131fe5ddc097` | `7243c35ac7d9bb12…` | step 2: only v2 was visible, so the seeded v1 report and its FAIL could not be found. **Product gap** (DEV-LOOP-05) |
| t-64 | `489d4eaedd0c` | 14:09:24 | UNKNOWN | 0 | — | — | did not start: "TMS did not return an org_id"; retried once |
| t-64 | `489d4eaedd0c` | 14:09:56 | **PASS** | 65.23 | `2d60c0d3-1369-43c5-ad4e-ab6d6c3c9cd2` | `2ed90ed0df63034e…` | run ID, objective, expected and observed, pack reference, lineage |
| t-55 | `35071ae6de6c` | 14:15:24 | **FAIL** | 44.16 | `e58e187b-ea72-4ea1-8812-ab2906b86110` | `0f3fcd8e2b7aff65…` | step 2: Kane asserted without locating the sanitized result. **Inconclusive** |
| t-60 | `5ed544a24532` | 14:19:18 | **FAIL** | 117.75 | `4551094e-d4c8-478c-adfb-f089ff79aaa0` | `8e9a6985600043a3…` | step 2, `confirmed_product_bug`: "The demo lists a seeded demonstration version in its history, but [its evidence] is missing." **Product gap** (DEV-LOOP-05) |
| t-63 | `4727c4722cc9` | 14:27:13 | **PASS** | 43.20 | `0b98ccb0-53e5-49f9-b0a2-8303b5aed861` | `a8ecca0a5844cebd…` | the public README covers setup without personal keys |
| t-50 | `e823d7ea5f89` | 14:31:35 | **FAIL** | 68.78 | `6edc1e86-864b-4773-a686-d98348834375` | `de7074997a0a7253…` | step 2 passed (25 receipts on page 1). Step 3: the later page loaded, but Kane did not capture the page-two response body in time. **Inconclusive**; paging itself worked |
| t-49 | `b6de90ccbe72` | 14:37:25 | **FAIL** | 36.61 | `e0ff2d86-8705-40aa-9c9b-093dcaea8b97` | `91ae448e97fa449a…` | step 2 passed (receipt, time, version v2, answers). Step 3, `confirmed_product_bug`: Kane wants the respondent's certificate number masked in the owner's view. **Disputed, recorded as FAIL**: the step's oracle is about verification evidence, not answers the owner owns; masking sensitive answer fields is a baseline requirement outside the hackathon scope, pending an owner decision |

### 3.4 Same tests after PR #19 (`b457993`)

| Test | Started | Outcome | Credits | Execution | Evidence pack SHA-256 | Steps |
|---|---|---|---|---|---|---|
| t-59 | 14:42:05 | UNKNOWN | 0 | — | — | did not start: "TMS did not return an org_id"; retried once |
| t-59 | 14:42:38 | **PASS** | 42.71 | `e674bcd0-bcb9-4cff-9ab4-1b56eb02a6e2` | `da04098c106567cc…` | step 1 replayed, steps 2–3 authored: label "Seeded defect for demonstration", `gte(gpa, 3.5)` claim versus seeded `gt(gpa, 3.5)` rule classified FAIL at 3.5, and the failed report's run ID, objective, expected and observed, pack reference, and lineage |
| t-60 | 14:47:23 | **FAIL** | 71.55 | `606dea76-7ce8-4017-8df7-98e220ed0f57` | `bb7c1406292adbb2…` | steps 2–3 now pass. Kane followed the seeded mismatch, the approved repair, v1 → v2 lineage, and the full run `01a1edac-80b3-78d4-b4f1-5efba89ff186` (8/8, 0 fail, 0 unknown). Step 4: it submitted and saw a receipt, then made the combined final check without re-inspecting each state. **Inconclusive** |

After the judge tests, the owner's view of the showcase form still holds exactly its two recorded runs: v1 diagnostic FAILED and v2 full VERIFIED. The judge account owns no forms. The judge's read-only scope therefore held, even where Kane's summary wording suggested otherwise.

## 4. Totals

- **Runs:** 25, of which 2 did not start (UNKNOWN, sign-in, retried once).
- **Credits:** 1,192.23.
  - §3.1: 370.52
  - §3.2: 252.01
  - §3.3: 455.44
  - §3.4: 42.71 + 71.55 = 114.26

  The local C-10 runs are recorded separately in `evidence/dev-loop/DEV-LOOP-04.md`.
- **Tests newly at PASS:** t-1, t-3, t-33, t-57, t-59, t-62, t-63, t-64.
- **Product gaps found by Kane and repaired:** t-60 and t-59, recorded in `evidence/dev-loop/DEV-LOOP-05.md`.

## 5. Limits

- t-51, t-52, and t-53 (owner response states) are proven on a local build only. The fault hook they need is inert on the deployment.
- Paging (t-50) is not proven by Kane: the later page loaded, but Kane could not capture the network response the test asks for.
- The scoped-judge tests cover reading. That a judge cannot change the showcase form is proven by native tests (`judge-access.test.ts`) and the direct API check above, not by a Kane step.
