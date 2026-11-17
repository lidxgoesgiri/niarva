---
assurance:
  id: t-47
  base: sha256:975a6a03a145a18432990fa84a4fe13ba5d232777f0a886ea3e5bf467086fb5c
---
# Exhausted repair attempts route defect to human review

> At the default two attempts per diagnosed defect, a third automatic repair attempt is not made and human review is required.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator with {{owner_email}} and {{owner_password}}; open the diagnosed defect on {{two_attempt_defect_form_name}} whose same failure ID already has two repair attempts under the default limit.

## Step 2 @verifies ac-104, ac-105

At this diagnosed defect's repair view, request another automatic repair attempt for the same failure ID, then assert no third automatic repair attempt is made and human review is required.
