import "server-only";
import {
  buildIntentTrace,
  catalogFields,
  claimBrowserStatus,
  claimSetContentSchema,
  formDefinitionSchema,
  compositionProblems,
  pageIdentity,
  renderStatement,
  type ClaimStatus,
  type Finding,
  type ProbePlan,
  type RuleTrace,
} from "@niarva/core";
import { and, count, desc, eq, sql } from "drizzle-orm";
import type { Actor } from "../context/session";
import { getDb } from "../db/client";
import { formVersions, probeRuns, probes, publications, repairProposals, submissions, verificationRuns } from "../db/schema";
import { configuredModels } from "../ai/extract-claims";
import { getEnv } from "../config/env";
import { latestClaimSet, loadOwnedForm } from "./intent.service";
import { gateFor } from "./publish.service";
import { currentVerificationKey, workerStatus } from "./verification.service";
import { latestVersion } from "./version.service";

/** Everything the creator workspace shows for one form, computed from authoritative data. */
export async function getFormState(actor: Actor, formId: string) {
  {
    const db = await getDb();
    const form = await loadOwnedForm(db, actor, formId);
    const claimSet = await latestClaimSet(db, formId);
    const content = claimSet ? claimSetContentSchema.safeParse(claimSet.content) : null;
    const catalog = content?.success ? new Map(catalogFields(content.data).map((field) => [field.key, field])) : new Map();
    const version = await latestVersion(db, formId);
    const [{ versionCount } = { versionCount: 0 }] = version
      ? await db.select({ versionCount: count() }).from(formVersions).where(eq(formVersions.formId, formId))
      : [];
    // Version lineage (FR-18): every proof belongs to one immutable version; judges need to see
    // which version a repair produced and from which parent.
    const lineage = version
      ? await db
          .select({
            id: formVersions.id,
            versionNo: formVersions.versionNo,
            createdVia: formVersions.createdVia,
            parentVersionId: formVersions.parentVersionId,
            definitionHash: formVersions.definitionHash,
            createdAt: formVersions.createdAt,
          })
          .from(formVersions)
          .where(eq(formVersions.formId, formId))
          .orderBy(desc(formVersions.versionNo))
          .limit(20)
      : [];
    const identity = version ? await currentVerificationKey(db, version, form.workspaceId) : null;
    const analysis = identity?.analysis ?? null;
    const plan = (analysis?.probePlan ?? null) as (Partial<ProbePlan> & { ruleTrace?: RuleTrace[] }) | null;
    const staticStatuses = (analysis?.claimStatuses ?? {}) as Record<string, { status: string }>;

    const repairs = version
      ? await db.select().from(repairProposals).where(eq(repairProposals.formVersionId, version.id)).orderBy(desc(repairProposals.createdAt)).limit(10)
      : [];

    const runRows = version
      ? await db.select().from(verificationRuns).where(eq(verificationRuns.formVersionId, version.id)).orderBy(desc(verificationRuns.requestedAt)).limit(6)
      : [];
    const runs = [];
    for (const run of runRows) {
      const probeRows = await db.select().from(probes).where(eq(probes.verificationRunId, run.id)).orderBy(probes.probeKey);
      const attempts = await db.select().from(probeRuns).where(eq(probeRuns.verificationRunId, run.id)).orderBy(desc(probeRuns.attempt));
      runs.push({
        id: run.id,
        mode: run.mode,
        state: run.state,
        detail: run.detail,
        counts: run.counts as { required: number; pass: number; fail: number; unknown: number },
        fresh: run.mode === "full" ? run.verificationKey === identity?.key : null,
        rendererBuildId: run.rendererBuildId,
        environmentId: run.environmentId,
        // Proof identity and timeline for the run report (FR-18).
        verificationKey: run.verificationKey,
        probePolicyVersion: run.probePolicyVersion,
        scenarioSetHash: run.scenarioSetHash,
        runtimeConfigHash: run.runtimeConfigHash,
        requestedAt: run.requestedAt.toISOString(),
        startedAt: run.startedAt?.toISOString() ?? null,
        completedAt: run.completedAt?.toISOString() ?? null,
        canceledAt: run.canceledAt?.toISOString() ?? null,
        creditsTotal: run.creditsTotal,
        probes: probeRows.map((probe) => {
          const latest = attempts.find((attempt) => attempt.probeId === probe.id);
          return {
            probeKey: probe.probeKey,
            kind: probe.kind,
            executor: probe.executor,
            claimKeys: probe.claimKeys,
            goldenIds: probe.goldenIds,
            objectiveHash: probe.objectiveHash,
            objective: probe.objectiveTemplate,
            stages: probe.stages,
            latest: latest
              ? {
                  status: latest.status,
                  attempt: latest.attempt,
                  verdict: latest.verdict,
                  reasonCode: latest.reasonCode,
                  failedStage: latest.failedStage,
                  observation: latest.observation,
                  agentVerdict: latest.agentVerdict,
                  agentVerdictMismatch: latest.agentVerdictMismatch,
                  kaneRunId: latest.kaneRunId,
                  kaneCliVersion: latest.kaneCliVersion,
                  creditsConsumed: latest.creditsConsumed,
                  evidence: latest.evidence,
                  serverEvidence: latest.serverEvidenceResult,
                  startedAt: latest.startedAt?.toISOString() ?? null,
                  finishedAt: latest.finishedAt?.toISOString() ?? null,
                }
              : null,
          };
        }),
      });
    }

    const [publication] = await db.select().from(publications).where(and(eq(publications.formId, formId), sql`${publications.unpublishedAt} is null`));
    const [{ responses } = { responses: 0 }] = await db.select({ responses: count() }).from(submissions).where(eq(submissions.formId, formId));
    const gate = await gateFor(db, form);
    const env = getEnv();

    // Intent Trace: only for the claim set this version was generated from, so the ledger never
    // mixes a newer claims revision with an older form.
    const definition = version ? formDefinitionSchema.safeParse(version.definition) : null;
    const traceable = Boolean(version && claimSet && content?.success && definition?.success && version.claimSetId === claimSet.id);
    const trace =
      traceable && content?.success && definition?.success
        ? buildIntentTrace(
            content.data,
            definition.data,
            analysis
              ? { findings: analysis.findings as Finding[], claimStatuses: staticStatuses as Record<string, ClaimStatus>, ruleTrace: plan?.ruleTrace ?? [] }
              : null,
          )
        : null;
    const traceRuns = runs.map((run) => ({
      id: run.id,
      mode: run.mode,
      fresh: run.fresh,
      probes: run.probes.map((probe) => ({ probeKey: probe.probeKey, claimKeys: probe.claimKeys, status: probe.latest?.status ?? null, verdict: probe.latest?.verdict ?? null })),
    }));

    return {
      form: { id: form.id, title: form.title, slug: form.slug, status: form.status },
      claimSet: claimSet
        ? {
            id: claimSet.id,
            status: claimSet.status,
            revision: claimSet.revision,
            versionNo: claimSet.versionNo,
            origin: claimSet.origin,
            sourcePrompt: claimSet.sourcePrompt,
            claimsHash: claimSet.claimsHash,
            fields: content?.success ? content.data.fields : [],
            content: content?.success ? content.data : null,
            claims: content?.success
              ? content.data.claims.map((claim) => ({ ...claim, statement: renderStatement(claim, catalog), staticStatus: staticStatuses[claim.key]?.status ?? null }))
              : [],
            problems: content?.success ? compositionProblems(content.data, claimSet.sourcePrompt).map((problem) => problem.message) : ["The stored claims are not valid."],
          }
        : null,
      version: version
        ? {
            id: version.id,
            versionNo: version.versionNo,
            versionCount,
            createdVia: version.createdVia,
            parentVersionId: version.parentVersionId,
            definitionHash: version.definitionHash,
            pageIdentity: pageIdentity(version.definitionHash),
            definition: version.definition,
            claimSetId: version.claimSetId,
          }
        : null,
      analysis: analysis
        ? {
            gate1: analysis.gate1,
            verdict: analysis.verdict,
            engineVersion: analysis.engineVersion,
            findings: analysis.findings as Finding[],
            claimStatuses: staticStatuses,
            ruleTrace: plan?.ruleTrace ?? [],
            probes: (plan?.probes ?? []).map((probe) => ({ probeKey: probe.probeKey, kind: probe.kind, executor: probe.executor, claimKeys: probe.claimKeys, goldenIds: probe.goldenIds })),
            gaps: plan?.gaps ?? [],
            stats: analysis.stats,
          }
        : null,
      versions: lineage.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
      intentTrace: trace
        ? {
            unrequestedRules: trace.unrequestedRules,
            rows: trace.rows.map((row) => ({ ...row, browser: claimBrowserStatus(row.claimKey, row.kind, traceRuns) })),
          }
        : null,
      intentTraceNote: version && claimSet && version.claimSetId !== claimSet.id ? "A newer claims revision exists. Create a version for it to trace it." : null,
      repairs: repairs.map((repair) => ({
        id: repair.id,
        strategy: repair.strategy,
        status: repair.status,
        explanation: repair.explanation,
        predictedEffects: repair.predictedEffects as string[],
        patch: repair.patch,
        findingKeys: repair.findingKeys,
        claimKeys: repair.claimKeys,
        resultingVersionId: repair.resultingVersionId,
      })),
      runs,
      gate,
      publication: publication ? { slug: publication.slug, publishedAt: publication.publishedAt.toISOString(), versionId: publication.formVersionId, responseCount: publication.responseCount } : null,
      responses,
      workers: await workerStatus(),
      ai: { configured: Boolean(env.OPENROUTER_API_KEY && configuredModels().length > 0) },
    };
  }
}

export type FormState = Awaited<ReturnType<typeof getFormState>>;
