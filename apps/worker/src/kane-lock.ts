import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * Machine-wide Kane lock, shared with `scripts/lib/kane-lock.mjs` (same file and format).
 * M0 recorded infrastructure failures when Kane runs overlapped; the dev runner, the
 * `kane:locked` wrapper, and this worker all take the lock before starting Kane.
 */
export const KANE_LOCK_PATH = process.env.NIARVA_KANE_LOCK ?? path.join(homedir(), ".niarva", "kane-run.lock");
const STALE_AFTER_MS = 30 * 60 * 1000;

type Holder = { label: string; pid: number; startedAt: string };

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readHolder(): Holder | null {
  try {
    return JSON.parse(readFileSync(KANE_LOCK_PATH, "utf8")) as Holder;
  } catch {
    return null;
  }
}

/** Waits until the lock is free, takes it, and returns a release function. */
export async function acquireKaneLock(label: string, options: { pollMs?: number; log?: (message: string) => void } = {}): Promise<() => void> {
  const pollMs = options.pollMs ?? 5000;
  const log = options.log ?? (() => undefined);
  mkdirSync(path.dirname(KANE_LOCK_PATH), { recursive: true });
  let announced = false;
  for (;;) {
    try {
      const fd = openSync(KANE_LOCK_PATH, "wx");
      writeSync(fd, JSON.stringify({ label, pid: process.pid, startedAt: new Date().toISOString() } satisfies Holder));
      closeSync(fd);
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        // Remove the exit hook again: the worker acquires the lock once per probe for hours.
        process.removeListener("exit", release);
        if (readHolder()?.pid === process.pid) rmSync(KANE_LOCK_PATH, { force: true });
      };
      process.once("exit", release);
      return release;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const holder = readHolder();
    const age = holder ? Date.now() - Date.parse(holder.startedAt) : Number.POSITIVE_INFINITY;
    if (!holder || !alive(holder.pid) || age > STALE_AFTER_MS) {
      log(`kane lock: removing an abandoned lock (${holder ? `${holder.label}, pid ${holder.pid}` : "unreadable"})`);
      rmSync(KANE_LOCK_PATH, { force: true });
      continue;
    }
    if (!announced) {
      log(`kane lock: waiting for "${holder.label}" (pid ${holder.pid}, since ${holder.startedAt})`);
      announced = true;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
