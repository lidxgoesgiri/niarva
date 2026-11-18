import "server-only";
import {
  GOLDEN_CLAIMS,
  GOLDEN_PROMPT,
  GOLDEN_TITLE,
  claimSetContentSchema,
  claimsHash,
  compositionProblems,
  type ClaimSetContent,
} from "@niarva/core";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Actor } from "../context/session";
import { getDb, type DbOrTx } from "../db/client";
import { aiInvocations, claimSets, forms } from "../db/schema";
import { ApiError, notFound } from "../http/errors";
import { uuidv7 } from "../ids";
import { EXTRACT_PROMPT_VERSION, extractClaims } from "../ai/extract-claims";
import { audit } from "./audit";
import { canReadShowcase } from "./demo-access";

export const createFormInput = z.discriminatedUnion("source", [
  z.object({ source: z.literal("template"), template: z.literal("scholarship"), title: z.string().trim().min(1).max(120).optional() }),
  z.object({ source: z.literal("ai"), prompt: z.string().trim().min(20).max(4000) }),
  z.object({ source: z.literal("manual"), title: z.string().trim().min(1).max(120), prompt: z.string().trim().max(4000).default("") }),
]);
export type CreateFormInput = z.infer<typeof createFormInput>;

const MANUAL_STARTER: ClaimSetContent = {
  fields: [{ key: "full_name", label: "Full name", type: "short_text" }],
  claims: [{ key: "C-01", kind: "FIELD", field: "full_name", required: "always", origin: "user", reviewState: "proposed" }],
};

function slugify(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "form";
  return `${base}-${uuidv7().slice(-6)}`;
}

/** Loads a form of the actor's workspace, or reports it as missing. */
/**
 * A form the actor may read: their own, or a demo showcase form when the actor is a judge
 * (`DEMO_MODE`). Writes never use this; they go through `loadOwnedForm`.
 */
export async function loadReadableForm(db: DbOrTx, actor: Actor, formId: string) {
  const [owned] = await db.select().from(forms).where(and(eq(forms.id, formId), eq(forms.workspaceId, actor.workspaceId)));
  if (owned) return { form: owned, access: "owner" as const };
  if (canReadShowcase(actor, formId)) {
    const [showcase] = await db.select().from(forms).where(eq(forms.id, formId));
    if (showcase) return { form: showcase, access: "judge" as const };
  }
  throw notFound("Form");
}

export async function loadOwnedForm(db: DbOrTx, actor: Actor, formId: string, lock = false) {
  const query = db.select().from(forms).where(and(eq(forms.id, formId), eq(forms.workspaceId, actor.workspaceId)));
  const [form] = lock ? await query.for("update") : await query;
  if (!form) throw notFound("Form");
  return form;
}

export async function latestClaimSet(db: DbOrTx, formId: string) {
  const [claimSet] = await db.select().from(claimSets).where(eq(claimSets.formId, formId)).orderBy(desc(claimSets.versionNo)).limit(1);
  return claimSet ?? null;
}

/** Creates a form with a draft claim set from a template, an AI extraction, or a manual starter. */
export async function createForm(actor: Actor, input: CreateFormInput, requestId: string): Promise<{ formId: string }> {
  const db = await getDb();
  let content: ClaimSetContent;
  let title: string;
  let sourcePrompt: string;
  let origin: "template" | "ai" | "manual";
  let aiInvocationId: string | null = null;

  if (input.source === "template") {
    content = GOLDEN_CLAIMS;
    title = input.title ?? GOLDEN_TITLE;
    sourcePrompt = GOLDEN_PROMPT;
    origin = "template";
  } else if (input.source === "manual") {
    content = MANUAL_STARTER;
    title = input.title;
    sourcePrompt = input.prompt;
    origin = "manual";
  } else {
    const outcome = await extractClaims(input.prompt);
    aiInvocationId = uuidv7();
    await db.insert(aiInvocations).values({
      id: aiInvocationId,
      workspaceId: actor.workspaceId,
      task: "extract_claims",
      modelRequested: null,
      modelUsed: outcome.ok ? outcome.model : null,
      promptVersion: EXTRACT_PROMPT_VERSION,
      inputHash: outcome.inputHash,
      status: outcome.ok ? "succeeded" : outcome.code === "INVALID_OUTPUT" ? "invalid_output" : outcome.code === "TIMEOUT" ? "timeout" : outcome.code === "RATE_LIMITED" ? "rate_limited" : "unavailable",
      errorCode: outcome.ok ? null : outcome.code,
      attempt: outcome.attempts,
      latencyMs: outcome.ok ? outcome.latencyMs : null,
    });
    if (!outcome.ok) {
      throw new ApiError(outcome.code === "RATE_LIMITED" ? "RATE_LIMITED" : outcome.code === "INVALID_OUTPUT" ? "VALIDATION_FAILED" : "PROVIDER_UNAVAILABLE", outcome.message);
    }
    content = outcome.content;
    title = input.prompt.split(/[.\n]/)[0]?.slice(0, 80) || "Untitled form";
    sourcePrompt = input.prompt;
    origin = "ai";
  }

  const formId = uuidv7();
  const claimSetId = uuidv7();
  await db.transaction(async (tx) => {
    await tx.insert(forms).values({ id: formId, workspaceId: actor.workspaceId, title, slug: slugify(title), createdBy: actor.userId, currentClaimSetId: claimSetId });
    await tx.insert(claimSets).values({
      id: claimSetId,
      formId,
      versionNo: 1,
      origin,
      sourcePrompt,
      content,
      aiInvocationId,
      createdBy: actor.userId,
    });
    await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "form.created", entityType: "form", entityId: formId, metadata: { origin }, requestId });
  });
  return { formId };
}

export const updateClaimsInput = z.object({ revision: z.number().int().min(1), content: claimSetContentSchema });

/** Replaces the content of the draft claim set. Approved claim sets are immutable. */
export async function updateDraftClaims(actor: Actor, formId: string, input: z.infer<typeof updateClaimsInput>, requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await loadOwnedForm(tx, actor, formId, true);
    const claimSet = await latestClaimSet(tx, formId);
    if (!claimSet) throw notFound("Claim set");
    if (claimSet.status !== "draft") throw new ApiError("CONFLICT", "These claims are approved. Start a revision to change them.");
    if (claimSet.revision !== input.revision) throw new ApiError("STALE_REVISION", "The claims changed in another tab. Reload and try again.");
    const content: ClaimSetContent = {
      ...input.content,
      claims: input.content.claims.map((claim) => (claim.reviewState === "approved" ? { ...claim, reviewState: "edited" as const } : claim)),
    };
    await tx.update(claimSets).set({ content, revision: claimSet.revision + 1, updatedAt: new Date() }).where(eq(claimSets.id, claimSet.id));
    await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "claims.edited", entityType: "claim_set", entityId: claimSet.id, requestId });
    return { revision: claimSet.revision + 1 };
  });
}

/** Freezes the approved meaning: composition is checked, a hash is recorded, and earlier approvals are superseded. */
export async function approveClaims(actor: Actor, formId: string, input: { revision: number }, requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await loadOwnedForm(tx, actor, formId, true);
    const claimSet = await latestClaimSet(tx, formId);
    if (!claimSet) throw notFound("Claim set");
    if (claimSet.status !== "draft") throw new ApiError("CONFLICT", "These claims are already approved.");
    if (claimSet.revision !== input.revision) throw new ApiError("STALE_REVISION", "The claims changed in another tab. Reload and review them again.");
    const content = claimSetContentSchema.parse(claimSet.content);
    const problems = compositionProblems(content, claimSet.sourcePrompt);
    if (problems.length > 0) {
      throw new ApiError("VALIDATION_FAILED", "Resolve the highlighted claims before approving.", { reasons: problems.map((problem) => problem.message) });
    }
    const approved: ClaimSetContent = {
      ...content,
      claims: content.claims.map((claim) => (claim.reviewState === "rejected" ? claim : { ...claim, reviewState: "approved" as const })),
    };
    const hash = claimsHash(approved);
    const previous = await tx.select({ id: claimSets.id }).from(claimSets).where(and(eq(claimSets.formId, formId), eq(claimSets.status, "approved")));
    for (const row of previous) {
      await tx.update(claimSets).set({ status: "superseded", supersededBy: claimSet.id, updatedAt: new Date() }).where(eq(claimSets.id, row.id));
    }
    await tx
      .update(claimSets)
      .set({ content: approved, status: "approved", claimsHash: hash, approvedAt: new Date(), approvedBy: actor.userId, updatedAt: new Date() })
      .where(eq(claimSets.id, claimSet.id));
    await tx.update(forms).set({ currentClaimSetId: claimSet.id, updatedAt: new Date() }).where(eq(forms.id, formId));
    await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "claims.approved", entityType: "claim_set", entityId: claimSet.id, afterHash: hash, requestId });
    return { claimSetId: claimSet.id, claimsHash: hash };
  });
}

/** Opens a new draft revision from the approved claims. Proof for older claims never carries over. */
export async function reviseClaims(actor: Actor, formId: string, requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await loadOwnedForm(tx, actor, formId, true);
    const current = await latestClaimSet(tx, formId);
    if (!current) throw notFound("Claim set");
    if (current.status === "draft") return { claimSetId: current.id };
    const content = claimSetContentSchema.parse(current.content);
    const id = uuidv7();
    await tx.insert(claimSets).values({
      id,
      formId,
      versionNo: current.versionNo + 1,
      origin: current.origin,
      sourcePrompt: current.sourcePrompt,
      content: { ...content, claims: content.claims.map((claim) => (claim.reviewState === "approved" ? { ...claim, reviewState: "proposed" as const } : claim)) },
      createdBy: actor.userId,
    });
    await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "claims.revision_started", entityType: "claim_set", entityId: id, requestId });
    return { claimSetId: id };
  });
}
