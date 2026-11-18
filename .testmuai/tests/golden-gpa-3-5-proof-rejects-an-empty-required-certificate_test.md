---
assurance:
  id: t-15
  base: sha256:ace9ff4cd61321cb5f139e67f0db51c6423260f1dbd25ac76eed6dbeffff5845
---
# Golden GPA 3.5 proof rejects an empty required certificate

> Verify approved 3.5 threshold on immutable browser preview: certificate visible and required, with empty certificate submission blocked and full-run evidence.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator with {{owner_email}} and {{owner_password}} and open the immutable preview for the approved-claim scholarship form {{owned_form_name}}.

## Step 2 @verifies ac-36, ac-37

In the scholarship preview, provide the required name and GPA 3.5 with no achievement certificate, then assert the achievement certificate field is visible and required.

## Step 3 @verifies ac-38

In that same preview at GPA 3.5, attempt to submit with the achievement certificate empty, then assert no successful submission occurs.

## Step 4 @verifies ac-39

For the same immutable version, request and inspect a newly executed complete critical verification in NIARVA's verification view, then assert the full run is VERIFIED only after all expected critical probes have complete proof.
