# UX-02: a creator can delete a draft they no longer need

> Checked on 18 November 2026 with Kane CLI against a local production build. Synthetic data only; the account password and share links are not recorded.

## Change

Requested by the owner: drafts that are no longer used should be removable from the forms list.

- **API.** `DELETE /api/v1/forms/{formId}` (same origin, owner only) deletes an unpublished draft.
  - Deleting **archives** the form (`status = archived`, `archivedAt` set). It disappears from the forms list and every API (`404`), while its immutable versions, runs, evidence, and the audit event `form.deleted` stay.
  - It is refused with `409 CONFLICT` for a form that is published or has an active publication, and for a draft whose browser verification is queued or running.
  - Another account gets `404`, as for any foreign form. A judge's read-only showcase list has no delete control.
- **UI.**
  - Each draft row on the forms page has a **Delete** button outside the row link.
  - Clicking it shows an inline confirmation, "Delete this draft? It disappears from your forms; its versions and audit trail are kept.", with **Cancel** and **Delete draft**.
  - Errors appear in the row with `role="alert"`.
- **Native.** `apps/web/tests/integration/delete-draft.test.ts`, 5 tests:
  - a draft is removed while its versions and audit event are kept;
  - an empty draft can be deleted;
  - a published form is refused;
  - a draft with a queued run is refused, and can be deleted after the run is canceled;
  - another account is refused.

  Lint, typecheck, and build pass; 119 tests pass.

## Kane CLI check

| Item | Value |
|---|---|
| Server | `next start --port 3600`, embedded PGlite, environment `local-judge-3600`, branch `feature/delete-draft-forms` |
| Fixture | a new synthetic `@niarva.test` account with two drafts, "Keep This Draft" and "Unused Event Draft" |
| Run | `node scripts/kane-locked.mjs run … --agent --headless`. Kane opens Delete on "Unused Event Draft", cancels, then deletes it |
| Kane status | `passed`, 203 s, 45.38 credits; session `87b3b4a3-c370-4f9b-a5de-0901c03b0c02`; evidence pack SHA-256 `ade48d18152321dafe269c40a09dd9d71c34461f80513db5c5bd9617430ffca8` (private) |
| `confirm_text` | "Delete this draft? It disappears from your forms; its versions and audit trail are kept." |
| `listed_after_cancel` | `true` |
| `listed_after_delete` | `false` |
| `other_draft_listed` | `true` |
| Server afterwards (direct API, owner) | "Unused Event Draft" `404`; "Keep This Draft" `200` |
| **Verdict (NIARVA's oracle: confirmation text, cancel keeps the draft, delete removes only that draft, server agrees)** | **PASS** |
