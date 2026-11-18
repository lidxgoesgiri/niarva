---
assurance:
  id: t-17
  base: sha256:d8372cafd995ede72256d1f5f6d08ce2d9ca61b8a723f71ae16c4d5df5c52b9e
---
# Changed form version cannot reuse earlier proof

> After complete verified proof, change a behavior-relevant version or renderer identity and reject reuse of earlier evidence.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator with {{owner_email}} and {{owner_password}} and open the approved scholarship form {{owned_form_name}} with a fresh full VERIFIED report for its immutable current version.

## Step 2 @verifies ac-43

In the builder, make and save a behavior-affecting edit to that form to create a new immutable draft version; in its verification view inspect the version and freshness status, then assert the earlier proof is STALE for this new draft.

## Step 3 @verifies ac-44

For this new draft, inspect its verification/evidence status rather than the old published version, then assert the prior verified run is not offered as current proof for the changed identity.
