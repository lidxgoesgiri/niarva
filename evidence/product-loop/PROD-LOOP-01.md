# PROD-LOOP-01: product closed loop with a real worker and Kane CLI

> NIARVA's own loop, driven through its API exactly as the workspace does it.
> Seeded `gt` defect → static FAIL → **diagnostic Kane run in a real browser** → bounded repair approved by the creator → new version with the same approved claims → publish refused before proof → **fresh full suite with real Kane runs** → publish allowed → respondent submission.
> Kane observes; NIARVA decides. Every attempt is listed, including the failed and interrupted ones.

## Setup

| Item | Value |
|---|---|
| Driver | `scripts/run-product-loop.mjs` (resumable since `5f4d13f`) |
| Worker | `apps/worker`: Kane CLI 0.10.4, `kane-cli run --agent --headless`. The preview link is passed only as a secret variable; the start page is its origin. |
| Server | Production build on `http://localhost:3200`, own PGlite database, environment id `local-verify-3200` |
| Form | Scholarship template: claims C-01 (name), C-02 (GPA), **C-GPA** (certificate visible and required when GPA ≥ 3.5), C-04 (GPA 0–4, 2 decimals). Claims hash `5bec6abf…3af7`. |
| Seeded defect | Generated rule `gt(gpa, 3.5) → show certificate` (labeled "Seeded defect for demonstration") |
| Kane lock | One Kane run at a time on the machine. Runs from other worktrees took turns between probes. |

## Attempt 3: VERIFIED (final)

Build `71839e9` (`feature/verification-worker`), probe policy `MPP-v4`, renderer `r1-6b8a9a7ac0dd0397`. Record: [`prod-loop-01-attempt-3.json`](prod-loop-01-attempt-3.json).

| Time (UTC) | Step | Result |
|---|---|---|
| 2026-11-17 18:54:19 | Seeded version v1 (`a8ebe142…`) | Static verdict **FAILED**. Counterexample: GPA = 3.50, certificate expected visible and required, actually hidden. |
| 18:54:19 → 18:56:32 | Diagnostic run `01a1eadc-…63dd` | **D-01 FAIL** `OBSERVATION_MISMATCH`. Kane reported `passed`, but its observations showed the certificate field hidden and not required at GPA 3.50; NIARVA judged FAIL. Kane session `2c149ca9-2994-4c03-bda4-8742cbe494dc`, 25.53 credits. |
| 18:56:40 | Repair proposals | `ALIGN_OPERATOR` (`set_operator rule_d0c84c42: gt → gte`) first, plus `REGENERATE_FROM_CLAIM`. Both engine-validated against the unchanged claims. |
| 18:56:40 | Creator approves `ALIGN_OPERATOR` | New version **v2** (`9796f3da…`), parent v1, `createdVia = repair`. **Claims hash unchanged.** Static verdict PASS. |
| 18:56:40 | Publish v2 before browser proof | **409 `GATE_BLOCKED`** (`BROWSER_UNVERIFIED`) |
| 18:56:40 → 19:45:42 | Full verification `01a1eade-…4fff` | **VERIFIED: 8/8 required probes PASS**, 260.41 credits (table below) |
| 2026-11-18 01:28:57 | Publish v2 after proof | **201**, slug `product-loop-scholarship-2026-11-17t18-5-542744` |
| 01:28:57 | Public respondent submission (GPA 3.5 with certificate) | **201**, receipt `JBSFXZFC` |

The driver stopped waiting at its former fixed 45-minute limit while the run was still progressing; P-07 waited for the Kane lock behind runs from another worktree. The run finished on its own. The last two steps were completed with `--resume`, which only reads the run from the server and continues. Nothing was redone.

### Full suite (real Kane CLI runs)

| Probe | Kind | Golden | Claims | Verdict | Kane session | Credits | Evidence pack SHA-256 |
|---|---|---|---|---|---|---|---|
| P-01 | initial state and empty submit | K-04 | C-01, C-02, C-GPA | PASS | `8fbce2f3-a1c1-44fb-91d8-36b938edf382` | 23.38 | `eb56fec86e76c97c709ba897a9f800068f687b754a96f53b7d9faf814559aeb5` |
| P-02 | boundary 3.49 / 3.50 / 3.51 | K-01, K-02, K-03 | C-GPA | PASS | `d5346906-806f-4319-abf2-752a5b4a667c` | 45.02 | `f018c1ebaee0040edbada3ff20de41bb6e4880ecb2143e1b23c9240e6e50f539` |
| P-03 | conditionally required field left empty | K-02 | C-GPA | PASS | `6c42296e-226b-4e9f-93a6-c3d3a17661bb` | 50.22 | `4db111336bde7e1466a99afb5ec7e91161e724eac236f4af896b4381b0ccbfa2` |
| P-04 | hidden answer is not submitted | K-05 | C-GPA | PASS | `5a3ec84b-db23-4f62-91df-a7e82494747f` | 45.39 | `3ad832b01190799fce2673da00c32dce793e85500cd4a88ee59a0553b4967947` |
| P-05 | valid answers produce a receipt | K-06 | C-01, C-02, C-04, C-GPA | PASS | `62114ad6-0baf-4349-99fd-95d7508f8290` | 34.98 | `c4b8304306d561de064032cf5b2c8db8a48cade3353d7bdd1a81a4d8b68c9d11` |
| P-06 | decimal comma input | K-02 | C-GPA | PASS | `fd484a4b-314d-4f40-b458-ae6a37166853` | 24.83 | `adc6a4a2051ea842af4b7b9b5e48757bf74453fad28c2b74f443548fe23c9bc3` |
| P-07 | out-of-range value rejected | — | C-04 | PASS | `551c74fd-8779-4e2b-91be-514251a064f0` | 36.59 | `44dffee604d73a599e6b37a536bd34befa4cbda10579cdc94b16d38b114d030d` |
| P-08 | server contract S0–S4 (no browser) | K-04, K-05, K-06 | C-01, C-02, C-04, C-GPA | PASS | — | — | — |

Evidence packs stay private (they contain the local preview link and the synthetic session). The digests identify them.

## Earlier attempts (kept, not hidden)

| Attempt | Build / policy | Outcome | What happened | Follow-up |
|---|---|---|---|---|
| 0 | `71564be` (main checkout) · MPP-v3, port 3000 | aborted | At 22:22 WIB, a development server started in the same checkout on port 3000 and stopped the verification server mid-loop; the driver failed with `ECONNREFUSED`. | Verification moved to its own worktree, port, and database (`docs/integration/API_CONTRACT.md` §6) |
| 1 | `4ff20f5` · MPP-v3 | **UNVERIFIED** (7/8 PASS, 1 UNKNOWN), publish refused (409) | D-01 FAIL as expected (session `ad1c0fdf-…`). P-05 UNKNOWN: Kane looked for the conditional certificate field before entering the GPA that reveals it. | **DEV-LOOP-02**: probe objectives repaired in `4359d55`, policy `MPP-v4`. Record: [`prod-loop-01-attempt-1.json`](prod-loop-01-attempt-1.json) |
| 2 | `f155474` · MPP-v4 | **interrupted**, run canceled | D-01 FAIL as expected (session `4c3a2799-…`); P-01, P-02, P-08 PASS. P-03 UNKNOWN: Kane ended with "No start URL provided" before executing a single step (0 credits). Then all local processes stopped. | Verdict: a run with zero steps is now `RUN_NOT_STARTED` and retried once (`0e0a977`). Worker: Kane starts on the preview origin (`b67d140`). Record: [`prod-loop-01-attempt-2-interrupted.json`](prod-loop-01-attempt-2-interrupted.json) |
| 3 | `71839e9` · MPP-v4 | **VERIFIED**, published, respondent receipt issued | see above | — |

In attempt 1, the gate refused publication of a run with one UNKNOWN probe. An UNKNOWN never became a PASS.

## What this proves, and what it does not

- Proven for this exact version (form, claims hash, definition hash, renderer build, environment `local-verify-3200`, probe policy `MPP-v4`): the approved scholarship intent holds in a real browser at the GPA boundary, for conditional requiredness, hidden-answer exclusion, decimal-comma input, the GPA range, and a valid submission with receipt. The server contract holds without a browser.
- Not claimed: correctness for other forms, other environments, or viewports narrower than 800 px. A new build, policy, or definition makes this proof stale by design.
