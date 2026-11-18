---
assurance:
  id: t-52
  base: sha256:b6a83c2a07137e4ce2aa664c5ff23f9bc68d20834a46f19a19b61e7f9c89c2c5
---
# Owner sees an empty response view for an unsubmitted form

> When an owned form has no submitted responses, the responses view presents its empty state.

## Step 1

At {{start_url}}, sign in to NIARVA with {{empty_owner_email}} and {{empty_owner_password}} and open the owner's workspace.

## Step 2 @verifies ac-114, ac-106, ac-107

In the owner's workspace at {{start_url}}, open the responses view for an owned form with no submitted responses, then assert its empty responses state appears for the owner and no raw sensitive verification evidence is displayed.
