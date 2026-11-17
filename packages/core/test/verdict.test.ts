import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Stage } from "../src/probes/probes";
import { parseKaneRunStream } from "../src/verdict/stream";
import { aggregateRun, evaluateProbeRun, evaluateServerContract, type KaneRunReport } from "../src/verdict/verdict";

// T-03 — parser and verdict contract, exercised on real Kane CLI 0.10.4 streams recorded in M0.
const LAB_IDENTITY = "3f2a91c0";

function fixture(runId: string): KaneRunReport {
  const raw = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "kane", `${runId}.json`), "utf8")) as {
    exitCode: number | null;
    timedOut: boolean;
    stdout: string;
    stderr: string;
  };
  return parseKaneRunStream(raw);
}

const bool = (value: boolean) => ({ type: "bool" as const, value });
const boundaryStages: Stage[] = [
  { stage: 1, name: "3.49", expect: { obs_1_visible: bool(false), obs_1_required: bool(false) } },
  { stage: 2, name: "3.50", expect: { obs_2_visible: bool(true), obs_2_required: bool(true) } },
  { stage: 3, name: "3.51", expect: { obs_3_visible: bool(true), obs_3_required: bool(true) } },
];

describe("Kane stream parser on real runs", () => {
  it("reads the envelope, the single run_end, and credits", () => {
    const report = fixture("K02-basic");
    expect(report).toMatchObject({ envelopeOk: true, surface: "run", cliVersion: "0.10.4", runEndCount: 1, exitCode: 0 });
    expect(report.runEnd?.status).toBe("passed");
    expect(report.runEnd?.creditsConsumed).toBeGreaterThan(0);
    expect(report.runEnd?.memory.page_definition_hash).toBe(LAB_IDENTITY);
  });

  it("recovers observation keys from context.memory when final_state renamed them", () => {
    const report = fixture("H01-boundary-1");
    expect(report.runEnd?.finalState.obs_1_visible).toBeUndefined();
    expect(report.runEnd?.memory).toMatchObject({ obs_1_visible: "false", obs_2_visible: "true", obs_3_visible: "true" });
  });

  it("flags unresolved variables", () => {
    expect(fixture("K06-missing-var").unresolvedVariables).toBe(true);
  });

  it("reports a killed run without run_end", () => {
    const report = fixture("K04-timeout-30");
    expect(report.runEndCount).toBe(0);
    expect(report.timedOut).toBe(true);
  });
});

describe("probe verdicts on real runs", () => {
  it("passes a correct boundary run whose observations match the oracle", () => {
    const verdict = evaluateProbeRun({ stages: boundaryStages, serverEvidence: null }, LAB_IDENTITY, fixture("H01-boundary-3"), null);
    expect(verdict).toMatchObject({ verdict: "PASS", reasonCode: null });
  });

  it("fails the gt boundary fault even though Kane reported passed", () => {
    const verdict = evaluateProbeRun({ stages: boundaryStages, serverEvidence: null }, LAB_IDENTITY, fixture("FAIL-boundary-gt-2"), null);
    expect(verdict).toMatchObject({ verdict: "FAIL", reasonCode: "OBSERVATION_MISMATCH", failedStage: 2, agentVerdict: "passed", agentVerdictMismatch: true });
    expect(verdict.mismatches).toContainEqual({ stage: 2, key: "obs_2_visible", expected: "true", observed: "false" });
  });

  it("lets an earlier proven mismatch outrank keys missing in later stages", () => {
    const stages: Stage[] = [
      { stage: 1, name: "active", expect: { obs_active_visible: bool(true), obs_active_required: bool(true) } },
      { stage: 2, name: "empty submit", expect: { obs_active_submitted: bool(false), obs_active_error_shown: bool(true) } },
      { stage: 3, name: "inactive submit", expect: { submitted: bool(true), receipt_code: { type: "receipt" } } },
    ];
    const verdict = evaluateProbeRun({ stages, serverEvidence: null }, LAB_IDENTITY, fixture("H08-condreq-reqoff"), null);
    expect(verdict).toMatchObject({ verdict: "FAIL", failedStage: 2 });
    const correct = evaluateProbeRun({ stages, serverEvidence: null }, LAB_IDENTITY, fixture("H08-condreq-1"), null);
    expect(correct.verdict).toBe("PASS");
  });

  it("treats an infrastructure failure with missing observations as UNKNOWN, never FAIL", () => {
    const stages: Stage[] = [{ stage: 1, name: "shown", expect: { obs_1_shown: bool(true) } }];
    const verdict = evaluateProbeRun({ stages, serverEvidence: null }, LAB_IDENTITY, fixture("H01-hidden-1"), null);
    expect(verdict).toMatchObject({ verdict: "UNKNOWN", reasonCode: "MISSING_OBSERVATION" });
  });

  it("treats a timeout and an unresolved variable as UNKNOWN", () => {
    expect(evaluateProbeRun({ stages: boundaryStages, serverEvidence: null }, LAB_IDENTITY, fixture("K04-timeout-30"), null).reasonCode).toBe("TIMEOUT");
    expect(evaluateProbeRun({ stages: [], serverEvidence: null }, LAB_IDENTITY, fixture("K06-missing-var"), null).reasonCode).toBe("WORKER_ERROR");
  });

  it("refuses evidence from a different page version", () => {
    const verdict = evaluateProbeRun({ stages: boundaryStages, serverEvidence: null }, "deadbeef", fixture("H01-boundary-3"), null);
    expect(verdict).toMatchObject({ verdict: "UNKNOWN", reasonCode: "STALE_TARGET", failedStage: 0 });
  });
});

describe("probe verdict contract (constructed edge cases)", () => {
  const base: KaneRunReport = {
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
    runEnd: { status: "passed", reasonCode: "success.complete", memory: { page_definition_hash: "abcd1234", ok: "true" }, finalState: {}, testUrl: "https://example.test/x", creditsConsumed: 10, runId: "r1" },
  };
  const stages: Stage[] = [{ stage: 1, name: "one", expect: { ok: bool(true) } }];

  it("never passes on exit code alone", () => {
    const missing = { ...base, runEnd: { ...base.runEnd!, memory: { page_definition_hash: "abcd1234" } } };
    expect(evaluateProbeRun({ stages, serverEvidence: null }, "abcd1234", missing, null)).toMatchObject({ verdict: "UNKNOWN", reasonCode: "MISSING_OBSERVATION" });
  });

  it("rejects duplicate terminal events, a broken envelope, and unknown statuses", () => {
    expect(evaluateProbeRun({ stages, serverEvidence: null }, "abcd1234", { ...base, runEndCount: 2 }, null).reasonCode).toBe("UNPARSEABLE_STATE");
    expect(evaluateProbeRun({ stages, serverEvidence: null }, "abcd1234", { ...base, envelopeOk: false }, null).reasonCode).toBe("UNPARSEABLE_STATE");
    expect(evaluateProbeRun({ stages, serverEvidence: null }, "abcd1234", { ...base, runEnd: { ...base.runEnd!, status: "mystery" } }, null).reasonCode).toBe("UNPARSEABLE_STATE");
  });

  it("rejects values outside the allowlist instead of coercing them", () => {
    const weird = { ...base, runEnd: { ...base.runEnd!, memory: { page_definition_hash: "abcd1234", ok: "yes" } } };
    expect(evaluateProbeRun({ stages, serverEvidence: null }, "abcd1234", weird, null).reasonCode).toBe("UNPARSEABLE_STATE");
  });

  it("is UNKNOWN when Kane says failed although every observation matches", () => {
    const inconsistent = { ...base, exitCode: 1, runEnd: { ...base.runEnd!, status: "failed" } };
    expect(evaluateProbeRun({ stages, serverEvidence: null }, "abcd1234", inconsistent, null).reasonCode).toBe("AGENT_INCONSISTENT");
  });

  it("marks a run that never started as retryable", () => {
    const notStarted = { ...base, exitCode: 2, runEndCount: 0, progressSteps: 0, runEnd: null };
    expect(evaluateProbeRun({ stages, serverEvidence: null }, "abcd1234", notStarted, null)).toMatchObject({ verdict: "UNKNOWN", reasonCode: "RUN_NOT_STARTED", retryable: true });
  });

  it("fails on server evidence of a stored hidden value", () => {
    const withReceipt = { ...base, runEnd: { ...base.runEnd!, memory: { page_definition_hash: "abcd1234", submitted: "true", receipt_code: "AB12CD34" } } };
    const submitStages: Stage[] = [{ stage: 1, name: "submit", expect: { submitted: bool(true), receipt_code: { type: "receipt" } } }];
    const spec = { expectSubmissions: 1, forbiddenKeys: ["certificate"], markers: ["NIARVA-HIDDEN-1"] };
    const leaked = evaluateProbeRun({ stages: submitStages, serverEvidence: spec }, "abcd1234", withReceipt, {
      receiptFound: true,
      submissionCount: 1,
      storedAnswers: { certificate: "NIARVA-HIDDEN-1" },
      rawHiddenNonemptyKeys: ["certificate"],
    });
    expect(leaked).toMatchObject({ verdict: "FAIL", reasonCode: "SERVER_MISMATCH" });
    const clean = evaluateProbeRun({ stages: submitStages, serverEvidence: spec }, "abcd1234", withReceipt, { receiptFound: true, submissionCount: 1, storedAnswers: { full_name: "x" }, rawHiddenNonemptyKeys: [] });
    expect(clean.verdict).toBe("PASS");
    const missing = evaluateProbeRun({ stages: submitStages, serverEvidence: spec }, "abcd1234", withReceipt, null);
    expect(missing.reasonCode).toBe("SERVER_EVIDENCE_MISSING");
  });
});

describe("server contract and run aggregation", () => {
  it("judges each server check independently", () => {
    const result = evaluateServerContract(
      [
        { checkKey: "S1-01", code: "S1", claimKeys: ["C-01"], payload: {}, expect: { status: 422, fieldErrorKeys: ["full_name"] } },
        { checkKey: "S3-02", code: "S3", claimKeys: ["C-03"], payload: {}, expect: { status: 201, absentKeys: ["certificate"] } },
      ],
      [
        { checkKey: "S1-01", status: 422, fieldErrorKeys: ["full_name"], storedAnswers: null },
        { checkKey: "S3-02", status: 201, fieldErrorKeys: [], storedAnswers: { certificate: "leak" } },
      ],
    );
    expect(result.verdict).toBe("FAIL");
    expect(result.checkOutcomes).toEqual({ "S1-01": "PASS", "S3-02": "FAIL" });
  });

  it("aggregates runs fail-closed", () => {
    expect(aggregateRun("full", ["PASS", "PASS"])).toEqual({ state: "VERIFIED", detail: null });
    expect(aggregateRun("full", ["PASS", "UNKNOWN"])).toEqual({ state: "UNVERIFIED", detail: "BLOCKED" });
    expect(aggregateRun("full", ["PASS", "FAIL", "UNKNOWN"])).toEqual({ state: "FAILED", detail: null });
    expect(aggregateRun("full", ["PASS", null]).state).toBe("RUNNING");
    expect(aggregateRun("full", []).state).toBe("UNVERIFIED");
    expect(aggregateRun("diagnostic", ["PASS"])).toEqual({ state: "UNVERIFIED", detail: "DIAGNOSTIC_ONLY" });
  });
});
