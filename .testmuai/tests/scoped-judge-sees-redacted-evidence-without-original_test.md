---
assurance:
  id: t-55
  base: sha256:68bfd17965ca0bcf89e5fadce659be31c4c01c0b743098992260c9acf625b2ff
---
# Scoped judge sees redacted evidence without original integrity claim

> A scoped judge inspects sanitized evidence and a redacted derivative without access to sensitive original pack, false original integrity, or a claimed video in the pack.

## Step 1

Open {{start_url}} for NIARVA and sign in with scoped judge access using {{scoped_judge_email}} and {{scoped_judge_password}}; navigate to the permitted verification report for {{owned_form_name}}.

## Step 2 @verifies ac-116, ac-117, ac-118

Open the permitted verification status and evidence for {{owned_form_name}}, then assert a sanitized result is available without arbitrary private file paths or the sensitive original sealed pack.

## Step 3 @verifies ac-119, ac-120

Inspect the redacted evidence derivative and its pack description for {{owned_form_name}}, then assert the derivative does not claim original sealed integrity and the sealed pack is not represented as containing video.
