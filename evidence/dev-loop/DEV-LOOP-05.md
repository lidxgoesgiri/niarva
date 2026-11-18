# DEV-LOOP-05: after a repair, the seeded version's failing proof disappeared → source repair → the same judge test passes on the deployment

> Found by the Assurance tests t-60 and t-59, run with Kane CLI as the scoped judge account against the live deployment. The defect was not planted, and no test was edited. Every check below ran on 18 November 2026; times are UTC. Synthetic data only. Full run tables: [`../assurance/PROD-ASSURANCE-01.md`](../assurance/PROD-ASSURANCE-01.md) §3.3–3.4.

## 1. What happened (real)

| Item | Value |
|---|---|
| Deployment | `https://niarva.vercel.app` at `38083bc` (environment `vercel-production`) |
| Account | `judge@niarva.test`, scoped read-only access to the showcase form: the production loop form `01a1edaa-e0d9-7694-b60b-59ca816433c6`, the golden case of `../deploy/VERCEL-PROD-01.md` |
| t-60 "Judge traces real golden-case repair through respondent receipt" (file `5ed544a24532…`) | 14:19:18, **FAIL** at step 2, reason `assertion_error.confirmed_product_bug`: "The required seeded demonstration version cannot be opened, so the comparator mismatch and its label cannot be verified." 117.75 credits, execution `4551094e-d4c8-478c-adfb-f089ff79aaa0`, pack `8e9a6985600043a3…` |
| t-59 "Judge sees labelled seeded GPA mismatch as real FAIL" (file `9e404f5836e4…`) | 14:04:59, **FAIL** at step 2: "The run opened the current approved v2 form, not the seeded GPA-comparator defect report … Restore or expose the seeded v1 demonstration report." 57.72 credits, execution `88205550-24cc-4a52-ba8a-131fe5ddc097`, pack `7243c35ac7d9bb12…` |

## 2. Diagnosis

`getFormState` (`apps/web/src/server/services/state.service.ts`) loaded runs and repair proposals for the **latest version only**. After the approved repair created v2, the seeded v1 kept its diagnostic run (Kane reported `passed`, NIARVA judged FAIL at GPA 3.50) and the applied repair in the database. However, nothing in the workspace showed them; the lineage line was the only trace. The golden case could not be followed from the mismatch to the current proof, for the owner or for a judge. That contradicts FR-18 (judges inspect run IDs, objective, expected and observed, pack, and version lineage) and the judge path in the master PRD §15.

Classification: source defect in NIARVA (evidence visibility across versions).

## 3. Repair

| Commit | Change |
|---|---|
| `53e1305` `feat(evidence): keep each earlier version's runs and repairs visible in the workspace` (PR #19, merged as `b457993`) | The form state carries a `history` of earlier versions. Each entry holds the version's own runs, built and reported exactly like current runs, and the repairs proposed on it, with the version each applied repair created. The verification panel shows **Earlier versions and their proof**. Proof never carries over: the current version still starts without runs. |

Native: lint, typecheck, and build pass; 114 tests pass (core 59, worker 5, web 50), including `proof-history.test.ts`. The renderer identity is unchanged, so the production proof stays FRESH. After the deploy, a direct API read as the judge showed the history: v1 (`template`), diagnostic run FAILED, repair `ALIGN_OPERATOR` applied.

## 4. Same tests again (deployment at `b457993`)

| Test | Started | Outcome | Credits | Execution | Steps |
|---|---|---|---|---|---|
| t-59 | 14:42:05 | UNKNOWN (did not start: Kane sign-in, "TMS did not return an org_id") | 0 | — | retried once |
| t-59 | 14:42:38 | **PASS** | 42.71 | `e674bcd0-bcb9-4cff-9ab4-1b56eb02a6e2`, pack `da04098c106567cc…` | step 1 replayed. Steps 2 and 3 were authored again: Kane saw the label "Seeded defect for demonstration" and the approved `gte(gpa, 3.5)` claim against the seeded `gt(gpa, 3.5)` rule classified FAIL at 3.5. The failed report showed the run ID, objective, expected and observed, evidence pack reference, and version lineage |
| t-60 | 14:47:23 | **FAIL** at step 4 (inconclusive) | 71.55 | `606dea76-7ce8-4017-8df7-98e220ed0f57`, pack `bb7c1406292adbb2…` | step 2, the former product bug, now **passes**. Step 3 passes: the approved repair, lineage v1 → v2, and the full run `01a1edac-80b3-78d4-b4f1-5efba89ff186` with 8/8 executed. In step 4, Kane submitted the public form and saw a receipt, then made the combined final check without re-inspecting each state |

The closed loop is t-59: FAIL on `38083bc` → repair `53e1305` → the same test file PASS on `b457993`. t-60 no longer fails on the defect, but it stays **FAIL** by its latest run.

After the reruns, the showcase form still had exactly its two recorded runs, and the judge account owned no forms.
