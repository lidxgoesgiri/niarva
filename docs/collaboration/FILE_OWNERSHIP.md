# File ownership

Writer: Claude. Codex requests changes in `CODEX_HANDOFF.md`.

**Owner** means the only agent that changes the file. **Shared** means both may change it under the stated rule.

## Claude Code

| Path | Notes |
|---|---|
| `packages/core/**`, `packages/contracts/**` | engine, verdicts, hashes, trace, error contract |
| `apps/web/src/server/**` | services, database schema and migrations, auth, AI, security |
| `apps/web/src/app/api/**` | HTTP API (see `docs/integration/API_CONTRACT.md`) |
| `apps/web/src/app/app/**`, `apps/web/src/app/preview/**`, `apps/web/src/app/f/**` | page loaders and access rules (Codex may restyle markup; see shared rules) |
| `apps/worker/**` | verification worker |
| `apps/web/tests/**` | native integration tests |
| `scripts/**`, `m0-lab/**` | runners, seeding, Kane tooling |
| `.testmuai/tests/**` | Kane Assurance tests and Kane's recorded step plans (never edit a test to make it pass) |
| `evidence/m0/**`, `evidence/dev-loop/**`, `evidence/product-loop/**` | Kane evidence of the core track |
| `docs/integration/**` | API contract, shared components, test hooks, environments |
| `docs/collaboration/**` except `CODEX_HANDOFF.md` | coordination |
| `.github/**`, `.gitignore`, `.env.example`, root configs, `pnpm-lock.yaml` | CI and dependencies (Codex asks before adding a dependency) |
| `README.md` | Claude writes; Codex proposes text in its handoff |

## Codex

| Path | Notes |
|---|---|
| `apps/web/src/app/page.tsx`, `apps/web/src/app/demo/**` | landing and judge demo guide |
| `apps/web/src/features/landing/**` | landing components and styles |
| `apps/web/src/styles/**` | global styles and motion tokens |
| `apps/web/src/components/ui/**` | primitive UI components |
| `evidence/product-experience/**` | Kane evidence of the UI track |
| `docs/collaboration/CODEX_HANDOFF.md` | Codex's channel |

## Shared under rules

| Path | Rule |
|---|---|
| `apps/web/src/features/workspace/**` | Claude owns behavior, data flow, and API calls. Codex may change markup, layout, and styling. Keep every hook and visible text listed in `docs/integration/API_CONTRACT.md` §4. Announce the files in `CODEX_HANDOFF.md` before editing. |
| `apps/web/src/features/form-renderer/**` | Same as the workspace. The renderer's rule evaluation, hidden-value removal, and submission payload must not change. |
| `apps/web/src/components/composites/**` | Codex may restyle. Props and the status meanings of `StatusBadge` stay the same; `STATIC_PASS` must never look like browser proof. |
| `apps/web/src/app/layout.tsx` | Codex for presentation, Claude for providers and metadata; announce changes. |

## Not to be committed by anyone

`private/`, `AGENTS.md`, `CLAUDE.md` (in any folder), `.env*` except `.env.example`, `.testmuai/variables/`, `evidence/private/`, Kane evidence packs, browser profiles, `.pglite` directories.
