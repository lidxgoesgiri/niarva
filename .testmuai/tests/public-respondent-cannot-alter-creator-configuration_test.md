---
assurance:
  id: t-32
  base: sha256:3a940a72a39aa79f913336ff475aa7939de3452644ee0094b73a061666f05f6a
---
# Public respondent cannot alter creator configuration

> A respondent using the public form cannot alter the creator's form configuration.

## Step 1

Open {{published_form_url}} in the browser as a respondent without signing in to the creator workspace.

## Step 2 @verifies ac-77

Without signing in, call POST {{config_api_url}} with body {"baseVersionId": "{{published_version_id}}", "definition": {"schemaVersion": 1, "title": "Changed by a respondent", "sections": [{"key": "main"}], "fields": [{"key": "full_name", "sectionKey": "main", "type": "short_text", "label": "Full name", "required": false, "visibility": "always"}], "rules": [], "settings": {}}}, save the response as respondent_change, and assert the respondent_change response status is 401 or 403. Then open {{published_form_url}} and verify the form still shows the Full name and GPA fields.
