import type { KaneRunReport, ServerCheck, Stage } from "@niarva/core";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/context/session";
import type { Db } from "@/server/db/client";
import { probeRuns, probes, publications, submissions } from "@/server/db/schema";
import { approveClaims, createForm } from "@/server/services/intent.service";
import { publish, unpublish } from "@/server/services/publish.service";
import { getFormState } from "@/server/services/state.service";
import { submitPreview, submitPublic } from "@/server/services/submission.service";
import { leaseNext, recordResult, requestVerification, type Lease } from "@/server/services/verification.service";
import { decideRepair, generateVersion, proposeVersionRepairs, saveEdits } from "@/server/services/version.service";
import { bootTestApp, createCreator } from "../support/test-app";

/**
 * Server-side invariants of the golden flow (T-04 … T-08). The worker is SIMULATED here: reports
 * are built from each probe's expectations so the server logic can be tested deterministically.
 * These tests are never evidence of browser behavior; Kane CLI provides that separately.
 */
const BASE = "http://localhost:3000";
const WORKER = "test-worker";

type Behavior = (lease: Extract<Lease, { executor: "kane" }>, stages: Stage[]) => Promise<Record<string, string>>;

async function runWorkerOnce(db: Db, behave: Behavior): Promise<boolean> {
  const lease = await leaseNext(WORKER, "0.10.4", BASE);
  if (!lease) return false;
  if (lease.executor === "http") {
    const results = [];
    for (const check of lease.checks as ServerCheck[]) {
      try {
        const response = await submitPreview(lease.formVersionId, lease.previewToken, { submissionId: crypto.randomUUID(), answers: check.payload });
        results.push({ checkKey: check.checkKey, status: 201, fieldErrorKeys: [], storedAnswers: response.storedAnswers });
      } catch (error) {
        const fieldErrors = (error as { fieldErrors?: Record<string, string> }).fieldErrors ?? {};
        results.push({ checkKey: check.checkKey, status: 422, fieldErrorKeys: Object.keys(fieldErrors), storedAnswers: null });
      }
    }
    await recordResult(WORKER, lease.probeRunId, { executor: "http", results });
    return true;
  }
  const [row] = await db.select({ stages: probes.stages }).from(probes).innerJoin(probeRuns, eq(probes.id, probeRuns.probeId)).where(eq(probeRuns.id, lease.probeRunId));
  const memory = await behave(lease, row!.stages as Stage[]);
  const report: KaneRunReport = {
    exitCode: 0,
    timedOut: false,
    canceled: false,
    envelopeOk: true,
    surface: "run",
    cliVersion: "0.10.4",
    runEndCount: 1,
    progressSteps: 5,
    unresolvedVariables: false,
    authFailure: false,
    runEnd: { status: "passed", reasonCode: "success.complete", memory, finalState: {}, testUrl: null, creditsConsumed: 1, runId: `simulated-${lease.probeRunId}` },
  };
  await recordResult(WORKER, lease.probeRunId, { executor: "kane", report, stdoutTail: "", evidence: null });
  return true;
}

/** Builds memory that matches every expectation, submitting through the preview API when a receipt is expected. */
function faithful(identity: string): Behavior {
  return async (lease, stages) => {
    const memory: Record<string, string> = { page_definition_hash: identity };
    const url = new URL(lease.variables.preview_url.value);
    const versionId = url.pathname.split("/").pop()!;
    const token = url.searchParams.get("t");
    for (const stage of stages) {
      for (const [key, expectation] of Object.entries(stage.expect)) {
        if (expectation.type === "bool") memory[key] = String(expectation.value);
        else {
          const answers = lease.kind === "valid_submission" ? { full_name: "Test Applicant 1", gpa: "3.50", certificate: "Test Applicant 2" } : { full_name: "Test Applicant 1", gpa: "3.49" };
          const response = await submitPreview(versionId, token, { submissionId: crypto.randomUUID(), answers });
          memory[key] = response.receiptCode;
        }
      }
    }
    return memory;
  };
}

describe("golden flow on the server", () => {
  let db: Db;
  let close: () => Promise<void>;
  let owner: Actor;
  let formId: string;
  let appliedProposalId: string;

  beforeAll(async () => {
    ({ db, close } = await bootTestApp());
    ({ actor: owner } = await createCreator("owner"));
  });
  afterAll(async () => {
    await close();
  });

  async function drain(behavior: Behavior) {
    for (let guard = 0; guard < 20; guard += 1) if (!(await runWorkerOnce(db, behavior))) return;
  }

  async function verifyLatest(identityOf: () => Promise<string>, behave?: Behavior) {
    const state = await getFormState(owner, formId);
    const queued = await requestVerification(owner, formId, state.version!.id, { mode: "full", force: false }, "test");
    await drain(behave ?? faithful(await identityOf()));
    return queued;
  }

  it("creates a form from the template and approves its claims", async () => {
    ({ formId } = await createForm(owner, { source: "template", template: "scholarship" }, "test"));
    const state = await getFormState(owner, formId);
    expect(state.claimSet?.status).toBe("draft");
    const approved = await approveClaims(owner, formId, { revision: state.claimSet!.revision }, "test");
    expect(approved.claimsHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("finds the seeded gt defect, refuses full verification, and repairs it into a new version", async () => {
    await generateVersion(owner, formId, { strategy: "seeded_demo" }, "test");
    let state = await getFormState(owner, formId);
    expect(state.analysis?.verdict).toBe("FAILED");
    const cex = state.analysis?.findings.find((finding) => finding.code === "INTENT_MISMATCH_VISIBILITY")?.counterexample;
    expect(cex?.assignment).toEqual({ gpa: "3.50" });
    await expect(requestVerification(owner, formId, state.version!.id, { mode: "full", force: false }, "test")).rejects.toMatchObject({ code: "ANALYSIS_REQUIRED" });

    const diagnostic = await requestVerification(owner, formId, state.version!.id, { mode: "diagnostic", force: false }, "test");
    expect(diagnostic.runId).toBeTruthy();

    const { proposals } = await proposeVersionRepairs(owner, formId, state.version!.id, "test");
    expect(proposals[0]?.strategy).toBe("ALIGN_OPERATOR");
    const before = state.claimSet!.claimsHash;
    const v1 = state.version!.id;
    appliedProposalId = proposals[0]!.id;
    const { versionId } = await decideRepair(owner, formId, appliedProposalId, "approve", "test");
    state = await getFormState(owner, formId);
    expect(state.version?.id).toBe(versionId);
    expect(state.version?.parentVersionId).toBe(v1);
    expect(state.version?.createdVia).toBe("repair");
    expect(state.claimSet?.claimsHash).toBe(before);
    expect(state.analysis?.verdict).toBe("PASS");
  });

  it("refuses to apply a stale repair proposal", async () => {
    await expect(decideRepair(owner, formId, appliedProposalId, "approve", "test")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("denies publication through the service before browser proof (direct API)", async () => {
    const state = await getFormState(owner, formId);
    await expect(publish(owner, formId, { versionId: state.version!.id, acknowledgedWarningKeys: [] }, "test")).rejects.toMatchObject({ code: "GATE_BLOCKED", reasons: expect.arrayContaining(["BROWSER_UNVERIFIED"]) });
  });

  it("verifies the repaired version with the full probe suite and publishes it", async () => {
    const identity = async () => (await getFormState(owner, formId)).version!.pageIdentity;
    await verifyLatest(identity);
    const state = await getFormState(owner, formId);
    expect(state.runs[0]?.state).toBe("VERIFIED");
    expect(state.runs[0]?.counts).toMatchObject({ pass: 8, fail: 0, unknown: 0 });
    expect(state.gate.eligible).toBe(true);
    const published = await publish(owner, formId, { versionId: state.version!.id, acknowledgedWarningKeys: [] }, "test");
    expect(published.versionNo).toBe(2);
  });

  it("reuses fresh proof instead of spending credits again", async () => {
    const state = await getFormState(owner, formId);
    const again = await requestVerification(owner, formId, state.version!.id, { mode: "full", force: false }, "test");
    expect(again.cached).toBe(true);
  });

  it("keeps public submissions idempotent across republication and never stores hidden answers", async () => {
    const state = await getFormState(owner, formId);
    const slug = state.form.slug;
    const versionId = state.version!.id;
    const submissionId = crypto.randomUUID();
    const payload = { submissionId, formVersionId: versionId, answers: { full_name: "Test Respondent", gpa: "3.49", certificate: "SHOULD-NOT-BE-STORED" } };
    const first = await submitPublic(slug, payload, "203.0.113.5");
    expect(first.replayed).toBe(false);
    const [stored] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    expect(stored?.answers).toEqual({ full_name: "Test Respondent", gpa: "3.49" });

    await unpublish(owner, formId, "test");
    await publish(owner, formId, { versionId, acknowledgedWarningKeys: [] }, "test");
    const retry = await submitPublic(slug, payload, "203.0.113.5");
    expect(retry).toMatchObject({ receiptCode: first.receiptCode, replayed: true });
    const [active] = await db.select().from(publications).where(eq(publications.formId, formId)).orderBy(publications.publishedAt);
    expect(active).toBeTruthy();
    const all = await db.select().from(submissions).where(eq(submissions.formId, formId));
    expect(all).toHaveLength(1);

    await expect(submitPublic(slug, { ...payload, answers: { ...payload.answers, full_name: "Someone else" } }, "203.0.113.5")).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    await expect(submitPublic(slug, { submissionId: crypto.randomUUID(), formVersionId: versionId, answers: { full_name: "X", gpa: "3.5" } }, "203.0.113.5")).rejects.toMatchObject({ code: "SUBMISSION_INVALID", fieldErrors: { certificate: expect.any(String) } });
  });

  it("refuses preview replays with a different payload or an invalid token", async () => {
    const state = await getFormState(owner, formId);
    await expect(submitPreview(state.version!.id, "forged.token", { submissionId: crypto.randomUUID(), answers: {} })).rejects.toMatchObject({ code: "PREVIEW_TOKEN_INVALID" });
  });

  it("makes proof stale after an edit and blocks publishing the new version", async () => {
    const state = await getFormState(owner, formId);
    const definition = structuredClone(state.version!.definition) as { fields: { key: string; label: string }[] };
    definition.fields[0]!.label = "Full legal name";
    await saveEdits(owner, formId, { baseVersionId: state.version!.id, definition }, "test");
    const edited = await getFormState(owner, formId);
    expect(edited.version?.versionNo).toBe(3);
    expect(edited.gate.reasons).toContain("BROWSER_UNVERIFIED");
    await expect(publish(owner, formId, { versionId: edited.version!.id, acknowledgedWarningKeys: [] }, "test")).rejects.toMatchObject({ code: "GATE_BLOCKED" });
    await expect(publish(owner, formId, { versionId: state.version!.id, acknowledgedWarningKeys: [] }, "test")).rejects.toMatchObject({ code: "GATE_BLOCKED", reasons: ["NOT_LATEST_VERSION"] });
  });

  it("requires two consecutive fresh verified runs after a failed run (instability)", async () => {
    const identity = async () => (await getFormState(owner, formId)).version!.pageIdentity;
    // A failing run: the boundary probe observes the certificate hidden at GPA 3.50.
    await verifyLatest(identity, async (lease, stages) => {
      const memory = await faithful(await identity())(lease, stages);
      if (lease.kind === "boundary_bundle") memory.obs_2_certificate_visible = "false";
      return memory;
    });
    let state = await getFormState(owner, formId);
    expect(state.runs[0]?.state).toBe("FAILED");

    await verifyLatest(identity);
    state = await getFormState(owner, formId);
    expect(state.runs[0]?.state).toBe("VERIFIED");
    expect(state.gate.reasons).toContain("BROWSER_UNSTABLE");

    const third = await requestVerification(owner, formId, state.version!.id, { mode: "full", force: false }, "test");
    expect(third.cached).toBe(false);
    await drain(faithful(await identity()));
    state = await getFormState(owner, formId);
    expect(state.runs[0]?.state).toBe("VERIFIED");
    expect(state.gate.eligible).toBe(true);
  });

  it("hides another creator's form as not found", async () => {
    const { actor: stranger } = await createCreator("stranger");
    await expect(getFormState(stranger, formId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(publish(stranger, formId, { versionId: crypto.randomUUID(), acknowledgedWarningKeys: [] }, "test")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
