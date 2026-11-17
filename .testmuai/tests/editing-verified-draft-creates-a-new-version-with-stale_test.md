---
assurance:
  id: t-31
  base: sha256:d635e106afdeb67758a8b2ac48bb6eef40f3615a0b41da704308ef46027ce020
---
# Editing verified draft creates a new version with stale proof

> After a previously verified draft, the creator changes a conditional rule and sees a new immutable version whose earlier proof is not fresh.

## Step 1

Open {{start_url}} in the browser and sign in to NIARVA as creator with {{owner_email}} and {{owner_password}}; in the workspace, locate {{owned_form_name}} and establish its currently verified form version.

## Step 2 @verifies ac-75

In the NIARVA builder for {{owned_form_name}}, change the approved GPA certificate conditional rule from `gte(gpa, 3.5)` to `gt(gpa, 3.5)` as a creator configuration edit and save it, then assert the edited draft has a new immutable version distinct from the previously verified version.

## Step 3 @verifies ac-76

From that edited draft, inspect its verification state and attempt to use the prior version's proof for the current draft, then assert earlier-version proof is not accepted as fresh proof for the edited draft.
