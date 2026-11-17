---
assurance:
  id: t-44
  base: sha256:2019030927d640d4af2b6537e6387e4da2834d33a56d0736cf548c8b9026d074
---
# Repair proposal waits for explicit creator approval

> A valid proposed bounded patch is not applied before the creator explicitly approves it.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator with {{owner_email}} and {{owner_password}}; open the diagnosed mismatch for {{observed_mismatch_form_name}} in the verification workspace.

## Step 2 @verifies ac-93, ac-100

For that diagnosed mismatch, obtain a valid bounded comparator repair proposal against the current version without approving it, and inspect its pending state, then assert the patch has not been applied.
