---
assurance:
  id: t-24
  base: sha256:302346d4af4c7b5176554ec449fe22fd5f4e70e1bb9382b65fdc44afe99e02d4
---
# Affected old publication is unavailable after renderer change

> For an affected active immutable publication without demonstrated compatible rendering, renderer or verification-policy change makes its public form unavailable until reverified.

## Step 1

Open {{start_url}} in the browser and access the NIARVA deployment with {{affected_public_form_url}}, an affected previously active publication whose renderer or verification policy changed without demonstrated compatible immutable rendering.

## Step 2 @verifies ac-54

Visit {{affected_public_form_url}} while it remains un-reverified, then assert the affected public form is unavailable rather than served.
