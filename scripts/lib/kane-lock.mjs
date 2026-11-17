// Machine-wide lock so only one Kane CLI run happens at a time on this computer.
// M0 recorded infrastructure failures when Kane runs overlapped, and two coding agents work on
// this repository in parallel. Every Kane entry point (dev runner, wrapper, product worker)
// takes this lock first. The lock lives in the user's home directory, which is the same for
// every agent and worktree; TEMP is not, because agents may set their own.
import { mkdirSync, openSync, readFileSync, rmSync, writeSync, closeSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const KANE_LOCK_PATH = process.env.NIARVA_KANE_LOCK ?? join(homedir(), ".niarva", "kane-run.lock");
const STALE_AFTER_MS = 30 * 60 * 1000;

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function readHolder() {
  try {
    return JSON.parse(readFileSync(KANE_LOCK_PATH, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Waits until the lock is free, then takes it. Returns a release function.
 * A lock whose process has exited, or that is older than 30 minutes, is treated as abandoned.
 */
export async function acquireKaneLock(label, { waitMs = 45 * 60 * 1000, pollMs = 5000, log = console.error } = {}) {
  mkdirSync(dirname(KANE_LOCK_PATH), { recursive: true });
  const deadline = Date.now() + waitMs;
  let announced = false;
  for (;;) {
    try {
      const fd = openSync(KANE_LOCK_PATH, "wx");
      writeSync(fd, JSON.stringify({ label, pid: process.pid, startedAt: new Date().toISOString() }));
      closeSync(fd);
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        const holder = readHolder();
        if (holder?.pid === process.pid) rmSync(KANE_LOCK_PATH, { force: true });
      };
      process.once("exit", release);
      return release;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const holder = readHolder();
    const age = holder ? Date.now() - Date.parse(holder.startedAt) : Infinity;
    if (!holder || !alive(holder.pid) || age > STALE_AFTER_MS) {
      log(`kane lock: removing an abandoned lock (${holder ? `${holder.label}, pid ${holder.pid}` : "unreadable"})`);
      rmSync(KANE_LOCK_PATH, { force: true });
      continue;
    }
    if (Date.now() > deadline) throw new Error(`kane lock: still held by ${holder.label} (pid ${holder.pid}) after waiting`);
    if (!announced) {
      log(`kane lock: waiting for "${holder.label}" (pid ${holder.pid}, since ${holder.startedAt})`);
      announced = true;
    }
    await new Promise((resolvePause) => setTimeout(resolvePause, pollMs));
  }
}
