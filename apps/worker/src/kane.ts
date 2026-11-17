import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseKaneRunStream, type KaneRunReport } from "@niarva/core";
import { KANE_CLI_PINNED_VERSION } from "./version";

export type KaneCli = { entry: string; version: string };

function compareVersions(a: string, b: string): number {
  const left = a.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < 3; index += 1) if ((left[index] ?? 0) !== (right[index] ?? 0)) return (left[index] ?? 0) - (right[index] ?? 0);
  return 0;
}

/**
 * Finds the Kane CLI entry script so it can be spawned with the Node executable and no shell
 * (Node refuses `.cmd` files without a shell on Windows). Refuses versions older than the pin.
 */
export function resolveKaneCli(explicit?: string): KaneCli {
  const candidates: string[] = [];
  if (explicit) candidates.push(explicit);
  const roots: string[] = [];
  if (process.env.APPDATA) roots.push(path.join(process.env.APPDATA, "npm", "node_modules"));
  try {
    roots.push(execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"], { encoding: "utf8", shell: process.platform === "win32" }).trim());
  } catch {
    // npm unavailable; rely on explicit or APPDATA candidates.
  }
  for (const root of roots) {
    const manifest = path.join(root, "@testmuai", "kane-cli", "package.json");
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, "utf8")) as { version: string; bin: string | Record<string, string> };
    const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin["kane-cli"];
    if (bin) candidates.push(path.resolve(path.dirname(manifest), bin));
  }
  for (const entry of candidates) {
    if (!existsSync(entry)) continue;
    const version = execFileSync(process.execPath, [entry, "--version"], { encoding: "utf8", windowsHide: true }).trim().split(/\s+/).pop() ?? "";
    if (compareVersions(version, KANE_CLI_PINNED_VERSION) < 0) {
      throw new Error(`Kane CLI ${version} is older than the validated ${KANE_CLI_PINNED_VERSION}. Run \`npm install -g @testmuai/kane-cli\`.`);
    }
    return { entry, version };
  }
  throw new Error("Kane CLI was not found. Run `npm install -g @testmuai/kane-cli` and `kane-cli login`.");
}

function killTree(pid: number | undefined) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { shell: false, windowsHide: true });
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      process.kill(pid, "SIGKILL");
    }
  }
}

/** Removes the preview token and any copy of the secret URL from text kept for diagnostics. */
export function redactTokens(text: string, secrets: string[]): string {
  let output = text.replace(/([?&]t=)[A-Za-z0-9._~%-]+/g, "$1[redacted]");
  for (const secret of secrets) if (secret) output = output.split(secret).join("[redacted]");
  return output;
}

export type KaneExecution = {
  report: KaneRunReport;
  stdoutTail: string;
  evidence: { packSha256: string | null; packBytes: number | null; packName: string | null } | null;
};

/**
 * Runs one objective with `kane-cli run --agent --headless`. The tokenized preview URL is passed
 * only as a secret variable. The worker owns the deadline: Kane's own --timeout was observed not
 * to stop a run, so a watchdog kills the whole process tree.
 */
export function runKane(cli: KaneCli, objective: string, variables: Record<string, { value: string; secret: boolean }>, timeoutSeconds: number, watchdogMargin: number): Promise<KaneExecution> {
  return new Promise((resolve) => {
    const args = [cli.entry, "run", objective, "--agent", "--headless", "--timeout", String(timeoutSeconds), "--variables", JSON.stringify(variables)];
    const child = spawn(process.execPath, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
      env: { ...process.env, KANE_CLI_USER_AGENT: "niarva-worker" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    let timedOut = false;
    const watchdog = setTimeout(() => {
      timedOut = true;
      killTree(child.pid);
    }, (timeoutSeconds + watchdogMargin) * 1000);

    child.on("close", (exitCode) => {
      clearTimeout(watchdog);
      const report = parseKaneRunStream({ stdout, stderr, exitCode, timedOut });
      const packPath = stderr.match(/evidence serve ([^`\r\n]+)/)?.[1]?.trim() ?? null;
      let evidence: KaneExecution["evidence"] = null;
      if (packPath && existsSync(packPath)) {
        const bytes = readFileSync(packPath);
        evidence = { packSha256: createHash("sha256").update(bytes).digest("hex"), packBytes: bytes.length, packName: path.basename(packPath) };
      }
      const secrets = Object.values(variables).filter((variable) => variable.secret).map((variable) => variable.value);
      resolve({ report, stdoutTail: redactTokens(stdout, secrets).slice(-8192), evidence });
    });
  });
}
