---
assurance:
  id: t-20
  base: sha256:2dec65c3f63ea991c81137d9d280b413045d25074a03febfa3a51bc79af133c0
---
# Direct publish before proof is rejected by backend

> An owner directly invokes publish before required verification; backend rejects with a safe blocked reason and does not create a publication.

## Step 1

Open {{start_url}} in the browser and sign in to NIARVA as the creator using {{owner_email}} and {{owner_password}}.

## Step 2

In the creator workspace, locate {{unverified_form_name}}, an owned immutable draft with required publish proof incomplete, and identify the application's publish operation.

## Step 3 @verifies ac-52

Invoke the application's publish operation directly through its API for {{unverified_form_name}} without relying on the UI gate, then assert a blocked reason is returned.

## Step 4 @verifies ac-47

Return to the workspace publication state for {{unverified_form_name}} after that direct call, then assert the unproven draft was not published.
