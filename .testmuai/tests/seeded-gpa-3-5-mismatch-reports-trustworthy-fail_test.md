---
assurance:
  id: t-13
  base: sha256:8ebfec82b4e154fb15216689e55a94f60e019db22435eefafa4c8a18e62d86cf
---
# Seeded GPA 3.5 mismatch reports trustworthy FAIL

> For an intentionally labeled gt defect against approved gte, expose the 3.5 witness and classify trustworthy observed mismatch as FAIL rather than PASS.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator with {{owner_email}} and {{owner_password}} and open the verification view for the isolated, explicitly labeled seeded gt scholarship form {{seeded_gt_form_name}}.

## Step 2 @verifies ac-32, ac-33

From that form's immutable preview, request a complete critical verification for approved C-GPA gte(3.5), with the seeded gt rule and GPA 3.5 witness; on the verification view inspect the Intent Trace and observed browser probe, then assert the gt-versus-gte mismatch identifies the GPA 3.5 witness and its trustworthy observed probe verdict is FAIL.
