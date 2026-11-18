---
assurance:
  id: t-59
  base: sha256:8b1a0db4f20ba455e1a90383abf17bfeecda9a329e6b7203262598400ccc44e0
---
# Judge sees labelled seeded GPA mismatch as real FAIL

> At the synthetic golden-case threshold, show the deliberately seeded gt-versus-gte mismatch as a labelled demonstration defect rather than a naturally discovered failure or a live PASS.

## Step 1 @verifies ac-126, ac-127, ac-131

From {{start_url}}, enter the NIARVA judge demo using {{scoped_judge_email}} and {{scoped_judge_password}} and open the synthetic scholarship example identified as {{seeded_gt_form_name}}, then assert the real demo path is accessible without requesting disclosure of a private provider secret and the sample is identified as synthetic.

## Step 2 @verifies ac-130, ac-134, ac-137

On the seeded scholarship example, inspect the intentional GPA 3.5 comparator defect and its verification report, then assert the label reads `Seeded defect for demonstration` and the approved `gte(gpa, 3.5)` claim versus seeded `gt(gpa, 3.5)` rule is classified FAIL at GPA 3.5 rather than shown as a live PASS.

## Step 3 @verifies ac-128

From the failed verification report for the seeded scholarship example, inspect the judge-accessible sanitized proof detail, then assert it contains the run ID, objective, expected and observed result, evidence pack reference and version lineage.
