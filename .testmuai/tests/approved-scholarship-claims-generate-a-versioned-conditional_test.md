---
assurance:
  id: t-36
  base: sha256:7cadcd28e76bd60c59d8f9285c6b21ed6eccf1c7911eb8dd2ec931a3b778ea08
---
# Approved scholarship claims generate a versioned conditional form

> Creator approves the specified scholarship claim and generates a form with Name, GPA and certificate rule for GPA 3.5 or higher, tied to a version.

## Step 1

Open {{start_url}} in the browser and sign in to NIARVA as creator with {{owner_email}} and {{owner_password}}.

## Step 2

In the NIARVA creator builder, create a scholarship application from `Create a scholarship application. Name and GPA are required. Applicants with a GPA of 3.5 or higher must provide an achievement certificate. Applicants below 3.5 must not see that field.` and review and approve the resulting claim for `gte(gpa, 3.5) → certificate visible AND required`.

## Step 3 @verifies ac-78, ac-79

Generate the form from those approved scholarship claims and inspect its field editor or shared preview, then assert a Name field and a GPA field are present.

## Step 4 @verifies ac-80, ac-72, ac-74

In the generated form's rule view, inspect the certificate rule against its approved source claim, then assert the rule is the declarative `gte(gpa, 3.5) → certificate visible AND required`, maps to the approved claim, and is not executable JavaScript, eval or shell.

## Step 5 @verifies ac-81

In the generated form's version view, inspect the saved configuration, then assert a generated form version exists.
