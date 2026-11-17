import "server-only";
import { canonicalJson, formDefinitionSchema, sha256Hex, validateSubmission } from "@niarva/core";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Actor } from "../context/session";
import { getDb, type DbOrTx } from "../db/client";
import { formVersions, forms, publications, rateLimitBuckets, submissions, testSubmissions } from "../db/schema";
import { ApiError, notFound } from "../http/errors";
import { hashIp, receiptCode, verifyPreviewToken } from "../security/tokens";
import { loadOwnedForm } from "./intent.service";

const answersSchema = z
  .record(z.string().max(60), z.union([z.string().max(5000), z.boolean(), z.number()]))
  .refine((value) => Object.keys(value).length <= 60, "Too many answers.");

export const submitInput = z.object({
  submissionId: z.string().uuid(),
  formVersionId: z.string().uuid(),
  answers: answersSchema,
});

/** Hash of the ORIGINAL payload (before hidden-value filtering): the idempotency fingerprint. */
function payloadHash(formId: string, formVersionId: string, answers: Record<string, unknown>): string {
  return sha256Hex(`ph1|${canonicalJson({ formId, formVersionId, answers })}`);
}

/** Fixed-window rate limit kept in PostgreSQL. */
export async function rateLimit(db: DbOrTx, key: string, limit: number, windowSeconds: number): Promise<void> {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const bucket = `${key}:${window}`;
  const [row] = await db
    .insert(rateLimitBuckets)
    .values({ key: bucket, count: 1, expiresAt: new Date((window + 1) * windowSeconds * 1000) })
    .onConflictDoUpdate({ target: rateLimitBuckets.key, set: { count: sql`${rateLimitBuckets.count} + 1` } })
    .returning({ count: rateLimitBuckets.count });
  if ((row?.count ?? 0) > limit) throw new ApiError("RATE_LIMITED", "Too many submissions. Wait a minute and try again.");
}

function invalid(errors: Record<string, { message: string }>): ApiError {
  return new ApiError("SUBMISSION_INVALID", "Some answers need attention.", {
    fieldErrors: Object.fromEntries(Object.entries(errors).map(([key, error]) => [key, error.message])),
  });
}

/**
 * Public submission, idempotency first:
 * 1. resolve the stable form and hash the original payload;
 * 2. a known submission ID with the same form and hash returns its original receipt, whatever the
 *    current publication or quota; a different form or hash is a generic conflict;
 * 3. only a new ID is checked against the active publication, version, quota, and validation.
 */
export async function submitPublic(slug: string, input: z.infer<typeof submitInput>, ip: string | null) {
  const db = await getDb();
  const [form] = await db.select().from(forms).where(eq(forms.slug, slug));
  if (!form) throw notFound("Form");
  const hash = payloadHash(form.id, input.formVersionId, input.answers);
  const ipHash = hashIp(ip);
  await rateLimit(db, `sub:${form.id}:${ipHash ?? "unknown"}`, 30, 60);

  const replay = async (tx: DbOrTx) => {
    const [existing] = await tx.select().from(submissions).where(eq(submissions.id, input.submissionId));
    if (!existing) return null;
    if (existing.formId !== form.id || existing.payloadHash !== hash) {
      throw new ApiError("IDEMPOTENCY_KEY_REUSED", "This submission ID was already used for different answers.");
    }
    return { receiptCode: existing.receiptCode, submittedAt: existing.submittedAt.toISOString(), replayed: true };
  };

  return db.transaction(async (tx) => {
    const earlier = await replay(tx);
    if (earlier) return earlier;

    const [publication] = await tx
      .select()
      .from(publications)
      .where(and(eq(publications.formId, form.id), sql`${publications.unpublishedAt} is null`))
      .for("update");
    if (!publication) throw new ApiError("FORM_CLOSED", "This form is not accepting responses.");
    if (publication.formVersionId !== input.formVersionId) {
      throw new ApiError("FORM_VERSION_CHANGED", "This form was updated. Reload the page to see the current version.");
    }
    if (publication.responseLimit !== null && publication.responseCount >= publication.responseLimit) {
      throw new ApiError("FORM_FULL", "This form has reached its response limit.");
    }
    const [version] = await tx.select().from(formVersions).where(eq(formVersions.id, publication.formVersionId));
    if (!version) throw notFound("Form");
    const check = validateSubmission(formDefinitionSchema.parse(version.definition), input.answers);
    if (!check.ok) throw invalid(check.errors);

    const code = receiptCode();
    const inserted = await tx
      .insert(submissions)
      .values({
        id: input.submissionId,
        formId: form.id,
        formVersionId: version.id,
        publicationId: publication.id,
        payloadHash: hash,
        receiptCode: code,
        answers: check.answers,
        ipHash,
      })
      .onConflictDoNothing({ target: submissions.id })
      .returning({ id: submissions.id, submittedAt: submissions.submittedAt });
    if (inserted.length === 0) {
      // A concurrent request with the same ID won the insert: apply the same idempotency rule.
      const raced = await replay(tx);
      if (raced) return raced;
      throw new ApiError("CONFLICT", "The submission could not be recorded. Try again.");
    }
    await tx.update(publications).set({ responseCount: sql`${publications.responseCount} + 1` }).where(eq(publications.id, publication.id));
    return { receiptCode: code, submittedAt: inserted[0]!.submittedAt.toISOString(), replayed: false };
  });
}

/**
 * Preview (test) submission for a token-scoped version. Isolated from public responses and
 * counters. Raw payload keys are recorded so probes can prove that hidden values were not sent.
 */
export async function submitPreview(versionId: string, token: string | null, input: { submissionId: string; answers: Record<string, unknown> }) {
  const claims = verifyPreviewToken(token, versionId);
  if (!claims) throw new ApiError("PREVIEW_TOKEN_INVALID", "This preview link has expired or is not valid.");
  const db = await getDb();
  const [version] = await db.select().from(formVersions).where(eq(formVersions.id, versionId));
  if (!version) throw notFound("Form version");
  const parsedAnswers = answersSchema.parse(input.answers);
  const hash = sha256Hex(`tp1|${canonicalJson({ versionId, scope: claims.r ?? claims.j, answers: parsedAnswers })}`);

  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(testSubmissions).where(eq(testSubmissions.id, input.submissionId));
    if (existing) {
      if (existing.formVersionId !== versionId || existing.payloadHash !== hash || existing.probeRunId !== claims.r) {
        throw new ApiError("IDEMPOTENCY_KEY_REUSED", "This submission ID was already used for different answers.");
      }
      return { receiptCode: existing.receiptCode, storedAnswers: existing.answers as Record<string, unknown>, replayed: true };
    }
    const definition = formDefinitionSchema.parse(version.definition);
    const check = validateSubmission(definition, parsedAnswers);
    if (!check.ok) throw invalid(check.errors);
    const code = receiptCode();
    await tx.insert(testSubmissions).values({
      id: input.submissionId,
      formVersionId: versionId,
      probeRunId: claims.r,
      tokenJti: claims.j,
      tokenPurpose: claims.p,
      payloadHash: hash,
      receiptCode: code,
      answers: check.answers,
      rawPayloadKeys: Object.keys(parsedAnswers).sort(),
      rawHiddenNonemptyKeys: check.hiddenNonEmptyKeys,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    return { receiptCode: code, storedAnswers: check.answers, replayed: false };
  });
}

/** Owner-only response list, newest first. */
export async function listResponses(actor: Actor, formId: string, page: number) {
  const db = await getDb();
  await loadOwnedForm(db, actor, formId);
  const pageSize = 25;
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(submissions).where(eq(submissions.formId, formId));
  const rows = await db
    .select({
      receiptCode: submissions.receiptCode,
      submittedAt: submissions.submittedAt,
      answers: submissions.answers,
      versionNo: formVersions.versionNo,
    })
    .from(submissions)
    .innerJoin(formVersions, eq(formVersions.id, submissions.formVersionId))
    .where(eq(submissions.formId, formId))
    .orderBy(desc(submissions.submittedAt))
    .limit(pageSize)
    .offset((Math.max(page, 1) - 1) * pageSize);
  return { total, page: Math.max(page, 1), pageSize, rows };
}
