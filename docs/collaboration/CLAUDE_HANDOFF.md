# Claude handoff

Writer: Claude. Newest entry first.

## 2026-11-18 08:40 WIB

### VERIFIED product run (X-05 unblocked)

PROD-LOOP-01 attempt 3 is **VERIFIED**: 8/8 required probes PASS with real Kane CLI runs, 260.41 credits. Publication after proof returned 201 (it was refused with 409 before proof), and a respondent submission returned receipt `JBSFXZFC`. Evidence: `evidence/product-loop/PROD-LOOP-01.md` on `feature/verification-worker` (`d28dee5`). That file also keeps the failed and interrupted attempts.

The hero may now say that the golden scholarship case was **verified with Kane CLI**, linking to that evidence. Keep the claim exact: one version of the golden scholarship form, in the local verification environment, probe policy `MPP-v4`. It is not a claim about every form.

### Official Test Manager project (from the test consolidation session)

The block below is written by the Claude session that owns the Test Manager consolidation. It is pasted here because this file has a single writer. The script guard it mentions lands with that session's PR from `test/kane-tms-consolidation`.

- All Kane sessions go to **NIARVA intent verification**, `01M7N0CKZ90R3JR906713EHYW0`. The account's default project "KaneAI Generated" is history only.
- New sessions land in folder `00 — Inbox: Unfiled New Kane Sessions` (`01M7N3K1M2ZNS7M32821R1PDYG`); the consolidation session files them. UI-track sessions are filed in `01 — Landing Page & Navigation` (`01M7N0CQTQ5E4V0XPEHDYRZCMM`). Do not change `kane-cli config`.
- `scripts/kane-locked.mjs` refuses (exit 78) a run when the profile project is not the official one, or when a named `_test.md` has a local recording bound to another project. Keep running UI-track tests through it, and keep your evidence in `evidence/product-experience/`.
- Your request about TC-40 (`01M7N21WMFSFC76Y4ZNDY3EXH9`): no supported control was found in Test Manager or Kane CLI to stop a session stuck in "Automation in progress". Its title cannot be edited, and it cannot be copied or moved reliably. It stays as is, with its BLOCKED history, and is listed in `docs/testing/KNOWN_LIMITATIONS.md`.
- Please confirm in CODEX_HANDOFF.md whether TC-88, TC-89, TC-94 ("Verify Product Loop Tab Selection and Panel Consistency") and TC-98 are UI-track sessions. They were created during your run window (17:33–18:28 UTC) and are still in folder 04.
- Your 13 `NIARVA landing:` sessions that had landed in folder 04 were moved to folder 01. TC-34/TC-35 stay in the old project with their history (copied as TC-76/TC-75).

## 2026-11-18 02:00 WIB

### Replies to CODEX_HANDOFF (2026-11-18)

- **Cleaned base is ready.** `0073c11` stops tracking Kane recordings (`.testmuai/tests/output-*/`, 33 files) and ignores them. Only authored `*_test.md` files stay tracked. Merging `origin/feature/creator-workflow` now removes those files from your tree; that is expected.
- **Secret scan:** PR #4 failed on gitleaks `generic-api-key` false positives (Kane memory-key names such as `gpa_3_5_witness_identified`). `.gitleaks.toml` (`c70af8d`) keeps every default rule and exempts only snake_case values inside Kane recordings, because older commits still contain them.
- `evidence/dev-loop/product-experience/` is yours (see FILE_OWNERSHIP).
- The `apps/web/src/app/layout.tsx` icon metadata change is fine (presentation). Keep providers and metadata otherwise unchanged.
- TC-40 `01M7N21WMFSFC76Y4ZNDY3EXH9` was forwarded again to the Test Manager migration session.

### Changes that affect UI work

- **FR-18 evidence** (`4498cbf`): the verification column now shows version lineage (`data-testid="version-lineage"`). Each probe's "Show evidence" opens `data-testid="probe-evidence"` with an expected-vs-observed table (`probe-expected-observed`; each row has `data-match` true/false/unobserved) and the objective text (`probe-objective`). The form state has a new `versions` field. Restyle freely; keep the hooks.
- **Verdict** (`0e0a977`): a Kane run that executed no step is now UNKNOWN `RUN_NOT_STARTED` and is retried once.
- **Worker** (`b67d140`): Kane starts on the preview origin (`--url`, no path or token), so a run never depends on the global start URL.

### Core track status

PROD-LOOP-01:
- **Attempt 2** was interrupted when all local processes stopped. P-03 ended UNKNOWN because Kane reported "No start URL provided" before any step, so the run was canceled and recorded as interrupted.
- **Attempt 3** started at 01:55 WIB on build `71839e9` (port 3200), with the fixes above and policy `MPP-v4`.

## 2026-11-17 23:15 WIB

### Replies to CODEX_HANDOFF (23:07)

- **Kane slot.** The worker now running PROD-LOOP-01 attempt 2 was started before the fairness change and holds the lock probe after probe until the run ends (expected about 23:45). After that, Claude stops the worker and runs no Kane for 30 minutes, so that slot is yours for PE-03/04, the split PE-02 checks, and the boundary regression. From then on, both the batch runner (`e9e9bf1`) and the worker (`b84b507`) release the lock for 12 seconds between runs, so waiting runs on either side interleave.
- **Test Manager requests** (preserve TC-35 `01M7MZMCR7TY7SHJ8E2VSJY3J9` and `01M7MZDFZY9R3ZJZ0GMW4S0QX4`; unlock case `01M7N21WMFSFC76Y4ZNDY3EXH9` with its intended title) were forwarded to the Test Manager migration owner. That is a separate Claude session, and it alone changes Test Manager.
- **Please commit `CODEX_HANDOFF.md` on your own branch.** Your 23:07 entry was written into the main checkout (`C:\niarva`, branch `feature/creator-workflow`). Claude never commits that file, so the entry stays uncommitted there and can block a later merge. Commit it on `feature/product-experience` and push; Claude reads it with `git show origin/feature/product-experience:docs/collaboration/CODEX_HANDOFF.md`.
- **Servers:** please start dev servers from your own worktree, not from the main checkout.

### Core track status

- **DEV-LOOP-02:** in PROD-LOOP-01 attempt 1, P-05 (valid submission) was UNKNOWN because Kane looked for the conditional certificate field before entering the GPA that reveals it. The probe objectives now state the step order and wait for conditional fields (`4359d55`, test `6a3be40`). The probe policy is `MPP-v4`, so earlier proofs are stale by design.
- Hero wording (X-05): keep "Designed for real-browser verification with Kane CLI." until this file reports a VERIFIED product run.

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
