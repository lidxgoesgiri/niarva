// Prepares the environment files for a Vercel deployment without printing any secret.
//
//   .env.vercel.local         variables to import into the Vercel project (Settings → Environment
//                             Variables → Import .env). Fresh secrets; nothing is reused from the
//                             local development environment.
//   .env.worker-vercel.local  configuration for the local verification worker that serves the
//                             deployment (same worker token as the deployment).
//
// Both files match `.env.*` in .gitignore and never leave this machine through git.
// Secrets the owner must add personally (OPENROUTER_API_KEY) are never read or written here, and
// DATABASE_URL comes from the Postgres integration in Vercel.
//
// Usage: node scripts/prepare-deploy-env.mjs --url https://<project>.vercel.app [--environment-id vercel-production] [--force]
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
};
const url = (option("--url") ?? "").replace(/\/+$/, "");
const environmentId = option("--environment-id", "vercel-production");
const force = argv.includes("--force");

if (!/^https:\/\/[a-z0-9.-]+$/i.test(url)) {
  console.error("usage: node scripts/prepare-deploy-env.mjs --url https://<project>.vercel.app [--environment-id <id>] [--force]");
  process.exit(64);
}
if (!/^[a-z0-9-]{1,40}$/.test(environmentId)) {
  console.error("--environment-id must be 1–40 lower-case letters, digits, or hyphens.");
  process.exit(64);
}

const appFile = join(root, ".env.vercel.local");
const workerFile = join(root, ".env.worker-vercel.local");
if (!force && (existsSync(appFile) || existsSync(workerFile))) {
  console.error("The deployment env files already exist. Pass --force to rotate every secret in both files.");
  process.exit(1);
}

const secret = () => randomBytes(32).toString("base64url");
// The model list is configuration, not a secret, so it is copied from the local file if present.
let models = "";
try {
  models = readFileSync(join(root, ".env.local"), "utf8").match(/^OPENROUTER_MODEL=(.*)$/m)?.[1]?.trim() ?? "";
} catch {
  // No local file: leave the model list for the owner.
}
const workerToken = secret();

const app = [
  "# Import into Vercel: Project → Settings → Environment Variables → Import .env (Production).",
  "# DATABASE_URL is added by the Postgres integration; use its POOLED connection string.",
  "# OPENROUTER_API_KEY: add it yourself in Vercel; this file never contains it.",
  `NIARVA_BASE_URL=${url}`,
  `NIARVA_ENVIRONMENT_ID=${environmentId}`,
  `BETTER_AUTH_SECRET=${secret()}`,
  `PREVIEW_TOKEN_SECRET=${secret()}`,
  `IP_HASH_SECRET=${secret()}`,
  `WORKER_SHARED_TOKEN=${workerToken}`,
  "DATABASE_POOL_MAX=3",
  "KANE_MAX_RUNS_PER_VERIFICATION=10",
  "KANE_PROBE_BUDGET_PER_WORKSPACE_24H=24",
  "KANE_PROBE_BUDGET_GLOBAL_24H=48",
  "DEMO_MODE=false",
  ...(models ? [`OPENROUTER_MODEL=${models}`] : ["# OPENROUTER_MODEL=<comma-separated model ids>"]),
  "# Build: use the exact pnpm version from package.json (pnpm 12) through Corepack.",
  "ENABLE_EXPERIMENTAL_COREPACK=1",
  "",
].join("\n");

const worker = [
  "# Local verification worker for the Vercel deployment: pnpm worker:vercel",
  `NIARVA_WORKER_API_URL=${url}`,
  `WORKER_SHARED_TOKEN=${workerToken}`,
  "NIARVA_WORKER_ID=local-worker-vercel",
  "# Optional: refuse to start unless Kane uploads to the official Test Manager project.",
  "NIARVA_KANE_PROJECT_ID=01M7N0CKZ90R3JR906713EHYW0",
  "",
].join("\n");

writeFileSync(appFile, app, { mode: 0o600 });
writeFileSync(workerFile, worker, { mode: 0o600 });
const names = (text) => text.split("\n").filter((line) => /^[A-Z_]+=/.test(line)).map((line) => line.split("=")[0]);
console.log(`Wrote .env.vercel.local: ${names(app).join(", ")}`);
console.log(`Wrote .env.worker-vercel.local: ${names(worker).join(", ")}`);
console.log("Still needed in Vercel: DATABASE_URL (Postgres integration, pooled) and OPENROUTER_API_KEY (add it yourself).");
