---
assurance:
  id: t-5
  base: sha256:bf4abd2d2382b98b1d9886b8b9801a2cf0beb87ddf8d2a8d0dc2caf9d72bbfdb
---
# Anonymous visitor receives unauthorized workspace state

> A visitor without a creator session requests the workspace and receives its unauthorized state rather than private workspace content.

## Step 1

At {{start_url}}, establish a signed-out NIARVA browser session for a visitor without creator authorization.

## Step 2 @verifies ac-11

From the signed-out browser session, request the NIARVA workspace at /app; then assert an unauthorized workspace state is presented.
