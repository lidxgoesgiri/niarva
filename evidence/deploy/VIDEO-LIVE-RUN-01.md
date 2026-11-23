# VIDEO-LIVE-RUN-01: the live Kane CLI run in the demo video

> Recorded on 22 November 2026 on https://niarva.vercel.app (the deployment of `832e690`), in the workspace of the synthetic judge account `judge@niarva.test`, with synthetic data only. It is the browser confirmation shown at 0:59–1:26 in the [demo video](https://youtu.be/1HWLSNiFpPk). Times are UTC.

## 1. What ran

| Item | Value |
|---|---|
| Form | `01a203f7-3da6-7e1a-86d7-b70974f397f1`, created from the scholarship template |
| Version | v1, the labeled seeded demonstration version (`gpa > 3.5` instead of the approved `gpa ≥ 3.5`), page definition `a8ebe142` |
| Run | diagnostic `01a203fb-2522-7468-b98c-8f095f5ac0b7`, requested 15:58:40 |
| Proof identity | renderer `r1-6b8a9a7ac0dd0397`, environment `vercel-production`, probe policy `MPP-v4` |
| Worker | `local-worker-vercel` on the maintainer's machine, Kane CLI 0.10.4, owner filter set to the judge account (`NIARVA_WORKER_OWNER_EMAILS`, PR #34) |

## 2. Attempts

| Attempt | Probe run | Leased → judged | Kane session | Outcome |
|---|---|---|---|---|
| 1 | `01a203fb-2528-7a77-94fd-597cecf50598` | 15:58:43 → 15:58:55 | `05dfcafa-ac39-4a41-8a1a-53f00510ec00` | UNKNOWN `AUTH_OR_CREDITS`. Kane exited with code 2 before any step (sign-in), used no credits, and wrote no evidence pack. The probe was retried automatically. |
| 2 | `01a203fb-5cae-7625-98ef-935845c30146` | 15:59:08 → 16:01:26 | `22c140c0-4ef8-443f-98e6-d9fc8e0c547e`, Test Manager test case `01M81ZQJPD82H97S5T2DQ2HFZC` | **FAIL `OBSERVATION_MISMATCH`.** Kane reported `passed`. Its observations at GPA 3.50: certificate visible, expected `true`, observed `false`; certificate required, expected `true`, observed `false`. NIARVA judged FAIL from the observations (`agentVerdictMismatch: true`). 25.62 credits. |

Evidence pack of attempt 2: `b88ba3fb-6450-4486-8df4-89fbf4ee49d1.evidence`, 218,300 bytes, SHA-256 `2d8ed826319c0298c2b954748d349c4c6bfe03c12f9b352ac19f0682c2f9190f`. The digest is the one NIARVA stored for the probe; it matches the file on the worker machine. The pack stays private because it can contain the token-scoped preview URL.

## 3. After the run

- The creator approved the engine's recommended repair, which rebuilds the rule from the approved claim. Version v2 has `gpa ≥ 3.5` and passes the static checks. v2 was **not** verified in a browser: a full verification costs about 250 Kane credits and was not run. The full verification shown later in the video is the recorded run of 18 November ([`VERCEL-PROD-01.md`](VERCEL-PROD-01.md)).
- One synthetic response (name "Alex Morgan", GPA 3.4, so the certificate is hidden) was submitted to the published showcase form. Receipt `QJCA7BDQ`.

## 4. How the video was made

- The UI footage was captured on the live site by a scripted screen recorder, for recording only. It does not test or verify anything. Every verdict in the video comes from NIARVA's Kane CLI runs: this one, and the full verification of 18 November.
- The wait for the run, 2 min 37 s on screen and covering both attempts, is shown 40× faster and labeled as such.
- Narration is a synthetic voice (Windows text-to-speech). Music and sound effects were generated for the video.
