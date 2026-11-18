---
assurance:
  id: t-42
  base: sha256:cd489016285a298f195c2ad1bd0ab4c9a5637acfee48e53909f3f47bb53b8cb4
---
# Approved comparator repair creates version and fresh proof

> Given a diagnosed seeded gt-versus-gte mismatch at GPA 3.5 with unchanged approved intent, creator approves a validated comparator patch; a new immutable version receives fresh diagnostic and full critical proof; previous evidence cannot release it.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator with {{owner_email}} and {{owner_password}}; open the verification workspace for {{observed_mismatch_form_name}} showing the diagnosed GPA 3.5 gt-versus-gte mismatch.

## Step 2

capture baseline: approved claim revision and form version identity for {{observed_mismatch_form_name}}

## Step 3 @verifies ac-93

On that diagnosed failure in the verification workspace, inspect the proposed comparator-only repair from gt to gte and try to apply it before giving explicit creator approval, then assert the proposed patch has not been applied.

## Step 4 @verifies ac-96, ac-92

In the same repair review, explicitly approve the bounded comparator-only patch from gt to gte for the current base, then assert a new immutable form version exists and its approved claim revision remains the baseline revision.

## Step 5 @verifies ac-94

On the new draft's publish view before new proof runs, try to publish using only the previous version's verification evidence, then assert publication is blocked.

## Step 6 @verifies ac-97

For this repaired version, run verification of the GPA 3.5 affected diagnostic against the unchanged approved gte claim, then assert the affected diagnostic has a new run attached to this version.

## Step 7 @verifies ac-98

For the same repaired version, run the full critical static, server and browser verification suite before publishing, then assert a new full critical-suite run is attached to the repaired version.
