---
assurance:
  id: t-8
  base: sha256:df1accc75ce491d642341bd6eac291afc44669f0624face85dec29b4d4720157
---
# Identical public submission retry returns its first receipt after republish

> Retry a prior original canonical submission on the same stable form after publication version or quota changes; original receipt returns without another counter increment.

## Step 1

Open {{published_form_url}} in a signed-out browser and reach the published NIARVA scholarship form.

## Step 2

Submit the scholarship form with synthetic name 'Synthetic Applicant', GPA 3.5 and achievement certificate answer {{certificate_fixture}}; capture the original receipt, submission ID, submitted version and original public-submit network request body for exact replay.

## Step 3

From {{start_url}}, sign in as the creator with {{owner_email}} and {{owner_password}} and republish a newly verified version of that same stable scholarship form without changing the original captured submission request.

## Step 4 @verifies ac-20

Against the same form's valid public route, repeat the captured public-submit request with exactly the same submission ID and original canonical payload after republishing, then assert the response receipt equals the receipt captured from the original accepted submission for that submission ID.
