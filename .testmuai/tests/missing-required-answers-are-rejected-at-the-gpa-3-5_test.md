---
assurance:
  id: t-10
  base: sha256:d4ebd2292302b4326a5c8553b2e131bac4af168c2b030ff423fe5927be442dbd
---
# Missing required answers are rejected at the GPA 3.5 boundary

> On published golden scholarship form at GPA 3.5, submit without certificate or without unconditional name/GPA; server refuses an accepted submission.

## Step 1

Open {{published_form_url}} in a signed-out browser and reach the published NIARVA scholarship form.

## Step 2 @verifies ac-16, ac-24

On the scholarship form set GPA to 3.5 and provide synthetic name 'Synthetic Applicant', then assert the achievement certificate field is visible and required under the inclusive GPA rule.

## Step 3 @verifies ac-15

Call POST {{public_submit_url}} with body {"submissionId": "{{missing_certificate_submission_id}}", "formVersionId": "{{published_version_id}}", "answers": {"full_name": "Synthetic Applicant", "gpa": "3.5"}}, save the response as missing_certificate. Call POST {{public_submit_url}} with body {"submissionId": "{{missing_name_submission_id}}", "formVersionId": "{{published_version_id}}", "answers": {"gpa": "3.5", "certificate": "{{certificate_fixture}}"}}, save the response as missing_name. Call POST {{public_submit_url}} with body {"submissionId": "{{missing_gpa_submission_id}}", "formVersionId": "{{published_version_id}}", "answers": {"full_name": "Synthetic Applicant"}}, save the response as missing_gpa. Then assert none of the missing_certificate, missing_name and missing_gpa responses has status 201, and none of their response bodies contains a receiptCode.
