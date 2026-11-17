# Integration log

Writer: Claude. Newest entry first.

| When (WIB) | Action | Result |
|---|---|---|
| 2026-11-17 22:40 | Overlap check: PR #6 and the local branch `feature/interactive-landing` both implement the landing page | `feature/interactive-landing` is retired as an active line. UI belongs to Codex; the branch is kept locally as reference and not merged. |
| 2026-11-17 22:28 | Core verification moved to its own worktree, port 3200, with its own PGlite database and environment id `local-verify-3200` | No shared server or database with the UI track |
| 2026-11-17 22:27 | `feature/creator-workflow` (`ecb199d`) merged into `feature/verification-worker` → `4ff20f5` | Clean |
| 2026-11-17 22:22 | A `pnpm dev` start on port 3000 (main checkout) stopped the core verification server during PROD-LOOP-01. The driver failed with `ECONNREFUSED`. | The loop was restarted from scratch on port 3200; the aborted attempt is recorded in `evidence/product-loop/` |
| 2026-11-17 22:19 | PR #5 opened (22:19:06); Codex opened PR #6 `feature/product-experience` → `feature/creator-workflow` (22:19:37) | #6 under review by Claude |
| 2026-11-17 22:17 | `feature/creator-workflow` merged into `feature/verification-worker` (`e47627b`) | Clean; typecheck, lint, worker and core tests pass |
| 2026-11-17 22:16 | CI permission fix `2b9bd65` merged up the stack: `a124a61` (#2), `ab63bd6` (#3), `6d8224d` (#4) | The secret scan can list pull request commits again |

## Integration gate (before the owner merges to `main`)

- [ ] All P0 tasks done or honestly listed as limitations
- [ ] CI green on every pull request in the stack
- [ ] Merge conflicts resolved; Codex changes reviewed and Kane-verified
- [ ] Integrated Kane regression on the final integrated build
- [ ] Fresh clone: install, build, start, seed, verify
- [ ] Secret scan clean; no confidential files in the repository
- [ ] README claims audited against evidence
