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

const cookies = new Map();

async function ensureAccount({ emailVar, passwordVar, email, name }) {
  const password = storedValue(passwordVar) ?? randomBytes(18).toString("base64url");
  const headers = { "content-type": "application/json", origin: baseUrl };

  const signIn = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
  let state = "reused";
  let session = signIn;
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
    session = signUp;
  }
  cookies.set(email, session.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; "));
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

/* ------------------------------------------------ fixture forms (owner account) */

async function signIn(email, password) {
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`sign-in failed for ${email} (HTTP ${response.status})`);
  return response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
}

async function call(cookie, path, body, method = "POST") {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { cookie, origin: baseUrl, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${method} ${path} failed: ${json?.error?.code ?? response.status}`);
  return json;
}

/** Template form → approved claims → generated version (skeleton or the labeled seeded defect). */
async function ensureForm(cookie, variable, title, strategy) {
  const known = storedValue(`${variable}__id`);
  if (known) {
    try {
      await call(cookie, `/api/v1/forms/${known}`, undefined, "GET");
      return "reused";
    } catch {
      // The local database was reset; create the fixture again.
    }
  }
  const { formId } = await call(cookie, "/api/v1/forms", { source: "template", template: "scholarship", title });
  const state = await call(cookie, `/api/v1/forms/${formId}`, undefined, "GET");
  await call(cookie, `/api/v1/forms/${formId}/claims/approve`, { revision: state.claimSet.revision });
  await call(cookie, `/api/v1/forms/${formId}/generate`, { strategy });
  setVariable(variable, title, { description: `Synthetic fixture form "${title}".` });
  setVariable(`${variable}__id`, formId, { description: "Internal: fixture form id (not used by tests)." });
  return "created";
}

const ownerCookie = cookies.get(storedValue("owner_email")) ?? (await signIn(storedValue("owner_email"), storedValue("owner_password")));
const fixtures = [
  ["seeded_gt_form_name", "Kane Seeded Defect Scholarship", "seeded_demo"],
  ["observed_mismatch_form_name", "Kane Repair Scholarship", "seeded_demo"],
  ["owned_form_name", "Kane Verified Scholarship", "skeleton"],
  ["unverified_form_name", "Kane Unverified Scholarship", "skeleton"],
];
for (const [variable, title, strategy] of fixtures) {
  report.push(`${title}: ${await ensureForm(ownerCookie, variable, title, strategy)}`);
}
setVariable("certificate_fixture", "CERT-TEST-0042", { description: "Synthetic achievement certificate number." });

mkdirSync(dirname(variablesPath), { recursive: true });
writeFileSync(variablesPath, JSON.stringify(variables, null, 2) + "\n");

// Names and states only: values of secret variables are never printed.
console.log(`Fixtures ready at ${baseUrl}`);
for (const line of report) console.log(`  ${line}`);
const empty = Object.entries(variables)
  .filter(([, entry]) => entry.value === "" || entry.value === undefined)
  .map(([name]) => name);
console.log(`Variables still without a value (${empty.length}): ${empty.join(", ") || "none"}`);
