---
assurance:
  id: t-26
  base: sha256:35cf904ad6026ad2bfdecf810f2285be4cf2b41405dc97cfcfd7960ea5c51859
---
# Semantic edit cannot inherit creator approval

> Approval freezes the claim revision and canonical hash; a semantic edit cannot inherit approval.

## Step 1

At {{start_url}}, sign in to the NIARVA creator workspace with {{owner_email}} and {{owner_password}} and open the builder for an owned draft.

## Step 2

Create claims from the scholarship prompt 'Create a scholarship application. Name and GPA are required. Applicants with a GPA of 3.5 or higher must provide an achievement certificate. Applicants below 3.5 must not see that field.' and approve the reviewed revision.

## Step 3 @verifies ac-66, ac-58

In the claim editor, change the approved certificate threshold semantics from GPA 3.5 or higher to strictly higher than GPA 3.5 without approving the edited revision, then assert the edited revision is not approved and cannot inherit the original approval.
