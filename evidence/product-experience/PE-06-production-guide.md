# Judge demo production evidence

PE-06 **PASS** for UI-AC-17 on the isolated local build `0DTv3jCHkELWhuJxRuEuD`. The tested `/demo` route fingerprint matches source commit [`740ab66`](https://github.com/lidxgoesgiri/niarva/commit/740ab6697dcffcd8c981423a5c10e7a8bf13337f). This test covers guide navigation. The linked production record establishes verification for its own form version, environment, and probe policy.

| Observation | Captured result |
| --- | --- |
| Landing → judge demo | **Explore Judge Demo** opens `/demo`. The heading reads **Trace one rule from intent to proof.** |
| Seeded Golden Case | `/#golden-case` |
| Recorded local evidence | The guide describes one approved scholarship version verified in the local environment. [Pinned local evidence](https://github.com/lidxgoesgiri/niarva/blob/d28dee5/evidence/product-loop/PROD-LOOP-01.md). |
| Supplemental production observation | Kane read the actual anchor `href` and the visible text that one approved scholarship version passed all eight required probes under MPP-v4. [Pinned production evidence](https://github.com/lidxgoesgiri/niarva/blob/8136ce3/evidence/deploy/VERCEL-PROD-01.md). |
| Supplemental worker observation | Kane read the guide's statement that live browser verification runs while the maintainer's worker is online. New runs stay queued while it is offline. |
| Workspace | **Go to the workspace** links to `/app`. Anonymous navigation reaches `/sign-in?next=%2Fapp`, with email, password, and **Sign in** visible. |

The approved objective and oracle match the [previous PE-06 record](./PE-06-judge-guide.json). Its objective SHA-256 is `a1f668d68c38f582186c5aefbf55c37545f802148e6554038745beed3b1dd542`. The new production and worker readings are supplemental. The sealed pack recorded zero console errors, 67 HTTP 200 responses, and one expected HTTP 307. Neither external evidence document was opened in the browser run.

Kane CLI 0.10.4 completed 12 recorded steps in 106.7 seconds and consumed 32.474066 credits. Execution archive `1e4f5ed3-8030-47cf-b521-0a6755ecf209`, sealed SHA-256 `945de725b070168104df4eb78e5f5a86ed6fa4bb7560042ef8c8f460f948ad45`. Execution started 18 November 2026 at 09:41 UTC. The original pack remains private. [Official Test Manager case](https://test-manager.lambdatest.com/projects/01M7N0CKZ90R3JR906713EHYW0/test-cases/01M7Q0GPJG74D28QBRWRWRDHZ8/dashboard) · [Guide capture](./judge-production-guide.jpg).

Native preflight passed lint, typecheck, 97 tests, and production build. The runtime code diff is scoped to the judge guide. [Source diff](https://github.com/lidxgoesgiri/niarva/commit/740ab6697dcffcd8c981423a5c10e7a8bf13337f).
