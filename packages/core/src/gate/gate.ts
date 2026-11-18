import type { RunState } from "../verdict/verdict";

/** One full verification run for the current proof key, oldest first. */
export type RunHistoryEntry = { state: RunState; cached: boolean };

export type Instability = { unstable: boolean; consecutiveVerifiedAfterFailure: number; required: number };

export const REQUIRED_CONSECUTIVE_VERIFIED = 2;

/**
 * After a full run FAILED for a proof key, that key is unstable until two consecutive, newly
 * executed, complete VERIFIED runs follow the latest failure. A FAILED, UNVERIFIED (unknown),
 * or canceled run resets the count; a cached result never advances it.
 */
export function instabilityOf(history: RunHistoryEntry[]): Instability {
  let lastFailure = -1;
  history.forEach((entry, index) => {
    if (entry.state === "FAILED") lastFailure = index;
  });
  if (lastFailure < 0) return { unstable: false, consecutiveVerifiedAfterFailure: 0, required: REQUIRED_CONSECUTIVE_VERIFIED };
  let streak = 0;
  for (const entry of history.slice(lastFailure + 1)) {
    if (entry.state === "QUEUED" || entry.state === "RUNNING") continue;
    if (entry.state === "VERIFIED" && !entry.cached) streak += 1;
    else if (entry.state === "VERIFIED" && entry.cached) continue;
    else streak = 0;
  }
  return { unstable: streak < REQUIRED_CONSECUTIVE_VERIFIED, consecutiveVerifiedAfterFailure: streak, required: REQUIRED_CONSECUTIVE_VERIFIED };
}

export type GateInput = {
  claimSet: { approved: boolean; hashMatches: boolean };
  analysis: { verdict: "PASS" | "FAILED" | "UNKNOWN"; current: boolean; warningKeys: string[] } | null;
  /** Latest full run for the version's current proof key, if any. */
  latestFullRun: { state: RunState; fresh: boolean } | null;
  history: RunHistoryEntry[];
  acknowledgedWarningKeys: string[];
  manualClaimKeys: string[];
  acknowledgedManualClaimKeys: string[];
  slug: { valid: boolean; available: boolean };
  formArchived: boolean;
};

export type GateResult = { eligible: boolean; reasons: string[]; instability: Instability };

/**
 * Publication gate. The backend evaluates it inside the publish transaction; the UI only
 * displays the result. There is no override of required proof.
 */
export function evaluateGate(input: GateInput): GateResult {
  const reasons: string[] = [];
  if (!input.claimSet.approved || !input.claimSet.hashMatches) reasons.push("INTENT_NOT_APPROVED");
  if (!input.analysis || !input.analysis.current) reasons.push("STATIC_NOT_RUN");
  else if (input.analysis.verdict === "FAILED") reasons.push("STATIC_FAILED");
  else if (input.analysis.verdict === "UNKNOWN") reasons.push("STATIC_UNKNOWN");

  const instability = instabilityOf(input.history);
  const run = input.latestFullRun;
  if (!run) reasons.push("BROWSER_UNVERIFIED");
  else if (!run.fresh) reasons.push("BROWSER_STALE");
  else if (run.state === "FAILED") reasons.push("BROWSER_FAILED");
  else if (run.state === "QUEUED" || run.state === "RUNNING") reasons.push("BROWSER_RUNNING");
  else if (run.state !== "VERIFIED") reasons.push("BROWSER_UNVERIFIED");
  else if (instability.unstable) reasons.push("BROWSER_UNSTABLE");

  if (input.analysis?.warningKeys.some((key) => !input.acknowledgedWarningKeys.includes(key))) reasons.push("WARNINGS_NOT_ACKNOWLEDGED");
  if (input.manualClaimKeys.some((key) => !input.acknowledgedManualClaimKeys.includes(key))) reasons.push("MANUAL_CLAIMS_NOT_ACKNOWLEDGED");
  if (!input.slug.valid) reasons.push("SLUG_INVALID");
  else if (!input.slug.available) reasons.push("SLUG_TAKEN");
  if (input.formArchived) reasons.push("FORM_ARCHIVED");
  return { eligible: reasons.length === 0, reasons, instability };
}

export const GATE_REASON_TEXT: Record<string, string> = {
  INTENT_NOT_APPROVED: "The claims for this version are not approved.",
  STATIC_NOT_RUN: "Static checks have not run for this version.",
  STATIC_FAILED: "Static checks found a mismatch with the approved intent.",
  STATIC_UNKNOWN: "Static checks could not decide every case.",
  BROWSER_UNVERIFIED: "This exact version has no complete browser proof.",
  BROWSER_STALE: "The browser proof no longer matches the current renderer or configuration.",
  BROWSER_FAILED: "The latest browser verification failed.",
  BROWSER_RUNNING: "Browser verification is still running.",
  BROWSER_UNSTABLE: "A previous run failed for this version; two consecutive fresh verified runs are required.",
  WARNINGS_NOT_ACKNOWLEDGED: "Some warnings are not acknowledged.",
  MANUAL_CLAIMS_NOT_ACKNOWLEDGED: "Some requirements need manual checking and are not acknowledged.",
  SLUG_INVALID: "The public address is not valid.",
  SLUG_TAKEN: "The public address is already used by another form.",
  FORM_ARCHIVED: "The form is archived.",
};
