---
assurance:
  id: t-56
  base: sha256:a80e64fad16983a75556a8bbc0a55953d981e545aa3d83e8426e79dc2e78db42
---
# Owner reviews full and per-probe report for exact version

> Owner reviews a version's full report and its probe reports with source/build lineage, per-probe observations, counts and gate reason, using only sanitized evidence references.

## Step 1

Open {{start_url}} for NIARVA and sign in as the owner with {{owner_email}} and {{owner_password}}; navigate to the verification history for {{owned_form_name}}.

## Step 2 @verifies ac-116, ac-117, ac-122

Open the full verification report for the selected version of {{owned_form_name}}, then assert the sanitized report contains required count, distinct-probe pass/fail/unknown counts, freshness key, source/build/version, run timeline, cache flag, instability history and gate reason without arbitrary private file paths.

## Step 3 @verifies ac-123

Compare the full report's coverage denominator to the expected approved critical probes in the version's probe plan rather than the number of completed tests, then assert the denominator equals the expected approved critical probes.

## Step 4 @verifies ac-121

Inspect every probe entry in this version's verification report, then assert each includes claim IDs, probe ID/objective hash, witness, expected, observed, classification, duration, CLI version, run ID, evidence digest, server assertion and failure reason.
