// Local secret and confidentiality scan, run before every commit (CI additionally runs gitleaks).
//
//   node scripts/scan-secrets.mjs            scan staged files
//   node scripts/scan-secrets.mjs <path>...  scan the given files or directories
//
// Two checks:
//   1. Known values: every secret in `.env.local` and every secret variable in
//      `.testmuai/variables/assurance.json` must not appear in any scanned file.
//   2. Generic patterns for common credential formats.
// Only file names and rule names are printed, never the matching text.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PATTERNS = [
  ["openrouter-key", /sk-or-v1-[A-Za-z0-9]{24,}/],
  ["generic-sk-key", /\bsk-[A-Za-z0-9_-]{32,}/],
  ["github-token", /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/],
  ["github-pat", /\bgithub_pat_[A-Za-z0-9_]{30,}/],
  ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/],
  ["private-key-block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["postgres-url-with-password", /postgres(?:ql)?:\/\/[^:\s"']+:[^@\s"']{6,}@/],
  ["bearer-token", /Bearer\s+[A-Za-z0-9._~-]{32,}/],
  ["lambdatest-access-key", /LT_[A-Za-z0-9]{40,}/],
  ["tokenized-preview-url", /\/preview\/[0-9a-f-]{36}\?t=[A-Za-z0-9._~-]{16,}/],
];

/** Secret values that exist on this machine and must never be committed. */
function knownSecretValues() {
  const values = new Map();
  const envPath = join(root, ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD|DATABASE_URL)[A-Z0-9_]*)=(.+)$/);
      if (match && match[2].length >= 12 && !/^replace-with/.test(match[2])) values.set(`env:${match[1]}`, match[2]);
    }
  }
  const variablesPath = join(root, ".testmuai", "variables", "assurance.json");
  if (existsSync(variablesPath)) {
    const variables = JSON.parse(readFileSync(variablesPath, "utf8"));
    for (const [name, entry] of Object.entries(variables)) {
      if (entry?.secret && typeof entry.value === "string" && entry.value.length >= 8) {
        values.set(`variable:${name}`, entry.value);
      }
    }
  }
  return values;
}

function collect(target, out) {
  const stats = statSync(target);
  if (stats.isDirectory()) {
    for (const name of readdirSync(target)) {
      if (name === "node_modules" || name === ".git" || name === ".next") continue;
      collect(join(target, name), out);
    }
  } else if (stats.size <= 5 * 1024 * 1024) {
    out.push(target);
  }
}

const args = process.argv.slice(2);
let files = [];
if (args.length > 0) {
  for (const arg of args) collect(join(root, arg), files);
} else {
  files = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => join(root, file))
    .filter((file) => existsSync(file));
}

// Confidential build documents never leave the owner's machine.
const CONFIDENTIAL_PATHS = [
  /^private\//,
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
  /^(governance|handoff|sources)\//,
  /^docs\/NIARVA_/,
  /^PRD_PACKAGE_README\.md$/,
  /^\.context\//,
];
const CONFIDENTIAL_MARKERS = [
  ["prd-title", /Product Requirements Document/],
  ["prd-file-name", /NIARVA_(UI_UX_)?PRD_v\d/],
  ["prd-package", /NIARVA PRD v\d|PRD_FINAL/],
  ["prd-indonesian-heading", /^#+ .*(Ringkasan produk|Cara memakai dokumen|Keputusan Terbuka|Aturan Verifikasi)/m],
];

const known = knownSecretValues();
const findings = [];
for (const file of files) {
  const buffer = readFileSync(file);
  const rel = relative(root, file).replace(/\\/g, "/");
  if (CONFIDENTIAL_PATHS.some((pattern) => pattern.test(rel))) {
    findings.push(`${rel}: confidential build document must not be committed`);
    continue;
  }
  if (rel !== "scripts/scan-secrets.mjs") {
    const text = buffer.toString("utf8");
    for (const [rule, pattern] of CONFIDENTIAL_MARKERS) {
      if (pattern.test(text)) findings.push(`${rel}: contains confidential document marker ${rule}`);
    }
  }
  for (const [label, value] of known) {
    if (buffer.includes(value)) findings.push(`${rel}: contains the value of ${label}`);
  }
  // This scanner and the env example describe patterns; they do not hold credentials.
  if (rel === "scripts/scan-secrets.mjs") continue;
  const text = buffer.toString("utf8");
  for (const [rule, pattern] of PATTERNS) {
    if (pattern.test(text)) findings.push(`${rel}: matches pattern ${rule}`);
  }
}

console.log(`secret scan: ${files.length} file(s), ${known.size} known secret value(s) checked`);
if (findings.length > 0) {
  for (const finding of findings) console.error(`  FOUND ${finding}`);
  process.exit(1);
}
console.log("secret scan: clean");
