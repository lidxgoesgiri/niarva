---
assurance:
  id: t-1
  base: sha256:ce46a212d8ab8f1c5308a5c03e4170faf49e073e79c5df4bf0e1e24dd39a2d9f
---
# Anonymous access to private version and evidence reveals no owner content

> From a signed-out browser, attempt access to a known private version and private evidence; neither resource content is exposed.

## Step 1

At {{start_url}}, establish a signed-out NIARVA browser session for an anonymous visitor.

## Step 2 @verifies ac-1, ac-7

From the signed-out NIARVA browser session, request the owner's known private form at {{private_version_url}}; then assert access to the private version is denied and its known content {{private_version_marker}} is absent from the page and response.

## Step 3 @verifies ac-2, ac-8

From the same signed-out NIARVA browser session, request the owner's private evidence at {{private_evidence_url}}; then assert access to the evidence is denied and its known content {{private_evidence_marker}} is absent from the page and response.
