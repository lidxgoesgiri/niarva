---
assurance:
  id: t-49
  base: sha256:e62fffd2575733de28e5429d71a12cd974dd6a6b452eac83e40cfb2d530507b5
---
# Owner response view shows seeded record fields without raw evidence

> Owner reviews persisted response records with receipts, submission times, originating versions, and sanitized answers; no raw sensitive verification evidence appears.

## Step 1

At {{start_url}}, sign in to NIARVA with {{owner_email}} and {{owner_password}} and reach the owner's workspace.

## Step 2 @verifies ac-108, ac-109, ac-110, ac-111

In the owner's workspace at {{start_url}}, open the responses view for {{response_form_name}} and inspect the seeded submission identified by receipt {{response_receipt}}, then assert that its receipt is {{response_receipt}}, its submission time matches {{response_time}}, its originating form version matches {{response_version}}, and its sanitized answers contain {{response_answer_marker}}.

## Step 3 @verifies ac-106, ac-107

In that responses view for {{response_form_name}}, inspect the displayed records and the response retrieval in the browser's network facility, then assert the owner can retrieve their own responses without revealing raw sensitive verification evidence.
