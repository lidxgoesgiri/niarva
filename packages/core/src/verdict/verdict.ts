import type { ProbeSpec, ServerCheck } from "../probes/probes";

/** What the worker extracted from one Kane run. Raw, unjudged. */
export type KaneRunReport = {
  exitCode: number | null;
  /** The worker's own deadline fired (Kane's --timeout is not relied on). */
  timedOut: boolean;
  canceled: boolean;
  /** Every JSON line carried `v: 1`. */
  envelopeOk: boolean;
  surface: string | null;
  cliVersion: string | null;
  runEndCount: number;
  /** Completed progress steps seen before the end of the stream. */
  progressSteps: number;
  unresolvedVariables: boolean;
  /** stderr reported an authentication, token, or credit problem. */
  authFailure: boolean;
  runEnd: {
    status: string;
    reasonCode: string | null;
    /** `run_end.context.memory[key].extracted_value` — the reliable source (M0). */
    memory: Record<string, string>;
    /** `run_end.final_state` — fallback only; the planner may rename keys. */
    finalState: Record<string, string>;
    testUrl: string | null;
    creditsConsumed: number | null;
    /** `run_end.run_id`: a per-session index such as "run-0", not globally unique. */
    runId: string | null;
  } | null;
  /** Kane session id from the `recording_state` event: the unique identifier of this run. */
  sessionId?: string | null;
};

/** Server-side evidence for probes that submit: looked up by receipt within the probe run. */
export type ServerEvidenceResult = {
  receiptFound: boolean;
  submissionCount: number;
  storedAnswers: Record<string, unknown>;
  rawHiddenNonemptyKeys: string[];
};

export type ProbeVerdict = {
  verdict: "PASS" | "FAIL" | "UNKNOWN";
  reasonCode: string | null;
  failedStage: number | null;
  observation: Record<string, string | boolean>;
  mismatches: { stage: number; key: string; expected: string; observed: string }[];
  agentVerdict: string | null;
  /** NIARVA judged FAIL while Kane reported `passed`. */
  agentVerdictMismatch: boolean;
  /** UNKNOWN reasons that may be retried automatically once (nothing ran). */
  retryable: boolean;
};

const RECEIPT = /^[A-Z0-9]{8}$/;
const PAGE_IDENTITY = /^[a-f0-9]{8}$/;

function parseBool(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function unknown(reasonCode: string, report: KaneRunReport | null, extra: Partial<ProbeVerdict> = {}): ProbeVerdict {
  return {
    verdict: "UNKNOWN",
    reasonCode,
    failedStage: null,
    observation: {},
    mismatches: [],
    agentVerdict: report?.runEnd?.status ?? null,
    agentVerdictMismatch: false,
    retryable: false,
    ...extra,
  };
}

/**
 * Judges one Kane probe run. Order matters: execution failures first, then the page identity,
 * then each observation stage. A proven mismatch at a stage outranks keys missing later
 * (the later steps could not be reached because of that failure). Exit code 0 or
 * `status: "passed"` alone never yields PASS.
 */
export function evaluateProbeRun(
  probe: Pick<ProbeSpec, "stages" | "serverEvidence">,
  expectedPageIdentity: string,
  report: KaneRunReport,
  server: ServerEvidenceResult | null,
): ProbeVerdict {
  if (report.canceled) return unknown("CANCELED", report);
  if (report.timedOut) return unknown("TIMEOUT", report);
  if (report.runEndCount === 0) {
    if (report.authFailure) return unknown("AUTH_OR_CREDITS", report, { retryable: report.progressSteps === 0 });
    return report.progressSteps === 0 ? unknown("RUN_NOT_STARTED", report, { retryable: true }) : unknown("WORKER_ERROR", report);
  }
  if (report.runEndCount > 1 || !report.envelopeOk || (report.surface !== null && report.surface !== "run")) return unknown("UNPARSEABLE_STATE", report);
  const runEnd = report.runEnd;
  if (!runEnd || (runEnd.status !== "passed" && runEnd.status !== "failed")) return unknown("UNPARSEABLE_STATE", report);
  if (report.unresolvedVariables) return unknown("WORKER_ERROR", report);
  // Kane ended without executing a single step (seen in PROD-LOOP-01: "No start URL provided").
  // Nothing about the product was observed, so the run never started; it is retried once.
  if (runEnd.status === "failed" && report.progressSteps === 0) return unknown("RUN_NOT_STARTED", report, { retryable: true });

  const observations: Record<string, string> = { ...runEnd.finalState, ...runEnd.memory };
  const observation: Record<string, string | boolean> = {};

  const identity = observations.page_definition_hash?.trim().toLowerCase();
  if (identity === undefined || identity === "") return unknown("MISSING_OBSERVATION", report, { failedStage: 0 });
  if (!PAGE_IDENTITY.test(identity)) return unknown("UNPARSEABLE_STATE", report, { failedStage: 0 });
  observation.page_definition_hash = identity;
  if (identity !== expectedPageIdentity) return unknown("STALE_TARGET", report, { failedStage: 0, observation });

  let receipt: string | null = null;
  for (const stage of probe.stages) {
    const mismatches: ProbeVerdict["mismatches"] = [];
    for (const [key, expectation] of Object.entries(stage.expect)) {
      const raw = observations[key];
      if (raw === undefined || raw.trim() === "") {
        return unknown("MISSING_OBSERVATION", report, { failedStage: stage.stage, observation });
      }
      if (expectation.type === "receipt") {
        const code = raw.trim().toUpperCase();
        if (!RECEIPT.test(code)) return unknown("UNPARSEABLE_STATE", report, { failedStage: stage.stage, observation });
        observation[key] = code;
        receipt = code;
        continue;
      }
      const value = parseBool(raw);
      if (value === null) return unknown("UNPARSEABLE_STATE", report, { failedStage: stage.stage, observation });
      observation[key] = value;
      if (value !== expectation.value) mismatches.push({ stage: stage.stage, key, expected: String(expectation.value), observed: String(value) });
    }
    if (mismatches.length > 0) {
      return {
        verdict: "FAIL",
        reasonCode: "OBSERVATION_MISMATCH",
        failedStage: stage.stage,
        observation,
        mismatches,
        agentVerdict: runEnd.status,
        agentVerdictMismatch: runEnd.status === "passed",
        retryable: false,
      };
    }
  }

  if (probe.serverEvidence) {
    if (!server || !server.receiptFound || receipt === null) return unknown("SERVER_EVIDENCE_MISSING", report, { observation });
    const spec = probe.serverEvidence;
    const mismatches: ProbeVerdict["mismatches"] = [];
    if (server.submissionCount !== spec.expectSubmissions) {
      mismatches.push({ stage: -1, key: "submission_count", expected: String(spec.expectSubmissions), observed: String(server.submissionCount) });
    }
    for (const key of spec.forbiddenKeys) {
      if (key in server.storedAnswers) mismatches.push({ stage: -1, key: `stored:${key}`, expected: "absent", observed: "present" });
      if (server.rawHiddenNonemptyKeys.includes(key)) mismatches.push({ stage: -1, key: `sent_while_hidden:${key}`, expected: "absent", observed: "present" });
    }
    const storedText = JSON.stringify(server.storedAnswers);
    for (const marker of spec.markers) if (storedText.includes(marker)) mismatches.push({ stage: -1, key: `marker:${marker}`, expected: "absent", observed: "present" });
    if (spec.expectedAnswers) {
      const expected = JSON.stringify(Object.fromEntries(Object.entries(spec.expectedAnswers).sort()));
      const actual = JSON.stringify(Object.fromEntries(Object.entries(server.storedAnswers).sort()));
      if (expected !== actual) mismatches.push({ stage: -1, key: "stored_answers", expected, observed: actual });
    }
    if (mismatches.length > 0) {
      return { verdict: "FAIL", reasonCode: "SERVER_MISMATCH", failedStage: -1, observation, mismatches, agentVerdict: runEnd.status, agentVerdictMismatch: runEnd.status === "passed", retryable: false };
    }
  }

  // Everything matched; Kane's own signals must agree before a PASS is granted.
  const uploadFailed = report.exitCode === 1 && runEnd.status === "passed" && !runEnd.testUrl;
  if (runEnd.status !== "passed") return unknown("AGENT_INCONSISTENT", report, { observation });
  if (report.exitCode !== 0 && !uploadFailed) return unknown("AGENT_INCONSISTENT", report, { observation });
  return { verdict: "PASS", reasonCode: null, failedStage: null, observation, mismatches: [], agentVerdict: runEnd.status, agentVerdictMismatch: false, retryable: false };
}

export type HttpCheckResult = {
  checkKey: string;
  /** null when the request failed, timed out, or was rate limited. */
  status: number | null;
  fieldErrorKeys: string[];
  storedAnswers: Record<string, unknown> | null;
};

/** Judges the server contract probe: validation and hidden-value filtering, independent of any browser. */
export function evaluateServerContract(checks: ServerCheck[], results: HttpCheckResult[]): ProbeVerdict & { checkOutcomes: Record<string, "PASS" | "FAIL" | "UNKNOWN"> } {
  const byKey = new Map(results.map((result) => [result.checkKey, result]));
  const outcomes: Record<string, "PASS" | "FAIL" | "UNKNOWN"> = {};
  const mismatches: ProbeVerdict["mismatches"] = [];
  for (const check of checks) {
    const result = byKey.get(check.checkKey);
    if (!result || result.status === null || result.status === 429) {
      outcomes[check.checkKey] = "UNKNOWN";
      continue;
    }
    let ok = result.status === check.expect.status;
    if (ok && check.expect.status === 422) ok = check.expect.fieldErrorKeys.every((key) => result.fieldErrorKeys.includes(key));
    if (ok && check.expect.status === 201) {
      const stored = result.storedAnswers ?? {};
      if (check.expect.absentKeys?.some((key) => key in stored)) ok = false;
      if (check.expect.storedAnswers) {
        const expected = JSON.stringify(Object.fromEntries(Object.entries(check.expect.storedAnswers).sort()));
        const actual = JSON.stringify(Object.fromEntries(Object.entries(stored).sort()));
        if (expected !== actual) ok = false;
      }
    }
    outcomes[check.checkKey] = ok ? "PASS" : "FAIL";
    if (!ok) mismatches.push({ stage: -1, key: check.checkKey, expected: JSON.stringify(check.expect), observed: JSON.stringify({ status: result.status, fieldErrorKeys: result.fieldErrorKeys }) });
  }
  const values = Object.values(outcomes);
  const verdict = values.includes("FAIL") ? "FAIL" : values.includes("UNKNOWN") || values.length === 0 ? "UNKNOWN" : "PASS";
  return {
    verdict,
    reasonCode: verdict === "FAIL" ? "SERVER_MISMATCH" : verdict === "UNKNOWN" ? "ENV_UNREACHABLE" : null,
    failedStage: verdict === "FAIL" ? -1 : null,
    observation: {},
    mismatches,
    agentVerdict: null,
    agentVerdictMismatch: false,
    retryable: verdict === "UNKNOWN",
    checkOutcomes: outcomes,
  };
}

export type RunState = "QUEUED" | "RUNNING" | "VERIFIED" | "FAILED" | "UNVERIFIED" | "CANCELED";

/**
 * Full-run aggregation. Any FAIL fails the run; any UNKNOWN leaves it UNVERIFIED; zero
 * probes can never be VERIFIED; a diagnostic run is never VERIFIED.
 */
export function aggregateRun(mode: "full" | "diagnostic", verdicts: ("PASS" | "FAIL" | "UNKNOWN" | null)[]): { state: RunState; detail: string | null } {
  if (verdicts.includes("FAIL")) return { state: "FAILED", detail: null };
  if (verdicts.includes(null)) return { state: "RUNNING", detail: null };
  if (verdicts.includes("UNKNOWN")) return { state: "UNVERIFIED", detail: "BLOCKED" };
  if (mode === "diagnostic") return { state: "UNVERIFIED", detail: "DIAGNOSTIC_ONLY" };
  if (verdicts.length === 0) return { state: "UNVERIFIED", detail: "PARTIAL" };
  return { state: "VERIFIED", detail: null };
}
