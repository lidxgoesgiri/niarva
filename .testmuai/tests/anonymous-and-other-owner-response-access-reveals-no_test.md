---
assurance:
  id: t-48
  base: sha256:283526fad4f0a570786d35b49d7625370317d2208e7821bd63869ee986309f9f
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
