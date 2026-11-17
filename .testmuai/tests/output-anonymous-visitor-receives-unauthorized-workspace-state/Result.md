---
test: ../anonymous-visitor-receives-unauthorized-workspace-state_test.md
status: passed
started: 2026-11-17T03:09:33.150Z
duration_s: 54
session_id: 9359941b-0895-4b94-8c1b-c24072241741
---

# Anonymous visitor receives unauthorized workspace state — Result

## Step 1 ✓ passed (25s)
md5: a345a5ceec0646a276e5a1abca34dde5
At {{start_url}}, establish a signed-out NIARVA browser session for a visitor without creator authorization.

## Step 2 ✓ passed (25.2s)
md5: e7e34ec75286f3459ea2390b012a0dce
From the signed-out browser session, request the NIARVA workspace at /app; then assert an unauthorized workspace state is presented.
