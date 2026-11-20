# DEV-LOOP-06: the builder could not add a rule → source repair → the same test passes

> Found by the Assurance test t-35 ("Unrequested rule is marked against approved intent") with Kane CLI on the live deployment. Repaired and run again, unchanged, against a local production build. Times are UTC. Synthetic data only.

## 1. What happened (real)

| Item | Value |
|---|---|
| Test | t-35 `unrequested-rule-is-marked-against-approved-intent_test.md` (file `3e1adeec8ce0…`), unchanged in both runs |
| First run | 18 Nov 2026 13:47:03, `https://niarva.vercel.app` at `7149c9a`, **FAIL** at step 2 (`assertion_error.final_verification`), 57.32 credits, execution `d3f7958f-b6f4-42e9-9c1b-99a368795e41` ([`PROD-ASSURANCE-01`](../assurance/PROD-ASSURANCE-01.md) §3.2) |
| Kane's account | "The agent selected the equals operator on the existing certificate condition and saved it … Create a separate certificate condition that is not covered by an approved claim." |

## 2. Diagnosis

The run was first classified as inconclusive (Kane changed the existing rule). Reading the source showed why Kane did that:

- The builder (`apps/web/src/features/workspace/form-panel.tsx`) could only change the operator and value of rules that already existed.
- There was no way to **add** a rule. The step "propose an additional certificate condition not requested by any approved claim" could not be done in NIARVA at all.
- Editing a form, including its conditional rules, is P0 creator scope, and the Intent Trace is designed to flag rules no claim asks for. The capability was simply missing.

Reclassified: **product gap** in NIARVA (the builder could not add a rule).

## 3. Repair

**Change: "Add a rule" in the builder.**
- **The form:** a new **Add a rule** button opens a small form: Then (Require or Show), Field, When (a number field), Operator, and Value.
- **The draft:** the rule goes into the unsaved draft, marked "New, not saved", with **Remove**. **Save as new version** stores it through the existing edit endpoint.
- **The checks:** after the save, the engine checks the rule's structure (Gate 1) and traces it against the approved claims, so a rule no claim asks for is flagged as unrequested and never accepted silently.

**Files:** `apps/web/src/features/workspace/add-rule.tsx` and `form-panel.tsx`; native test `apps/web/tests/integration/add-rule.test.ts` (an added rule is stored in a new version, `ruleTrace` status `unrequested`, listed in the Intent Trace's unrequested rules).

**Native:** lint, typecheck, and build pass; 121 tests pass. The renderer identity is unchanged.

## 4. Same test again (local production build)

| Item | Value |
|---|---|
| Server | `next start --port 3600`, embedded PGlite, branch `feature/add-rule`; fixtures from `pnpm seed:kane`. The tested working tree on top of `62e8fd3` is exactly the commit that records this file |
| Run | 19 Nov 2026 10:24:07, `node scripts/verify-kane.mjs t-35`, every step authored (no replay) |
| Outcome | **PASS**, 66.31 credits, execution `38afdb51-91e2-43a9-b99f-270819aae782`, test case `01M7SNBQV0M7XXQ74BBKJ5A52V`, evidence pack `9625c841f7b508a4af78ea171485cd986f045d1a70b9061481777f30481f9ee7` (private) |
| Step 2 | "Added an additional certificate-related condition … Confirmed that the added rule appears in the Unrequested rules section" |
| Step 3 | "The rule was not silently accepted; the page indicated that it was not needed by any approved claim." |
| Server afterwards (direct API, owner) | current version v2 (`manual_edit`): `rule_afa9de9e` "require certificate when `gte(gpa, 4)`" with trace status **unrequested**, listed under the Intent Trace's unrequested rules; publishing gate **closed** |

The closed loop: FAIL on the deployment at `7149c9a` → "Add a rule" → the same t-35 PASS on a local build. The deployment gets the change when this is merged; t-35 is not claimed on the deployment until it runs there.
