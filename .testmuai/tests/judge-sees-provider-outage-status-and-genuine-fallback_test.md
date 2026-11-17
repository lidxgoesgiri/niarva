---
assurance:
  id: t-61
  base: sha256:a861199a199bb36406be54017e84db3651516871a04ce7020bf6ae0a2849250e
---
# Judge sees provider outage status and genuine fallback

> During a real or controlled provider-unavailable state, see explicit unavailable/error status and a recorded real run or backup deployment, without any synthetic PASS masquerading as live verification.

## Step 1 @verifies ac-126, ac-127

From {{start_url}}, enter the NIARVA judge demo with {{scoped_judge_email}} and {{scoped_judge_password}} and reach the provider-unavailable demonstration state identified by {{provider_outage_fixture}}, then assert this is a reachable real judge path that requires no disclosure of a private provider secret.

## Step 2 @verifies ac-132, ac-134

In the provider-unavailable state of the NIARVA judge demo, inspect the service status and proof result, then assert an explicit provider-unavailable or error status appears and no synthetic result is presented as a live PASS.

## Step 3 @verifies ac-133

From the judge demo's unavailable-provider status, follow its fallback material, then assert a recorded real run or backup deployment is accessible.
