// Locates the Kane CLI entry script so it can be started with the Node executable and no shell.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function resolveKaneEntry() {
  if (process.env.KANE_CLI_ENTRY) return { entry: process.env.KANE_CLI_ENTRY, version: null };
  const candidates = [];
  if (process.env.APPDATA) candidates.push(join(process.env.APPDATA, "npm", "node_modules"));
  try {
    // Fixed arguments only; the shell is needed on Windows to start npm's .cmd shim.
    candidates.push(execFileSync("npm", ["root", "-g"], { encoding: "utf8", shell: process.platform === "win32" }).trim());
  } catch {
    // Fall through to the error below.
  }
  for (const base of candidates) {
    const pkgPath = join(base, "@testmuai", "kane-cli", "package.json");
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin["kane-cli"];
    return { entry: resolve(dirname(pkgPath), bin), version: pkg.version };
  }
  throw new Error("Kane CLI not found. Install it with `npm install -g @testmuai/kane-cli`.");
}
