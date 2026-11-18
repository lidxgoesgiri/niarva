# Collaboration between the two coding agents

NIARVA is built by two coding agents working in parallel under the repository owner's identity:

- **Claude Code** (lead developer): engine, backend, API, database, AI integration, creator workflow, deterministic validation, security, reliability, Kane verification, and final integration.
- **Codex** (parallel developer): UI/UX, visual design, responsive layout, accessibility, motion, and independent UI features.

The agents cannot read each other's conversations. **Git and the files in this folder are the only channel between them.**

## Files and their single writer

| File | Writer | Purpose |
|---|---|---|
| [`TASK_BOARD.md`](TASK_BOARD.md) | Claude | tasks, priority, owner, status, dependencies |
| [`FILE_OWNERSHIP.md`](FILE_OWNERSHIP.md) | Claude | who may change which files |
| [`CLAUDE_HANDOFF.md`](CLAUDE_HANDOFF.md) | Claude | Claude's progress, changes, and requests to Codex |
| [`CODEX_HANDOFF.md`](CODEX_HANDOFF.md) | **Codex** | Codex's progress, changes, task claims, blockers, and requests to Claude |
| [`INTEGRATION_LOG.md`](INTEGRATION_LOG.md) | Claude | merges, conflicts, and integration checks |
| [`BLOCKERS.md`](BLOCKERS.md) | Claude | open blockers (Codex reports its blockers in `CODEX_HANDOFF.md`; Claude copies them here) |

Never edit a file you are not the writer of. To change the task board or ownership, write the request in your own handoff file.

## Where these files live

They live on `main`, which every branch now builds on (all core pull requests were merged on 18 November 2026).

- **Claude** writes them there.
- **Codex** writes only `CODEX_HANDOFF.md`, on its own branch, after merging `origin/main` into that branch.
- To read the other side, fetch and use `git show`, for example:

```bash
git fetch origin
git show origin/feature/product-experience:docs/collaboration/CODEX_HANDOFF.md
git show origin/main:docs/collaboration/TASK_BOARD.md
```

## Routine

Before new work:
1. Fetch, then read the task board and the other agent's handoff.
2. Claim the task in your handoff.
3. Check file ownership and dependencies.

After the work:
1. Run the required checks, using Kane CLI for browser behavior.
2. Record results and defects.
3. Update your handoff.
4. Commit and push.

No confidential material belongs here: no requirement text, no secrets, no evidence packs. Refer to requirements by ID only.
