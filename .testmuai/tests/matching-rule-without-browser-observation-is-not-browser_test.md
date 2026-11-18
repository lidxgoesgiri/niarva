---
assurance:
  id: t-41
  base: sha256:b08237eed11af25aa3ea2b475e18d8f38542ebc12241534e89bbf9b28d3f6994
---
# Matching rule without browser observation is not browser proof

> Inspect approved C-GPA with matching gte rule and no observed browser result; the trace must not present structural matching as established browser correctness.

## Step 1

At {{start_url}}, sign in to NIARVA with {{owner_email}} and {{owner_password}} and open the isolated synthetic form {{matching_rule_form_name}} in the creator workspace.

## Step 2 @verifies ac-83

In the verification workspace for approved C-GPA and the matching generated gte rule, inspect the planned GPA 3.5 probe, then assert its expectation is derived from the approved claim rather than the generated rule.

## Step 3 @verifies ac-84

In that form's Intent Trace and browser-proof status before any browser probe has been observed, inspect the structurally matching rule, then assert it is not presented as established browser correctness solely on structural equivalence.
