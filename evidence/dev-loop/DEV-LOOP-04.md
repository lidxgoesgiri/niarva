# DEV-LOOP-04: a failed responses request looked like "No responses yet" → source repair → the same test passes

> Found by the Assurance test t-51 ("Owner sees an error when response retrieval fails") with Kane CLI against a local production build. The defect was not planted, and no test was edited. Every check below ran on 18 November 2026; times are UTC. Synthetic data only.

## 1. Environment

| Item | Value |
|---|---|
| Server | `next start --port 3500`, embedded PGlite, environment id `local-c10-3500`, branch `fix/owner-responses-view` |
| Fixtures | `pnpm seed:kane` against the server: synthetic `*@niarva.test` accounts and forms. `response_error_form_name` = "Kane Verified Scholarship B", `response_delayed_form_name` = "Kane Unverified Scholarship B", and one form without responses for the empty owner |
| Configured failure | `NIARVA_TEST_RESPONSE_FAULTS=error:<Kane Verified Scholarship B>,delay:<Kane Unverified Scholarship B>` (commit `930f005`). Direct check before the run: the owner gets `500 INTERNAL` for the error form, a non-owner still gets `404 NOT_FOUND`, and other forms answer `200` |
| Kane CLI | 0.10.4, headless Chrome, `node scripts/verify-kane.mjs` (machine-wide lock, official Test Manager project `01M7N0CKZ90R3JR906713EHYW0`) |

The fault hook is test support, not product behavior: it is configured per form, checked after ownership, and inert on the production environment (`apps/web/tests/integration/response-faults.test.ts`, 4 tests).

## 2. What happened (real)

| Item | Value |
|---|---|
| Test | t-51 `owner-sees-an-error-when-response-retrieval-fails_test.md` (SHA-256 `498c1597…298b`), unchanged in both runs |
| Source under test | `930f005` (clean tree) |
| Run | 2026-11-18 12:45:33, 37.58 credits, execution `2da2732a-754a-4c73-bba4-b953b1a35274`, evidence pack `3cbfacb470347a87ede101a4f867c4f1e39aa3294bc0c5f74f4d099637c5c25b` (private) |
| Outcome | **FAIL** at step 2, reason `assertion_error.confirmed_product_bug`: "When response loading fails, the responses view shows 'No responses yet' instead of telling the owner that responses could not be loaded." Kane recorded the `500` body it received |

## 3. Diagnosis

`apps/web/src/features/workspace/workspace.tsx` caught every failure of `GET /api/v1/forms/{id}/responses` and replaced it with `{ total: 0, rows: [] }`, so the view rendered its empty state. A system failure was presented as a form nobody had answered. That contradicts ac-113 (an error state, "rather than a populated or empty result") and NIARVA's rule that an unknown result is never shown as a definite one.

The same review found a second gap in the view: the API already returns 25 responses per page, but the view requested only the first page and had no control to reach a later one (ac-112, test t-50).

Classification: source defect in NIARVA (owner responses view).

## 4. Repair

| Commit | Change |
|---|---|
| `5fa1af1` `fix(responses): show a retrievable error and page through the owner's responses` | The view tracks loading, error, and ready for each request (form, page, attempt, response count). A failed request shows "Responses could not be loaded." with the server's message and a **Try again** action, and never an empty list. The view shows the range and **Previous page** / **Next page** controls when there is more than one page. |

The renderer identity is unchanged (the workspace is outside it), so existing browser proofs stay fresh. Native: lint, typecheck, build pass; 107 tests pass (core 59, worker 5, web 43).

## 5. Same test again

The server was rebuilt from `5fa1af1` and restarted with the same configured failure.

| Test | Run (UTC) | Outcome | Credits | Execution | Steps |
|---|---|---|---|---|---|
| t-51 | 13:16:48 | **PASS**: "The page showed that responses could not be loaded while the configured retrieval failure was active. No raw sensitive verification information was shown, and the form's responses were not exposed to non-owners." | 19.96 | `5ece3e24-a9d2-4968-a71c-6739c31b261d`, pack `13202df1…7d27` | step 1 replayed, step 2 authored again |
| t-53 loading state (regression) | 13:20:49 | PASS | 0 | `a0cf05f5-10e7-4ebe-a66e-442386832d2e` | both steps replayed from the 12:55 recording |
| t-52 empty state (regression) | 13:25:36 | PASS | 0 | `9abfcf5f-7090-48b3-be0d-66492fad52d8` | both steps replayed from the 13:07 recording |

Before the fix, t-53 (12:55:18, 31.89 credits, execution `2d30bbeb-4743-475d-99d7-db01a8e3109e`) and t-52 (13:07:04, 35.78 credits, execution `2d44d37c-9deb-40f6-8960-4d4e5fe2639c`) already passed with Kane authoring every step. The regressions above replayed those recordings against the fixed build.

Test Manager cases: t-51 `01M7QB1XX2A50GNSNQDGZ8CNSJ`, t-53 `01M7QBKS5F64FERNTW649NN2D9`, t-52 `01M7QC9A78DQBR1PGATYCCS8R4`.

## 6. Not covered here

- Paging in a browser (t-50) needs a published form with more than 25 responses; it is run on the deployment and recorded separately.
- The fault hook is not active on the deployment, so t-51 and t-53 are proven on local builds only.
