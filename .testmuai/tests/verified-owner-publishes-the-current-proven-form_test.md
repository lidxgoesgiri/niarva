---
assurance:
  id: t-19
  base: sha256:a58c3eca49c08614b8f3ef2aeb0bc5e3100976a3a1eb7b5fed9fa5b5ee12acdf
---
# Verified owner publishes the current proven form

> An owner with approved claims, immutable version, fresh complete static/server/full browser proof and stored evidence publishes and obtains an active version and shareable public URL.

## Step 1

Open {{start_url}} in the browser and sign in to NIARVA as the creator using {{owner_email}} and {{owner_password}}.

## Step 2

In the creator workspace, open {{owned_form_name}} and reach its Publish screen with an approved immutable version and completed fresh static, server and full Kane browser checks backed by stored evidence.

## Step 3 @verifies ac-49, ac-56

On that Publish screen, confirm publication of the verified version, then assert the publication identifies the exact verified immutable version and presents a shareable public URL.

## Step 4 @verifies ac-51

From the resulting publication, inspect the application's active publication for {{owned_form_name}}, then assert its version matches the publication record inserted for the just-published version.
