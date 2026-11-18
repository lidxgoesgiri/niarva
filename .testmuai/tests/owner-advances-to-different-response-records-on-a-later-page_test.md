---
assurance:
  id: t-50
  base: sha256:c0337715d0f79a6b775e2d5f02eaf53e091b917ad9ab15881249da591182b4e0
---
# Owner advances to different response records on a later page

> Owner navigates response pages and reviews the actual records on each page, including a later page, rather than only the presence of page controls.

## Step 1

At {{start_url}}, sign in to NIARVA with {{owner_email}} and {{owner_password}} and open the owner's workspace.

## Step 2

In the owner's workspace at {{start_url}}, open the responses view of {{paginated_form_name}} and store the first page's response receipts as first_page_receipts.

## Step 3 @verifies ac-112, ac-106, ac-107

In that responses view for {{paginated_form_name}}, navigate to a later page and compare its response receipts with first_page_receipts, then assert at least one displayed response was absent from the first page, the responses remain accessible to the owner, and neither the displayed page nor its browser network response contains raw sensitive verification evidence.
