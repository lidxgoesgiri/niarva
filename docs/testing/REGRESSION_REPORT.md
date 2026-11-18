# Regression report

The regression set is every Kane test whose behavior a fix could affect. After each source repair, the **same** test is run again, then its neighbours. Test files are never edited between runs; each run records the file's SHA-256.

## 1. History (17 November 2026, KaneAI Generated)

The complete chronology, including failures and runs that never started, is in [`evidence/dev-loop/regression.md`](../../evidence/dev-loop/regression.md). Summary:

| Fix | Same test again | Neighbours run after the fix |
|---|---|---|
| DEV-LOOP-01 `cfc28b8` (AI extraction) | t-36 PASS on `da0c5a0` | t-37 FAIL (exposed R-01), t-44 PASS |
| R-01 `4a3a45b`, `e66e3a2` (claim key) | t-37 FAIL for a new reason (exposed R-02) | — |
| R-02 `5411b9f`, `e860ecf` (Intent Trace) | t-37 PASS on `e860ecf` | t-44 PASS (replay), t-36 FAIL at step 5 (inconclusive visual check) |
| version identity header `7cdc71b` | t-36 PASS on `71564be` | — |

State of the set at the end of 17 November: t-36 PASS (`71564be`), t-37 PASS (`e860ecf`), t-44 PASS (`e860ecf`, replay), t-5 and t-6 PASS (`4d1ecca`, foundation).

## 2. Retests in the official project

The same five designed tests were run again on 18 November 2026 in **NIARVA intent verification**, from a clean worktree with no earlier recording, so every step was authored again in a real browser rather than replayed. These are new executions; they do not replace the history above.

| Test | Historical state (17 Nov) | Retest in the official project | Test case |
|---|---|---|---|
| t-5 | PASS (`4d1ecca`) | **PASS**, 2 steps authored | TC-105 |
| t-6 | PASS (`4d1ecca`) | **PASS**, 2 steps authored | TC-107 |
| t-44 | PASS (`e860ecf`, replay) | UNKNOWN (sign-in, did not start), then **PASS**, 2 steps authored | TC-109 |
| t-36 | PASS (`71564be`) | **PASS**, 5 steps authored | TC-112 |
| t-37 | PASS (`e860ecf`) | **PASS**, 7 steps authored | TC-114 |

All five hold on the current stack (`b17a767`). No regression was found. Details and pack digests: [`KANE_EXECUTION_REPORT.md`](KANE_EXECUTION_REPORT.md#2-retests-in-the-official-project).

## 3. Product verification probes

PROD-LOOP-01 probes are regression evidence for the verification engine itself (D-01 must keep confirming the seeded counterexample; P-01 … P-07 must keep passing on a correct form). Attempts 1–3 are listed in [`KANE_EXECUTION_REPORT.md`](KANE_EXECUTION_REPORT.md#14-product-verification-probes-verification-worker-kane-cli-run). DEV-LOOP-02 (`4359d55`) changed the probe objectives (policy `MPP-v4`), so proofs from attempt 1 are stale by design and later attempts are the regression run.

## 4. Not yet in the regression set

The 59 designed tests that have never run (see [`TEST_CASE_INVENTORY.md`](TEST_CASE_INVENTORY.md)) are not regression evidence until they have a first real run.
