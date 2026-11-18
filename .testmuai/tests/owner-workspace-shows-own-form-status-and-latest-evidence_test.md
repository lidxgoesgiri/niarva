---
assurance:
  id: t-3
  base: sha256:e9b7363103c110160ef46a2d111ef7f5675e9b48dc84256eb1a3b75c04d01f67
---
# Owner workspace shows own form, status and latest evidence

> The authenticated owner opens a populated workspace and sees their forms, their status, and their latest evidence where available.

## Step 1

At {{start_url}}, sign in to NIARVA as the owner of the synthetic form using {{owner_email}} and {{owner_password}}.

## Step 2 @verifies ac-4

In the owner's NIARVA workspace at /app, inspect the forms list; then assert the owned form {{owned_form_name}} is listed.

## Step 3 @verifies ac-5

On the {{owned_form_name}} entry in the owner's workspace, inspect its status; then assert it shows the independently established status {{expected_form_status}}.

## Step 4 @verifies ac-6

On the {{owned_form_name}} entry in the owner's workspace, inspect the most recent evidence associated with the form whose known evidence entries include earlier {{older_evidence_marker}} and later {{latest_evidence_marker}}; then assert the displayed latest evidence corresponds to {{latest_evidence_marker}}.
