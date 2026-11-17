---
assurance:
  id: t-9
  base: sha256:dff6cb3a4cea4071f89283d4d8d122d8dc4e9860f8a529707b43ae47c71294c2
---
# Conflicting public submission ID yields generic conflict without receipt

> Submit an already used ID with a changed original payload or a different stable form ID; receive generic 409 without another form's receipt.

## Step 1

Open {{published_form_url}} in a signed-out browser and reach the published NIARVA scholarship form.

## Step 2

Submit a valid synthetic name 'Synthetic Applicant', GPA 3.5 and achievement certificate answer {{certificate_fixture}}; capture the public-submit request's submission ID, its original receipt and original request body.

## Step 3 @verifies ac-22, ac-23

Against the same form's public-submit operation discovered from that request, repeat the captured submission ID with a different synthetic name 'Changed Synthetic Applicant' while keeping the form identity, then assert the response is 409 IDEMPOTENCY_KEY_REUSED and does not disclose any other form's receipt.

## Step 4 @verifies ac-22, ac-23

From {{other_published_form_url}}, identify the second published NIARVA form's public-submit operation and send a valid synthetic answer using the already captured submission ID, then assert the response is 409 IDEMPOTENCY_KEY_REUSED without disclosing the first form's receipt.
