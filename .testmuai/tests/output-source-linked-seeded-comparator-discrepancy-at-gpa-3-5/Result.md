---
test: ../source-linked-seeded-comparator-discrepancy-at-gpa-3-5_test.md
status: passed
started: 2026-11-17T14:28:03.288Z
duration_s: 312
session_id: 6bedd08a-1072-47ba-951a-80a06715326d
---

# Source-linked seeded comparator discrepancy at GPA 3.5 — Result

## Step 1 ✓ passed (16.01s)
md5: d2c0d16d638c6173b69643452df7583c
At {{start_url}}, sign in to NIARVA with {{owner_email}} and {{owner_password}} and open the creator workspace for the isolated synthetic scholarship form {{seeded_gt_form_name}}.

## Step 2 ✓ passed (42.2s)
md5: 6df8804a03e1f83ee06be3107ef33d79
In the form's approved-claims review, locate C-GPA and open its Intent Trace in the verification workspace, then assert the probe expectation is derived from approved gte(gpa, 3.5), not the generated gt rule.

## Step 3 ✓ passed (35.9s)
md5: ee04808d80ef4530392725224a220e06
In the Intent Trace's claim-to-rule discrepancy, inspect the counterexample for C-GPA, then assert GPA 3.5 is identified as the witness for approved gte versus generated gt.

## Step 4 ✓ passed (36s)
md5: 3fba870524cbd7c268d6aea5eb0e422a
In that discrepancy's source reference, inspect the approved C-GPA origin, then assert the mismatch maps to the source-backed approved claim.

## Step 5 ✓ passed (32.8s)
md5: cf92de1626081e01057f1904514186c0
In the isolated seeded defect's trace presentation, inspect its demonstration status, then assert 'Seeded defect for demonstration' is shown.

## Step 6 ✓ passed (52.4s)
md5: d513806e61c48c5a15b71c933174ab26
In the GPA 3.5 discrepancy explanation, inspect the actual observed consequence, then assert there is no claim of applicant rejection without an observed rejection when the observation is a missing certificate field.

## Step 7 ✓ passed (44.6s)
md5: 212551d7447c007fc9e4db2c48b64a76
In the verification workspace's trace and browser-proof status for this form, inspect the structural mismatch and its observation status, then assert structural comparison alone is not presented as established browser correctness.
