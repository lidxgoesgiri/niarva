import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getActor, requireActor, assertWorkspace } from "@/server/context/session";
import type { Db } from "@/server/db/client";
import { forms, workspaceMembers, workspaces } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import { uuidv7 } from "@/server/ids";
import { listForms } from "@/server/services/form.service";
import { bootTestApp, createCreator } from "../support/test-app";

// FR-01 / AC-01 — creator access and tenant isolation (test matrix T-04, T-15).
describe("creator access", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ db, close } = await bootTestApp());
  });
  afterAll(async () => {
    await close();
  });

  it("creates exactly one personal workspace with an owner membership at sign-up", async () => {
    const { actor } = await createCreator("owner");
    const owned = await db.select().from(workspaces).where(eq(workspaces.ownerId, actor.userId));
    expect(owned).toHaveLength(1);
    expect(owned[0]?.id).toBe(actor.workspaceId);
    const members = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, actor.workspaceId));
    expect(members).toEqual([expect.objectContaining({ userId: actor.userId, role: "owner" })]);
  });

  it("resolves no actor without a session and rejects protected calls", async () => {
    expect(await getActor(new Headers())).toBeNull();
    await expect(requireActor(new Headers())).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    });
  });

  it("rejects a forged session cookie", async () => {
    const forged = new Headers({ cookie: "niarva.session_token=forged.value" });
    expect(await getActor(forged)).toBeNull();
  });

  it("lists only the forms of the actor's own workspace", async () => {
    const alice = await createCreator("alice");
    const bob = await createCreator("bob");
    await db.insert(forms).values({
      id: uuidv7(),
      workspaceId: alice.actor.workspaceId,
      title: "Alice private form",
      slug: `alice-${uuidv7().slice(-8)}`,
      createdBy: alice.actor.userId,
    });

    const aliceForms = await listForms(alice.actor);
    const bobForms = await listForms(bob.actor);
    expect(aliceForms.map((form) => form.title)).toEqual(["Alice private form"]);
    expect(bobForms).toEqual([]);
  });

  it("reports a foreign workspace resource as missing, not as forbidden", async () => {
    const alice = await createCreator("alice");
    const bob = await createCreator("bob");
    let thrown: unknown;
    try {
      assertWorkspace(bob.actor, alice.actor.workspaceId, "Form");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown).toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(() => assertWorkspace(alice.actor, alice.actor.workspaceId)).not.toThrow();
  });
});
