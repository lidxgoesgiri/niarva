import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { auditEvents, claimSets, formVersions, forms } from "@/server/db/schema";
import { uuidv7 } from "@/server/ids";
import { bootTestApp, createCreator } from "../support/test-app";

/** Asserts that the database itself refused the statement through an immutability guard. */
async function expectImmutable(statement: PromiseLike<unknown>): Promise<void> {
  let thrown: unknown;
  try {
    await statement;
  } catch (error) {
    thrown = error;
  }
  expect(thrown, "statement was expected to be rejected").toBeInstanceOf(Error);
  // Drizzle wraps driver errors, so the database message is found along the cause chain.
  const messages: string[] = [];
  for (let current = thrown; current instanceof Error; current = current.cause) {
    messages.push(current.message);
  }
  expect(messages.join(" | ")).toMatch(/NIARVA_IMMUTABLE/);
}

// Database-level immutability guards (FR-03, FR-10).
describe("immutability guards", () => {
  let db: Db;
  let close: () => Promise<void>;
  let formId: string;
  let userId: string;
  let claimSetId: string;

  beforeAll(async () => {
    ({ db, close } = await bootTestApp());
    const { actor } = await createCreator("owner");
    userId = actor.userId;
    formId = uuidv7();
    await db.insert(forms).values({
      id: formId,
      workspaceId: actor.workspaceId,
      title: "Immutability fixture",
      slug: `fixture-${formId.slice(-8)}`,
      createdBy: userId,
    });
    claimSetId = uuidv7();
    await db.insert(claimSets).values({
      id: claimSetId,
      formId,
      versionNo: 1,
      origin: "manual",
      sourcePrompt: "Name is required.",
      content: { fields: [], claims: [] },
      createdBy: userId,
    });
  });
  afterAll(async () => {
    await close();
  });

  it("allows editing a draft claim set", async () => {
    await db
      .update(claimSets)
      .set({ sourcePrompt: "Name and GPA are required.", revision: 2 })
      .where(eq(claimSets.id, claimSetId));
    const [row] = await db.select().from(claimSets).where(eq(claimSets.id, claimSetId));
    expect(row?.sourcePrompt).toBe("Name and GPA are required.");
  });

  it("refuses to approve a claim set without a hash", async () => {
    // Rejected by the `claim_sets_approved_has_hash` check constraint.
    await expect(
      db.update(claimSets).set({ status: "approved" }).where(eq(claimSets.id, claimSetId)),
    ).rejects.toThrow();
    const [row] = await db.select().from(claimSets).where(eq(claimSets.id, claimSetId));
    expect(row?.status).toBe("draft");
  });

  it("freezes content, hash, and prompt once a claim set is approved", async () => {
    await db
      .update(claimSets)
      .set({ status: "approved", claimsHash: "a".repeat(64), approvedAt: new Date(), approvedBy: userId })
      .where(eq(claimSets.id, claimSetId));

    await expectImmutable(
      db.update(claimSets).set({ content: { fields: [], claims: ["tampered"] } }).where(eq(claimSets.id, claimSetId)),
    );
    await expectImmutable(db.update(claimSets).set({ claimsHash: "b".repeat(64) }).where(eq(claimSets.id, claimSetId)));
    await expectImmutable(db.update(claimSets).set({ status: "draft" }).where(eq(claimSets.id, claimSetId)));
    await expectImmutable(db.delete(claimSets).where(eq(claimSets.id, claimSetId)));

    // The lifecycle transition to "superseded" stays possible.
    await db.update(claimSets).set({ status: "superseded" }).where(eq(claimSets.id, claimSetId));
  });

  it("rejects any update or delete of a form version", async () => {
    const versionId = uuidv7();
    await db.insert(formVersions).values({
      id: versionId,
      formId,
      versionNo: 1,
      claimSetId,
      definition: { schemaVersion: 1 },
      definitionHash: "c".repeat(64),
      schemaVersion: 1,
      createdVia: "manual_edit",
      createdBy: userId,
    });
    await expectImmutable(db.update(formVersions).set({ definitionHash: "d".repeat(64) }).where(eq(formVersions.id, versionId)));
    await expectImmutable(db.delete(formVersions).where(eq(formVersions.id, versionId)));
  });

  it("keeps the audit trail append-only", async () => {
    const id = uuidv7();
    await db.insert(auditEvents).values({
      id,
      workspaceId: uuidv7(),
      actorType: "user",
      actorId: userId,
      action: "test.created",
      entityType: "form",
      entityId: formId,
    });
    await expectImmutable(db.update(auditEvents).set({ action: "test.rewritten" }).where(eq(auditEvents.id, id)));
    await expectImmutable(db.delete(auditEvents).where(eq(auditEvents.id, id)));
  });
});
