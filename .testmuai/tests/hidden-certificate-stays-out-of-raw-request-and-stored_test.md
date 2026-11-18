---
assurance:
  id: t-7
  base: sha256:ff6cb0ba1f735c48e73169bc1725b258eb8b32b4109a2c159385c5e9f95f1e15
---
# Hidden certificate stays out of raw request and stored response

> On the published golden scholarship form, supply certificate at GPA 3.6, change to 3.4, submit, and independently inspect hidden UI, original raw request, and stored response.

## Step 1

Open {{published_form_url}} in a signed-out browser and reach the published NIARVA scholarship form.

## Step 2

On the published scholarship form, provide the synthetic name 'Synthetic Applicant', set GPA to 3.6, and give the achievement certificate field the synthetic answer {{certificate_fixture}}.

## Step 3 @verifies ac-19, ac-16

On the same scholarship form, change GPA from 3.6 to 3.4, then assert the achievement certificate field is hidden and the conditional visibility matches the below-threshold rule.

## Step 4 @verifies ac-13, ac-17

Submit the same form with the name and GPA 3.4, then verify the POST request to /api/v1/public/forms/ sent by the page has a request body that does not contain {{certificate_fixture}}, verify the page shows a confirmation with a receipt code, and store that receipt code as 'receipt_code'.

## Step 5 @verifies ac-14, ac-18

From {{start_url}}, sign in to NIARVA with {{owner_email}} and {{owner_password}} and open the authorized Responses view for the submitted scholarship form; find the response associated with that receipt, then assert the response exists with the submitted sanitized name and GPA 3.4 but no achievement certificate answer.
