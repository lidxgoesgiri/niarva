# FRESH-CLONE-02: the README steps from an anonymous clone of the final commit

> Executed on 24 November 2026 on Windows 11 with Node.js 24.11.1 and pnpm 12.11.2, after the repository was made public again. Native checks only (no browser); synthetic data. Repeats [FRESH-CLONE-01](FRESH-CLONE-01.md) on the final commit.

| Step | Command | Result |
|---|---|---|
| Clone without credentials | `git -c credential.helper= clone --depth 1 https://github.com/lidxgoesgiri/niarva.git`, with `GIT_TERMINAL_PROMPT=0` | OK (repository is public), `main` at `5ec9923` |
| Install | `pnpm install --frozen-lockfile` | OK, 1 min 4 s |
| Environment | `pnpm setup:env` | OK, `.env.local` with generated `BETTER_AUTH_SECRET`, `PREVIEW_TOKEN_SECRET`, `IP_HASH_SECRET`, and `WORKER_SHARED_TOKEN`; no AI key set |
| Build | `pnpm build` | OK |
| Start | `pnpm start` | Listening on `http://localhost:3000`, embedded PGlite database |
| Health | `GET /api/v1/health` | 200 |
| Pages | `GET /`, `/demo`, `/sign-in`, `/sign-up` | 200 each |
| Workspace while signed out | `GET /app` | 307, redirect to sign-in |
| Creator flow over HTTP | sign up a synthetic account → create the scholarship template form → approve its 4 claims → generate the labeled seeded version | 200, 201, 200, 201; static verdict **FAILED** with 2 counterexamples |
| Publish gate | `POST /api/v1/forms/{id}/publish` for that version, before any browser proof | **409 `GATE_BLOCKED`** |

The first publish request in this check returned 422 `VALIDATION_FAILED`, because it omitted the required `versionId`. The request was corrected and sent again; the result in the table is the corrected request.

Public access, checked anonymously the same day:
- the repository page;
- the evidence links pinned to `d28dee5`, `8136ce3`, and `7dccd35`;
- the three commit links in the product-experience records;
- the README images through `raw.githubusercontent.com`.

All of them answered 200.

Not covered here: the verification worker (it needs an authenticated Kane CLI and spends credits), OpenRouter AI intake (it needs a key), an external PostgreSQL (`DATABASE_URL`), and anything in a browser. Browser behavior on the final build is recorded in [`../deploy/FINAL-SMOKE-01.md`](../deploy/FINAL-SMOKE-01.md).

The server was stopped and the clone, including its generated `.env.local`, was deleted after the check.
