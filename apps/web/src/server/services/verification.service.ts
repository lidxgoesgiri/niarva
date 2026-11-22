import "server-only";
import {
  PROBE_POLICY_VERSION,
  aggregateRun,
  analysisKey,
  claimSetContentSchema,
  deriveConfirmationProbe,
  evaluateProbeRun,
  evaluateServerContract,
  formDefinitionSchema,
  instabilityOf,
  pageIdentity,
  verificationKey,
  type Finding,
  type HttpCheckResult,
  type KaneRunReport,
  type ProbePlan,
  type ProbeSpec,
  type RunState,
  type ServerCheck,
  type ServerEvidenceSpec,
  type Stage,
} from "@niarva/core";
import { and, asc, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getEnv } from "../config/env";
import type { Actor } from "../context/session";
import { getDb, type DbOrTx } from "../db/client";
import { analysisRuns, claimSets, formVersions, probeRuns, probes, testSubmissions, users, verificationRuns, workers, workspaces } from "../db/schema";
import { ApiError, notFound } from "../http/errors";
import { uuidv7 } from "../ids";
import { logger, redact } from "../logging/logger";
import { environmentId, rendererBuildId, runtimeConfigHash, serverValidationVersion } from "../renderer-identity";
import { issuePreviewToken } from "../security/tokens";
import { audit } from "./audit";
import { loadOwnedForm } from "./intent.service";
import { latestVersion } from "./version.service";

/** Lease length beyond the probe's own timeout; an expired lease makes the probe UNKNOWN. */
const LEASE_MARGIN_SECONDS = 180;
const MAX_AUTO_ATTEMPTS = 2;

export async function currentVerificationKey(tx: DbOrTx, version: typeof formVersions.$inferSelect, workspaceId: string) {
  const [claimSet] = await tx.select().from(claimSets).where(eq(claimSets.id, version.claimSetId));
  if (!claimSet?.claimsHash) return null;
  const [analysis] = await tx
    .select()
    .from(analysisRuns)
    .where(and(eq(analysisRuns.formVersionId, version.id), eq(analysisRuns.analysisKey, analysisKey(claimSet.claimsHash, version.definitionHash))));
  const plan = analysis?.probePlan as Partial<ProbePlan> | null;
  return {
    claimSet,
    analysis: analysis ?? null,
    plan: plan?.probes ? (plan as ProbePlan) : null,
    key: plan?.scenarioSetHash
      ? verificationKey({
          workspaceId,
          formId: version.formId,
          formVersionId: version.id,
          claimsHash: claimSet.claimsHash,
          definitionHash: version.definitionHash,
          rendererBuildId: rendererBuildId(),
          runtimeConfigHash: runtimeConfigHash(),
          environmentId: environmentId(),
          probePolicyVersion: PROBE_POLICY_VERSION,
          scenarioSetHash: plan.scenarioSetHash,
          serverValidationVersion: serverValidationVersion(),
        })
      : null,
  };
}

/** Full runs for a proof key, oldest first, as the instability rule needs them. */
export async function fullRunHistory(tx: DbOrTx, versionId: string, key: string) {
  return tx
    .select({ id: verificationRuns.id, state: verificationRuns.state, requestedAt: verificationRuns.requestedAt })
    .from(verificationRuns)
    .where(and(eq(verificationRuns.formVersionId, versionId), eq(verificationRuns.mode, "full"), eq(verificationRuns.verificationKey, key)))
    .orderBy(asc(verificationRuns.requestedAt));
}

const BUDGET_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Refuses a new run whose Kane probes would exceed the rolling 24-hour budget of the workspace or
 * of the whole deployment. Kane probes spend the operator's credits; HTTP probes are free and are
 * not counted. A transaction-scoped advisory lock serializes concurrent requests, so two requests
 * cannot both pass on the same remaining budget.
 */
async function enforceKaneBudget(tx: DbOrTx, workspaceId: string, kaneProbes: number): Promise<void> {
  if (kaneProbes === 0) return;
  const env = getEnv();
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('niarva:kane-probe-budget'))`);
  const since = new Date(Date.now() - BUDGET_WINDOW_MS);
  // A probe counts while it can still spend credits or already did: it has at least one attempt
  // that was not canceled (queued, leased, running, or finished). A probe canceled before any
  // attempt ran spent nothing and frees its place.
  const queuedSince = (workspace?: string) =>
    tx
      .select({ n: count() })
      .from(probes)
      .innerJoin(verificationRuns, eq(probes.verificationRunId, verificationRuns.id))
      .where(
        and(
          eq(probes.executor, "kane"),
          gte(verificationRuns.requestedAt, since),
          workspace ? eq(verificationRuns.workspaceId, workspace) : undefined,
          sql`exists (select 1 from ${probeRuns} where ${probeRuns.probeId} = ${probes.id} and ${probeRuns.status} <> 'canceled')`,
        ),
      );
  const [[own], [all]] = await Promise.all([queuedSince(workspaceId), queuedSince()]);
  const ownCount = Number(own?.n ?? 0);
  const allCount = Number(all?.n ?? 0);
  if (ownCount + kaneProbes > env.KANE_PROBE_BUDGET_PER_WORKSPACE_24H) {
    throw new ApiError(
      "RATE_LIMITED",
      `Browser verification budget reached: this workspace has ${ownCount} Kane probes queued or run in the last 24 hours (probes canceled before they ran are not counted), this run needs ${kaneProbes} more, and the limit is ${env.KANE_PROBE_BUDGET_PER_WORKSPACE_24H}. Nothing was queued. Try again later.`,
    );
  }
  if (allCount + kaneProbes > env.KANE_PROBE_BUDGET_GLOBAL_24H) {
    throw new ApiError(
      "RATE_LIMITED",
      "This deployment's browser verification budget for the last 24 hours is used up. Nothing was queued. Try again later; recorded evidence stays available.",
    );
  }
}

export const requestVerificationInput = z.object({
  mode: z.enum(["full", "diagnostic"]),
  force: z.boolean().default(false),
  findingKey: z.string().max(64).optional(),
});

/**
 * Queues browser verification for the latest version. Full runs need static PASS and complete
 * coverage. A cached VERIFIED run is reused only when the key matches and the key is stable;
 * after a FAILED run the cache is bypassed automatically until two fresh runs verify.
 */
export async function requestVerification(actor: Actor, formId: string, versionId: string, input: z.infer<typeof requestVerificationInput>, requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await loadOwnedForm(tx, actor, formId, true);
    const version = await latestVersion(tx, formId);
    if (!version || version.id !== versionId) throw new ApiError("STALE_REVISION", "Only the latest version can be verified.");
    const identity = await currentVerificationKey(tx, version, actor.workspaceId);
    if (!identity?.analysis) throw new ApiError("ANALYSIS_REQUIRED", "Static analysis has not run for this version.");
    const definition = formDefinitionSchema.parse(version.definition);
    const content = claimSetContentSchema.parse(identity.claimSet.content);

    let specs: ProbeSpec[];
    let key: string;
    if (input.mode === "full") {
      if (identity.analysis.verdict !== "PASS" || !identity.plan || !identity.key) {
        throw new ApiError("ANALYSIS_REQUIRED", "Full browser verification needs passing static checks. Fix or repair the form first.");
      }
      if (identity.plan.gaps.length > 0) {
        throw new ApiError("VALIDATION_FAILED", "Some approved claims cannot be covered by probes.", { reasons: identity.plan.gaps.map((gap) => `${gap.claimKey}: ${gap.obligation}`) });
      }
      const kaneCount = identity.plan.probes.filter((probe) => probe.executor === "kane").length;
      if (kaneCount > getEnv().KANE_MAX_RUNS_PER_VERIFICATION) {
        throw new ApiError("VALIDATION_FAILED", `This form needs ${kaneCount} browser probes; the limit is ${getEnv().KANE_MAX_RUNS_PER_VERIFICATION}. Simplify the form.`);
      }
      key = identity.key;
      specs = identity.plan.probes;

      const history = await fullRunHistory(tx, version.id, key);
      const active = history.find((run) => run.state === "QUEUED" || run.state === "RUNNING");
      if (active) return { runId: active.id, cached: false, deduplicated: true };
      const instability = instabilityOf(history.map((run) => ({ state: run.state as RunState, cached: false })));
      const latest = history[history.length - 1];
      if (!input.force && !instability.unstable && latest?.state === "VERIFIED") {
        return { runId: latest.id, cached: true, deduplicated: false };
      }
    } else {
      if (identity.analysis.verdict !== "FAILED") throw new ApiError("VALIDATION_FAILED", "A diagnostic run confirms a static counterexample; this version has none.");
      const findings = identity.analysis.findings as Finding[];
      const finding = findings.find((candidate) => candidate.counterexample && (!input.findingKey || candidate.key === input.findingKey));
      if (!finding?.counterexample) throw new ApiError("VALIDATION_FAILED", "No counterexample is available to confirm.");
      const probe = deriveConfirmationProbe(definition, content, pageIdentity(version.definitionHash), finding.counterexample, finding.claimKeys);
      specs = [probe];
      key = `diagnostic:${finding.key}:${version.definitionHash}`;
      const [active] = await tx
        .select({ id: verificationRuns.id })
        .from(verificationRuns)
        .where(and(eq(verificationRuns.formVersionId, version.id), eq(verificationRuns.verificationKey, key), inArray(verificationRuns.state, ["QUEUED", "RUNNING"])));
      if (active) return { runId: active.id, cached: false, deduplicated: true };
    }

    await enforceKaneBudget(tx, actor.workspaceId, specs.filter((spec) => spec.executor === "kane").length);

    const runId = uuidv7();
    await tx.insert(verificationRuns).values({
      id: runId,
      workspaceId: actor.workspaceId,
      formId,
      formVersionId: version.id,
      claimSetId: identity.claimSet.id,
      analysisRunId: identity.analysis.id,
      mode: input.mode,
      verificationKey: key,
      rendererBuildId: rendererBuildId(),
      runtimeConfigHash: runtimeConfigHash(),
      environmentId: environmentId(),
      probePolicyVersion: PROBE_POLICY_VERSION,
      scenarioSetHash: identity.plan?.scenarioSetHash ?? "diagnostic",
      state: "QUEUED",
      counts: { required: specs.length, pass: 0, fail: 0, unknown: 0 },
      requestedBy: actor.userId,
    });
    for (const [index, spec] of specs.entries()) {
      const probeId = uuidv7();
      await tx.insert(probes).values({
        id: probeId,
        verificationRunId: runId,
        probeKey: spec.probeKey,
        kind: spec.kind,
        executor: spec.executor,
        mandatory: input.mode === "full",
        claimKeys: spec.claimKeys,
        goldenIds: spec.goldenIds,
        stages: spec.stages,
        serverEvidence: spec.serverEvidence,
        checks: spec.checks,
        objectiveTemplate: spec.objectiveTemplate,
        objectiveHash: spec.objectiveHash,
        timeoutSeconds: spec.timeoutSeconds,
        // Cheap server checks first, so a broken server contract surfaces before browser credits are spent.
        priority: spec.executor === "http" ? -1 : index,
      });
      await tx.insert(probeRuns).values({ id: uuidv7(), probeId, verificationRunId: runId, status: "queued" });
    }
    await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "verification.requested", entityType: "verification_run", entityId: runId, metadata: { mode: input.mode, probes: specs.length, force: input.force }, requestId });
    return { runId, cached: false, deduplicated: false };
  });
}

/* ------------------------------------------------------------- worker side */

export type Lease =
  | {
      probeRunId: string;
      probeKey: string;
      kind: string;
      executor: "kane";
      objective: string;
      variables: { preview_url: { value: string; secret: true } };
      timeoutSeconds: number;
    }
  | {
      probeRunId: string;
      probeKey: string;
      kind: string;
      executor: "http";
      submitUrl: string;
      previewToken: string;
      formVersionId: string;
      checks: ServerCheck[];
      timeoutSeconds: number;
    };

async function upsertWorker(tx: DbOrTx, workerId: string, kaneCliVersion: string | null, state: "idle" | "busy") {
  await tx
    .insert(workers)
    .values({ id: workerId, label: workerId, tokenHash: "shared", state, kaneCliVersion, lastSeenAt: new Date() })
    .onConflictDoUpdate({ target: workers.id, set: { state, kaneCliVersion, lastSeenAt: new Date() } });
}

/** Marks probe runs with an expired lease as UNKNOWN (LEASE_EXPIRED) so a crashed worker never leaves a run hanging. */
async function expireLeases(tx: DbOrTx) {
  const expired = await tx
    .select({ id: probeRuns.id, verificationRunId: probeRuns.verificationRunId })
    .from(probeRuns)
    .where(and(inArray(probeRuns.status, ["leased", "running"]), lt(probeRuns.leaseExpiresAt, new Date())));
  for (const run of expired) {
    await tx.update(probeRuns).set({ status: "completed", verdict: "UNKNOWN", reasonCode: "LEASE_EXPIRED", finishedAt: new Date() }).where(eq(probeRuns.id, run.id));
    await aggregate(tx, run.verificationRunId);
  }
}

/**
 * Leases the oldest queued probe. A worker may restrict itself to runs whose workspace owner has one
 * of `ownerEmails` (case-insensitive), so an operator can run the worker for chosen accounts only
 * and never spend Kane credits on runs queued by anyone else; those runs stay queued.
 */
export async function leaseNext(workerId: string, kaneCliVersion: string | null, baseUrl: string, ownerEmails: readonly string[] = []): Promise<Lease | null> {
  const db = await getDb();
  const owners = [...new Set(ownerEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  return db.transaction(async (tx) => {
    // Register the worker first: probe runs reference it as their lease owner.
    await upsertWorker(tx, workerId, kaneCliVersion, "idle");
    await expireLeases(tx);
    const [next] = await tx
      .select({ runId: probeRuns.id, probeId: probeRuns.probeId, verificationRunId: probeRuns.verificationRunId })
      .from(probeRuns)
      .innerJoin(probes, eq(probes.id, probeRuns.probeId))
      .innerJoin(verificationRuns, eq(verificationRuns.id, probeRuns.verificationRunId))
      .innerJoin(workspaces, eq(workspaces.id, verificationRuns.workspaceId))
      .innerJoin(users, eq(users.id, workspaces.ownerId))
      .where(
        and(
          eq(probeRuns.status, "queued"),
          inArray(verificationRuns.state, ["QUEUED", "RUNNING"]),
          owners.length > 0 ? inArray(sql`lower(${users.email})`, owners) : undefined,
        ),
      )
      .orderBy(asc(verificationRuns.requestedAt), asc(probes.priority), asc(probeRuns.createdAt))
      .limit(1)
      .for("update", { skipLocked: true, of: probeRuns });
    if (!next) return null;
    const [probe] = await tx.select().from(probes).where(eq(probes.id, next.probeId));
    const [run] = await tx.select().from(verificationRuns).where(eq(verificationRuns.id, next.verificationRunId));
    if (!probe || !run) return null;
    await tx
      .update(probeRuns)
      .set({ status: "leased", leaseOwner: workerId, leaseExpiresAt: new Date(Date.now() + (probe.timeoutSeconds + LEASE_MARGIN_SECONDS) * 1000), startedAt: new Date() })
      .where(eq(probeRuns.id, next.runId));
    if (run.state === "QUEUED") await tx.update(verificationRuns).set({ state: "RUNNING", startedAt: new Date() }).where(eq(verificationRuns.id, run.id));
    await upsertWorker(tx, workerId, kaneCliVersion, "busy");

    const { token } = issuePreviewToken(run.formVersionId, "probe", next.runId);
    if (probe.executor === "http") {
      return {
        probeRunId: next.runId,
        probeKey: probe.probeKey,
        kind: probe.kind,
        executor: "http",
        submitUrl: `${baseUrl}/api/v1/preview/${run.formVersionId}/submissions`,
        previewToken: token,
        formVersionId: run.formVersionId,
        checks: (probe.checks ?? []) as ServerCheck[],
        timeoutSeconds: probe.timeoutSeconds,
      };
    }
    return {
      probeRunId: next.runId,
      probeKey: probe.probeKey,
      kind: probe.kind,
      executor: "kane",
      objective: probe.objectiveTemplate ?? "",
      // The tokenized URL travels only as a secret Kane variable, never inside the objective text.
      variables: { preview_url: { value: `${baseUrl}/preview/${run.formVersionId}?t=${encodeURIComponent(token)}`, secret: true } },
      timeoutSeconds: probe.timeoutSeconds,
    };
  });
}

export const kaneResultInput = z.object({
  executor: z.literal("kane"),
  report: z.custom<KaneRunReport>((value) => typeof value === "object" && value !== null),
  stdoutTail: z.string().max(8192).default(""),
  evidence: z.object({ packSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(), packBytes: z.number().int().nullable(), packName: z.string().max(120).nullable() }).nullable(),
});
export const httpResultInput = z.object({
  executor: z.literal("http"),
  results: z.array(z.object({ checkKey: z.string(), status: z.number().int().nullable(), fieldErrorKeys: z.array(z.string()), storedAnswers: z.record(z.string(), z.unknown()).nullable() })),
});
export const workerResultInput = z.discriminatedUnion("executor", [kaneResultInput, httpResultInput]);

/** Records a worker result and judges it with the engine. The worker never decides a verdict. */
export async function recordResult(workerId: string, probeRunId: string, input: z.infer<typeof workerResultInput>) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [probeRun] = await tx.select().from(probeRuns).where(eq(probeRuns.id, probeRunId)).for("update");
    if (!probeRun || probeRun.leaseOwner !== workerId || !["leased", "running"].includes(probeRun.status)) {
      throw new ApiError("LEASE_LOST", "This probe run is not leased to this worker.");
    }
    const [probe] = await tx.select().from(probes).where(eq(probes.id, probeRun.probeId));
    const [run] = await tx.select().from(verificationRuns).where(eq(verificationRuns.id, probeRun.verificationRunId));
    if (!probe || !run) throw notFound("Probe run");
    const [version] = await tx.select().from(formVersions).where(eq(formVersions.id, run.formVersionId));
    if (!version) throw notFound("Form version");

    let verdict;
    let extra: Partial<typeof probeRuns.$inferInsert> = {};
    if (input.executor === "kane") {
      const evidenceSpec = probe.serverEvidence as ServerEvidenceSpec | null;
      let server = null;
      if (evidenceSpec) {
        const rows = await tx.select().from(testSubmissions).where(eq(testSubmissions.probeRunId, probeRunId));
        const observed = input.report.runEnd ? { ...input.report.runEnd.finalState, ...input.report.runEnd.memory } : {};
        const receipt = observed.receipt_code?.trim().toUpperCase();
        const match = rows.find((row) => row.receiptCode === receipt);
        server = {
          receiptFound: Boolean(match),
          submissionCount: rows.length,
          storedAnswers: (match?.answers ?? {}) as Record<string, unknown>,
          rawHiddenNonemptyKeys: rows.flatMap((row) => row.rawHiddenNonemptyKeys),
        };
        extra = { serverEvidenceResult: { ...server, storedAnswers: Object.keys(server.storedAnswers) } };
      }
      verdict = evaluateProbeRun({ stages: probe.stages as Stage[], serverEvidence: evidenceSpec }, pageIdentity(version.definitionHash), input.report, server);
      const runEnd = input.report.runEnd;
      extra = {
        ...extra,
        exitCode: input.report.exitCode,
        runEnd: runEnd ? (redact({ status: runEnd.status, reasonCode: runEnd.reasonCode, finalState: runEnd.finalState, memory: runEnd.memory }) as object) : null,
        creditsConsumed: runEnd?.creditsConsumed !== null && runEnd?.creditsConsumed !== undefined ? String(runEnd.creditsConsumed) : null,
        kaneRunId: input.report.sessionId ?? runEnd?.runId ?? null,
        kaneCliVersion: input.report.cliVersion,
        streamVersion: input.report.envelopeOk ? "1" : "invalid",
        evidence: input.evidence,
        stdoutTail: String(redact(input.stdoutTail)).slice(-8192),
      };
    } else {
      const checks = (probe.checks ?? []) as ServerCheck[];
      verdict = evaluateServerContract(checks, input.results as HttpCheckResult[]);
      extra = { httpResults: input.results.map((result) => ({ ...result, storedAnswers: result.storedAnswers ? Object.keys(result.storedAnswers) : null })), serverEvidenceResult: verdict.checkOutcomes };
    }

    await tx
      .update(probeRuns)
      .set({
        ...extra,
        status: "completed",
        finishedAt: new Date(),
        verdict: verdict.verdict,
        reasonCode: verdict.reasonCode,
        failedStage: verdict.failedStage,
        observation: { ...verdict.observation, mismatches: verdict.mismatches },
        agentVerdict: verdict.agentVerdict,
        agentVerdictMismatch: verdict.agentVerdictMismatch,
      })
      .where(eq(probeRuns.id, probeRunId));

    // One automatic retry when nothing ran (infrastructure), never for a FAIL.
    if (verdict.verdict === "UNKNOWN" && verdict.retryable && probeRun.attempt < MAX_AUTO_ATTEMPTS) {
      await tx.insert(probeRuns).values({ id: uuidv7(), probeId: probe.id, verificationRunId: run.id, status: "queued", attempt: probeRun.attempt + 1, retryReason: "auto" });
    }
    await aggregate(tx, run.id);
    await tx.update(workers).set({ state: "idle", lastSeenAt: new Date() }).where(eq(workers.id, workerId));
    logger.info({ msg: "probe judged", probeRunId, probeKey: probe.probeKey, verdict: verdict.verdict, reasonCode: verdict.reasonCode });
    return { verdict: verdict.verdict, reasonCode: verdict.reasonCode };
  });
}

/** Recomputes the run state from the latest attempt of every probe. A FAILED run is never overwritten. */
async function aggregate(tx: DbOrTx, runId: string) {
  const [run] = await tx.select().from(verificationRuns).where(eq(verificationRuns.id, runId));
  if (!run || run.state === "CANCELED") return;
  const rows = await tx
    .select({ probeId: probeRuns.probeId, attempt: probeRuns.attempt, status: probeRuns.status, verdict: probeRuns.verdict, credits: probeRuns.creditsConsumed })
    .from(probeRuns)
    .where(eq(probeRuns.verificationRunId, runId))
    .orderBy(desc(probeRuns.attempt));
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) if (!latest.has(row.probeId)) latest.set(row.probeId, row);
  const verdicts = [...latest.values()].map((row) => (row.status === "completed" ? row.verdict : null));
  const { state, detail } = aggregateRun(run.mode, verdicts);
  const counts = {
    required: latest.size,
    pass: verdicts.filter((value) => value === "PASS").length,
    fail: verdicts.filter((value) => value === "FAIL").length,
    unknown: verdicts.filter((value) => value === "UNKNOWN").length,
  };
  const credits = rows.reduce((sum, row) => sum + (row.credits ? Number(row.credits) : 0), 0);
  const finished = state !== "RUNNING";
  const nextState = run.state === "FAILED" ? "FAILED" : state === "RUNNING" ? (run.state === "QUEUED" ? "RUNNING" : run.state) : state;
  await tx
    .update(verificationRuns)
    .set({ state: nextState, detail, counts, creditsTotal: String(Math.round(credits * 100) / 100), ...(finished && !run.completedAt ? { completedAt: new Date() } : {}) })
    .where(eq(verificationRuns.id, runId));
  if (finished && nextState === "FAILED" && state !== "FAILED") return;
  // A FAILED run cancels its remaining queued probes: no more credits are spent on a known failure.
  if (state === "FAILED") {
    await tx.update(probeRuns).set({ status: "canceled", finishedAt: new Date() }).where(and(eq(probeRuns.verificationRunId, runId), eq(probeRuns.status, "queued")));
  }
}

export async function cancelRun(actor: Actor, formId: string, runId: string, requestId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await loadOwnedForm(tx, actor, formId, true);
    const [run] = await tx.select().from(verificationRuns).where(and(eq(verificationRuns.id, runId), eq(verificationRuns.formId, formId)));
    if (!run) throw notFound("Verification run");
    if (run.state !== "QUEUED" && run.state !== "RUNNING") return { state: run.state };
    await tx.update(probeRuns).set({ status: "canceled", finishedAt: new Date() }).where(and(eq(probeRuns.verificationRunId, runId), eq(probeRuns.status, "queued")));
    await tx.update(verificationRuns).set({ state: "CANCELED", canceledAt: new Date(), completedAt: new Date() }).where(eq(verificationRuns.id, runId));
    await audit(tx, { workspaceId: actor.workspaceId, formId, actorType: "user", actorId: actor.userId, action: "verification.canceled", entityType: "verification_run", entityId: runId, requestId });
    return { state: "CANCELED" as const };
  });
}

export async function workerStatus() {
  const db = await getDb();
  const rows = await db.select({ id: workers.id, state: workers.state, lastSeenAt: workers.lastSeenAt, kaneCliVersion: workers.kaneCliVersion }).from(workers);
  const online = rows.filter((row) => row.lastSeenAt && Date.now() - row.lastSeenAt.getTime() < 60_000);
  return { online: online.length, workers: online };
}

export async function heartbeat(workerId: string, kaneCliVersion: string | null) {
  const db = await getDb();
  await db
    .insert(workers)
    .values({ id: workerId, label: workerId, tokenHash: "shared", state: "idle", kaneCliVersion, lastSeenAt: new Date() })
    .onConflictDoUpdate({ target: workers.id, set: { lastSeenAt: new Date(), kaneCliVersion } });
  // `ownerFilter` tells a worker that this server honours `ownerEmails` on lease requests.
  return { ok: true, ownerFilter: true };
}
