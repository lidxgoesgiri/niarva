/**
 * NIARVA verification worker.
 *
 * A separate long-running Node process: Chrome and Kane CLI never run inside a serverless
 * function. The worker pulls one probe at a time from the web API, runs it, and reports raw
 * results. It never computes a verdict and never touches the database.
 *
 * Usage: pnpm worker   (reads .env.local at the repository root)
 */
import type { ServerCheck } from "@niarva/core";
import { loadConfig } from "./config";
import { kaneProjectId, resolveKaneCli, runKane } from "./kane";
import { acquireKaneLock } from "./kane-lock";
import { runServerContract } from "./server-contract";
import { WORKER_VERSION } from "./version";

type Lease =
  | { probeRunId: string; probeKey: string; kind: string; executor: "kane"; objective: string; variables: Record<string, { value: string; secret: boolean }>; timeoutSeconds: number }
  | { probeRunId: string; probeKey: string; kind: string; executor: "http"; submitUrl: string; previewToken: string; checks: ServerCheck[]; timeoutSeconds: number };

const log = (level: "info" | "warn" | "error", msg: string, extra: Record<string, unknown> = {}) =>
  console[level === "info" ? "log" : "error"](JSON.stringify({ level, time: new Date().toISOString(), msg, ...extra }));

const config = loadConfig();
const cli = resolveKaneCli(config.KANE_CLI_ENTRY);
if (config.NIARVA_KANE_PROJECT_ID) {
  // Every Kane session uploads to the profile's Test Manager project; refuse to scatter probe
  // sessions into another project.
  const actual = kaneProjectId(cli);
  if (actual !== config.NIARVA_KANE_PROJECT_ID) {
    log("error", "Kane CLI uploads to a different Test Manager project; not starting", { expected: config.NIARVA_KANE_PROJECT_ID, actual });
    process.exit(78);
  }
}
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  log("info", "stopping after the current probe");
});

async function api<T>(pathname: string, body: unknown): Promise<T> {
  const response = await fetch(`${config.NIARVA_WORKER_API_URL}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.WORKER_SHARED_TOKEN}`, "x-worker-id": config.NIARVA_WORKER_ID },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as T & { error?: { code: string; message: string } };
  if (!response.ok) throw new Error(`${pathname}: ${json?.error?.code ?? response.status} ${json?.error?.message ?? ""}`.trim());
  return json;
}

async function handle(lease: Lease) {
  const started = Date.now();
  log("info", "probe leased", { probeRunId: lease.probeRunId, probeKey: lease.probeKey, kind: lease.kind, executor: lease.executor });
  if (lease.executor === "http") {
    const results = await runServerContract(lease.submitUrl, lease.previewToken, lease.checks);
    const outcome = await api<{ verdict: string; reasonCode: string | null }>(`/api/v1/worker/probe-runs/${lease.probeRunId}/result`, { executor: "http", results });
    log("info", "probe judged by server", { probeKey: lease.probeKey, ...outcome, seconds: Math.round((Date.now() - started) / 1000) });
    return;
  }
  const execution = await runKane(cli, lease.objective, lease.variables, lease.timeoutSeconds, config.WORKER_WATCHDOG_MARGIN);
  const outcome = await api<{ verdict: string; reasonCode: string | null }>(`/api/v1/worker/probe-runs/${lease.probeRunId}/result`, {
    executor: "kane",
    report: execution.report,
    stdoutTail: execution.stdoutTail,
    evidence: execution.evidence,
  });
  log("info", "probe judged by server", {
    probeKey: lease.probeKey,
    ...outcome,
    kaneSessionId: execution.report.sessionId ?? null,
    // Test Manager case id only; the full test_url carries a share token and is not logged.
    kaneTestCaseId: /\/test-cases\/([A-Za-z0-9]+)/.exec(execution.report.runEnd?.testUrl ?? "")?.[1] ?? null,
    kaneStatus: execution.report.runEnd?.status ?? null,
    exitCode: execution.report.exitCode,
    credits: execution.report.runEnd?.creditsConsumed ?? null,
    seconds: Math.round((Date.now() - started) / 1000),
  });
}

async function main() {
  log("info", "worker started", { workerId: config.NIARVA_WORKER_ID, workerVersion: WORKER_VERSION, kaneCli: cli.version, api: config.NIARVA_WORKER_API_URL });
  const ownerEmails = config.NIARVA_WORKER_OWNER_EMAILS;
  if (ownerEmails.length > 0) {
    // Fail closed: a server without the owner filter would ignore it and lease anyone's run.
    const { ownerFilter } = await api<{ ownerFilter?: boolean }>("/api/v1/worker/heartbeat", { workerId: config.NIARVA_WORKER_ID, kaneCliVersion: cli.version });
    if (ownerFilter !== true) throw new Error("NIARVA_WORKER_OWNER_EMAILS is set, but the server does not support the owner filter. Deploy the web app first.");
    log("info", "leasing only runs owned by the configured accounts", { accounts: ownerEmails.length });
  }
  while (!stopping) {
    // Take the machine-wide Kane lock before leasing, so a probe is never leased (and its lease
    // never expires) while another Kane run on this computer is in progress.
    let release: (() => void) | null = null;
    let handled = false;
    try {
      release = await acquireKaneLock(`worker ${config.NIARVA_WORKER_ID}`, { log: (message) => log("info", message) });
      const { lease } = await api<{ lease: Lease | null }>("/api/v1/worker/lease", {
        workerId: config.NIARVA_WORKER_ID,
        kaneCliVersion: cli.version,
        ...(ownerEmails.length > 0 ? { ownerEmails } : {}),
      });
      if (lease) {
        await handle(lease);
        handled = true;
      }
    } catch (error) {
      log("warn", "worker loop error", { error: error instanceof Error ? error.message : String(error) });
    } finally {
      release?.();
    }
    // After a probe, pause longer than the lock's 5-second poll so a Kane run waiting in another
    // worktree can start between probes instead of waiting for the whole verification run.
    await new Promise((resolve) => setTimeout(resolve, handled ? 12_000 : config.WORKER_IDLE_POLL_MS));
  }
  log("info", "worker stopped");
}

await main();
