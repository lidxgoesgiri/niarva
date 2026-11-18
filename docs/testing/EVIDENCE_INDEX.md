# Evidence index

How to trace a testing claim back to the execution that supports it. Every row ends at something a reviewer can check: a Kane evidence ID shown in Test Manager, a sealed pack digest, a commit, or a committed record.

Raw NDJSON streams and sealed packs are kept on the owner's machine (`evidence/private/`, `.testmuai/evidence/`) because they contain local URLs and synthetic session cookies. The SHA-256 digests below identify them exactly; `kane-cli evidence validate <pack>` checks a pack's integrity.

Test Manager links:
- Official project: https://test-manager.lambdatest.com/projects/01M7N0CKZ90R3JR906713EHYW0/test-cases
- Historical project: https://test-manager.lambdatest.com/projects/01M7K3YXN5X28FCVQCMV3F4HN5/test-runs

## 1. Claims

| # | Claim | Executions | Code | Record |
|---|---|---|---|---|
| 1 | Kane found that AI extraction dropped the conditional certificate requirement; after a source fix the unchanged test passed | FAIL `475eaa00…` → PASS `e868720f…` (TM run `01M7MFXH8Q18XDA3AEPBRB0VH9`); retest PASS `b7593a16…` (TC-112) | `cfc28b8`, `d79ea57` | [`DEV-LOOP-01.md`](../../evidence/dev-loop/DEV-LOOP-01.md), [`DEFECT_TRACEABILITY.md`](DEFECT_TRACEABILITY.md) |
| 2 | Kane found a wrong claim key (R-01) and a missing required feature, the Intent Trace (R-02); both were fixed in the source and the unchanged test passed | FAIL `4ec07345…` → FAIL `cca534b4…` → PASS `f0be05ef…` (TM run `01M7MYWC7NSXEZPGNQHH52SJWB`); retest PASS `12883865…` (TC-114) | `4a3a45b`, `e66e3a2`, `5411b9f`, `e860ecf` | [`regression.md`](../../evidence/dev-loop/regression.md) |
| 3 | A repair proposal waits for explicit creator approval | PASS `0034b409…`, replays `234ab9e2…`, `35ac194c…`; retest PASS `30c613bb…` (TC-109) | — | [`KANE_EXECUTION_REPORT.md`](KANE_EXECUTION_REPORT.md) |
| 4 | An anonymous visitor gets an unauthorized state; a creator with no forms sees the empty state | PASS `2973d707…`, `fe214043…`, `testrun` `238db307…`; retests PASS `f7202a6f…` (TC-105), `801c6450…` (TC-107) | — | [`KANE_EXECUTION_REPORT.md`](KANE_EXECUTION_REPORT.md) |
| 5 | NIARVA's verification confirms the seeded `gte`/`gt` mismatch in a real browser, and its verdict differs from Kane's own status | PROD-LOOP-01 D-01: sessions `ad1c0fdf…` (TC-39), `4c3a2799…` (TC-64), `2c149ca9…` (TC-101) — NIARVA FAIL, Kane `passed` | worker, `packages/core/src/probes` | [`KANE_EXECUTION_REPORT.md`](KANE_EXECUTION_REPORT.md#14-product-verification-probes-verification-worker-kane-cli-run) |
| 6 | Kane observations reveal labelled lab faults, including three that Kane itself reported as `passed` | M0 runs `FAIL-boundary-gt-2`, `FAIL-comma-bug`, `H08-condreq-reqoff`, `H09-multi-leakB` (pack digests in `runs.json`) | `m0-lab/` | [`M0_REPORT.md`](../../evidence/m0/M0_REPORT.md) §3.1 |
| 7 | All NIARVA testing now goes to one Test Manager project, enforced by the runners | retests recorded `project_id = 01M7N0CKZ90R3JR906713EHYW0` in each new recording | `scripts/lib/kane-project.mjs` | [`MIGRATION_REPORT.md`](MIGRATION_REPORT.md) |
| 8 | A Kane run with an incomplete observation was judged UNKNOWN and blocked publication; after a probe-objective repair the same probe passed and the run was VERIFIED (DEV-LOOP-02) | P-05 UNKNOWN `87f8a649…` (TC-45, pack `a3ae5642…4fc51`) → P-05 PASS `62114ad6…` (TC-110, pack `c4b83043…9d11`); run `01a1eade-…4fff` VERIFIED 8/8, publish `201`, receipt `JBSFXZFC` | `4359d55`, `6a3be40` | `evidence/dev-loop/DEV-LOOP-02.md` and `evidence/product-loop/PROD-LOOP-01.md` on `feature/verification-worker` (`d28dee5`) |

## 2. Sealed evidence packs (historical, 17 Nov 2026)

| Evidence ID | Test | Outcome | SHA-256 | Bytes | Test Manager (KaneAI Generated) |
|---|---|---|---|---:|---|
| `2973d707-69b3-4d72-87dc-48248d2daedc` | t-5 | PASS | `96c11dde3cc672233a8f091b1249b1d6672acaea075874b4e6378468bf94675c` | 533,321 | run `01M7KQRNNTY3VJSX5856VWQRNP` |
| `fe214043-4d45-444e-8a42-47b93ee14001` | t-6 | PASS | `2721de0d3538caa8cab2023970f091796fe06ab9bf5621bddb7eeba844e60ec9` | 931,960 | run `01M7KQX79MTYEX4NQGPRP3GATQ` |
| `238db307-4553-4bac-8619-2d6cbbb88e93` | t-5 + t-6 (testrun replay) | PASS | `a99c20107be766044099006fa56571e4205fef435046c56f03405f9ef5f8482f` | 1,336,523 | not uploaded as a run |
| `0034b409-8adb-4cf0-9953-f433589279ca` | t-44 | PASS | `d67c982386f559943a3c0ea18ccb72419c9fd11ddda6859b5e92232f34c6730b` | 3,303,322 | run `01M7MEVMKZRGJ9T22TH0NS6Y7Y` |
| `475eaa00-5b39-4e94-a6f7-4b2d65f95526` | t-36 | FAIL | `13d5fcc89a2c709849307f535e53f8d5ad9e8d22957d136d9730ce453bffc08d` | 11,248,528 | — |
| `e868720f-90a3-4073-a12e-ae931dc513a3` | t-36 | PASS | `6b85fd96ab064627e6e5b371c3aa27824ee0707c2a1e2d53a67b12fd632f3210` | 8,949,466 | run `01M7MFXH8Q18XDA3AEPBRB0VH9` |
| `4ec07345-8e01-439b-abec-5a7d148ca232` | t-37 | FAIL | `0145b909b8de5a06f5c8cabd730a54f64e3bfaf7be69a3f1a7bcfa2b0eecc16e` | 8,205,694 | run `01M7MG7YA8336CPHAFDR9RKRPA` |
| `234ab9e2-51c6-43a2-bf07-c355282d8a34` | t-44 | PASS (replay) | `5a0cbfb4d40fad9175821ecf8df1bb46c7d645df825a787b0ea2fe293f38aa9e` | 3,137,780 | — |
| `cca534b4-ec0b-4647-b98a-f34911d81f43` | t-37 | FAIL | `4f07a50c0d182c71fc68773544933ad44fac484c853d66d0cd8a02703c73147e` | 4,309,883 | — |
| `f0be05ef-7437-4cba-98d8-fd5fcd36ac49` | t-37 | PASS | `d862d269e4a60433455f71741d3cdc7682b96f93aa666223febe4ca6f847d851` | 4,440,922 | run `01M7MYWC7NSXEZPGNQHH52SJWB` |
| `35ac194c-f68b-4690-8668-a4678831c626` | t-44 | PASS (replay) | `0a7a7be5343cfe64e2a8c3dcb73a66775cfcc334faa3226cf7b9b4d5505fc9f9` | 2,819,217 | — |
| `34643871-e4d1-4059-b1b1-bf7f9cb6c2f9` | t-36 | FAIL | `e2b373303b90990aeab454031c4d398959995b9fe552442398be819f85ebf6c2` | 8,236,035 | — |
| `b0922bd0-2c4d-49ab-a5bb-c466b75c0cc5` | t-36 | PASS | `d1ed0530827d233d5d4375b1867aa62f56d106a7e3f3b7e7cb0a1e4049f909fe` | 8,111,214 | run `01M7N0GPATPSTJ0AEMQXYY7QAP` |

Every digest above that also appears in [`DEV-LOOP-01.md`](../../evidence/dev-loop/DEV-LOOP-01.md) or [`regression.md`](../../evidence/dev-loop/regression.md) was recomputed from the pack on 18 Nov 2026 and matches. The digests of `2973d707…`, `fe214043…`, `238db307…`, and `0034b409…` are recorded here for the first time.

Revision note: the run summary of the DEV-LOOP-01 failure (`475eaa00…`) records `57d1627` at run start, a commit on the local branch `feature/interactive-landing`; `DEV-LOOP-01.md` names `b9e584d` as the revision before the fix. `b9e584d` is an ancestor of `57d1627`, and the two have no differences under `apps/web/src/server/` or `packages/` (only landing, worker, and demo files differ), so the extraction code under test is the same.

## 3. Retests in the official project

| Evidence ID | Test | Outcome | SHA-256 | Bytes | Test case (official project) |
|---|---|---|---|---:|---|
| `f7202a6f-735d-4a27-a7aa-ad31acb4e699` | t-5 | PASS | `12aaa39ad9921c2a6f18815d4d847135265d41763c722a56bc10768eb4593590` | 469,448 | TC-105 `01M7NEG155H11YH0RNZ2EXMAKJ` |
| `801c6450-1abc-442f-94f3-27c756843239` | t-6 | PASS | `0a82ec579feffced643d098a2b4d9b83447ced0595f5dc89f9107f1bc518f628` | 1,009,075 | TC-107 `01M7NES07YV6K4BQQ8Y7083D1D` |
| `30c613bb-2ab4-4839-9ddd-16aad25d4e08` | t-44 | PASS | `00a800b9ec90c59ed9ecc5c524fa2831c54807ace1e51a16106ba93f408c2131` | 2,485,743 | TC-109 `01M7NF2VXG14F0PE2NGST7TC5E` |
| `b7593a16-e58f-4bc0-ab2a-9834e2486a6c` | t-36 | PASS | `c0a987052fe2318507103480c0fff3d8af4707419766e37cda7f22f649bda816` | 6,046,262 | TC-112 `01M7NFT74HM01X7P35RHKNXEY2` |
| `12883865-5fd7-450b-bbcc-b36801f5ff2b` | t-37 | PASS | `cf56a3af86bb546d37c09fc7c632bc356ecfa2082e48f9206f56dc7a348708b7` | 4,981,256 | TC-114 `01M7NG9T8ZD75HJTJ4Q01M3TRC` |

The sixth retest record (t-44, 19:16:56 UTC) never started (Kane sign-in), so it has no pack. Full records: [`KANE_EXECUTION_REPORT.md`](KANE_EXECUTION_REPORT.md#2-retests-in-the-official-project) and [`evidence/tms-migration/retests.json`](../../evidence/tms-migration/retests.json).

## 4. Production deployment (Vercel, 18 November 2026)

The product loop on `https://niarva.vercel.app` (D-01 FAIL as expected, P-01 … P-07 PASS) and the production smoke runs (t-5, t-6, t-44, t-36, t-37 PASS; a first batch BLOCKED by configuration) are listed with full SHA-256 pack digests, Kane sessions, and execution ids in [`evidence/deploy/VERCEL-PROD-01.md`](../../evidence/deploy/VERCEL-PROD-01.md). Sanitized loop records: [`prod-loop-vercel-01-attempt-1-interrupted.json`](../../evidence/product-loop/prod-loop-vercel-01-attempt-1-interrupted.json), [`prod-loop-vercel-01-attempt-2.json`](../../evidence/product-loop/prod-loop-vercel-01-attempt-2.json).
