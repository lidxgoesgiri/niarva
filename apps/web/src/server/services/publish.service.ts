import "server-only";
import { ENGINE_VERSION, GATE_REASON_TEXT, evaluateGate, type GateResult, type RunState } from "@niarva/core";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Actor } from "../context/session";
import { getDb, type DbOrTx } from "../db/client";
import { analysisRuns, forms, formVersions, publications, submissions, verificationRuns } from "../db/schema";
import { ApiError } from "../http/errors";
import { uuidv7 } from "../ids";
import { audit } from "./audit";
import { latestClaimSet, loadOwnedForm } from "./intent.service";
import { latestVersion } from "./version.service";
import { currentVerificationKey, fullRunHistory } from "./verification.service";

const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/;

export type GateView = GateResult & { versionId: string | null; reasonTexts: string[]; latestRunId: string | null };

/** Computes the gate for the form's latest version. Used both for display and inside the publish transaction. */
export async function gateFor(tx: DbOrTx, form: typeof forms.$inferSelect, acknowledgedWarningKeys: string[] = []): Promise<GateView> {
  const version = await latestVersion(tx, form.id);
  const empty = { versionId: null, latestRunId: null };
  if (!version) {
    const result = evaluateGate({
      claimSet: { approved: false, hashMatches: false },
      analysis: null,
      latestFullRun: null,
      history: [],
      acknowledgedWarningKeys,
      manualClaimKeys: [],
      acknowledgedManualClaimKeys: [],
      slug: { valid: SLUG.test(form.slug), available: true },
      formArchived: form.archivedAt !== null,
    });
    return { ...result, ...empty, reasonTexts: result.reasons.map((reason) => GATE_REASON_TEXT[reason] ?? reason) };
  }
  const identity = await currentVerificationKey(tx, version, form.workspaceId);
  const approvedNow = await latestClaimSet(tx, form.id);
  const history = identity?.key ? await fullRunHistory(tx, version.id, identity.key) : [];
  const finished = history.filter((run) => run.state !== "QUEUED" && run.state !== "RUNNING");
  const latestRun = history[history.length - 1] ?? null;
  // Any newer run under a different key (renderer, config, policy changed) means the old proof is stale.
  const [anyFull] = await tx
    .select({ id: verificationRuns.id, state: verificationRuns.state, verificationKey: verificationRuns.verificationKey })
    .from(verificationRuns)
    .where(and(eq(verificationRuns.formVersionId, version.id), eq(verificationRuns.mode, "full")))
    .orderBy(desc(verificationRuns.requestedAt))
    .limit(1);
  const staleOnly = !latestRun && anyFull !== undefined;

  const manualClaimKeys = ((identity?.claimSet.content as { claims?: { kind: string; key: string; reviewState: string }[] })?.claims ?? [])
    .filter((claim) => claim.kind === "MANUAL" && claim.reviewState !== "rejected")
    .map((claim) => claim.key);
  const warningKeys = ((identity?.analysis?.findings ?? []) as { key: string; severity: string }[]).filter((finding) => finding.severity === "warning").map((finding) => finding.key);

  const result = evaluateGate({
    claimSet: {
      approved: identity?.claimSet.status === "approved" && approvedNow?.id === identity.claimSet.id,
      hashMatches: Boolean(identity?.claimSet.claimsHash),
    },
    analysis: identity?.analysis ? { verdict: identity.analysis.verdict, current: identity.analysis.engineVersion === ENGINE_VERSION, warningKeys } : null,
    latestFullRun: latestRun ? { state: latestRun.state as RunState, fresh: true } : staleOnly ? { state: anyFull!.state as RunState, fresh: false } : null,
    history: finished.map((run) => ({ state: run.state as RunState, cached: false })),
    acknowledgedWarningKeys,
    manualClaimKeys,
    acknowledgedManualClaimKeys: manualClaimKeys,
    slug: { valid: SLUG.test(form.slug), available: true },
    formArchived: form.archivedAt !== null,
  });
  return {
    ...result,
    versionId: version.id,
    latestRunId: latestRun?.id ?? null,
    reasonTexts: result.reasons.map((reason) => GATE_REASON_TEXT[reason] ?? reason),
  };
}

export const publishInput = z.object({
  versionId: z.string().uuid(),
  acknowledgedWarningKeys: z.array(z.string().max(64)).max(50).default([]),
});

/**
 * Atomic publication. The form row and the active publication are locked; the gate is evaluated
 * inside the transaction against the latest version. The UI never authorizes publication.
 */
export async function publish(actor: Actor, formId: string, input: z.infer<typeof publishInput>, requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const form = await loadOwnedForm(tx, actor, formId, true);
    await tx.select({ id: publications.id }).from(publications).where(and(eq(publications.formId, formId), sql`${publications.unpublishedAt} is null`)).for("update");
    const version = await latestVersion(tx, formId);
    if (!version || version.id !== input.versionId) {
      throw new ApiError("GATE_BLOCKED", "Only the latest version can be published.", { reasons: ["NOT_LATEST_VERSION"] });
    }
    const gate = await gateFor(tx, form, input.acknowledgedWarningKeys);
    if (!gate.eligible || !gate.latestRunId) {
      await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "publication.blocked", entityType: "form_version", entityId: version.id, metadata: { reasons: gate.reasons }, requestId });
      throw new ApiError("GATE_BLOCKED", "This version cannot be published yet.", { reasons: gate.reasons });
    }
    const [analysis] = await tx.select({ id: analysisRuns.id }).from(analysisRuns).where(eq(analysisRuns.formVersionId, version.id)).orderBy(desc(analysisRuns.createdAt)).limit(1);
    const [{ historical } = { historical: 0 }] = await tx.select({ historical: count() }).from(submissions).where(eq(submissions.formId, formId));

    await tx.update(publications).set({ unpublishedAt: new Date(), unpublishedBy: actor.userId }).where(and(eq(publications.formId, formId), sql`${publications.unpublishedAt} is null`));
    const publicationId = uuidv7();
    await tx.insert(publications).values({
      id: publicationId,
      workspaceId: actor.workspaceId,
      formId,
      formVersionId: version.id,
      analysisRunId: analysis!.id,
      verificationRunId: gate.latestRunId,
      gateResult: { reasons: gate.reasons, instability: gate.instability, evaluatedAt: new Date().toISOString() },
      slug: form.slug,
      responseCount: historical,
      publishedBy: actor.userId,
    });
    await tx.update(forms).set({ status: "published", activePublicationId: publicationId, updatedAt: new Date() }).where(eq(forms.id, formId));
    await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "publication.created", entityType: "publication", entityId: publicationId, afterHash: version.definitionHash, metadata: { versionNo: version.versionNo, verificationRunId: gate.latestRunId }, requestId });
    return { publicationId, slug: form.slug, versionNo: version.versionNo };
  });
}

export async function unpublish(actor: Actor, formId: string, requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await loadOwnedForm(tx, actor, formId, true);
    await tx.update(publications).set({ unpublishedAt: new Date(), unpublishedBy: actor.userId }).where(and(eq(publications.formId, formId), sql`${publications.unpublishedAt} is null`));
    await tx.update(forms).set({ status: "draft", activePublicationId: null, updatedAt: new Date() }).where(eq(forms.id, formId));
    await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "publication.unpublished", entityType: "form", entityId: formId, requestId });
    return { ok: true };
  });
}

/** Public view of an active publication, with its proof label computed at request time. */
export async function publicForm(slug: string) {
  const db = await getDb();
  const [form] = await db.select().from(forms).where(eq(forms.slug, slug));
  if (!form) return null;
  const [publication] = await db.select().from(publications).where(and(eq(publications.formId, form.id), sql`${publications.unpublishedAt} is null`));
  if (!publication) return { form, publication: null, version: null, label: null };
  const [version] = await db.select().from(formVersions).where(eq(formVersions.id, publication.formVersionId));
  const [run] = await db.select().from(verificationRuns).where(eq(verificationRuns.id, publication.verificationRunId));
  const identity = version ? await currentVerificationKey(db, version, form.workspaceId) : null;
  const fresh = Boolean(run && identity?.key && run.verificationKey === identity.key);
  return {
    form,
    publication,
    version: version ?? null,
    label: { kind: fresh ? ("FULLY_VERIFIED" as const) : ("BROWSER_EVIDENCE_STALE" as const), verifiedAt: run?.completedAt ?? null },
  };
}

