---
assurance:
  id: t-45
  base: sha256:ba5336be6a7637f8990e779d5c8261c437fa7e70004285ef56a79787ccf63273
---
# Stale-base repair cannot modify current version

> A repair patch prepared against an earlier form version cannot modify the current version after the base changes.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator with {{owner_email}} and {{owner_password}}; open the diagnosed mismatch on {{race_form_name}} in the verification workspace.

## Step 2

Prepare a bounded repair proposal against the current form version for {{race_form_name}} and leave it pending.

## Step 3

As that form's creator, edit the form configuration to create a newer immutable version, leaving the previously prepared repair proposal based on the older version.

## Step 4 @verifies ac-92, ac-101

Return to the older pending repair proposal and try to approve and apply it to the now-current form, then assert the stale-base patch is rejected and the approved claim revision remains unchanged.
