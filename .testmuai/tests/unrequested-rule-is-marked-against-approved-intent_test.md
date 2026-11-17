---
assurance:
  id: t-35
  base: sha256:ca30f5cff437bc4b7749bb304f293503632a8b31ced2d79a4d70cda23e713b37
---
# Unrequested rule is marked against approved intent

> A new form rule with no matching approved claim is surfaced as unrequested, never silently accepted as approved intent.

## Step 1

Open {{start_url}} in the browser, sign in to NIARVA as creator with {{owner_email}} and {{owner_password}}, and open the builder for {{owned_form_name}} with approved scholarship claims.

## Step 2 @verifies ac-82

In the builder's conditional-rule editor for {{owned_form_name}}, propose an additional certificate condition not requested by any approved claim and inspect its intent trace, then assert the rule is flagged as unrequested.

## Step 3 @verifies ac-72

From that unrequested-rule review state, attempt to accept the additional rule without approving a corresponding claim, then assert no form rule lacking a corresponding approved claim is silently accepted.
