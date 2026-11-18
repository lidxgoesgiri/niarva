// Creates (or reuses) the synthetic judge account and prints the deployment settings that give it
// scoped, read-only access to the demo showcase forms.
//
// - The account is synthetic (`judge@niarva.test`). Its password is generated locally, written only
//   to the gitignored `.testmuai/variables/assurance.json` (`scoped_judge_password`), and never
//   printed. Hand it to judges through the private submission channel, never the repository.
// - Access is granted by the deployment, not by this script: set `DEMO_MODE=true`,
//   `DEMO_JUDGE_EMAILS`, and `DEMO_SHOWCASE_FORM_IDS` on the web app (see docs/deployment/VERCEL.md).
//
// Usage: node scripts/seed-judge-account.mjs <baseUrl> [--showcase <formId,formId>]
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const baseUrl = (argv.find((arg) => /^https?:\/\//.test(arg)) ?? process.env.NIARVA_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const showcaseIndex = argv.indexOf("--showcase");
const showcase = showcaseIndex >= 0 ? argv[showcaseIndex + 1] ?? "" : "";

const variablesPath = join(root, ".testmuai", "variables", "assurance.json");
mkdirSync(dirname(variablesPath), { recursive: true });
const variables = existsSync(variablesPath) ? JSON.parse(readFileSync(variablesPath, "utf8")) : {};
const stored = (name) => (typeof variables[name]?.value === "string" && variables[name].value !== "" ? variables[name].value : null);
const setVariable = (name, value, extra) => {
  variables[name] = { ...(variables[name] ?? {}), value, secret: extra.secret ?? false, description: variables[name]?.description ?? extra.description };
  writeFileSync(variablesPath, JSON.stringify(variables, null, 2) + "\n");
};

const health = await fetch(`${baseUrl}/api/v1/health`).catch(() => null);
if (!health?.ok) {
  console.error(`NIARVA is not reachable at ${baseUrl}.`);
  process.exit(1);
}

const email = stored("scoped_judge_email") ?? "judge@niarva.test";
const password = stored("scoped_judge_password") ?? randomBytes(18).toString("base64url");
const headers = { "content-type": "application/json", origin: baseUrl };

let state = "reused";
const signIn = await fetch(`${baseUrl}/api/auth/sign-in/email`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
if (!signIn.ok) {
  const signUp = await fetch(`${baseUrl}/api/auth/sign-up/email`, { method: "POST", headers, body: JSON.stringify({ name: "NIARVA Judge", email, password }) });
  if (!signUp.ok) {
    console.error(`Could not create or sign in ${email} (sign-up HTTP ${signUp.status}). If it exists with another password, use the stored one.`);
    process.exit(1);
  }
  state = "created";
}
setVariable("scoped_judge_email", email, { description: "Synthetic judge account with scoped, read-only access to the demo showcase." });
setVariable("scoped_judge_password", password, { secret: true, description: "Password of the synthetic judge account (private channel only)." });

console.log(`Judge account ${email}: ${state} at ${baseUrl}. Password stored in .testmuai/variables/assurance.json (scoped_judge_password).`);
console.log("Set on the web app, then redeploy:");
console.log("  DEMO_MODE=true");
console.log(`  DEMO_JUDGE_EMAILS=${email}`);
console.log(`  DEMO_SHOWCASE_FORM_IDS=${showcase || "<form id>[,<form id>]"}`);
