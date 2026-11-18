---
assurance:
  id: t-10
  base: sha256:cd1899c991afb1db2e67e7319dd68d08f42aeaca844cfe07d2da10ab4f80ffe5
---
# Missing required answers are rejected at the GPA 3.5 boundary

> On published golden scholarship form at GPA 3.5, submit without certificate or without unconditional name/GPA; server refuses an accepted submission.

## Step 1

Open {{published_form_url}} in a signed-out browser and reach the published NIARVA scholarship form.

## Step 2 @verifies ac-16, ac-24

On the scholarship form set GPA to 3.5 and provide synthetic name 'Synthetic Applicant', then assert the achievement certificate field is visible and required under the inclusive GPA rule.

## Step 3 @verifies ac-15

Using the published form's public-submit operation as observed from this browser session, try separate synthetic submissions each missing exactly one currently required answer: certificate at GPA 3.5, name at GPA 3.5, and GPA with name present; then assert the server accepts none of these missing-required submissions.
