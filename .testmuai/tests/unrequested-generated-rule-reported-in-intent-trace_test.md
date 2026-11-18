---
assurance:
  id: t-39
  base: sha256:5d936a45edf34cc92dbd2bf8ba2879c90d20e811a80640b99c83b64bcd72661e
---
# Unrequested generated rule reported in Intent Trace

> Inspect a generated rule with no corresponding approved claim and find it flagged as unrequested in the Intent Trace.

## Step 1

At {{start_url}}, sign in to NIARVA with {{owner_email}} and {{owner_password}} and open the isolated synthetic form {{unrequested_rule_form_name}} in the creator workspace.

## Step 2 @verifies ac-90

In that form's verification workspace, inspect the rule-to-approved-claim link in Intent Trace for the generated rule without a matching approved claim, then assert the rule is flagged as unrequested.
