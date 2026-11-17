---
assurance:
  id: t-18
  base: sha256:b04ecd1f0b64ffc096dc82b9f820ccc68153f5580eed28d6177311e22a062786
---
# GPA 3.4 preview hides the nonrequired certificate

> Below threshold the real preview hides the achievement certificate and does not require it, using a known non-matching GPA as negative counterpart.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator with {{owner_email}} and {{owner_password}} and open the immutable scholarship preview for {{owned_form_name}}.

## Step 2 @verifies ac-45, ac-46

In that preview, provide the required name and GPA 3.4; inspect the conditional certificate field and the K-01 verification observation for this immutable version, then assert the achievement certificate is not visible and its expected requiredness is not required.
