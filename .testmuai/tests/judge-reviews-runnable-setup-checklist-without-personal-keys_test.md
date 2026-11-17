---
assurance:
  id: t-63
  base: sha256:b1bc63ef9e9befcfc011965cae1b1504d152259e38c0b87d2b53fdf52f065244
---
# Judge reviews runnable setup checklist without personal keys

> From the judge-facing project material, find the documented prerequisites, pinned versions, environment placeholders, migration/seed, startup of web and worker, Kane auth, sanity checks and known costs/limits without personal keys.

## Step 1 @verifies ac-135

From {{repo_url}}, open NIARVA's judge-facing README and setup guidance, then assert the guidance covers prerequisites, pinned versions, environment placeholders, migration and seed, starting web and worker, Kane authentication, sanity checks and known costs and limits.

## Step 2 @verifies ac-136

While reviewing NIARVA's judge-facing setup material, inspect its environment example and credential guidance, then assert no personal provider keys appear in the material.
