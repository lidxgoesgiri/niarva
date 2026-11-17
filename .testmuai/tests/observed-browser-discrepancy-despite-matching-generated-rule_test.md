---
assurance:
  id: t-38
  base: sha256:82994d5355881d4b9cede8fccd9ece7595cfa83ab4fbb6d7f87720d19d746b6f
---
# Observed browser discrepancy despite matching generated rule

> With approved claim and structurally matching generated rule, inspect trustworthy browser observation that disagrees with approved expected behavior and identify the observed semantic mismatch rather than accepting structural agreement as proof.

## Step 1

At {{start_url}}, sign in to NIARVA with {{owner_email}} and {{owner_password}} and open the isolated synthetic form {{observed_mismatch_form_name}} in the creator workspace.

## Step 2 @verifies ac-83

In that form's verification workspace, inspect the approved C-GPA claim and structurally matching gte rule, then assert the expected certificate behavior at GPA 3.5 comes from approved C-GPA rather than the generated rule.

## Step 3 @verifies ac-89

In that form's Intent Trace, inspect its reliable GPA 3.5 browser probe observation showing the certificate field missing despite the matching gte rule, then assert the observed browser behavior is identified as a mismatch with the approved claim.

## Step 4 @verifies ac-84

In the trace's proof status for that observed discrepancy, inspect how matching rule structure is characterized, then assert structural agreement alone is not represented as proof of browser correctness.
