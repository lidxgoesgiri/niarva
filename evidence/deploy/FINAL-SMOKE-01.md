# FINAL-SMOKE-01: Kane CLI smoke on the final build

> Run on 23 November 2026 against https://niarva.vercel.app, the production deployment of `311ee01` (the last change to `apps/` and `packages/` before the code freeze). Kane CLI 0.10.4 through `scripts/verify-kane.mjs`, official Test Manager project `01M7N0CKZ90R3JR906713EHYW0`. Synthetic accounts only. Times are UTC.

## 1. Results

| Started | Test | Outcome | Credits (Kane-reported) | Execution | Test case | Evidence pack SHA-256 |
|---|---|---|---|---|---|---|
| 07:12:26 | t-5 Anonymous visitor receives unauthorized workspace state | **PASS** | 16.45 | `4fd27322-0e9b-40a5-b561-712ca305d944` | `01M7T0TR9BCWGB4RFVX8ZTC0BY` | `7a74aacea46affabf89276defc90d265b632b0aa2eb69c3a1b9a18934a19e73e` |
| 07:15:50 | t-6 Creator without forms sees an empty workspace state | **PASS** | 0 | `abc599d1-a554-4944-b0d2-000fe486477d` | `01M7T10V8XPRMV2QCMN270V627` | `e275e5fee00b8c7f03a1bd78b183d124b4c7c64c20e80ab57a82b5be88cf1fe8` |
| 07:17:56 | t-59 Judge sees labelled seeded GPA mismatch as real FAIL | **FAIL** (test data) | 18.92 | `bb8c8e8b-1aab-4079-acbc-a05d194f7990` | `01M83M9YV7CP096HHXJSF0D8N8` | `ae2b44ec270b9a089f13fcaee79b856dc90d6aac7f456d6d821a075997ef4942` |
| 07:21:40 | t-59, rerun once with the documented judge fixture | **PASS** | 56.90 | `586f18d2-ce6c-4494-9018-74c636e5e821` | `01M83M9YV7CP096HHXJSF0D8N8` | `29755e8bc5ffaca7941af460d7d1970bc2f2e9d7409b5657dc149f4f6d65f820` |

Kane-reported credits: 92.27. The account balance went from 249.19 to 132.26 over the same window (116.93), so not every charge was reported per run (t-6, for example, reported 0).

## 2. Notes

- **t-5.** Kane's step stream contains one failed navigation attempt to `/app`, which Kane retried within the run. The test's completion status is `passed`: the signed-out visitor was redirected to sign-in, which states that the workspace requires signing in.
- **t-6.** Kane reported 0 credits for this run.
- **t-59, first run.** The test opens the form named by the variable `seeded_gt_form_name`. That variable still named a fixture form owned by another synthetic account, so the judge's demo list did not contain it. Kane's own summary: "This points to missing or stale test setup rather than a proven problem in the product." For read-only judge tests, the documented procedure is to point `seeded_gt_form_name` at the showcase form ([`PROD-ASSURANCE-01.md`](../assurance/PROD-ASSURANCE-01.md) §2). That step was missed here.
- **t-59, rerun.** The variable was pointed at the showcase form "Product Loop Scholarship 2026-11-18T07:59" and the unchanged test file (`9e404f5836e4…`) ran once more. All three steps passed:
  - Kane entered the judge demo without any provider secret.
  - It confirmed that the earlier version is labeled "Seeded defect for demonstration" and that the approved `gte(gpa, 3.5)` claim versus the seeded `gt(gpa, 3.5)` rule is marked Fail at GPA 3.5.
  - It inspected the failed report's run ID, objective, expected and observed values, evidence-pack reference, and version history.
- The variables file was restored after each run. No test file was edited.

## 3. Status of the designed tests

Unchanged: t-5, t-6, and t-59 were already PASS by their latest runs, so the totals stay at 25 PASS, 15 FAIL, and 24 NOT RUN ([`KANE_EXECUTION_REPORT.md` §5](../../docs/testing/KANE_EXECUTION_REPORT.md#5-latest-status-per-designed-test)).
