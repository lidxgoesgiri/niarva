// Runs a named lane of M0 lab runs sequentially and appends one summary line per run.
// Usage: node m0-lab/batch.mjs <lane>
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// [runId, objective, vars, timeoutSeconds]
const lanes = {
  a: [
    ["H01-presence-1", "O-PRESENCE", "lab-local", 180],
    ["H01-presence-2", "O-PRESENCE", "lab-local", 180],
    ["H01-presence-3", "O-PRESENCE", "lab-local", 180],
    ["H01-boundary-1", "O-BOUNDARY", "lab-local", 240],
    ["H01-boundary-2", "O-BOUNDARY", "lab-local", 240],
    ["H01-boundary-3", "O-BOUNDARY", "lab-local", 240],
    ["FAIL-boundary-gt", "O-BOUNDARY", "lab-gt", 240],
    ["CTRL-comma-ok", "O-COMMA", "lab-local", 180],
    ["FAIL-comma-bug", "O-COMMA", "lab-comma", 180],
  ],
  b: [
    ["H01-hidden-1", "O-HIDDEN", "lab-local", 240],
    ["H01-hidden-2", "O-HIDDEN", "lab-local", 240],
    ["H01-hidden-3", "O-HIDDEN", "lab-local", 240],
    ["H08-condreq-1", "O-CONDREQ", "lab-local", 300],
    ["H08-condreq-2", "O-CONDREQ", "lab-local", 300],
    ["H08-condreq-3", "O-CONDREQ", "lab-local", 300],
    ["H08-condreq-reqoff", "O-CONDREQ", "lab-reqoff", 300],
  ],
  c: [
    ["H09-multi-1", "O-HIDDEN-MULTI", "lab-multi", 300],
    ["H09-multi-2", "O-HIDDEN-MULTI", "lab-multi", 300],
    ["H09-multi-3", "O-HIDDEN-MULTI", "lab-multi", 300],
    ["H09-multi-leakB", "O-HIDDEN-MULTI", "lab-leakB", 300],
    ["K04-timeout-20", "O-SLOW", "lab-local", 20],
    ["K06-missing-var", "O-MISSINGVAR", "lab-local", 180],
  ],
};

const lane = process.argv[2];
const runs = lanes[lane];
if (!runs) {
  console.error(`unknown lane "${lane}". lanes: ${Object.keys(lanes).join(", ")}`);
  process.exit(64);
}

const logPath = join(here, "results", `batch-${lane}.log`);
for (const [runId, objective, vars, timeout] of runs) {
  const started = new Date().toISOString();
  let line;
  try {
    const out = execFileSync(
      process.execPath,
      [join(here, "run.mjs"), runId, `objectives/${objective}.txt`, `vars/${vars}.json`, String(timeout)],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: (timeout + 120) * 1000 },
    );
    line = out.trim().split(/\r?\n/).filter((l) => l.startsWith("{")).pop() ?? `{"runId":"${runId}","error":"no summary"}`;
  } catch (error) {
    line = JSON.stringify({ runId, error: String(error.message ?? error).slice(0, 300) });
  }
  appendFileSync(logPath, `${started} ${objective} ${vars} ${line}\n`);
  console.log(`${runId} done`);
}
console.log(`lane ${lane} complete`);
