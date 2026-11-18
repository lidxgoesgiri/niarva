---
assurance:
  id: t-62
  base: sha256:ec8eb562b8c1de36ad8dad48f9f53f04b915e85447662a173cf656613af5e05f
---
# Scoped judge enters synthetic demo without private provider key

> Use limited judge credentials or a judge-owned account to reach the real demo without requiring private provider secret disclosure.

## Step 1 @verifies ac-126, ac-127, ac-131

From {{start_url}}, sign in to NIARVA's judge demo with {{scoped_judge_email}} and {{scoped_judge_password}} and open its sample, then assert the real demo path is available, the sample is identified as synthetic, and no private provider secret must be disclosed to access it.
