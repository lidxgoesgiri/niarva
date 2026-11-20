import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Actor } from "../context/session";
import { getDb } from "../db/client";
import { forms, probeRuns, verificationRuns } from "../db/schema";
import { ApiError } from "../http/errors";
import { audit } from "./audit";
import { isJudge, showcaseFormIds } from "./demo-access";
import { loadOwnedForm } from "./intent.service";

export type FormListItem = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "closed" | "archived";
  updatedAt: Date;
};

/** Forms of the actor's own workspace, newest first. Never crosses the workspace boundary. */
export async function listForms(actor: Actor): Promise<FormListItem[]> {
  const db = await getDb();
  return db
    .select({
      id: forms.id,
      title: forms.title,
      slug: forms.slug,
      status: forms.status,
      updatedAt: forms.updatedAt,
    })
    .from(forms)
    .where(and(eq(forms.workspaceId, actor.workspaceId), isNull(forms.archivedAt)))
    .orderBy(desc(forms.updatedAt))
    .limit(100);
}

/** Demo showcase forms a judge may read (read-only); empty for everyone else. */
export async function listShowcaseForms(actor: Actor): Promise<FormListItem[]> {
  const ids = showcaseFormIds();
  if (!isJudge(actor) || ids.length === 0) return [];
  const db = await getDb();
  return db
    .select({ id: forms.id, title: forms.title, slug: forms.slug, status: forms.status, updatedAt: forms.updatedAt })
    .from(forms)
    .where(and(inArray(forms.id, ids), isNull(forms.archivedAt)))
    .orderBy(desc(forms.updatedAt));
}

/**
 * Deletes a draft the creator no longer needs. The form is archived, not erased: it disappears
 * from the workspace and every API (404), while its versions, runs, evidence, and audit trail stay
 * immutable. Only an unpublished draft can be deleted. Its queued or running verifications, on any
 * version, are canceled in the same transaction (an earlier version's run may have no cancel control
 * in view), and each cancellation is audited.
 */
export async function deleteDraftForm(actor: Actor, formId: string, requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const form = await loadOwnedForm(tx, actor, formId, true);
    if (form.status !== "draft" || form.activePublicationId !== null) {
      throw new ApiError("CONFLICT", "Only a draft can be deleted. Unpublish the form first.");
    }
    const now = new Date();
    const active = await tx
      .select({ id: verificationRuns.id })
      .from(verificationRuns)
      .where(and(eq(verificationRuns.formId, formId), inArray(verificationRuns.state, ["QUEUED", "RUNNING"])));
    for (const run of active) {
      await tx.update(probeRuns).set({ status: "canceled", finishedAt: now }).where(and(eq(probeRuns.verificationRunId, run.id), eq(probeRuns.status, "queued")));
      await tx.update(verificationRuns).set({ state: "CANCELED", canceledAt: now, completedAt: now }).where(eq(verificationRuns.id, run.id));
      await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "verification.canceled", entityType: "verification_run", entityId: run.id, requestId });
    }
    await tx.update(forms).set({ status: "archived", archivedAt: now, updatedAt: now }).where(eq(forms.id, formId));
    await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "form.deleted", entityType: "form", entityId: formId, requestId });
    return { deleted: true, canceledRuns: active.length };
  });
}
