---
test: ../approved-scholarship-claims-generate-a-versioned-conditional_test.md
status: passed
started: 2026-11-17T14:58:25.422Z
duration_s: 179
session_id: 4fd8a926-45f8-4886-b6f3-c8299624a4c7
---

# Approved scholarship claims generate a versioned conditional form — Result

## Step 1 ✓ passed (5.38s)
md5: 83ed894fbfd2261d3e9fd14a201b1d72
Open {{start_url}} in the browser and sign in to NIARVA as creator with {{owner_email}} and {{owner_password}}.

## Step 2 ✓ passed (62.09s)
md5: e1b9ca7fdeab5567e1c0ccabfabb3de8
In the NIARVA creator builder, create a scholarship application from `Create a scholarship application. Name and GPA are required. Applicants with a GPA of 3.5 or higher must provide an achievement certificate. Applicants below 3.5 must not see that field.` and review and approve the resulting claim for `gte(gpa, 3.5) → certificate visible AND required`.

## Step 3 ✓ passed (1.12s)
md5: 4fbb1cbfa577f6cd183119f768ae2448
Generate the form from those approved scholarship claims and inspect its field editor or shared preview, then assert a Name field and a GPA field are present.

## Step 4 ✓ passed (2.16s)
md5: 2d53d67faaa287972447b360079b7186
In the generated form's rule view, inspect the certificate rule against its approved source claim, then assert the rule is the declarative `gte(gpa, 3.5) → certificate visible AND required`, maps to the approved claim, and is not executable JavaScript, eval or shell.

## Step 5 ✓ passed (97.1s)
md5: 8e708ec650a7a235f908d85e96a37a50
In the generated form's version view, inspect the saved configuration, then assert a generated form version exists.
