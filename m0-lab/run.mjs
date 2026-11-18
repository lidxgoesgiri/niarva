// M0 lab runner: spawns Kane CLI without a shell (argv array) and records raw output.
// Usage: node m0-lab/run.mjs <runId> <objectiveFile> <varsFile|-> [timeoutSeconds] [-- extra kane args]
// Raw output goes to m0-lab/results/ (gitignored). Nothing here is product code.
import { spawn, execFileSync } from "node:child_process";
import { createWriteStream, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(here, "results");
mkdirSync(resultsDir, { recursive: true });

function resolveKaneEntry() {
  if (process.env.KANE_CLI_ENTRY) return process.env.KANE_CLI_ENTRY;
  const npmCli = process.platform === "win32" ? "npm.cmd" : "npm";
  const root = execFileSync(npmCli, ["root", "-g"], { encoding: "utf8", shell: process.platform === "win32" }).trim();
  const pkgDir = join(root, "@testmuai", "kane-cli");
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin["kane-cli"];
  return resolve(pkgDir, bin);
}

const [runId, objectiveFile, varsFile, timeoutArg, ...rest] = process.argv.slice(2);
if (!runId || !objectiveFile) {
  console.error("usage: node run.mjs <runId> <objectiveFile> <varsFile|-> [timeoutSeconds] [-- extra args]");
  process.exit(64);
}
const timeoutSeconds = Number(timeoutArg ?? 180);
const extra = rest[0] === "--" ? rest.slice(1) : rest;

const objective = readFileSync(resolve(here, objectiveFile), "utf8").replace(/\r\n/g, "\n").trim();
const args = ["run", objective, "--agent", "--headless", "--timeout", String(timeoutSeconds)];
if (varsFile && varsFile !== "-") {
  const varsPath = existsSync(resolve(here, varsFile)) ? resolve(here, varsFile) : resolve(varsFile);
  args.push("--variables", JSON.stringify(JSON.parse(readFileSync(varsPath, "utf8"))));
}
args.push(...extra);

const entry = resolveKaneEntry();
const outPath = join(resultsDir, `${runId}.ndjson`);
const errPath = join(resultsDir, `${runId}.stderr.txt`);
const out = createWriteStream(outPath);
const err = createWriteStream(errPath);

const startedAt = Date.now();
const child = spawn(process.execPath, [entry, ...args], {
  shell: false,
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, KANE_CLI_USER_AGENT: "claude-code" },
});

let stdoutText = "";
child.stdout.on("data", (chunk) => { stdoutText += chunk.toString("utf8"); out.write(chunk); });
child.stderr.on("data", (chunk) => { err.write(chunk); });

// Second-layer watchdog: kill the whole process tree if the CLI ignores --timeout.
let watchdogFired = false;
const watchdog = setTimeout(() => {
  watchdogFired = true;
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { shell: false, windowsHide: true });
  } else {
    try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
  }
}, (timeoutSeconds + Number(process.env.M0_WATCHDOG_EXTRA ?? 30)) * 1000);

child.on("close", (code, signal) => {
  clearTimeout(watchdog);
  out.end();
  err.end();
  const wallSeconds = Math.round((Date.now() - startedAt) / 100) / 10;

  const lines = stdoutText.split(/\r?\n/).filter(Boolean);
  let jsonLines = 0;
  let nonJsonLines = 0;
  const versions = new Set();
  const types = {};
  let streamStart = null;
  const runEnds = [];
  let progress = 0;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      jsonLines += 1;
      versions.add(obj.v);
      if (obj.type) types[obj.type] = (types[obj.type] ?? 0) + 1;
      else if (obj.step !== undefined) progress += 1;
      if (obj.type === "stream_start") streamStart = obj;
      if (obj.type === "run_end") runEnds.push(obj);
    } catch {
      nonJsonLines += 1;
    }
  }
  const runEnd = runEnds.length === 1 ? runEnds[0] : null;
  const summary = {
    runId,
    exit: code,
    signal,
    watchdogFired,
    wallSeconds,
    lines: lines.length,
    jsonLines,
    nonJsonLines,
    envelopeVersions: [...versions],
    typedEvents: types,
    progressEvents: progress,
    firstLineType: lines.length ? safeType(lines[0]) : null,
    streamStart: streamStart ? { surface: streamStart.surface, cli_version: streamStart.cli_version } : null,
    runEndCount: runEnds.length,
    status: runEnd?.status ?? null,
    final_state: runEnd?.final_state ?? null,
    credits_consumed: runEnd?.credits_consumed ?? null,
    credits: runEnd?.credits ?? null,
    duration: runEnd?.duration ?? null,
    runEndKeys: runEnd ? Object.keys(runEnd).sort() : null,
    testUrlHost: hostOf(runEnd?.test_url),
  };
  writeFileSync(join(resultsDir, `${runId}.summary.json`), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  process.exit(0);
});

function safeType(line) {
  try { return JSON.parse(line).type ?? "(progress)"; } catch { return "(non-json)"; }
}
function hostOf(url) {
  if (typeof url !== "string" || url === "") return null;
  try { return new URL(url).host; } catch { return "(unparseable)"; }
}
