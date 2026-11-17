// Runs any Kane CLI command under the machine-wide Kane lock, so runs from different agents or
// worktrees never overlap. Output, exit code, and arguments pass through unchanged.
//
// Usage: node scripts/kane-locked.mjs <kane-cli arguments...>
//   e.g. node scripts/kane-locked.mjs testmd run .testmuai/tests/x_test.md --agent --headless
import { spawn } from "node:child_process";
import { resolveKaneEntry } from "./lib/kane-entry.mjs";
import { acquireKaneLock } from "./lib/kane-lock.mjs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: node scripts/kane-locked.mjs <kane-cli arguments...>");
  process.exit(64);
}

const release = await acquireKaneLock(`kane-locked: ${args.slice(0, 3).join(" ")}`);
const kane = resolveKaneEntry();
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
