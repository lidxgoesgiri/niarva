---
assurance:
  id: t-27
  base: sha256:cb26986dc66e10c5dd1b93feedf6432f616204c58b2a9212e2834c1b0e68be0a
---
# Provider outage retains manual approval and proof gate

> Provider outage permits clearly labeled manual drafting and approval while not permitting unproven publication.

## Step 1

At {{start_url}}, sign in to the NIARVA creator workspace with {{owner_email}} and {{owner_password}} and open the create/builder workflow in the {{provider_outage_fixture}} environment.

## Step 2 @verifies ac-67

Request extraction while the provider is unavailable and inspect the application request result in the browser network view, then assert its HTTP status is 503.

## Step 3 @verifies ac-68

In the builder's manual claim drafting workflow, draft the scholarship certificate rule for GPA 3.5 or higher, then assert the claim is clearly labeled as manually drafted.

## Step 4 @verifies ac-64

Approve the manually drafted claims and attempt to publish this unverified draft through the creator publish workflow, then assert no publication of the manually drafted claims occurs without required live proof.
