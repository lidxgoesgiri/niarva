// Builds the sanitized M0 run manifest `evidence/m0/runs.json` from raw lab results.
// Raw streams and sealed evidence packs stay private (m0-lab/results, ~/.testmuai); the
// manifest keeps run identity, outcome, typed observations, credits, and pack digests only.
// The lab URL was passed as a secret variable, so it never appears in these values.
// Usage: node m0-lab/build-manifest.mjs
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const results = join(here, "results");

// runId -> objective and lab variant, recovered from the batch logs (tolerant parser).
const meta = {
  "K02-basic": { objective: "O-BASIC", variant: "lab-local" },
  "K09-viewport-cdp-390": { objective: "O-VIEWPORT", variant: "lab-local via --cdp-endpoint (390x844 window)" },
  "K11-invalid-flag": { objective: "(none)", variant: "invalid flag" },
};
for (const file of readdirSync(results).filter((name) => /^batch-[a-z]\.log$/.test(name))) {
  for (const line of readFileSync(join(results, file), "utf8").split(/\r?\n/)) {
    const match = line.match(/^\S+ (\S+) (\S+) .*"runId":"([^"]+)"/);
    if (match) meta[match[3]] = { objective: match[1], variant: match[2] };
  }
}

function readEvents(runId) {
  const path = join(results, `${runId}.ndjson`);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

const runs = [];
for (const file of readdirSync(results).filter((name) => name.endsWith(".summary.json")).sort()) {
  const summary = JSON.parse(readFileSync(join(results, file), "utf8"));
  const events = readEvents(summary.runId);
  const runEnd = events.find((event) => event.type === "run_end") ?? null;
  const memory = runEnd?.context?.memory ?? null;
  const stderr = readFileSync(join(results, `${summary.runId}.stderr.txt`), "utf8");
  const packPath = stderr.match(/evidence serve ([^`\r\n]+)/)?.[1]?.trim() ?? null;
  const pack = packPath && existsSync(packPath) ? readFileSync(packPath) : null;
  runs.push({
    runId: summary.runId,
    objective: meta[summary.runId]?.objective ?? null,
    variant: meta[summary.runId]?.variant ?? null,
    kaneRunId: runEnd?.run_id ?? null,
    startedUtc: events[0]?.ts ?? null,
    exitCode: summary.exit,
    watchdogFired: summary.watchdogFired,
    wallSeconds: summary.wallSeconds,
    runEndStatus: runEnd?.status ?? null,
    reasonCode: runEnd?.reason_code ?? null,
    creditsConsumed: typeof runEnd?.credits_consumed === "number" ? Math.round(runEnd.credits_consumed * 100) / 100 : null,
    finalStateKeys: runEnd?.final_state ? Object.keys(runEnd.final_state).filter((key) => key !== "url") : [],
    observations: memory ? Object.fromEntries(Object.entries(memory).map(([key, value]) => [key, value.extracted_value])) : null,
    errorEvent: events.find((event) => event.type === "error")?.message ?? null,
    warningCode: events.find((event) => event.type === "warning")?.code ?? null,
    testUrlHost: summary.testUrlHost ?? null,
    evidencePack: pack ? { sha256: createHash("sha256").update(pack).digest("hex"), bytes: pack.length } : null,
  });
}

mkdirSync(join(root, "evidence", "m0"), { recursive: true });
writeFileSync(
  join(root, "evidence", "m0", "runs.json"),
  JSON.stringify(
    {
      generatedBy: "m0-lab/build-manifest.mjs",
      environment: { kaneCli: "0.10.4", chrome: "157.0.8103.51", node: "v24.11.1", os: "Windows 11 (10.0.26200)" },
      runs,
    },
    null,
    2,
  ) + "\n",
);
console.log(`wrote evidence/m0/runs.json with ${runs.length} runs`);
for (const run of runs) {
  console.log(
    [run.runId.padEnd(22), String(run.exitCode).padEnd(2), String(run.runEndStatus).padEnd(7), String(run.reasonCode).padEnd(38), run.creditsConsumed, run.kaneRunId ? "id" : "-"].join(" "),
  );
}
