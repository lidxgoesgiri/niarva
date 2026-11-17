---
assurance:
  id: t-28
  base: sha256:72b413668d020de3db2e6799f66d98ee54a2a201d9bd36c91405c13ec3db9d0d
---
# Scholarship extraction preserves source and typed threshold

> Creator reviews the typed source-linked claims for the stated scholarship prompt, including certificate visibility and requiredness at the stated threshold.

## Step 1

At {{start_url}}, sign in to the NIARVA creator workspace with {{owner_email}} and {{owner_password}} and open the create/builder workflow.

## Step 2 @verifies ac-60

Supply the prompt 'Create a scholarship application. Name and GPA are required. Applicants with a GPA of 3.5 or higher must provide an achievement certificate. Applicants below 3.5 must not see that field.' and review its extracted claims, then assert each extracted claim retains a quote or source span from the prompt.

## Step 3 @verifies ac-61

In the builder claim review, inspect the extracted scholarship requirements, then assert each extracted claim has a typed predicate.

## Step 4 @verifies ac-62

In that claim review, inspect the extracted scholarship requirements, then assert each extracted claim retains its expected effect.

## Step 5 @verifies ac-69

In the scholarship claim review, inspect the certificate condition at the GPA threshold, then assert its typed predicate is gte(gpa, 3.5).
