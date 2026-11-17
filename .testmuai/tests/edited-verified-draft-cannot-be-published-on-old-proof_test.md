---
assurance:
  id: t-22
  base: sha256:d96cac6271c3fc55fc01cc8142c03c9d91ec61d66cdf34f05e070b24eb001eb1
---
# Edited verified draft cannot be published on old proof

> After a previously verified immutable version, a behavior-affecting edit leaves the new draft stale and its publication request is denied with a reason or conflict.

## Step 1

Open {{start_url}} in the browser and sign in to NIARVA as the creator using {{owner_email}} and {{owner_password}}.

## Step 2

In the creator workspace, open {{owned_form_name}} at its previously verified immutable version and navigate to the draft editor.

## Step 3

capture baseline: verification status for the prior immutable version of {{owned_form_name}}

## Step 4 @verifies ac-53

In the draft editor for {{owned_form_name}}, make a behavior-affecting form edit and inspect the resulting new draft, then assert that the new draft's verification is stale relative to the previously VERIFIED version.

## Step 5 @verifies ac-47, ac-52

On the new draft's Publish screen, request publication, then assert a stale conflict or blocked reason is shown and the unverified edited draft has not been published.
