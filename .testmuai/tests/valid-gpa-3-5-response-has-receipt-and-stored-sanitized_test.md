---
assurance:
  id: t-11
  base: sha256:44f021a6db1717805ac50787933587c617531e70f38fbc0ab433c01ea45ea5d1
---
# Valid GPA 3.5 response has receipt and stored sanitized answers

> On the published golden form supply synthetic name, GPA 3.5 and required certificate; receive a receipt and independently locate the sanitized persisted response.

## Step 1

Open {{published_form_url}} in a signed-out browser and reach the published NIARVA scholarship form.

## Step 2 @verifies ac-16, ac-25

On the scholarship form supply synthetic name 'Synthetic Applicant' and GPA 3.5, then assert the achievement certificate field is visible and conditional visibility matches the inclusive rule.

## Step 3 @verifies ac-17

On that form provide achievement certificate answer {{certificate_fixture}} and submit the valid synthetic answers, then assert the accepted submission produces a receipt.

## Step 4 @verifies ac-18

From {{start_url}}, sign in as the owner using {{owner_email}} and {{owner_password}} and open this form's authorized Responses view; locate the response for the captured receipt, then assert the persisted response matches the accepted sanitized name, GPA 3.5 and certificate answers.
