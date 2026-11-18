# Deploying NIARVA on Vercel

The web app (Next.js, `apps/web`) runs on Vercel with a Postgres database. The verification worker, Kane CLI, and Chrome **do not** run on Vercel: serverless functions cannot host a browser. The worker runs on a machine with Kane CLI and pulls work from the deployment over HTTPS.

```text
Vercel: apps/web (Next.js) ── Postgres (Neon, pooled)
   ▲ HTTPS: lease / heartbeat / result, with the shared worker token
Worker machine: apps/worker + Kane CLI 0.10.4 + Chrome
```

## 1. Project

1. In Vercel, import the GitHub repository `lidxgoesgiri/niarva`.
2. **Root Directory:** `apps/web`. Vercel installs the whole pnpm workspace from the repository root.
3. **Framework:** Next.js. `apps/web/vercel.json` sets the build command to `pnpm run vercel-build`, which applies the database migrations and then runs `next build`. A build without a database fails instead of deploying a broken app.
4. **Production branch:** `main`.
5. **Node.js:** 24.x (from `apps/web/package.json`).

## 2. Database

1. In the project, open **Storage** and add **Neon Postgres** from the Marketplace, then connect it to the project. From the CLI (in a folder linked with `vercel link`):

   ```bash
   vercel integration add neon --name niarva-db --plan free_v3 -m region=iad1 -m auth=false -e production --no-env-pull
   ```

   Pick the region of the project's functions (`iad1` by default). Connect it to **Production only**: the build runs migrations, so a preview build connected to the same database would migrate production data from a feature branch.
2. Make sure `DATABASE_URL` is the **pooled** connection string (its host contains `-pooler`). Serverless instances open their own connections, and `DATABASE_POOL_MAX=3` keeps each one small.
3. On Vercel the app refuses to start without `DATABASE_URL`, because an embedded database on a temporary disk would lose data.

## 3. Environment variables

On the machine that holds the repository, run:

```bash
pnpm prepare:deploy --url https://<project>.vercel.app
```

It writes two git-ignored files and prints only variable names:

| File | Use |
|---|---|
| `.env.vercel.local` | Import into Vercel: **Settings → Environment Variables → Import .env** (Production). It contains fresh secrets (`BETTER_AUTH_SECRET`, `PREVIEW_TOKEN_SECRET`, `IP_HASH_SECRET`, `WORKER_SHARED_TOKEN`), the base URL, the environment id `vercel-production`, `DATABASE_POOL_MAX=3`, the model list, and `ENABLE_EXPERIMENTAL_COREPACK=1`. Corepack makes the build use the exact pnpm version pinned in `package.json`. |
| `.env.worker-vercel.local` | The local worker's API URL and the same worker token. |

Add **`OPENROUTER_API_KEY` yourself** in Vercel; the script never reads or writes it. Without it, AI intake reports that the provider is unavailable, and the template and manual intake still work.

To rotate every secret later, run the script again with `--force` and re-import the file.

**Kane credit budget.** Sign-up is open on a public deployment, and every browser probe spends Kane credits from the operator's account. The backend therefore refuses a new verification run with `429 RATE_LIMITED`, queuing nothing, when its Kane probes would exceed the rolling 24-hour budget. `KANE_PROBE_BUDGET_PER_WORKSPACE_24H` (default 24, about three complete golden loops) caps one workspace, and `KANE_PROBE_BUDGET_GLOBAL_24H` (default 48) caps the whole deployment. Cached and already-queued runs are never refused. Set either value to `0` to stop new browser verification. A changed value takes effect with the next deployment.

## 4. Deploy and smoke check

Merging to `main` deploys to production. A deployment of the current `main` can also be requested from the CLI without uploading local files, using the connected GitHub repository (`gitSource` in `POST /v13/deployments`, sent with `vercel api`). Then check:

```bash
curl -s https://<project>.vercel.app/api/v1/health
```

The health endpoint should answer with HTTP 200. Then sign up a synthetic account, create a form from the scholarship template, approve its claims, and generate a version.

## 5. Verification worker and Kane CLI

On the worker machine (with Kane CLI signed in to the official Test Manager project):

```bash
pnpm worker:vercel
```

Browser proof is bound to the environment: proofs made on a local server do not carry over to `vercel-production`. To verify the deployment:

1. Point Kane at it: set `start_url` in `.testmuai/variables/assurance.json` to the deployment URL.
2. Seed the fixtures: `pnpm seed:kane https://<project>.vercel.app`.
3. Run the product loop: `node scripts/run-product-loop.mjs https://<project>.vercel.app`. A full verification costs roughly 250 Kane credits.
4. Run the Assurance regression: `pnpm verify:kane <test ids>`.

## 6. Judge access

Give judges a synthetic demo account through the official private channel, never the owner's credentials. Evidence packs and raw Kane streams stay on the worker machine; the app shows digests, Kane session ids, and sanitized observations.

Scoped judge access:

1. Create the account: `pnpm seed:judge https://<your-domain> --showcase <form id>[,<form id>]`. It creates `judge@niarva.test` with a generated password, stores the password only in the gitignored `.testmuai/variables/assurance.json` (`scoped_judge_password`), and prints the three settings below.
2. In Vercel → Settings → Environment Variables (Production), set `DEMO_MODE=true`, `DEMO_JUDGE_EMAILS=judge@niarva.test`, and `DEMO_SHOWCASE_FORM_IDS` to the showcase form ids, for example the form of the recorded production loop. Redeploy.
3. Signed in, the judge sees **Demo examples (read-only)** above their own forms. A showcase form opens with every claim, version, run, observation, and the gate, marked **Demo example · read-only**. Every change is refused by the backend (`404`, as for any foreign form), and response answers stay visible to the owner only. The judge's own workspace works like any creator's, within the Kane credit budget.
4. Hand the email and password to judges in the submission form only.

## 7. Limits

- With the database connected to Production only, preview deployments have no `DATABASE_URL`, so their build stops at the migration step. Connect a separate database (or a Neon branch) to the Preview environment to get working previews; never the production one.
- A verification only progresses while the worker machine is running.
- Desktop Kane CLI verifies viewports of 800 px and wider; narrower layouts are reviewed manually.
