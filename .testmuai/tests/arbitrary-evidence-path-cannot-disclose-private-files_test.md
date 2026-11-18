---
assurance:
  id: t-54
  base: sha256:4f793ac7e2703ea5d6cde73f31e6912b8b6284f933136ca90f980281eb12f3c1
---
# Arbitrary evidence path cannot disclose private files

> An authorized reviewer attempts arbitrary private path access through verification evidence retrieval; no path or private file content is disclosed.

## Step 1

Open {{start_url}} for NIARVA and sign in as the owner with {{owner_email}} and {{owner_password}}; locate verification evidence for {{owned_form_name}}.

## Step 2 @verifies ac-117, ac-118

In the verification status/evidence request for {{owned_form_name}}, try {{private_file_path}} in place of a valid evidence reference, then assert the response exposes neither an arbitrary private file path nor the sensitive original sealed pack.
