---
assurance:
  id: t-58
  base: sha256:68d265574867b962acdf95dc56ed575e502d5c5f45fda9a1296c70bfd1644733
---
# Diagnostic-only pass is not presented as full proof

> Review a report after only a diagnostic probe passed and ensure it is not presented as full proof.

## Step 1

Open {{start_url}} for NIARVA and sign in as the owner with {{owner_email}} and {{owner_password}}; locate the synthetic diagnostic-only pass for {{diagnostic_only_form_name}}.

## Step 2 @verifies ac-116, ac-121

Open the diagnostic-only report for {{diagnostic_only_form_name}} and inspect its probe entry, then assert a sanitized result is available and the probe entry includes claim IDs, probe ID/objective hash, witness, expected, observed, classification, duration, CLI version, run ID, evidence digest, server assertion and failure reason.

## Step 3 @verifies ac-125

Inspect the proof status shown for the diagnostic-only pass of {{diagnostic_only_form_name}}, then assert the pass is not represented as full proof.
