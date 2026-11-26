<div align="center">

# NIARVA

**From intention to proof.**

Conditional forms, proven against what their creator approved, in a real browser, before anyone fills them in.

[Live demo](https://niarva.vercel.app) &nbsp;·&nbsp; [Watch the demo](https://youtu.be/1HWLSNiFpPk) &nbsp;·&nbsp; [Reviewer guide](https://niarva.vercel.app/demo) &nbsp;·&nbsp; [Evidence](evidence)

</div>

<br>

<!--
  Hero preview: a frame from the demo video (docs/assets/demo-preview.jpg), linked to the video.
  To use another screenshot or a GIF, replace that file or change the src below.
-->
<a href="https://youtu.be/1HWLSNiFpPk">
  <img src="docs/assets/demo-preview.jpg" width="100%" alt="The verdict screen from the NIARVA demo: Kane CLI reported passed, its observations contradict the approved claim, and NIARVA judges the run FAIL. Opens the demo video.">
</a>

<p align="center"><sub>The three-minute demo, recorded on the live deployment. Click the image to watch it on YouTube.</sub></p>

<br>

## Overview

A form builder can call a rule tested while the rule is wrong. Write a scholarship condition as `gpa > 3.5` instead of `gpa ≥ 3.5` and the form still renders, still passes a schema check, and still lets an applicant with exactly 3.5 skip the certificate. NIARVA closes that gap. The creator approves plain-language claims first. Every generated version is checked against them, then exercised in real Chrome by Kane CLI through a private preview of that exact version. NIARVA reads Kane's observations rather than its summary, and only a version with complete, fresh proof can be published.

The interface is dark and editorial, set in Space Grotesk, Inter, and JetBrains Mono, and the landing page tells this story through scroll.

## Highlights

**Product**

- **Approved intent is the oracle.** Claims are typed, quoted from the source text, rendered as deterministic sentences, approved by the creator, and frozen with a SHA-256 hash.
- **A deterministic engine.** A declarative rule DSL with exact decimal arithmetic checks every input partition, including the values just below, at, and above each boundary, so `gt` versus `gte` surfaces with the witness `GPA = 3.50`.
- **Kane observes, NIARVA decides.** Probes are derived from the claims. Kane CLI records typed observations in a real browser and NIARVA computes the verdict: a mismatch is FAIL even when Kane reports `passed`, and timeouts or missing observations are UNKNOWN, never PASS.
- **Repair within intent.** Repairs are a small allowlist of DSL operations, validated by the engine against the unchanged claims and applied only with the creator's approval. Each one creates a new version that needs fresh proof.
- **Version-bound proof, fail-closed publishing.** Proof is keyed to the form version, claims, definition, renderer build, runtime configuration, environment, and probe policy. The backend enforces the publish gate inside a transaction, whatever the interface shows.
- **Respondent safety.** Hidden fields are removed and their answers never stored, the server validates every submission again, and an identical retry returns the original receipt.

**Architecture**

- **A worker outside serverless.** Chrome and Kane CLI cannot run inside a Vercel function, so `apps/worker` leases probes from the web app over HTTPS, runs them, and reports raw results. A machine-wide lock keeps one Kane run at a time, a rolling 24-hour budget caps the probes any workspace can queue, and an optional owner allowlist keeps the worker from spending credits on other accounts' runs.
- **A pure core.** `packages/core` holds the DSL, decimals, evaluation, analysis, repair, probe derivation, verdicts, and the publish gate, without I/O. It is covered by unit and property tests.

**Interface**

- **Scroll choreography without scroll-jacking.** `scroll-choreography.ts` reads the native scroll position once per animation frame and writes it to CSS custom properties. CSS Modules turn those values into the hero drift, the boundary sandbox, the pipeline beam, and the reading trace.
- **GSAP where it earns its place.** ScrollTrigger drives the word and card reveals and the scrubbed timelines. The reveal layer is loaded on demand with `next/dynamic`.
- **A hand-written WebGL hero.** A small shader scene, with no 3D library, in a low-power context that follows scroll and pointer and recovers from a lost context.
- **Motion that respects the visitor.** Animation follows `prefers-reduced-motion` and pauses while the tab is hidden.
- **Overflow-safe layouts.** Grids use `minmax(0, 1fr)` tracks and the app shells clip horizontal overflow, so long hashes and slugs never push a page sideways at any width. Kane's automated checks cover viewports of 800 px and wider; narrower layouts are reviewed by hand, as the [known limitations](docs/testing/KNOWN_LIMITATIONS.md#3-kane-cli-behavior-from-the-m0-lab) record.

## Tech stack

- **Next.js 16** (App Router) and **React 19**, in **TypeScript 5.9**
- **Tailwind CSS 4** for the application, **CSS Modules** for the landing's scroll scenes
- **GSAP** with `@gsap/react`, for ScrollTrigger reveals and scrubbed timelines
- **WebGL**, hand-written shaders for the hero
- **Radix UI** Tabs for the landing's evidence panels, **Lucide** for icons
- **Better Auth** for email and password accounts
- **Drizzle ORM** on **PostgreSQL** (Neon in production), or embedded **PGlite** for local runs
- **Zod** for validation, `@noble/hashes` for SHA-256 in the engine
- **Vitest** and **fast-check** for unit, integration, and property tests
- **Kane CLI 0.10.4**, the version validated in the M0 lab, for browser verification in the worker and during development; the worker refuses older versions
- **OpenRouter**, optional, for drafting claims from plain language on the server

## Project structure

```text
niarva/
├── apps/
│   ├── web/                Next.js app: landing, creator workspace, public forms, REST API
│   │   └── src/
│   │       ├── app/        routes: /, /app, /f/[slug], /preview/[versionId], /demo, /api/v1
│   │       ├── features/   landing, workspace, form-renderer, auth
│   │       ├── components/ UI primitives and composites
│   │       ├── server/     services, auth, database, AI extraction, security
│   │       └── styles/     design tokens
│   └── worker/             leases probes, runs Kane CLI and Chrome, reports raw results
├── packages/
│   ├── core/               the pure engine
│   └── contracts/          shared API contracts
├── .testmuai/tests/        the 64 browser tests designed by Kane Assurance
├── scripts/                environment setup, Kane runners, fixture seeding
├── docs/                   deployment guide, API contract, testing reports
├── evidence/               sanitized proof: Kane runs, closed loops, the live deployment
└── m0-lab/                 isolated fixture used to validate Kane CLI, not product code
```

## Getting started

**Prerequisites**

- Node.js 24 (`engines` allows `>=24 <25`)
- pnpm 12, pinned in `package.json` as `pnpm@12.11.2`
- For browser verification only: Google Chrome and Kane CLI 0.10.4 or newer, installed with `npm install -g @testmuai/kane-cli` and signed in with `kane-cli login`. The worker uses your own Kane account and credits; a full verification costs about 260 credits.

**Install and run**

```bash
pnpm install
pnpm setup:env    # creates .env.local with freshly generated secrets
pnpm dev          # http://localhost:3000
```

Create an account and start from the scholarship template. Without `DATABASE_URL`, NIARVA uses an embedded PostgreSQL (PGlite) in `apps/web/.pglite` and applies its migrations on start.

These steps were checked from an anonymous clone of the final commit ([FRESH-CLONE-02](evidence/fresh-clone/FRESH-CLONE-02.md)).

To verify forms in a real browser, run the worker in a second terminal:

```bash
pnpm worker
```

**Production build**

```bash
pnpm build
pnpm start
```

**Other scripts**

```bash
pnpm lint                  # ESLint
pnpm typecheck             # TypeScript in every workspace
pnpm test                  # all tests
pnpm test:unit             # engine, contracts, and worker
pnpm test:integration      # web app against PostgreSQL, embedded by default
pnpm db:migrate            # apply migrations to DATABASE_URL
pnpm format                # Prettier
pnpm verify:kane <t-id>    # run a Kane-designed browser test against the running app
```

`pnpm verify:kane` is the maintainer's development runner: it uploads to the project's own Test Manager project and refuses any other. To verify forms with your own Kane account, use `pnpm worker`.

**Environment**

`pnpm setup:env` writes `.env.local` from [`.env.example`](.env.example), which documents every variable. The ones you are most likely to change:

- `DATABASE_URL` stays empty for the embedded database, or points to your own PostgreSQL.
- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` enable AI drafting, with one model or a comma-separated fallback list. Without them, the template and manual paths are used.
- `NIARVA_WORKER_API_URL`, `NIARVA_WORKER_ID`, and `WORKER_SHARED_TOKEN` connect the worker to the web app.
- `KANE_PROBE_BUDGET_PER_WORKSPACE_24H` and `KANE_PROBE_BUDGET_GLOBAL_24H` cap Kane probes, since each one spends credits.

Never commit `.env.local`.

## Proof

Every verification claim here is backed by recorded evidence. Kane CLI has four roles in this project: it was [validated at runtime](evidence/m0/M0_REPORT.md) before anything depended on it, it [designed the browser tests](.testmuai/tests) from the requirements (Kane Assurance), it is the only browser test runner during development ([`scripts/verify-kane.mjs`](scripts/verify-kane.mjs)), and it is the browser sensor inside the product's worker ([`apps/worker/src/kane.ts`](apps/worker/src/kane.ts)).

**The golden case**

- [On the live deployment](evidence/deploy/VERCEL-PROD-01.md): the seeded defect confirmed at GPA 3.50, an approved repair, a full verification with 8 of 8 required probes passing (7 in a real browser, 1 server contract check), and publishing refused before proof and accepted after it.
- [On a local build](evidence/product-loop/PROD-LOOP-01.md): the same loop with a real worker, including the failed and interrupted attempts.
- [In the demo video](evidence/deploy/VIDEO-LIVE-RUN-01.md): a live run on the deployment on 22 November. Kane reported `passed`, its observations showed the certificate hidden and not required at GPA 3.50, and NIARVA judged FAIL.

**Development loops.** In each, a Kane test exposed a defect, the source was repaired, and the test ran again: [01](evidence/dev-loop/DEV-LOOP-01.md), [02](evidence/dev-loop/DEV-LOOP-02.md), [03](evidence/dev-loop/DEV-LOOP-03.md), [04](evidence/dev-loop/DEV-LOOP-04.md), [05](evidence/dev-loop/DEV-LOOP-05.md), [06](evidence/dev-loop/DEV-LOOP-06.md). All six ended with the same test passing. For DEV-LOOP-03 the passing rerun came later, on the live deployment, and is recorded in [PROD-ASSURANCE-01](evidence/assurance/PROD-ASSURANCE-01.md).

**The 64 designed tests.** By their latest recorded run: 25 PASS, 15 FAIL, and 24 NOT RUN ([status per test](docs/testing/KANE_EXECUTION_REPORT.md#5-latest-status-per-designed-test)). On the final build, t-5, t-6, and t-59 passed again on the deployment, with one t-59 rerun after a test-data fix ([FINAL-SMOKE-01](evidence/deploy/FINAL-SMOKE-01.md)).

- **15 FAIL.** The rule is strict: a run in which Kane cannot perform or observe a step counts as FAIL. Fourteen are inconclusive in that sense: for example, Kane could not see a request that had already completed, could not find an API endpoint the interface never reveals, would have had to wait for a verification while holding the Kane lock the worker needs, or stopped with its own checks pending. Where the same behavior is covered by integration tests or the server contract probe, the record says so. One, t-49, is disputed: Kane asked for a respondent's answer to be masked in the owner's own response view, which is outside the product scope. Every classification is in [PROD-ASSURANCE-01](evidence/assurance/PROD-ASSURANCE-01.md), [C-03](evidence/assurance/C-03-publish-and-respondent.md), and [C-04/C-05](evidence/assurance/C-04-C-05-security-and-honesty.md).
- **24 NOT RUN.** Eight need extra full verifications or a second published form, and each full verification costs about 250 Kane credits. Seven cover AI intake and provider outage and have not been run within the available credits. Five need authenticated API calls that Kane does not make, or fixtures not built yet. Two describe situations the design rules out, one would start a verification while holding the Kane lock, and one needs a renderer change after publication. The list is in [known limitations](docs/testing/KNOWN_LIMITATIONS.md#4-coverage-not-yet-proven).

## Deployment

The web app runs on Vercel from `apps/web`. Its `vercel.json` builds with `pnpm run vercel-build`, which applies the database migrations and then runs `next build`; production uses Neon Postgres. The worker, Kane CLI, and Chrome run on a separate machine with `pnpm worker:vercel`, which reads `.env.worker-vercel.local`. The full guide is in [`docs/deployment/VERCEL.md`](docs/deployment/VERCEL.md).

**For reviewers.** Live browser verification runs only while the maintainer's worker machine is online, and then only for the demo accounts the worker is allowed to serve, since every probe spends the maintainer's Kane credits. Otherwise the workspace shows "No worker online" or the run stays queued; nothing has failed. The [reviewer guide](https://niarva.vercel.app/demo) links the recorded runs, including the full verification on this deployment, so the complete loop can be reviewed at any time.

## Credits

Built for the KaneCLI Online Hackathon, 12–26 November 2026. NIARVA was written with AI coding agents, Claude Code for the engine, backend, and verification and OpenAI Codex for UI work, with Kane CLI as the only browser test runner. Every commit is made under the repository owner's identity; agent involvement is disclosed here rather than in commit trailers. The `gpa > 3.5` scholarship rule and the faults in the M0 lab are intentional, labeled demonstration defects.

Released under the [MIT License](LICENSE).
