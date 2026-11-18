// Prepares Kane test fixtures that need no browser run: forms whose definitions differ from the
// approved claims in a known way, a run canceled before any probe ran, and pointers to existing
// owner records (private pages, evidence, a run that ended UNKNOWN, a form with responses).
// Everything goes through NIARVA's own API. No proof is created or faked here.
//
// Requires: `pnpm seed:kane` first; for the pointers, a completed PROD-LOOP-01 record.
// Usage: node scripts/seed-derived-fixtures.mjs [baseUrl] [--loop <prod-loop json>] [--unknown-loop <prod-loop json>]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const baseUrl = (argv.find((arg) => /^https?:\/\//.test(arg)) ?? process.env.NIARVA_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const option = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
};
const variablesPath = join(root, ".testmuai", "variables", "assurance.json");
const variables = JSON.parse(readFileSync(variablesPath, "utf8"));
const stored = (name) => (typeof variables[name]?.value === "string" && variables[name].value !== "" ? variables[name].value : null);
const setVariable = (name, value, description) => {
  variables[name] = { ...(variables[name] ?? {}), value, secret: variables[name]?.secret ?? false, ...(variables[name]?.description ? {} : { description }) };
  writeFileSync(variablesPath, JSON.stringify(variables, null, 2) + "\n");
};
const report = [];

const signIn = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email: stored("owner_email"), password: stored("owner_password") }),
});
if (!signIn.ok) throw new Error(`owner sign-in failed (HTTP ${signIn.status}); run \`pnpm seed:kane\` against ${baseUrl}`);
const cookie = signIn.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
async function call(path, body, method = "POST") {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { cookie, origin: baseUrl, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${method} ${path} failed: ${json?.error?.code ?? response.status} ${json?.error?.message ?? ""}`);
  return json;
}
const state = (formId) => call(`/api/v1/forms/${formId}`, undefined, "GET");

/** A template form with approved claims and the claim-derived (correct) skeleton version. */
async function skeletonForm(variable, title) {
  const known = stored(`${variable}__id`);
  if (known && stored(variable) === title) {
    try {
      await state(known);
      return { formId: known, created: false };
    } catch {
      // Recreate below.
    }
  }
  const { formId } = await call("/api/v1/forms", { source: "template", template: "scholarship", title });
  const current = await state(formId);
  await call(`/api/v1/forms/${formId}/claims/approve`, { revision: current.claimSet.revision });
  await call(`/api/v1/forms/${formId}/generate`, { strategy: "skeleton" });
  setVariable(variable, title, `Synthetic fixture form "${title}".`);
  setVariable(`${variable}__id`, formId, "Internal: fixture form id (not used by tests).");
  return { formId, created: true };
}

/** Saves an edited definition as a new version through the creator's edit endpoint. */
async function editDefinition(formId, change) {
  const current = await state(formId);
  const definition = JSON.parse(JSON.stringify(current.version.definition));
  change(definition);
  await call(`/api/v1/forms/${formId}/versions`, { baseVersionId: current.version.id, definition });
}

// t-39: a generated rule that no approved claim asks for.
{
  const { formId, created } = await skeletonForm("unrequested_rule_form_name", "Kane Unrequested Rule Scholarship B");
  if (created) {
    await editDefinition(formId, (definition) => {
      definition.rules.push({ id: "rule_0ec0a1b2", target: "full_name", effect: "require", when: { kind: "cmp", field: "gpa", op: "lt", value: "2" }, originClaimKeys: [] });
    });
  }
  report.push(`unrequested rule form: ${created ? "created" : "reused"}`);
}
// t-40: an approved conditional claim with no generated rule.
{
  const { formId, created } = await skeletonForm("missing_rule_form_name", "Kane Missing Rule Scholarship B");
  if (created) {
    await editDefinition(formId, (definition) => {
      definition.rules = definition.rules.filter((rule) => rule.target !== "certificate");
    });
  }
  report.push(`missing rule form: ${created ? "created" : "reused"}`);
}
// t-41: the claim-derived rule, never observed in a browser.
{
  const { created } = await skeletonForm("matching_rule_form_name", "Kane Matching Rule Scholarship B");
  report.push(`matching rule form: ${created ? "created" : "reused"}`);
}
// t-57: a full verification canceled before any probe executed (no worker may be running).
{
  const { formId, created } = await skeletonForm("zero_run_form_name", "Kane Zero Run Scholarship B");
  const current = await state(formId);
  if (!current.runs.some((run) => run.mode === "full")) {
    const { runId } = await call(`/api/v1/forms/${formId}/versions/${current.version.id}/verify`, { mode: "full", force: true });
    await call(`/api/v1/forms/${formId}/runs/${runId}/cancel`, {});
    const after = (await state(formId)).runs.find((run) => run.id === runId);
    const executed = after.probes.filter((probe) => probe.latest?.status === "completed").length;
    if (executed !== 0) throw new Error(`zero-run fixture: ${executed} probes executed before the cancel; stop the worker and retry`);
  }
  report.push(`zero-run form: ${created ? "created" : "reused"} (full run canceled before any probe)`);
}

// Pointers to existing owner records from a completed PROD-LOOP-01 run.
const loopPath = option("--loop");
if (loopPath) {
  const record = JSON.parse(readFileSync(loopPath, "utf8"));
  const resumed = record.steps.find((step) => step.name === "resumed");
  const formId = resumed?.formId ?? record.steps.find((step) => step.formId)?.formId;
  const full = record.steps.find((step) => step.name === "full verification finished")?.run;
  if (!formId || !full) throw new Error(`${loopPath}: no form or full run in the record`);
  const loopState = await state(formId);
  const owned = stored("owned_form_name__id");
  setVariable("private_version_url", `${baseUrl}/app/forms/${owned}`, "Direct URL for an owner's known private form version in synthetic fixture.");
  setVariable("private_version_marker", stored("owned_form_name"), "Text that appears only on the owner's private form page.");
  setVariable("private_evidence_url", `${baseUrl}/api/v1/forms/${formId}`, "Direct URL for that owner's private evidence in synthetic fixture.");
  setVariable("private_evidence_marker", full.id, "The verification run id, present only in the owner's evidence response.");
  setVariable("config_api_url", `${baseUrl}/api/v1/forms/${formId}/versions`, "Owner-scoped form-version configuration mutation endpoint (POST).");
  setVariable("response_form_name", loopState.form.title, "Owned form that has a real respondent submission.");
  report.push(`pointers from ${loopPath}: private page, evidence, config endpoint, response form`);
}
const unknownPath = option("--unknown-loop");
if (unknownPath) {
  const record = JSON.parse(readFileSync(unknownPath, "utf8"));
  const run = record.steps.find((step) => step.name === "full verification finished")?.run;
  const unknownProbe = run?.probes.find((probe) => probe.verdict === "UNKNOWN");
  if (!run || !unknownProbe) throw new Error(`${unknownPath}: no full run with an UNKNOWN probe`);
  setVariable("unknown_run_id", run.id, "ID of an isolated verification run for an approved critical probe with missing observation or required completion event, visible to the owner.");
  report.push(`unknown run: ${run.id} (${unknownProbe.probeKey} ${unknownProbe.reasonCode})`);
}
if (!stored("private_file_path")) {
  setVariable("private_file_path", "../../../synthetic-private/niarva-fixture-note.txt", "Safe synthetic private file path outside permitted evidence references; not a real file.");
}

console.log(`Derived fixtures ready at ${baseUrl}`);
for (const line of report) console.log(`  ${line}`);
