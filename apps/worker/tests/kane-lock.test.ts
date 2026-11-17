import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type * as KaneLock from "../src/kane-lock";

// The lock path is read when the module loads, so point it at a private file first.
let lock: typeof KaneLock;
beforeAll(async () => {
  process.env.NIARVA_KANE_LOCK = path.join(tmpdir(), `niarva-kane-lock-test-${process.pid}.lock`);
  lock = await import("../src/kane-lock");
});

describe("machine-wide Kane lock", () => {
  it("makes a second holder wait until the first releases", async () => {
    const first = await lock.acquireKaneLock("first");
    let secondAcquired = false;
    const second = lock.acquireKaneLock("second", { pollMs: 50 }).then((release) => {
      secondAcquired = true;
      return release;
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(secondAcquired).toBe(false);
    first();
    const releaseSecond = await second;
    expect(secondAcquired).toBe(true);
    releaseSecond();
    expect(existsSync(lock.KANE_LOCK_PATH)).toBe(false);
  });

  it("removes a lock whose process no longer exists", async () => {
    writeFileSync(lock.KANE_LOCK_PATH, JSON.stringify({ label: "gone", pid: 999_999, startedAt: new Date().toISOString() }));
    const messages: string[] = [];
    const release = await lock.acquireKaneLock("next", { pollMs: 50, log: (message) => messages.push(message) });
    expect(messages.some((message) => message.includes("abandoned"))).toBe(true);
    release();
  });
});
