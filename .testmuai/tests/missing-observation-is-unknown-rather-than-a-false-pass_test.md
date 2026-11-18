---
assurance:
  id: t-14
  base: sha256:07001e51c830823b51f077cc7972e13b0f1adbbf730e3401cff72f02d1095637
---
# Missing observation is UNKNOWN rather than a false PASS

> Missing observation, event, timeout, auth/upload failure or ambiguous evidence must not be treated as false, FAIL or PASS.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator with {{owner_email}} and {{owner_password}} and open the verification report for the isolated critical-probe run {{unknown_run_id}}, whose observation or required completion event is missing.

## Step 2 @verifies ac-34, ac-35

In that run's verification report, inspect the missing browser observation and the full-run status, then assert its probe verdict is UNKNOWN and the full run is not VERIFIED.
