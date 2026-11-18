---
assurance:
  id: t-48
  base: sha256:e4e2dc5804351cea8a2091c0145b32a89335ea6cd2f852c00665ac6af7414414
---
# Anonymous and other-owner response access reveals no responses

> Anonymous and signed-in non-owners cannot retrieve another creator's responses from the responses view or GET responses.

## Step 1 @verifies ac-106, ac-107

Without signing in, open {{response_view_url}}, then verify no response records and no verification evidence of that form are shown on the page you land on.

## Step 2 @verifies ac-106, ac-107

Open {{start_url}}, sign in to NIARVA as the non-owner with {{nonowner_email}} and {{nonowner_password}}, then open {{response_view_url}} and verify no response records and no verification evidence of that form are shown.

## Step 3 @verifies ac-106, ac-107

While signed in as the non-owner, open {{response_api_url}} in the browser, then verify the page shows no response records and no verification evidence of that form.

## Step 4 @verifies ac-106, ac-107

Clear all cookies, open {{response_api_url}} in the browser, then verify the page shows no response records and no verification evidence of that form.
