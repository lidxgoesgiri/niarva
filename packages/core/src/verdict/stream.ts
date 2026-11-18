import type { KaneRunReport } from "./verdict";

const AUTH_HINT = /(token refresh failed|not authenticated|kane-cli login|insufficient credits|out of credits|no credits)/i;

/**
 * Turns the raw output of `kane-cli run --agent` into a typed report. Pure: the worker hands
 * over stdout, stderr, the exit code, and whether its own deadline fired. Unknown event types
 * and non-JSON lines are tolerated; nothing here decides a verdict.
 */
export function parseKaneRunStream(input: { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; canceled?: boolean }): KaneRunReport {
  let envelopeOk = true;
  let surface: string | null = null;
  let cliVersion: string | null = null;
  let progressSteps = 0;
  let unresolvedVariables = false;
  const runEnds: Record<string, unknown>[] = [];

  for (const line of input.stdout.split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line) as Record<string, unknown>;
    } catch {
      envelopeOk = false;
      continue;
    }
    if (event.v !== 1) envelopeOk = false;
    switch (event.type) {
      case "stream_start":
        surface = typeof event.surface === "string" ? event.surface : null;
        cliVersion = typeof event.cli_version === "string" ? event.cli_version : null;
        break;
      case "warning":
        if (event.code === "unresolved_variables") unresolvedVariables = true;
        break;
      case "run_end":
        runEnds.push(event);
        break;
      case undefined:
        if (event.status === "done" || event.status === "failed") progressSteps += 1;
        break;
      default:
        break;
    }
  }

  const last = runEnds.length === 1 ? runEnds[0] : null;
  const toStrings = (value: unknown): Record<string, string> => {
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key, inner]) => key !== "url" && (typeof inner === "string" || typeof inner === "number" || typeof inner === "boolean"))
        .map(([key, inner]) => [key, String(inner)]),
    );
  };
  const memory: Record<string, string> = {};
  const rawMemory = (last?.context as { memory?: Record<string, { extracted_value?: unknown }> } | undefined)?.memory;
  if (rawMemory && typeof rawMemory === "object") {
    for (const [key, entry] of Object.entries(rawMemory)) {
      const value = entry?.extracted_value;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") memory[key] = String(value);
    }
  }

  return {
    exitCode: input.exitCode,
    timedOut: input.timedOut,
    canceled: input.canceled ?? false,
    envelopeOk,
    surface,
    cliVersion,
    runEndCount: runEnds.length,
    progressSteps,
    unresolvedVariables,
    authFailure: AUTH_HINT.test(input.stderr),
    runEnd: last
      ? {
          status: typeof last.status === "string" ? last.status : "",
          reasonCode: typeof last.reason_code === "string" ? last.reason_code : null,
          memory,
          finalState: toStrings(last.final_state),
          testUrl: typeof last.test_url === "string" && last.test_url !== "" ? last.test_url : null,
          creditsConsumed: typeof last.credits_consumed === "number" ? last.credits_consumed : null,
          runId: typeof last.run_id === "string" ? last.run_id : null,
        }
      : null,
  };
}
