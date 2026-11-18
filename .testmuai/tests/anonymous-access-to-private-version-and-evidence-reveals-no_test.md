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

Without signing in, open {{private_version_url}}, then verify the page you land on asks you to sign in or says access is denied, and does not show {{private_version_marker}}.

## Step 3 @verifies ac-2, ac-8

Still without signing in, open {{private_evidence_url}}, then verify the page shows an error instead of the form's evidence and does not contain {{private_evidence_marker}}.
