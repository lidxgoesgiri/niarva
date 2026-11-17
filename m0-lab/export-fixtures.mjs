// Exports selected real M0 streams as sanitized parser fixtures for packages/core tests.
// String values inside each JSON line are scrubbed (local paths, lab URL), so every line stays
// valid JSON. The lab URL was already masked by Kane ("***") in the run_end payload.
// Usage: node m0-lab/export-fixtures.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "packages", "core", "test", "fixtures", "kane");
mkdirSync(out, { recursive: true });

const RUNS = [
  "K02-basic",
  "H01-boundary-1",
  "H01-boundary-3",
  "FAIL-boundary-gt-2",
  "H08-condreq-1",
  "H08-condreq-reqoff",
  "H09-multi-leakB",
  "H01-hidden-1",
  "K04-timeout-30",
  "K06-missing-var",
];

// A Windows drive path up to the next quote, whitespace, or backtick.
const LOCAL_PATH = /[A-Za-z]:[\\/][^"\s`]*/g;
const LAB_URL = /https?:\/\/localhost:\d+\S*/g;
const scrubText = (text) => text.replace(LOCAL_PATH, "<local-path>").replace(LAB_URL, "<lab-url>");

function scrubValue(value) {
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, scrubValue(inner)]));
  }
  return value;
}

function scrubStream(stdout) {
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      try {
        return JSON.stringify(scrubValue(JSON.parse(line)));
      } catch {
        return scrubText(line);
      }
    })
    .join("\n");
}

for (const runId of RUNS) {
  const summary = JSON.parse(readFileSync(join(here, "results", `${runId}.summary.json`), "utf8"));
  const stdout = scrubStream(readFileSync(join(here, "results", `${runId}.ndjson`), "utf8"));
  const stderr = scrubText(readFileSync(join(here, "results", `${runId}.stderr.txt`), "utf8"));
  writeFileSync(
    join(out, `${runId}.json`),
    JSON.stringify({ runId, exitCode: summary.exit, timedOut: summary.watchdogFired, stdout, stderr }, null, 2) + "\n",
  );
}
console.log(`exported ${RUNS.length} sanitized fixtures to packages/core/test/fixtures/kane`);
