import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/context/session";
import type { Db } from "@/server/db/client";
import { auditEvents, formVersions, forms } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import { deleteDraftForm, listForms } from "@/server/services/form.service";
import { approveClaims, createForm } from "@/server/services/intent.service";
import { getFormState } from "@/server/services/state.service";
import { cancelRun, requestVerification } from "@/server/services/verification.service";
import { generateVersion } from "@/server/services/version.service";
import { bootTestApp, createCreator } from "../support/test-app";

// A creator can delete a draft they no longer need. Deleting archives the form: it is gone from the
// workspace and every API, while its immutable versions and audit trail stay.
describe("deleting a draft form", () => {
  let db: Db;
  let close: () => Promise<void>;
  let owner: Actor;
  let other: Actor;

  async function draft(title: string, withVersion = true) {
    const { formId } = await createForm(owner, { source: "template", template: "scholarship", title }, "test");
    if (withVersion) {
      const state = await getFormState(owner, formId);
      await approveClaims(owner, formId, { revision: state.claimSet!.revision }, "test");
      await generateVersion(owner, formId, { strategy: "seeded_demo" }, "test");
    }
    return formId;
  }

  const rejects = (promise: Promise<unknown>, code: string) =>
    expect(promise).rejects.toSatisfy((error: unknown) => error instanceof ApiError && error.code === code);

  beforeAll(async () => {
    ({ db, close } = await bootTestApp());
    ({ actor: owner } = await createCreator("delete-owner"));
    ({ actor: other } = await createCreator("delete-other"));
  });
  afterAll(async () => {
    await close();
  });

  it("removes a draft from the workspace and every API, and keeps its versions and audit trail", async () => {
    const formId = await draft("Unused draft");
    expect(await deleteDraftForm(owner, formId, "test")).toEqual({ deleted: true });
    expect((await listForms(owner)).map((form) => form.id)).not.toContain(formId);
    await rejects(getFormState(owner, formId), "NOT_FOUND");
    await rejects(deleteDraftForm(owner, formId, "test"), "NOT_FOUND");
    const [row] = await db.select().from(forms).where(eq(forms.id, formId));
    expect(row?.status).toBe("archived");
    expect(row?.archivedAt).not.toBeNull();
    expect(await db.select().from(formVersions).where(eq(formVersions.formId, formId))).not.toHaveLength(0);
    expect(await db.select().from(auditEvents).where(and(eq(auditEvents.entityId, formId), eq(auditEvents.action, "form.deleted")))).toHaveLength(1);
  });

  it("deletes a draft that has no version yet", async () => {
    const formId = await draft("Empty draft", false);
    expect(await deleteDraftForm(owner, formId, "test")).toEqual({ deleted: true });
  });

  it("refuses a published form", async () => {
    const formId = await draft("Live form");
    await db.update(forms).set({ status: "published" }).where(eq(forms.id, formId));
    await rejects(deleteDraftForm(owner, formId, "test"), "CONFLICT");
    expect((await listForms(owner)).map((form) => form.id)).toContain(formId);
  });

  it("refuses while a verification is queued, and allows it after the run is canceled", async () => {
    const formId = await draft("Draft under verification");
    const state = await getFormState(owner, formId);
    const { runId } = await requestVerification(owner, formId, state.version!.id, { mode: "diagnostic", force: false }, "test");
    await rejects(deleteDraftForm(owner, formId, "test"), "CONFLICT");
    await cancelRun(owner, formId, runId, "test");
    expect(await deleteDraftForm(owner, formId, "test")).toEqual({ deleted: true });
  });

  it("never lets another account delete the draft", async () => {
    const formId = await draft("Someone else's draft");
    await rejects(deleteDraftForm(other, formId, "test"), "NOT_FOUND");
    expect((await listForms(owner)).map((form) => form.id)).toContain(formId);
  });
});
