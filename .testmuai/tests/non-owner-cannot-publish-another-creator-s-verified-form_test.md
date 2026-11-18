---
assurance:
  id: t-23
  base: sha256:91460524ce944cba194fbb6c818dfca4d913c913128afba544b5c72b1c919840
---
# Non-owner cannot publish another creator's verified form

> A different signed-in user invokes publish for another owner's verified form and receives denial without publication.

## Step 1

Open {{start_url}} in the browser and sign in to NIARVA as a different creator using {{nonowner_email}} and {{nonowner_password}}.

## Step 2

Identify the application publish API operation and the owned form {{owned_form_name}} belonging to the other creator, without obtaining that creator's session.

## Step 3 @verifies ac-52

Invoke publish directly through the application's API for the other creator's form, then assert a safe denial or conflict response is returned.

## Step 4 @verifies ac-48

Inspect the other creator's active publication through an authorized observation after the denied call, then assert the non-owner's request created no publication.
