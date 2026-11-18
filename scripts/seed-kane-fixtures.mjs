// Seeds synthetic fixtures for the Kane Assurance development tests and fills the
// matching variables in `.testmuai/variables/assurance.json` (gitignored).
//
// - Accounts are synthetic (`*@niarva.test`); passwords are generated locally, written only
//   to the gitignored variables file, and never printed.
// - Re-running is safe: existing accounts and stored passwords are reused.
//
// Usage: node scripts/seed-kane-fixtures.mjs [baseUrl]
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (process.argv[2] ?? process.env.NIARVA_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const variablesPath = join(root, ".testmuai", "variables", "assurance.json");

const variables = existsSync(variablesPath) ? JSON.parse(readFileSync(variablesPath, "utf8")) : {};

function setVariable(name, value, { secret = false, description } = {}) {
  const current = variables[name] ?? {};
  variables[name] = {
    ...current,
    value,
    secret: current.secret ?? secret,
    ...(description && !current.description ? { description } : {}),
  };
}

function storedValue(name) {
  const value = variables[name]?.value;
  return typeof value === "string" && value !== "" ? value : null;
}

async function ensureAccount({ emailVar, passwordVar, email, name }) {
  const password = storedValue(passwordVar) ?? randomBytes(18).toString("base64url");
  const headers = { "content-type": "application/json", origin: baseUrl };

  const signIn = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
  let state = "reused";
  if (!signIn.ok) {
    const signUp = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, email, password }),
    });
    if (!signUp.ok) {
      throw new Error(
        `Could not create or sign in ${email} (sign-up HTTP ${signUp.status}). ` +
          "If the account exists with another password, reset the local database or the variables file.",
      );
    }
    state = "created";
  }
  setVariable(emailVar, email, { description: `Synthetic account ${email}.` });
  setVariable(passwordVar, password, { secret: true, description: `Password for ${email}.` });
  return state;
}

const health = await fetch(`${baseUrl}/api/v1/health`).catch(() => null);
if (!health?.ok) {
  console.error(`NIARVA is not reachable at ${baseUrl}. Start it with \`pnpm start\` or \`pnpm dev\` first.`);
  process.exit(1);
}

setVariable("start_url", baseUrl, { description: "Reachable NIARVA base URL." });

const accounts = [
  { emailVar: "empty_owner_email", passwordVar: "empty_owner_password", email: "kane-empty-owner@niarva.test", name: "Kane Empty Owner" },
  { emailVar: "owner_email", passwordVar: "owner_password", email: "kane-owner@niarva.test", name: "Kane Owner" },
  { emailVar: "nonowner_email", passwordVar: "nonowner_password", email: "kane-nonowner@niarva.test", name: "Kane Non Owner" },
];

const report = [];
for (const account of accounts) {
  report.push(`${account.email}: ${await ensureAccount(account)}`);
}

mkdirSync(dirname(variablesPath), { recursive: true });
writeFileSync(variablesPath, JSON.stringify(variables, null, 2) + "\n");

// Names and states only: values of secret variables are never printed.
console.log(`Fixtures ready at ${baseUrl}`);
for (const line of report) console.log(`  ${line}`);
const empty = Object.entries(variables)
  .filter(([, entry]) => entry.value === "" || entry.value === undefined)
  .map(([name]) => name);
console.log(`Variables still without a value (${empty.length}): ${empty.join(", ") || "none"}`);
