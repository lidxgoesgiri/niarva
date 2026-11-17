---
assurance:
  id: t-57
  base: sha256:d183776c338c038d1197732776ee8cca1d66bf98e1dcdfaa06a56eedcb69c59c
---
# Zero-test verification does not show VERIFIED

> Review an empty verification run and check that zero executed tests cannot yield a VERIFIED full-run report.

## Step 1

Open {{start_url}} for NIARVA and sign in as the owner with {{owner_email}} and {{owner_password}}; find the synthetic zero-test verification record for {{zero_run_form_name}}.

## Step 2 @verifies ac-116, ac-122, ac-123, ac-124

Inspect the full verification report for the zero-test record of {{zero_run_form_name}}, then assert the sanitized report still provides required count, distinct-probe pass/fail/unknown counts, freshness key, source/build/version, run timeline, cache flag, instability history and gate reason, uses expected approved critical probes as its coverage denominator rather than completed tests, and does not classify this run as VERIFIED.
