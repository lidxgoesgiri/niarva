---
assurance:
  id: t-32
  base: sha256:ace4b8a9fdba470e12904292e7971e738be0d17ce0ef20066266b31d1975fa81
---
# Public respondent cannot alter creator configuration

> A respondent using the public form cannot alter the creator's form configuration.

## Step 1

Open {{published_form_url}} in the browser as a respondent without signing in to the creator workspace.

## Step 2 @verifies ac-77

From the public NIARVA form, attempt to change its field or conditional-rule configuration with the respondent's session, including a direct mutation request to {{config_api_url}} if the public UI provides no editor, then assert no respondent-authorized configuration change is accepted.
