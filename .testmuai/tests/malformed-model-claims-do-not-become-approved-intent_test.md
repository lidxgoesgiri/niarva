---
assurance:
  id: t-25
  base: sha256:cd1ded38d5dafb90aaceced7bb83968003fb057b719e4c3b1173e6e855646c27
---
# Malformed model claims do not become approved intent

> Malformed provider output is rejected instead of entering authoritative approved intent.

## Step 1

At {{start_url}}, sign in to the NIARVA creator workspace with {{owner_email}} and {{owner_password}} and open the create/builder claim-review workflow.

## Step 2 @verifies ac-65, ac-59

With {{malformed_claim_fixture}} providing a malformed model-generated claim for a scholarship prompt, run extraction in the builder, then assert the malformed output is not accepted as an extracted claim set or authoritative approved intent.
