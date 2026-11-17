---
assurance:
  id: t-33
  base: sha256:e936900882f79ca10e8ea425fe51b7d7c03c719fdce4c74065cf0e0252067dc6
---
# Executable rule expressions are not accepted as DSL

> A creator cannot save an executable JavaScript, eval or shell expression as a declarative form rule.

## Step 1

Open {{start_url}} in the browser, sign in to NIARVA using {{owner_email}} and {{owner_password}}, and open the creator's form builder for {{owned_form_name}}.

## Step 2 @verifies ac-74, ac-73

Through the form-version configuration operation at {{config_api_url}}, attempt to save a rule containing arbitrary JavaScript in place of a typed declarative condition, then assert the executable rule is not accepted or stored as a supported rule.

## Step 3 @verifies ac-74

Through the same form-version operation at {{config_api_url}}, attempt an `eval` expression as a condition, then assert it is not accepted as a form rule.

## Step 4 @verifies ac-74

Through the same form-version operation at {{config_api_url}}, attempt a shell expression as a condition, then assert it is not accepted as a form rule.
