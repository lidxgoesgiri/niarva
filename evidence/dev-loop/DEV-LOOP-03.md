# DEV-LOOP-03: invalid rule saved by a Kane test → form workspace HTTP 500 → source repair

> Found while running the Assurance test t-33 ("Executable rule expressions are not accepted as DSL") with Kane CLI against the verification server. The defect was not planted, and no test was edited.

## 1. What happened (real)

| Item | Value |
|---|---|
| Test | t-33 `executable-rule-expressions-are-not-accepted-as-dsl_test.md` (SHA-256 `73dba047…a619`), run 2026-11-18 03:14:21 UTC |
| Kane CLI | 0.10.4, session `dead94fa-09e0-40f9-bb75-08ff2be51c2e`; evidence pack `01d7e220be12313633acaa10edd194c2e638572d2d89425141eed67aa502fd4e` (private) |
| Kane action | 03:17:05 UTC: "Typing alert(1) into the rule condition text box", then saving the form, signed in as the owner |
| Server effect | 03:17:29 UTC: a new version **v3** (`manual_edit`, definition `75bc79bf…`) was stored with the rule `{"op":"gte","field":"gpa","value":"alert(1)"}` |
| Kane's judgement of that step | passed: "The form configuration did not accept or store the executable rule as a supported rule". The static checks marked v3 FAILED with `INVALID_LITERAL`, but the version **was stored**. |
| Consequence, found afterwards | `GET /api/v1/forms/{id}` and the form's workspace returned **HTTP 500** (`Invalid decimal literal: alert(1)`, correlation `GpZqz3Fkgu2U`). The creator could no longer open the form. |
| Not affected | The published version (v2) kept serving respondents (HTTP 200); publishing v3 was impossible because its static verdict was FAILED. |

## 2. Diagnosis

1. **Save accepted a structurally invalid edit.** `snapshotVersion` recorded every definition, valid or not, so the creator could see why it failed. That contradicts ac-73: "Invalid field references, dependency cycles, or unsupported conditions are rejected rather than saved as supported rules."
2. **The workspace state evaluated the invalid definition.** The Intent Trace boundary table (`packages/core/src/trace/trace.ts`) ran the definition at the threshold. `alert(1)` cannot be parsed as a decimal, the exception escaped, and the whole state request failed.

Classification: source defects in NIARVA (save validation and robustness).

## 3. Repair

| Commit | Change |
|---|---|
| `b3a89bd` `fix(versions): reject manual edits that fail structural checks instead of saving them` | Manual edits run Gate 1 (`validateStructure`: schema, references, types, literals, depth, cycles) before a version is created. A failure returns `422 VALIDATION_FAILED` with the problems as reasons, and no version is stored. Engine-produced versions (generation, approved repair) are unchanged. |
| `4c88995` `fix(trace): keep the workspace loading when a stored definition cannot be evaluated` | The boundary table is omitted for a definition that cannot be evaluated; its findings already explain why. Versions stored before the fix load again. |

The renderer identity is unchanged (the trace and the version service are outside it), so existing browser proofs stay fresh.

Native tests: `apps/web/tests/integration/invalid-edit.test.ts` (3 tests: `alert(1)` rejected with no version created, a valid edit still saved, a previously stored invalid version still loads) and a core trace test. Core 59/59, web 33/33.

Verified on the live server after the rebuild: the affected form loads again (HTTP 200) and shows v3 as static FAILED with `INVALID_LITERAL`; the public form still serves v2.

## 4. Same objective again

t-33 is rerun unchanged in the retest batch after the fixes; the result is recorded in [`../assurance/C-04-C-05-security-and-honesty.md`](../assurance/C-04-C-05-security-and-honesty.md).

**Outcome.** Those retests replayed a stale recording and ended inconclusive. On 18 November, the same test file (`73dba047215d`) was run again on the live deployment with every step authored against the current build, and it **passed**: [`../assurance/PROD-ASSURANCE-01.md`](../assurance/PROD-ASSURANCE-01.md) §3.1, execution `e2dfa4ea-f283-4fd2-9044-ad18a3d9084e`.
