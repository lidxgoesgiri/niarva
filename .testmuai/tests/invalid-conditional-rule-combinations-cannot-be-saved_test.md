---
assurance:
  id: t-34
  base: sha256:246b2ea26692b897cc2e9dbb1e9642796ef7e2645ff0e2b5991919293896a842
---
# Invalid conditional-rule combinations cannot be saved

> A creator's rule with a missing field reference, dependency cycle or unsupported condition is rejected rather than declared supported.

## Step 1

Open {{start_url}} in the browser, sign in to NIARVA using {{owner_email}} and {{owner_password}}, and locate the creator form builder for {{owned_form_name}}.

## Step 2 @verifies ac-73

At {{config_api_url}}, attempt to save a supported condition referring to a missing field with otherwise acyclic dependencies, then assert that rule is rejected rather than saved.

## Step 3 @verifies ac-73

At {{config_api_url}}, attempt to save an unsupported condition referring to a missing field with otherwise acyclic dependencies, then assert that rule is rejected rather than saved.

## Step 4 @verifies ac-73

At {{config_api_url}}, attempt to save a supported condition with a missing field reference and cyclic dependencies, then assert that rule is rejected rather than saved.

## Step 5 @verifies ac-73

At {{config_api_url}}, attempt to save an unsupported condition with a missing field reference and cyclic dependencies, then assert that rule is rejected rather than saved.

## Step 6 @verifies ac-73

At {{config_api_url}}, attempt to save an unsupported condition with valid references and acyclic dependencies, then assert that rule is rejected rather than saved.

## Step 7 @verifies ac-73

At {{config_api_url}}, attempt to save a supported condition with valid references and cyclic dependencies, then assert that rule is rejected rather than saved.

## Step 8 @verifies ac-73

At {{config_api_url}}, attempt to save an unsupported condition with valid references and cyclic dependencies, then assert that rule is rejected rather than saved.
