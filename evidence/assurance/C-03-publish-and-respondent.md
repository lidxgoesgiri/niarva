# C-03: publish and respondent flows (Kane CLI Assurance tests)

> Assurance-designed `_test.md` tests run unchanged with `node scripts/verify-kane.mjs` (Kane CLI 0.10.4, `kane-cli testmd run --agent --headless`), one at a time under the machine-wide Kane lock.
> PASS needs exactly one `test_md_done` with `overall_status = passed` and exit code 0. Every run is listed. No test file was edited.

## Target

| Item | Value |
|---|---|
| Server | Production build of `71839e9` on `http://localhost:3200`, own PGlite database, environment `local-verify-3200` |
| Code under test | `apps/web` and `packages` are identical from `71839e9` through `4c98e5b`. The worktree commit recorded in each run summary moved during the batch only because documentation, scripts, and worker files were merged; the server was not rebuilt. |
| Published form | The form published by PROD-LOOP-01 attempt 3 after its VERIFIED run: `/f/product-loop-scholarship-2026-11-17t18-5-542744` |
| Other fixtures | `Kane Verified Scholarship B` (claim-derived version, never verified), `Kane Unverified Scholarship B`, synthetic accounts `*@niarva.test` |

## Runs (2026-11-18, UTC)

| Test | File | SHA-256 | Started | Outcome | Credits | Kane decisions | Evidence pack SHA-256 |
|---|---|---|---|---|---|---|---|
| t-4 | `published-public-form-remains-accessible-without-respondent` | `d2ede351…611d` | 01:31:56 | **PASS** | 25.69 | 2 authored | `ee42d1340495cd93462eefdcebe2eef71f5c6df8038e2119de992bebf444e67d` |
| t-7 | `hidden-certificate-stays-out-of-raw-request-and-stored` | `35ef38c4…4984` | 01:34:39 | FAIL | 62.64 | 5 authored | `71e7790f12567d2030759606245980afa11d151668eb94804051ffb437e7d578` |
| t-8 | `identical-public-submission-retry-returns-its-first-receipt` | `7f89fa77…4820` | 01:41:00 | FAIL | 38.57 | 4 authored | `b674603845a25b8c11d3a1c448c66f49f6566abed45f8d3aacb840004364ba59` |
| t-10 | `missing-required-answers-are-rejected-at-the-gpa-3-5` | `8f0014e9…7afb` | 01:47:55 | FAIL | 55.11 | 3 authored | `5644c13e076978cba320f89011afbc227147d25a0e6e0fd9ead52ff6091cf3af` |
| t-11 | `valid-gpa-3-5-response-has-receipt-and-stored-sanitized` | `52bed2df…7556` | 01:56:26 | **PASS** | 73.49 | 4 authored | `acc0326e31c09a9910bc0c48a89f1a17da89d5789ad7fd9bf21db86432da7b78` |
| t-18 | `gpa-3-4-preview-hides-the-nonrequired-certificate` | `2f9fdc80…e0e` | 02:01:11 | **PASS** | 34.25 | 2 authored | `cc3b43f83457722f20bd42636bc65632c4cfa790d5f5b7ab3a719a3b21e55cf8` |
| t-20 | `direct-publish-before-proof-is-rejected-by-backend` | `72713cb8…339b` | 02:04:03 | FAIL | 42.67 | 4 authored | `9a39d6eaa7251db9528412acc80e3e41158da0b2d7b33f83d41c78f4c632480a` |

## What Kane confirmed (PASS)

- **t-4:** a signed-out visitor reaches the published form and its enabled submit control, with no respondent login.
- **t-11:**
  - At GPA 3.5 the certificate field is shown (inclusive boundary).
  - A complete submission returns a receipt.
  - The owner's Responses view shows the stored answers: name "Synthetic Applicant", GPA "3.5", certificate "CERT-TEST-0042".
- **t-18:** in the immutable preview at GPA 3.4, the certificate field is neither shown nor required (K-01).

## Failures and their classification

| Test | Failing step | Kane's account | Classification | Product evidence for the same behavior |
|---|---|---|---|---|
| t-7 | 4: inspect the raw public-submit request | "tried to examine the raw submission request only after the form had already moved to its receipt page … request snapshots then timed out" | **Inconclusive: Kane did not capture the request.** Steps 1–3 passed, including the certificate field being hidden after GPA 3.6 → 3.4. | PROD-LOOP-01 P-04 `hidden_exclusion` PASS (server evidence: no hidden value stored); server contract P-08 PASS |
| t-8 | 2: capture the submit request body | "The submit request had already completed before the automation tried to collect its body" | **Inconclusive: Kane did not capture the request.** | Idempotency integration tests (`apps/web/tests/integration/golden-flow.test.ts`) |
| t-10 | 3: server-side rejection of missing answers | "The form correctly required the missing answers in the browser … no server request was made" | **Inconclusive: Kane never sent the request the test needs.** The browser behavior Kane observed is correct. | P-08 server contract checks S1–S4 PASS; P-01 initial required PASS |
| t-20 | 3: invoke publish directly through the API | "used '/publish' as the direct API endpoint, but that value is not a complete usable URL" | **Inconclusive: the endpoint is not discoverable from the UI.** The Publish button is disabled while the gate is closed, so no request reveals the path, and the test has no API URL variable. | PROD-LOOP-01: direct `POST …/publish` before proof → `409 GATE_BLOCKED` (`BROWSER_UNVERIFIED`); publish-gate integration tests |

The renderer submits with an ordinary `fetch` POST and renders the receipt on the same page; nothing in the product prevents request capture. These outcomes stay FAIL in every count: an inconclusive run is never a pass. Kane suggested editing the tests; that was declined. The tests are the oracle and were designed and approved through Assurance.

## Not run yet

t-9 and t-12 need a second published form and a republished, newly verified version (two more full verifications). t-19, t-22, and t-31 need a verified, unpublished owned form (one more full verification each, or a dedicated fixture).
