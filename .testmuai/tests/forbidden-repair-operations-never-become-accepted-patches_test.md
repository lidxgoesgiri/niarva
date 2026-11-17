---
assurance:
  id: t-43
  base: sha256:69110dd681cd39896d3f51e9db5d0e5437efa25dd58da517b203d86faafe6c1c
---
# Forbidden repair operations never become accepted patches

> A diagnosed configuration mismatch cannot be repaired by arbitrary code, shell, changing an approved claim or its expected probe result; unsafe proposals do not become versions.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator with {{owner_email}} and {{owner_password}}; open the diagnosed configuration mismatch for {{observed_mismatch_form_name}} in the verification workspace.

## Step 2

capture baseline: approved claim revision for {{observed_mismatch_form_name}}

## Step 3 @verifies ac-95, ac-99

Through the diagnosed failure's repair proposal operation, submit a proposal containing arbitrary code instead of a bounded DSL edit, then assert the forbidden proposal is rejected.

## Step 4 @verifies ac-95, ac-99

Through the same repair proposal operation, submit a proposal containing a shell operation instead of a bounded DSL edit, then assert the forbidden proposal is rejected.

## Step 5 @verifies ac-92, ac-99

Through the same repair proposal operation, submit a proposal that changes an approved claim, then assert the proposal is rejected and the approved claim revision remains the baseline revision.

## Step 6 @verifies ac-99

Through the same repair proposal operation, submit a proposal that changes an expected probe result, then assert the proposal is rejected.
