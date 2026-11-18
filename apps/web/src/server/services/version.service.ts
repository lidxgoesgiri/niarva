import "server-only";
import {
  GOLDEN_CLAIMS,
  analysisKey,
  analyze,
  applyPatch,
  claimSetContentSchema,
  claimsHash,
  definitionHash,
  deriveProbePlan,
  formDefinitionSchema,
  goldenDefinitionWithSeededDefect,
  pageIdentity,
  patchSchema,
  proposeRepairs,
  skeletonFromClaims,
  validateRepair,
  validateStructure,
  ENGINE_VERSION,
  type FormDefinition,
} from "@niarva/core";
import { and, desc, eq, max } from "drizzle-orm";
import { z } from "zod";
import type { Actor } from "../context/session";
import { getDb, type DbOrTx } from "../db/client";
import { analysisRuns, claimSets, formDrafts, formVersions, forms, repairProposals } from "../db/schema";
import { ApiError, notFound } from "../http/errors";
import { uuidv7 } from "../ids";
import { audit } from "./audit";
import { latestClaimSet, loadOwnedForm } from "./intent.service";

type Origin = "ai_generate" | "template" | "skeleton" | "manual_edit" | "repair";

/**
 * Records an immutable version (deduplicated by claims + definition) and its static analysis.
 * Static analysis runs on every snapshot, so no version ever exists without a verdict.
 */
export async function snapshotVersion(
  tx: DbOrTx,
  input: {
    actor: Actor;
    formId: string;
    claimSetId: string;
    definition: unknown;
    createdVia: Origin;
    parentVersionId?: string | null;
    repairProposalId?: string | null;
    requestId: string;
  },
): Promise<{ versionId: string; created: boolean }> {
  const parsed = formDefinitionSchema.safeParse(input.definition);
  // Structurally invalid definitions are still recorded so the creator can see why they fail.
  const definition = (parsed.success ? parsed.data : input.definition) as FormDefinition;
  const hash = parsed.success ? definitionHash(parsed.data) : definitionHash(input.definition as FormDefinition);

  const [existing] = await tx
    .select({ id: formVersions.id })
    .from(formVersions)
    .where(and(eq(formVersions.formId, input.formId), eq(formVersions.claimSetId, input.claimSetId), eq(formVersions.definitionHash, hash)));
  let versionId = existing?.id;
  let created = false;
  if (!versionId) {
    const [{ value: lastNo } = { value: 0 }] = await tx.select({ value: max(formVersions.versionNo) }).from(formVersions).where(eq(formVersions.formId, input.formId));
    versionId = uuidv7();
    created = true;
    await tx.insert(formVersions).values({
      id: versionId,
      formId: input.formId,
      versionNo: (lastNo ?? 0) + 1,
      claimSetId: input.claimSetId,
      definition,
      definitionHash: hash,
      schemaVersion: 1,
      createdVia: input.createdVia,
      parentVersionId: input.parentVersionId ?? null,
      repairProposalId: input.repairProposalId ?? null,
      createdBy: input.actor.userId,
    });
    await audit(tx, {
      workspaceId: input.actor.workspaceId,
      formId: input.formId,
      actorType: "user",
      actorId: input.actor.userId,
      action: "version.created",
      entityType: "form_version",
      entityId: versionId,
      afterHash: hash,
      metadata: { createdVia: input.createdVia, parentVersionId: input.parentVersionId ?? null },
      requestId: input.requestId,
    });
  }

  const [claimSet] = await tx.select().from(claimSets).where(eq(claimSets.id, input.claimSetId));
  if (!claimSet?.claimsHash) throw new ApiError("INTENT_NOT_APPROVED", "Approve the claims before generating a form.");
  const content = claimSetContentSchema.parse(claimSet.content);
  const key = analysisKey(claimSet.claimsHash, hash);
  const [cached] = await tx.select({ id: analysisRuns.id }).from(analysisRuns).where(and(eq(analysisRuns.formVersionId, versionId), eq(analysisRuns.analysisKey, key)));
  if (!cached) {
    const result = analyze(definition, content);
    const plan = result.verdict === "PASS" ? deriveProbePlan(definition, content, pageIdentity(hash)) : null;
    await tx.insert(analysisRuns).values({
      id: uuidv7(),
      workspaceId: input.actor.workspaceId,
      formId: input.formId,
      formVersionId: versionId,
      claimSetId: input.claimSetId,
      analysisKey: key,
      engineVersion: ENGINE_VERSION,
      gate1: result.gate1,
      verdict: result.verdict,
      claimStatuses: result.claimStatuses,
      findings: result.findings,
      counterexamples: result.findings.flatMap((finding) => (finding.counterexample ? [{ findingKey: finding.key, ...finding.counterexample }] : [])),
      probePlan: plan ? { ...plan, ruleTrace: result.ruleTrace } : { ruleTrace: result.ruleTrace },
      stats: result.stats,
    });
  }

  await tx
    .insert(formDrafts)
    .values({ formId: input.formId, definition, baseVersionId: versionId, updatedBy: input.actor.userId })
    .onConflictDoUpdate({ target: formDrafts.formId, set: { definition, baseVersionId: versionId, updatedBy: input.actor.userId, updatedAt: new Date() } });
  await tx.update(forms).set({ updatedAt: new Date() }).where(eq(forms.id, input.formId));
  return { versionId, created };
}

async function approvedClaimSet(tx: DbOrTx, formId: string) {
  const claimSet = await latestClaimSet(tx, formId);
  if (!claimSet || claimSet.status !== "approved" || !claimSet.claimsHash) {
    throw new ApiError("INTENT_NOT_APPROVED", "Approve the claims before generating or editing the form.");
  }
  return claimSet;
}

export async function latestVersion(tx: DbOrTx, formId: string) {
  const [version] = await tx.select().from(formVersions).where(eq(formVersions.formId, formId)).orderBy(desc(formVersions.versionNo)).limit(1);
  return version ?? null;
}

export const generateInput = z.object({ strategy: z.enum(["skeleton", "seeded_demo"]) });

/**
 * Generates a version from the approved claims. `seeded_demo` is the labeled demonstration defect
 * (`gt` instead of `gte`) and exists only for the golden scholarship claims.
 */
export async function generateVersion(actor: Actor, formId: string, input: z.infer<typeof generateInput>, requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const form = await loadOwnedForm(tx, actor, formId, true);
    const claimSet = await approvedClaimSet(tx, formId);
    const content = claimSetContentSchema.parse(claimSet.content);
    let definition: FormDefinition;
    if (input.strategy === "seeded_demo") {
      if (claimSet.claimsHash !== claimsHash(GOLDEN_CLAIMS)) {
        throw new ApiError("VALIDATION_FAILED", "The seeded demonstration defect is only available for the scholarship template.");
      }
      definition = goldenDefinitionWithSeededDefect();
    } else {
      definition = skeletonFromClaims(content, { title: form.title, submitLabel: "Submit application" });
    }
    const parent = await latestVersion(tx, formId);
    return snapshotVersion(tx, {
      actor,
      formId,
      claimSetId: claimSet.id,
      definition,
      createdVia: input.strategy === "seeded_demo" ? "template" : "skeleton",
      parentVersionId: parent?.id ?? null,
      requestId,
    });
  });
}

export const saveEditsInput = z.object({ baseVersionId: z.string().uuid(), definition: z.unknown() });

/** Saves a creator edit as a new immutable version. Every behavior-affecting edit gets fresh analysis. */
export async function saveEdits(actor: Actor, formId: string, input: z.infer<typeof saveEditsInput>, requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await loadOwnedForm(tx, actor, formId, true);
    const claimSet = await approvedClaimSet(tx, formId);
    const current = await latestVersion(tx, formId);
    if (!current || current.id !== input.baseVersionId) {
      throw new ApiError("STALE_REVISION", "The form changed since you opened it. Reload to see the latest version.");
    }
    // ac-73: invalid references, cycles, unsupported conditions, and literals that do not fit
    // their field are rejected instead of being saved as a version (found by Kane test t-33,
    // which typed "alert(1)" into a numeric rule condition).
    const structure = validateStructure(input.definition);
    if (!structure.ok) {
      throw new ApiError("VALIDATION_FAILED", "These rules cannot be saved. Fix the problems listed below.", {
        reasons: structure.findings.slice(0, 10).map((finding) => finding.message),
      });
    }
    return snapshotVersion(tx, { actor, formId, claimSetId: claimSet.id, definition: structure.definition, createdVia: "manual_edit", parentVersionId: current.id, requestId });
  });
}

/** Deterministic repair proposals for the latest version, validated by the engine before they are offered. */
export async function proposeVersionRepairs(actor: Actor, formId: string, versionId: string, requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await loadOwnedForm(tx, actor, formId, true);
    const version = await latestVersion(tx, formId);
    if (!version || version.id !== versionId) throw new ApiError("STALE_REVISION", "Repairs can only be proposed for the latest version.");
    const [claimSet] = await tx.select().from(claimSets).where(eq(claimSets.id, version.claimSetId));
    if (!claimSet?.claimsHash) throw new ApiError("INTENT_NOT_APPROVED", "The claims of this version are not approved.");
    const [analysis] = await tx
      .select()
      .from(analysisRuns)
      .where(and(eq(analysisRuns.formVersionId, version.id), eq(analysisRuns.analysisKey, analysisKey(claimSet.claimsHash, version.definitionHash))));
    if (!analysis) throw new ApiError("ANALYSIS_REQUIRED", "Static analysis has not run for this version.");
    if (analysis.verdict !== "FAILED") return { proposals: [] };

    const content = claimSetContentSchema.parse(claimSet.content);
    const definition = formDefinitionSchema.parse(version.definition);
    const result = analyze(definition, content);
    const candidates = proposeRepairs(definition, content, result);

    await tx.update(repairProposals).set({ status: "stale" }).where(and(eq(repairProposals.formVersionId, version.id), eq(repairProposals.status, "proposed")));
    const stored = [];
    for (const candidate of candidates) {
      const id = uuidv7();
      stored.push({ id, ...candidate });
      await tx.insert(repairProposals).values({
        id,
        formVersionId: version.id,
        analysisRunId: analysis.id,
        findingKeys: candidate.findingKeys,
        claimKeys: candidate.claimKeys,
        source: "deterministic",
        strategy: candidate.strategy,
        patch: candidate.patch,
        explanation: candidate.explanation,
        predictedEffects: candidate.predictedEffects,
        validation: candidate.validation,
      });
    }
    await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "system", actorId: "repair-engine", action: "repair.proposed", entityType: "form_version", entityId: version.id, metadata: { count: candidates.length }, requestId });
    return { proposals: stored };
  });
}

/**
 * Applies a proposal only with the creator's explicit approval, only to the exact base version,
 * and only if the engine still validates it against the unchanged approved claims.
 */
export async function decideRepair(actor: Actor, formId: string, proposalId: string, decision: "approve" | "reject", requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await loadOwnedForm(tx, actor, formId, true);
    const [proposal] = await tx.select().from(repairProposals).where(eq(repairProposals.id, proposalId)).for("update");
    if (!proposal) throw notFound("Repair proposal");
    const [base] = await tx.select().from(formVersions).where(and(eq(formVersions.id, proposal.formVersionId), eq(formVersions.formId, formId)));
    if (!base) throw notFound("Repair proposal");
    if (proposal.status !== "proposed") throw new ApiError("CONFLICT", "This proposal was already decided or is out of date.");

    if (decision === "reject") {
      await tx.update(repairProposals).set({ status: "rejected", decidedBy: actor.userId, decidedAt: new Date() }).where(eq(repairProposals.id, proposalId));
      await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "repair.rejected", entityType: "repair_proposal", entityId: proposalId, requestId });
      return { versionId: null };
    }

    const current = await latestVersion(tx, formId);
    if (!current || current.id !== base.id) {
      await tx.update(repairProposals).set({ status: "stale" }).where(eq(repairProposals.id, proposalId));
      throw new ApiError("STALE_REVISION", "The form changed after this repair was proposed. Propose repairs again.");
    }
    const [claimSet] = await tx.select().from(claimSets).where(eq(claimSets.id, base.claimSetId));
    const approved = await latestClaimSet(tx, formId);
    if (!claimSet?.claimsHash || approved?.id !== claimSet.id || approved.status !== "approved") {
      throw new ApiError("INTENT_NOT_APPROVED", "The approved claims changed. Repairs cannot change approved intent.");
    }
    const content = claimSetContentSchema.parse(claimSet.content);
    const definition = formDefinitionSchema.parse(base.definition);
    const patch = patchSchema.parse(proposal.patch);
    const validation = validateRepair(definition, content, patch, proposal.findingKeys);
    if (!validation.ok || !validation.definition) throw new ApiError("VALIDATION_FAILED", "The repair no longer validates against the approved claims.", { reasons: validation.reasons });
    const applied = applyPatch(definition, patch);
    if (!applied.ok) throw new ApiError("STALE_REVISION", applied.message);

    const result = await snapshotVersion(tx, {
      actor,
      formId,
      claimSetId: claimSet.id,
      definition: applied.definition,
      createdVia: "repair",
      parentVersionId: base.id,
      repairProposalId: proposalId,
      requestId,
    });
    await tx
      .update(repairProposals)
      .set({ status: "applied", decidedBy: actor.userId, decidedAt: new Date(), resultingVersionId: result.versionId })
      .where(eq(repairProposals.id, proposalId));
    await audit(tx, {
      workspaceId: actor.workspaceId,
      formId,
      actorType: "user",
      actorId: actor.userId,
      action: "repair.applied",
      entityType: "repair_proposal",
      entityId: proposalId,
      beforeHash: base.definitionHash,
      afterHash: definitionHash(applied.definition),
      metadata: { claimsHash: claimSet.claimsHash, resultingVersionId: result.versionId },
      requestId,
    });
    return { versionId: result.versionId };
  });
}
