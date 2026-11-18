---
assurance:
  id: t-40
  base: sha256:3e08044a1929389eded32c27f759b79c897b16b6846a1c6538a46660db760408
---
# Missing generated rule reported in Intent Trace

> Inspect a source-backed approved claim without a corresponding generated rule and find the missing claim→rule link flagged.

## Step 1

At {{start_url}}, sign in to NIARVA with {{owner_email}} and {{owner_password}} and open the isolated synthetic form {{missing_rule_form_name}} in the creator workspace.

## Step 2 @verifies ac-91

In that form's verification workspace, inspect the claim-to-generated-rule link in Intent Trace for the approved claim that has no matching generated rule, then assert the missing rule is flagged.
