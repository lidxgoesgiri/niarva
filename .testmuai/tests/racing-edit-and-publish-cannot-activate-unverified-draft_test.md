---
assurance:
  id: t-21
  base: sha256:f37a61561c99c08d18648daed3f7c931c739dc61ffcff39fa9fb304cdbf067d4
---
# Racing edit and publish cannot activate unverified draft

> An owner races an edit creating an unverified draft against a publish of the previously verified version; the transaction never activates the unverified draft.

## Step 1

Open {{start_url}} in the browser and sign in to NIARVA as the creator using {{owner_email}} and {{owner_password}}.

## Step 2

In the workspace, locate {{race_form_name}} with a previously verified immutable version and identify its form-version edit and publish API operations.

## Step 3 @verifies ac-47, ac-50

Coordinate a behavior-affecting edit that creates a new unverified draft concurrently with a publish request for the prior verified version, then assert the concurrently edited unverified draft is not active or newly published.
