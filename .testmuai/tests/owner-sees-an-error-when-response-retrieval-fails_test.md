---
assurance:
  id: t-51
  base: sha256:b471415d76ebc0906081ebfe8749ed4700d8a95e8658ad94b7897819e9905c08
---
# Owner sees an error when response retrieval fails

> When response retrieval fails, the responses view presents an error state rather than a populated or empty result.

## Step 1

At {{start_url}}, sign in to NIARVA with {{owner_email}} and {{owner_password}} and open the owner's workspace.

## Step 2 @verifies ac-113, ac-107, ac-106

In the owner's workspace at {{start_url}}, open the responses view for {{response_error_form_name}} while its configured response retrieval failure is active, then assert the view shows its response retrieval error state, reveals no raw sensitive verification evidence, and does not expose this form's responses to any non-owner.
