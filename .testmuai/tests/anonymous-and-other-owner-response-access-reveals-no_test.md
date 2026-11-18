---
assurance:
  id: t-48
  base: sha256:e4e2dc5804351cea8a2091c0145b32a89335ea6cd2f852c00665ac6af7414414
---
# Anonymous and other-owner response access reveals no responses

> Anonymous and signed-in non-owners cannot retrieve another creator's responses from the responses view or GET responses.

## Step 1 @verifies ac-106, ac-107

At {{start_url}}, open NIARVA in the browser and locate the responses view for the form {{response_form_name}} as an anonymous visitor; request its responses through the browser-accessible response view, then assert no response records or raw sensitive verification evidence from that form are revealed.

## Step 2 @verifies ac-106, ac-107

From {{start_url}}, sign in to NIARVA as the non-owner with {{nonowner_email}} and {{nonowner_password}}; request the responses view for {{response_form_name}}, then assert no responses or raw sensitive verification evidence from that form are revealed.

## Step 3 @verifies ac-106, ac-107

While signed in as the non-owner at {{start_url}}, use the browser's network/API facility to request the logical GET responses operation for {{response_form_name}}, then assert its returned data contains no response records or raw sensitive verification evidence from that form.

## Step 4 @verifies ac-106, ac-107

At {{start_url}} without a signed-in session, request the same GET responses operation for {{response_form_name}}, then assert its returned data contains no response records or raw sensitive verification evidence from that form.
