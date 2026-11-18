---
assurance:
  id: t-53
  base: sha256:777333ad42375c0456c945d7922c14b4f46fd33612dbdf3ab30dd35423c34c6e
---
# Owner sees a loading state while responses are pending

> While the responses view waits for retrieval, it presents its loading state.

## Step 1

At {{start_url}}, sign in to NIARVA with {{owner_email}} and {{owner_password}} and open the owner's workspace.

## Step 2 @verifies ac-115, ac-106, ac-107

In the owner's workspace at {{start_url}}, open the responses view for {{response_delayed_form_name}} while its configured response retrieval remains pending, then assert its loading state is shown to the owner and no raw sensitive verification evidence appears while the request is pending.
