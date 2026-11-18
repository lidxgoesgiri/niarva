---
assurance:
  id: t-12
  base: sha256:5f917aed4b63f7deb96c7fd690ba45dca1a24c4c8d31241d9816de5515d9e7d1
---
# Stale version for a new public submission ID returns version-changed error

> For a new submission ID, send an old submitted version after republish; get FORM_VERSION_CHANGED rather than success or original receipt.

## Step 1

Open {{published_form_url}} in a signed-out browser and reach the published NIARVA scholarship form.

## Step 2

Submit a valid synthetic scholarship response with name 'Synthetic Applicant', GPA 3.5 and certificate answer {{certificate_fixture}}; capture the public-submit request shape and submitted immutable form version for a separate new-ID request.

## Step 3

From {{start_url}}, sign in as the form owner with {{owner_email}} and {{owner_password}} and republish a newly verified version of this same stable form, keeping its public route active.

## Step 4 @verifies ac-26

Using the public-submit operation observed earlier against the valid public route, submit synthetic required answers with the captured old version and a fresh submission ID {{stale_submission_id}}, then assert the response rejects this new ID with FORM_VERSION_CHANGED.
