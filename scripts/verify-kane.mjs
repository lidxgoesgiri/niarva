// Development Kane runner: executes Assurance-designed `_test.md`
// files in a real browser through Kane CLI and records what actually happened.
//
// Usage:
//   node scripts/verify-kane.mjs <test.md | t-id | substring> [...more] [--label <name>] [--headed]
//
// For every test it writes, under evidence/private/dev/<run>/ (gitignored):
//   stdout.ndjson   raw Kane stream            stderr.txt   raw stderr
//   summary.json    parsed outcome: completion event, exit code, per-step results, credits,
//                   evidence pack digest, Kane version, and the source revision under test
//
// Kane is the only browser runner in this repository. This script never decides that a
// product behavior is correct on its own: it reports Kane's completion event and exit code,
// and a missing completion event is reported as UNKNOWN, never as a pass.
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveKaneEntry } from "./lib/kane-entry.mjs";
import { acquireKaneLock } from "./lib/kane-lock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = join(root, ".testmuai", "tests");
const WATCHDOG_SECONDS = 15 * 60;

function resolveTest(selector) {
  if (existsSync(resolve(root, selector))) return resolve(root, selector);
  const files = readdirSync(testsDir).filter((file) => file.endsWith("_test.md"));
  const byId = files.filter((file) =>
    new RegExp(`^\\s*id:\\s*${selector}\\s*$`, "m").test(readFileSync(join(testsDir, file), "utf8")),
  );
  const matches = byId.length > 0 ? byId : files.filter((file) => file.includes(selector));
  if (matches.length !== 1) {
    throw new Error(`"${selector}" matched ${matches.length} test files; give a unique file, id, or substring.`);
  }
  return join(testsDir, matches[0]);
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function runOne(kane, testPath, label, headed, retryOf = null) {
  return new Promise((resolveRun) => {
    const stem = basename(testPath).replace(/_test\.md$/, "");
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const runDir = join(root, "evidence", "private", "dev", `${stamp}-${label ? `${label}-` : ""}${stem}`.slice(0, 140));
    mkdirSync(runDir, { recursive: true });

    const args = [kane.entry, "testmd", "run", testPath, "--agent"];
    if (!headed) args.push("--headless");
    const child = spawn(process.execPath, args, {
      cwd: root,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT ?? "claude-code" },
    });

    const out = createWriteStream(join(runDir, "stdout.ndjson"));
    const err = createWriteStream(join(runDir, "stderr.txt"));
    let stdoutText = "";
    let stderrText = "";
    child.stdout.on("data", (chunk) => { stdoutText += chunk.toString("utf8"); out.write(chunk); });
    child.stderr.on("data", (chunk) => { stderrText += chunk.toString("utf8"); err.write(chunk); });

    let watchdogFired = false;
    const watchdog = setTimeout(() => {
      watchdogFired = true;
      if (process.platform === "win32") {
        spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { shell: false, windowsHide: true });
      } else {
        child.kill("SIGKILL");
      }
    }, WATCHDOG_SECONDS * 1000);

    const startedAt = Date.now();
    // Record the revision under test when the run starts, not when it ends.
    const sourceAtStart = {
      commit: git(["rev-parse", "HEAD"]),
      branch: git(["rev-parse", "--abbrev-ref", "HEAD"]),
      dirty: (git(["status", "--porcelain", "--", "apps", "packages"]) ?? "") !== "",
    };
    child.on("close", (exitCode) => {
      clearTimeout(watchdog);
      out.end();
      err.end();

      const events = [];
      let nonJson = 0;
      for (const line of stdoutText.split(/\r?\n/)) {
        if (!line.trim()) continue;
        try { events.push(JSON.parse(line)); } catch { nonJson += 1; }
      }
      const done = events.filter((event) => event.type === "test_md_done");
      const mdSummary = events.find((event) => event.type === "test_md_summary") ?? null;
      const stepsStarted = events.filter((event) => event.type === "test_md_step_start").length;
      const runEnds = events.filter((event) => event.type === "run_end");
      const failedSteps = events
        .filter((event) => !event.type && event.status === "failed")
        .map((event) => ({ step: event.step, remark: String(event.remark ?? "").slice(0, 400) }));
      const warnings = events
        .filter((event) => event.type === "warning" || event.type === "error")
        .map((event) => ({ type: event.type, code: event.code ?? null, message: String(event.message ?? "").slice(0, 400) }));
      const credits = runEnds.reduce(
        (sum, event) => (typeof event.credits_consumed === "number" ? sum + event.credits_consumed : sum),
        0,
      );

      const packMatch = stderrText.match(/evidence serve ([^`\r\n]+)/) ?? null;
      const packPath = packMatch ? packMatch[1].trim() : (events.find((event) => event.type === "coverage" && event.pack)?.pack ?? null);
      const pack = packPath && existsSync(packPath)
        ? { name: basename(packPath), sha256: sha256File(packPath), bytes: readFileSync(packPath).length }
        : null;

      // The completion event is authoritative; without exactly one, the outcome is unknown.
      const completion = done.length === 1 ? done[0] : null;
      const outcome = watchdogFired
        ? "UNKNOWN"
        : completion?.overall_status === "passed" && exitCode === 0
          ? "PASS"
          : completion?.overall_status === "failed"
            ? "FAIL"
            : "UNKNOWN";

      const summary = {
        test: basename(testPath),
        assuranceId: (readFileSync(testPath, "utf8").match(/^\s*id:\s*(t-\d+)/m) ?? [])[1] ?? null,
        testFileSha256: sha256File(testPath),
        label: label ?? null,
        retryOf,
        outcome,
        exitCode,
        watchdogFired,
        completionEvents: done.length,
        overallStatus: completion?.overall_status ?? null,
        durationSeconds: completion?.duration_s ?? null,
        wallSeconds: Math.round((Date.now() - startedAt) / 100) / 10,
        steps: runEnds.map((event, index) => ({
          index: index + 1,
          status: event.status ?? null,
          reasonCode: event.reason_code ?? null,
          oneLiner: event.one_liner ?? null,
          summary: typeof event.summary === "string" ? event.summary.slice(0, 600) : null,
        })),
        failedSteps,
        warnings,
        // Kane may replay recorded actions for unchanged steps instead of authoring them again.
        // A replay still runs in a real browser, but it is reported separately and never hidden.
        decisions: mdSummary
          ? {
              replayed: mdSummary.steps?.replay_decisions ?? null,
              authored: mdSummary.steps?.author_decisions ?? null,
              adaptiveHealTriggered: mdSummary.adaptive_heal?.triggered ?? null,
            }
          : null,
        stepsStarted,
        notStartedReason:
          stepsStarted === 0 && completion === null ? (stderrText.match(/error:\s*([^\r\n]{1,200})/i)?.[1] ?? null) : null,
        creditsConsumed: Math.round(credits * 100) / 100,
        kaneCliVersion: events.find((event) => event.type === "stream_start")?.cli_version ?? kane.version ?? null,
        streamVersion: events.find((event) => event.v !== undefined)?.v ?? null,
        nonJsonLines: nonJson,
        evidencePack: pack,
        source: sourceAtStart,
        startedAtUtc: new Date(startedAt).toISOString(),
        runDir: runDir.replace(root, ".").replace(/\\/g, "/"),
      };
      writeFileSync(join(runDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
      resolveRun(summary);
    });
  });
}

const argv = process.argv.slice(2);
const selectors = [];
let label = null;
let headed = false;
for (let index = 0; index < argv.length; index += 1) {
  if (argv[index] === "--label") { label = argv[index + 1] ?? null; index += 1; }
  else if (argv[index] === "--headed") headed = true;
  else selectors.push(argv[index]);
}
if (selectors.length === 0) {
  console.error("usage: node scripts/verify-kane.mjs <test.md | t-id | substring> [...] [--label <name>] [--headed]");
  process.exit(64);
}

// A run that never started a step because Kane's own sign-in check failed says nothing about
// NIARVA. As decided in M0 (RUN_NOT_STARTED is retryable once), such a run is retried once
// after a pause. Both attempts keep their own record; the first stays UNKNOWN.
const SIGN_IN_NOT_STARTED = /org_id|token refresh failed|re-authenticate|kane-cli login/i;
const RETRY_PAUSE_MS = 20_000;

const kane = resolveKaneEntry();
const results = [];
// One Kane run at a time: M0 showed infrastructure failures under parallel execution.
for (const selector of selectors) {
  const testPath = resolveTest(selector);
  // Machine-wide lock: never overlap with another Kane run (another agent, worktree, or the worker).
  const release = await acquireKaneLock(`verify-kane: ${basename(testPath)}`);
  let summary;
  try {
    summary = await runOne(kane, testPath, label, headed);
    if (summary.outcome === "UNKNOWN" && summary.stepsStarted === 0 && SIGN_IN_NOT_STARTED.test(summary.notStartedReason ?? "")) {
      console.log(JSON.stringify(summary));
      console.error(`run did not start (${summary.notStartedReason}); retrying once in ${RETRY_PAUSE_MS / 1000}s`);
      await new Promise((resolvePause) => setTimeout(resolvePause, RETRY_PAUSE_MS));
      summary = await runOne(kane, testPath, label, headed, summary.runDir);
    }
  } finally {
    release();
  }
  results.push(summary);
  console.log(JSON.stringify(summary));
  // Yield the machine-wide lock between tests so a Kane run waiting in another worktree (which
  // polls every 5 seconds) can start instead of waiting for this whole batch.
  if (selectors.indexOf(selector) < selectors.length - 1) await new Promise((resolvePause) => setTimeout(resolvePause, 12_000));
}
process.exit(results.every((result) => result.outcome === "PASS") ? 0 : 1);
