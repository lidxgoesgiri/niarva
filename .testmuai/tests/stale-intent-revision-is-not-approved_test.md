---
assurance:
  id: t-29
  base: sha256:951df788e96c4ddf3977617b6c49f9ebf681457b94eaac0cc35f6dbb9c8b5e36
---
# Stale intent revision is not approved

> An approval request for an out-of-date claim revision returns the specified conflict rather than approving it.

## Step 1

At {{start_url}}, sign in to the NIARVA creator workspace with {{owner_email}} and {{owner_password}} and open a creator-owned draft's claim review.

## Step 2

In the claim review, record the current claim revision identity and then create an updated revision by changing the scholarship certificate threshold semantics.

## Step 3 @verifies ac-70, ac-58

Using the application's approval operation with the earlier revision identity, attempt approval of the stale claim revision and inspect its response, then assert HTTP 409 and no changed claim semantics treated as approved without renewed creator approval.
