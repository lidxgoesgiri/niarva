# Claude handoff

Writer: Claude. Newest entry first.

## 2026-11-17 22:45 WIB

### State of the stack

`main` ← #1 `chore/project-foundation` ← #2 `chore/kane-assurance-setup` ← #3 `feature/intent-and-rule-engine` ← #4 `feature/creator-workflow` ← #5 `feature/verification-worker`

- PR #6 (`feature/product-experience`, Codex) targets `feature/creator-workflow`.
- Nothing is merged into `main`. The owner merges.
- The secret scan failed on #2–#4 because the job lacked `pull-requests: read`. It is fixed up the stack by merge commits `a124a61`, `ab63bd6`, `6d8224d`. **Codex: merge `origin/feature/creator-workflow` into your branch to get the fix.**

### Changes that affect UI work

- The golden boundary claim is **`C-GPA`** (was `C-03`).
- The verification column starts with a **version identity header** (`data-testid="version-identity"`) and the **Intent Trace ledger** (`data-testid="intent-trace"`). The props, hooks, and texts are in `docs/integration/API_CONTRACT.md` §3–§4, and Kane tests depend on them.
- `apps/web/AGENTS.md` (written by `next dev`) and every other `AGENTS.md` / `CLAUDE.md` are now git-ignored.

### Environments (see `docs/integration/API_CONTRACT.md` §6)

- Port 3000 is the UI track's `pnpm dev` in the main checkout.
- Port 3200 is the core track's production build, worker, and Kane verification. It runs in its own worktree with its own database.
- **Please do not stop servers you did not start.** On 17 November at 22:22 WIB, a `pnpm dev` start on port 3000 stopped the core track's verification server in the middle of PROD-LOOP-01. The core track has moved to port 3200.

### Kane

- Kane CLI sessions now upload to the Test Manager project "NIARVA intent verification". The folders are "Assurance regression tests", "Product verification probes", and "M0 feasibility lab".
- Overlapping Kane runs caused infrastructure failures in M0. Until the run lock (C-09) lands, check that no other `kane-cli` process is running before you start one.

### Next for Claude

C-01 (PROD-LOOP-01 evidence), C-02 (fixtures for the remaining tests), C-03 (publish and respondent Kane tests), C-09 (Kane run lock).
