# DEV-LOOP-02: Kane UNKNOWN in product verification → probe derivation repair → same probe again

> Found by the product's own verification. A real Kane CLI run, started by NIARVA's worker during PROD-LOOP-01, ended without the observation NIARVA needs. NIARVA correctly judged it UNKNOWN, so the version stayed unpublishable. The cause was a defect in how NIARVA writes probe objectives. It was repaired in source, and the same probe kind was run again on the repaired build.

## 1. The failing probe (real)

| Item | Value |
|---|---|
| Loop | PROD-LOOP-01, attempt 1 (`evidence/product-loop/prod-loop-01-attempt-1.json`) |
| Run | full verification `01a1ea22-00d2-7b06-87ff-1d2ad40656b2`, form version 2 (after the approved repair) |
| Probe | **P-05 `valid_submission`** (golden K-06), claims C-01, C-02, C-04, C-GPA |
| Kane CLI | 0.10.4, session `87f8a649-dc26-4a72-a6f5-356a55348fe1`, Kane status `failed`, 20.98 credits |
| Evidence pack SHA-256 | `a3ae564211154d42d5d1690305a2720aa05108c5f23213e714b3d4f2fba4fc51` (private) |
| NIARVA verdict | **UNKNOWN**, `MISSING_OBSERVATION` at stage 1 |
| Effect | Run UNVERIFIED (7/8 PASS, 1 UNKNOWN); publishing refused with `409 GATE_BLOCKED` (`BROWSER_UNVERIFIED`) |

What Kane did, from its session log:

1. It read the footer code.
2. **Before** typing the GPA, it searched the page for "Achievement certificate number". The search returned only `field-full_name` and `field-gpa`.
3. It concluded `objective_contradiction`: "The form has only Full name and GPA inputs; the required Achievement certificate number field is absent."

The objective listed the steps in the right order (name → GPA 3.50 → certificate), but the agent planned ahead and checked a conditional field before the answer that reveals it. The form was correct: at GPA 3.50 the certificate field appears, as every other probe in the same run confirmed (P-02 boundary, P-03 conditional requiredness, P-04 hidden exclusion all PASS).

**Classification:** source defect in NIARVA's probe derivation (`packages/core/src/probes/probes.ts`). Objectives did not say that fields can appear only after earlier answers. Neither the form nor Kane was at fault, and the test oracle was not touched.

## 2. Source repair

| Item | Value |
|---|---|
| Repair commit | `4359d5508e71ce4f8e898780d5f5a3b8e1f5aa5f`: `fix(probes): tell the browser agent that conditional fields appear only after the answers that reveal them` |
| Regression test | `6a3be40027d98ba874c98bd9142515bb12140708`: `test(core): cover the step order of conditional fields in probe objectives` (core 57/57) |
| Probe policy | `MPP-v3` → **`MPP-v4`**. Objective text is part of the probe policy, so every earlier browser proof becomes STALE by design. |

What changed in every objective of a form with conditional fields:

- An ordering note at the top: "Some fields appear only after an earlier answer is entered. Follow the steps in order, and do not look for a field before the step that names it."
- Before typing into a conditional field: "Wait until a field labeled … is shown; it appears only after the earlier answers."

The expected observations (the oracle derived from the approved claims) are unchanged. Only the instructions to the browser agent are clearer.

## 3. Same probe again on the repaired build

| Item | Value |
|---|---|
| Run | PROD-LOOP-01 attempt 3, full verification `01a1eade-4eef-7d44-8714-0375693a4fff` on build `71839e9` (contains `4359d55`), policy `MPP-v4` |
| Probe | P-05 `valid_submission`, same derivation with the repaired objective text |
| Kane CLI | 0.10.4, session `62114ad6-0baf-4349-99fd-95d7508f8290`, status `passed`, 34.98 credits |
| Evidence pack SHA-256 | `c4b8304306d561de064032cf5b2c8db8a48cade3353d7bdd1a81a4d8b68c9d11` (private) |
| NIARVA verdict | **PASS**: receipt observed; server evidence matched the expected stored answers |
| Run | VERIFIED, 8/8 required probes PASS ([`../product-loop/PROD-LOOP-01.md`](../product-loop/PROD-LOOP-01.md)) |

Attempt 2 of the loop also ran under `MPP-v4` and was interrupted before P-05 started. Its P-03 failure ("No start URL provided") is a separate defect, recorded in PROD-LOOP-01.md and repaired in `0e0a977` and `b67d140`.
