import type { FormDefinition } from "@niarva/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/context/session";
import { getDb } from "@/server/db/client";
import { approveClaims, createForm } from "@/server/services/intent.service";
import { getFormState } from "@/server/services/state.service";
import { generateVersion, saveEdits, snapshotVersion } from "@/server/services/version.service";
import { bootTestApp, createCreator } from "../support/test-app";

// ac-73 / FR-06 — found by Kane test t-33, which typed "alert(1)" into a numeric rule condition:
// the edit was saved as a version and the form's workspace then failed to load.
describe("invalid manual edits", () => {
  let close: () => Promise<void>;
  let owner: Actor;
  let formId: string;

  beforeAll(async () => {
    ({ close } = await bootTestApp());
    ({ actor: owner } = await createCreator("invalid-edit-owner"));
    ({ formId } = await createForm(owner, { source: "template", template: "scholarship" }, "test"));
    const state = await getFormState(owner, formId);
    await approveClaims(owner, formId, { revision: state.claimSet!.revision }, "test");
    await generateVersion(owner, formId, { strategy: "skeleton" }, "test");
  });
  afterAll(async () => {
    await close();
  });

  const withLiteral = (definition: FormDefinition, value: string): FormDefinition => ({
    ...definition,
    rules: definition.rules.map((rule) => ({ ...rule, when: { kind: "cmp", field: "gpa", op: "gte", value } })),
  });

  it("rejects a rule whose numeric literal is not a number and creates no version", async () => {
    const before = await getFormState(owner, formId);
    const definition = withLiteral(before.version!.definition as FormDefinition, "alert(1)");
    await expect(saveEdits(owner, formId, { baseVersionId: before.version!.id, definition }, "test")).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      reasons: [expect.stringContaining("alert(1)")],
    });
    const after = await getFormState(owner, formId);
    expect(after.version!.id).toBe(before.version!.id);
    expect(after.versions).toHaveLength(before.versions.length);
  });

  it("still saves a valid manual edit", async () => {
    const before = await getFormState(owner, formId);
    const definition = withLiteral(before.version!.definition as FormDefinition, "3.6");
    const { versionId } = await saveEdits(owner, formId, { baseVersionId: before.version!.id, definition }, "test");
    expect(versionId).not.toBe(before.version!.id);
  });

  it("loads the workspace state of an invalid version stored before this check existed", async () => {
    const before = await getFormState(owner, formId);
    const db = await getDb();
    await db.transaction((tx) =>
      snapshotVersion(tx, {
        actor: owner,
        formId,
        claimSetId: before.version!.claimSetId,
        definition: withLiteral(before.version!.definition as FormDefinition, "alert(1)"),
        createdVia: "manual_edit",
        parentVersionId: before.version!.id,
        requestId: "test",
      }),
    );
    const state = await getFormState(owner, formId);
    expect(state.version!.versionNo).toBe(before.version!.versionNo + 1);
    expect(state.intentTrace?.rows.find((row) => row.claimKey === "C-GPA")?.boundary).toEqual([]);
  });
});
