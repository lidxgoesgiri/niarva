---
assurance:
  id: t-64
  base: sha256:a2adf60d413042e1a3cfd52acee6afd2f8b75d12be3038267769267355968ef3
---
# Scoped judge inspects actual-run provenance in sanitized demo report

> From the judge-facing demo, inspect the actual run ID, objective, expected and observed behavior, evidence pack and version lineage in a sanitized report rather than only a success badge.

## Step 1 @verifies ac-126, ac-127

From {{start_url}}, enter the NIARVA judge demo with {{scoped_judge_email}} and {{scoped_judge_password}} and open the golden-case verification report, then assert the real report is accessible without disclosing a private provider secret.

## Step 2 @verifies ac-128, ac-134

In the judge-accessible sanitized golden-case verification report, inspect the real run and its proof references, then assert the report exposes run ID, objective, expected and observed result, evidence pack reference and version lineage and does not present a synthetic result as live PASS.
