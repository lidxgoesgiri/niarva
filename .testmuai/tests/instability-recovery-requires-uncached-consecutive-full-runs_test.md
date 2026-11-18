---
assurance:
  id: t-16
  base: sha256:b7fc464f23f51dc041f502b38fe0e55ce45e4e5746e1267c60102f113fa2f545
---
# Instability recovery requires uncached consecutive full runs

> After full FAILED for the same proof key, bypass cached VERIFIED evidence and clear BROWSER_UNSTABLE only on two consecutive newly executed complete full VERIFIED runs; UNKNOWN resets streak.

## Step 1

At {{start_url}}, sign in to NIARVA as the creator with {{owner_email}} and {{owner_password}} and open the verification history of the isolated form {{unstable_form_name}} with a full FAILED attempt and a reusable cached VERIFIED attempt sharing its proof key.

## Step 2 @verifies ac-40

From this unresolved BROWSER_UNSTABLE history, request another full verification without force and inspect its run ID and cached flag, then assert the new request reports cached=false rather than reusing the earlier VERIFIED attempt.

## Step 3 @verifies ac-41

For the same form and exact proof key, reach a second newly executed complete full VERIFIED attempt after the first newly executed complete full VERIFIED attempt and inspect the chronological run history, then assert instability clears only after two consecutive newly executed complete full VERIFIED runs.
