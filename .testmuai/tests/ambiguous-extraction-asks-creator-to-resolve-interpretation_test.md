---
assurance:
  id: t-30
  base: sha256:995448782294bb2e307dc39ff33b4823f0eef970a582cce38f3dbcd8250ae292
---
# Ambiguous extraction asks creator to resolve interpretation

> Creator resolves an ambiguous interpretation before approving the semantic revision.

## Step 1

At {{start_url}}, sign in to the NIARVA creator workspace with {{owner_email}} and {{owner_password}} and open the create/builder claim-review workflow.

## Step 2 @verifies ac-71

Submit {{ambiguous_prompt}} for extraction and review its ambiguous claim before approving, then assert a creator clarification request or manual-edit option is offered for that claim.
