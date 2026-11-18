// Inspects the sealed evidence pack of an M0 lab run without modifying it.
// Usage: node m0-lab/inspect-pack.mjs <runId> [needle ...]
// Prints: pack size, SHA-256 digest, entry kinds, and which entries contain each needle.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [runId, ...needles] = process.argv.slice(2);
if (!runId) {
  console.error("usage: node inspect-pack.mjs <runId> [needle ...]");
  process.exit(64);
}

const stderrText = readFileSync(join(here, "results", `${runId}.stderr.txt`), "utf8");
const match = stderrText.match(/evidence serve ([^`\r\n]+)/);
if (!match) {
  console.error("no evidence hint found in stderr");
  process.exit(1);
}
const packPath = match[1].trim();
const bytes = readFileSync(packPath);
const digest = createHash("sha256").update(bytes).digest("hex");

const dir = mkdtempSync(join(tmpdir(), "niarva-pack-"));
try {
  execFileSync("unzip", ["-q", "-o", packPath.replace(/\\/g, "/"), "-d", dir], { stdio: "ignore" });
  const files = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(dir);

  const kinds = {};
  for (const file of files) {
    const rel = relative(dir, file).replace(/\\/g, "/");
    const kind = rel
      .replace(/^tests\/[^/]+\//, "tests/<test>/")
      .replace(/steps\/[^/]+\//, "steps/<n>/");
    kinds[kind] = (kinds[kind] ?? 0) + 1;
  }

  const hits = {};
  for (const needle of needles) {
    hits[needle] = [];
    for (const file of files) {
      if (readFileSync(file).includes(needle)) {
        hits[needle].push(
          relative(dir, file)
            .replace(/\\/g, "/")
            .replace(/^tests\/[^/]+\//, "tests/<test>/"),
        );
      }
    }
  }

  console.log(JSON.stringify({ runId, packBytes: bytes.length, packSha256: digest, entries: files.length, kinds, hits }, null, 2));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
