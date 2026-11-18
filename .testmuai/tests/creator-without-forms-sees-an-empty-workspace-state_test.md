---
assurance:
  id: t-6
  base: sha256:ac7fc8d04707f3b665788211420c0f883194defd2136deca77dea2d5a0089ab1
---
# Creator without forms sees an empty workspace state

> The authenticated creator opens a workspace containing no forms and sees the specified empty state.

## Step 1

At {{start_url}}, sign in to NIARVA as the synthetic creator with no forms using {{empty_owner_email}} and {{empty_owner_password}}.

## Step 2 @verifies ac-12

In that creator's NIARVA workspace at /app, view the forms area for the zero-form account; then assert an empty workspace state is presented.
