---
assurance:
  id: t-4
  base: sha256:a085d1f480e4f76c8d40c7ecac393133640ce973433e4b3bed04484c4204da12
---
# Published public form remains accessible without respondent login

> A signed-out visitor opens a known published public form without respondent login.

## Step 1

At {{start_url}}, establish a signed-out NIARVA browser session without respondent credentials.

## Step 2 @verifies ac-3

From that signed-out browser session, open the known published form at {{published_form_url}}; then assert the published public form is accessible without respondent login.
