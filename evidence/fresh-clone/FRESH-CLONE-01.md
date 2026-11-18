# FRESH-CLONE-01: the README quick start from a fresh public clone

> Executed on 18 November 2026, about 10:00 UTC, on Windows 11 with Node.js 24.11.1 and pnpm 12.11.2. Native checks only (no browser); synthetic data.

| Step | Command | Result |
|---|---|---|
| Clone without credentials | `git -c credential.helper= clone https://github.com/lidxgoesgiri/niarva.git` | OK (repository is public), `main` at `8136ce3` |
| Install | `pnpm install` | OK, 57 s |
| Environment | `pnpm setup:env` | OK, `.env.local` with generated secrets |
| Build | `pnpm build` | OK, 23 s |
| Start | `pnpm start` | Listening on `http://localhost:3000` |
| Health | `GET /api/v1/health` | 200: environment `local`, database `pglite`, engine `1.3.0`, policy `MPP-v4`, AI `unavailable` (no key, as documented) |
| Pages | `GET /`, `/sign-in`, `/demo` | 200 each |
| Creator flow over HTTP | sign up a synthetic account → create the scholarship template form → approve claims → generate the labeled seeded version | 200, 201, 200, 201; static verdict **FAILED** with counterexample `gpa = 3.50` |

Not covered here: the verification worker (needs an authenticated Kane CLI and spends credits), OpenRouter AI intake (needs a key), and an external PostgreSQL (`DATABASE_URL`). Browser behavior of the same build is covered by the Kane records in [`docs/testing/`](../../docs/testing).
