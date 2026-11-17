# DEV-LOOP-01 — Kane CLI failure → source repair → same objective passes

> Development closed loop: a real Kane CLI failure in a real browser fed back into the coding agent (Claude Code), which repaired NIARVA's **source code**, and the **unchanged** test objective passed on the repaired build.
> This defect was found, not planted. Nothing about the test, its oracle, or its objective was changed.

## 1. Requirement and test

| Item | Value |
|---|---|
| Requirement | Generating from the approved scholarship claims must produce a Name field, a GPA field, and the declarative certificate rule `gte(gpa, 3.5) → certificate visible AND required`, tied to a form version |
| Test | `t-36` · `.testmuai/tests/approved-scholarship-claims-generate-a-versioned-conditional_test.md` |
| Test origin | Designed by Kane Assurance (`kane-cli design tests`) from the approved use case "Generate and edit a versioned conditional form"; approved by the repository owner at the design review |
| Test file SHA-256 (both runs) | `860858c7a5f4e502af83624025105eafc3698630fb3b255e9e3783d68d5c5969` |
| Runner | `pnpm verify:kane t-36` → `kane-cli testmd run <file> --agent --headless` (Kane CLI 0.10.4) |
| Target | NIARVA production build on `http://localhost:3000`, synthetic owner account |

## 2. Failure (real)

| Item | Value |
|---|---|
| Started (UTC) | 2026-11-17T09:54:33Z |
| Outcome | `test_md_done.overall_status = failed`, exit code 1 |
| Kane session (first step) | `d392a9ca-43ff-4940-978e-f13d819ee849` |
| Evidence pack SHA-256 | `13d5fcc89a2c709849307f535e53f8d5ad9e8d22957d136d9730ce453bffc08d` (11,248,528 bytes, kept private) |
| Credits | 99.32 |
| Failing step | Step 4 — `assertion_error.final_verification` |

What Kane observed: Kane followed the AI path with the golden prompt. The generated form contained only **Name** and **GPA**; there was **no certificate field and no conditional rule**. The certificate requirement had become two **manual-check** claims.

Kane's own summary suggested updating the test expectation. That suggestion was **rejected**: the test's oracle is the approved requirement, and the product was wrong.

### Diagnosis by the coding agent

The form the run created was inspected through the API:

```text
C-01 FIELD   Name is always shown and must be filled in.
C-02 FIELD   GPA is always shown and must be filled in.
C-03 MANUAL  "When GPA is 3.5 or higher, the applicant must provide an achievement certificate.
              File uploads are not supported by the form, so this must be handled outside the form …"
C-04 MANUAL  "When GPA is below 3.5, the achievement certificate field must not be shown …"
```

Root cause in `apps/web/src/server/ai/extract-claims.ts`:

1. The extraction instructions told the model that "file uploads … are MANUAL claims". The model read "must provide an achievement certificate" as an upload, so it dropped the field and the boundary rule.
2. The model also returned `acknowledged: true` for the manual claims. Approval therefore accepted "not verified" requirements **without a decision by the creator**, which is a silent substitution of intent.

Classification: **source defect** in NIARVA (not infrastructure, not a test problem).

## 3. Source repair

| Item | Value |
|---|---|
| Revision before | `b9e584d61a77b8beecf68b4346b4035659817234` |
| Repair commit | `cfc28b836d5a022f47ab008aef2b5f2471a07170` — `fix(ai): keep provided documents as conditional fields and never auto-acknowledge manual checks` |
| Regression test commit | `d79ea57` — `test(web): require creator review for AI-proposed manual checks` |
| Files | `apps/web/src/server/ai/extract-claims.ts` (+12 −2), `apps/web/src/features/workspace/intent-panel.tsx` (+2) |

Changes:

- The instructions now say that a document an applicant must provide becomes a field for its number or identifier, conditioned with `VISIBLE_WHEN` / `REQUIRED_WHEN`. A conditional field requirement must never become a manual claim. Prompt version: `extract-claims.v2`.
- A deterministic guard: every AI-proposed manual claim is forced to `acknowledged: false` and `needs_review`, with the choices "Keep as manual check" or "Remove". Only the creator's choice acknowledges it.
- A native regression test covers the guard: `apps/web/tests/integration/ai-guard.test.ts`, 4 of 4 passing.

## 4. Same objective, rerun (real)

| Item | Value |
|---|---|
| Started (UTC) | after the repaired build, on revision `da0c5a09f832f0264f796b7f223df5cfe1e9a551` (clean working tree) |
| Test file SHA-256 | `860858c7…5c5969`, identical to the failing run |
| Outcome | `test_md_done.overall_status = passed`, exit code 0 |
| Evidence pack SHA-256 | `6b85fd96ab064627e6e5b371c3aa27824ee0707c2a1e2d53a67b12fd632f3210` (8,949,466 bytes, kept private) |
| Credits | 75.74 |

What Kane confirmed:
- The generated form has Name and GPA.
- "Achievement certificate number" is shown and required when GPA ≥ 3.5.
- The rule is declarative (no JavaScript, `eval`, or shell) and supports the approved claims.
- A generated form version exists.

How Kane executed the rerun, from its `test_md_summary` event: **3 replay decisions and 2 author decisions**, with adaptive heal triggered. Kane first replayed the recorded actions from the failing run. Step 2's replay failed against the repaired product, so Kane healed by restarting from step 1 and continued. A replayed step still runs in a real browser, but it reuses recorded actions instead of deciding afresh. The stream reports these counts per run, not per step. The final verdict comes from `test_md_done`, as the completion contract requires.

## 5. Regression

See [`regression.md`](regression.md) for the regression runs after the repair.

## 6. Notes

- The model output is non-deterministic. The deterministic guard makes the failure mode safe even when a model still proposes a manual claim: approval is blocked until the creator decides.
- Raw NDJSON streams and sealed packs stay private because they contain the preview environment URL and session cookies of the synthetic account. The digests above identify them.
