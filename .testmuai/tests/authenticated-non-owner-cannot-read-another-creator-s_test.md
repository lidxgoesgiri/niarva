---
assurance:
  id: t-2
  base: sha256:58f9c5a0892020fb747348c4c95be00473197aada22dda7b712b20c597751483
---
# Authenticated non-owner cannot read another creator's private resources

> An authenticated creator other than the resource owner attempts to open that owner's known private version and evidence; content remains inaccessible.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator who does not own the target private form, using {{nonowner_email}} and {{nonowner_password}}.

## Step 2 @verifies ac-1, ac-9

In this non-owner session, open {{private_version_url}}, then verify the page says access is denied and does not show {{private_version_marker}}.

## Step 3 @verifies ac-2, ac-10

In the same non-owner session, open {{private_evidence_url}}, then verify the page shows an error instead of the form's evidence and does not contain {{private_evidence_marker}}.
