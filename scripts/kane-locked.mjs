// Runs any Kane CLI command under the machine-wide Kane lock, so runs from different agents or
// worktrees never overlap. Output, exit code, and arguments pass through unchanged.
//
// Commands that upload to Test Manager (run, testmd run, testrun run, generate) are refused unless the
// Kane profile points at the official NIARVA project and no named test carries a recording bound to
// another project (see scripts/lib/kane-project.mjs).
//
// Usage: node scripts/kane-locked.mjs <kane-cli arguments...>
//   e.g. node scripts/kane-locked.mjs testmd run .testmuai/tests/x_test.md --agent --headless
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { resolveKaneEntry } from "./lib/kane-entry.mjs";
import { acquireKaneLock } from "./lib/kane-lock.mjs";
import { assertProfileProject, assertRecordingProject } from "./lib/kane-project.mjs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: node scripts/kane-locked.mjs <kane-cli arguments...>");
  process.exit(64);
}

const kane = resolveKaneEntry();
const uploads =
  ["run", "generate"].includes(args[0]) ||
  (["testmd", "testrun"].includes(args[0]) && args[1] === "run");
if (uploads) {
  try {
    assertProfileProject(kane);
    for (const arg of args) if (arg.endsWith("_test.md")) assertRecordingProject(resolve(arg));
  } catch (error) {
    console.error(error.message);
    process.exit(78);
  }
}
const release = await acquireKaneLock(`kane-locked: ${args.slice(0, 3).join(" ")}`);
// Started with Node directly and no shell, so arguments (objectives with spaces or quotes) are passed verbatim.
const child = spawn(process.execPath, [kane.entry, ...args], {
  stdio: "inherit",
  shell: false,
  windowsHide: true,
  env: { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT ?? "codex" },
});
const stop = (signal) => child.kill(signal);
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("close", (code) => {
  release();
  process.exit(code ?? 1);
});
