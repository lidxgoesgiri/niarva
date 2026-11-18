---
assurance:
  id: t-37
  base: sha256:73b8042e9434ef2889bb487b2942bc3e3a68c0158795449422b7fffb42af75c8
---
# Source-linked seeded comparator discrepancy at GPA 3.5

> With approved C-GPA gte(gpa, 3.5) and an intentionally seeded gt rule, inspect the trace's GPA 3.5 counterexample and source mapping without claiming an unobserved applicant rejection.

## Step 1

At {{start_url}}, sign in to NIARVA with {{owner_email}} and {{owner_password}} and open the creator workspace for the isolated synthetic scholarship form {{seeded_gt_form_name}}.

## Step 2 @verifies ac-83

In the form's approved-claims review, locate C-GPA and open its Intent Trace in the verification workspace, then assert the probe expectation is derived from approved gte(gpa, 3.5), not the generated gt rule.

## Step 3 @verifies ac-85

In the Intent Trace's claim-to-rule discrepancy, inspect the counterexample for C-GPA, then assert GPA 3.5 is identified as the witness for approved gte versus generated gt.

## Step 4 @verifies ac-86

In that discrepancy's source reference, inspect the approved C-GPA origin, then assert the mismatch maps to the source-backed approved claim.

## Step 5 @verifies ac-87

In the isolated seeded defect's trace presentation, inspect its demonstration status, then assert 'Seeded defect for demonstration' is shown.

## Step 6 @verifies ac-88

In the GPA 3.5 discrepancy explanation, inspect the actual observed consequence, then assert there is no claim of applicant rejection without an observed rejection when the observation is a missing certificate field.

## Step 7 @verifies ac-84

In the verification workspace's trace and browser-proof status for this form, inspect the structural mismatch and its observation status, then assert structural comparison alone is not presented as established browser correctness.
