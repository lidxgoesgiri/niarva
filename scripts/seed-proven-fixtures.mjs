// Prepares the Kane test fixtures that need real browser proof: verified and published forms.
// Everything goes through NIARVA's own API and the verification worker, so every proof comes
// from real Kane CLI runs. Nothing bypasses the publish gate: a form is published only when the
// backend allows it, and a run that is not VERIFIED stops the script with an honest report.
//
// Requires: the web app, `pnpm worker` against the same base URL, and `pnpm seed:kane` first.
// Usage:
//   node scripts/seed-proven-fixtures.mjs [baseUrl] [--published] [--other-published] [--verified-owned]
//                                         [--published-from <prod-loop json>]
// Each verification runs the full probe suite (about 25 minutes and roughly 250 Kane credits).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const baseUrl = (argv.find((arg) => /^https?:\/\//.test(arg)) ?? process.env.NIARVA_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const flag = (name) => argv.includes(name);
const option = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
};
const variablesPath = join(root, ".testmuai", "variables", "assurance.json");
if (!existsSync(variablesPath)) {
  console.error("Run `pnpm seed:kane` first: the variables file is missing.");
  process.exit(1);
}
const variables = JSON.parse(readFileSync(variablesPath, "utf8"));
const stored = (name) => (typeof variables[name]?.value === "string" && variables[name].value !== "" ? variables[name].value : null);
const setVariable = (name, value, description) => {
  variables[name] = { ...(variables[name] ?? {}), value, secret: variables[name]?.secret ?? false, ...(variables[name]?.description ? {} : { description }) };
  writeFileSync(variablesPath, JSON.stringify(variables, null, 2) + "\n");
};
const log = (...parts) => console.log(new Date().toISOString(), ...parts);

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
  return { status: response.status, json };
}
const state = async (formId) => (await call(`/api/v1/forms/${formId}`, undefined, "GET")).json;

async function templateForm(title) {
  const { json: created } = await call("/api/v1/forms", { source: "template", template: "scholarship", title });
  const current = await state(created.formId);
  await call(`/api/v1/forms/${created.formId}/claims/approve`, { revision: current.claimSet.revision });
  await call(`/api/v1/forms/${created.formId}/generate`, { strategy: "skeleton" });
  return created.formId;
}

/** Full verification of the latest version through the real worker; returns the finished run. */
async function verify(formId, label) {
  const current = await state(formId);
  const requested = await call(`/api/v1/forms/${formId}/versions/${current.version.id}/verify`, { mode: "full", force: false });
  if (requested.status >= 400) throw new Error(`${label}: verification refused (${requested.json?.error?.code ?? requested.status})`);
  const runId = requested.json.runId;
  log(`${label}: full verification ${runId}${requested.json.cached ? " (existing fresh proof reused)" : ""}`);
  const deadline = Date.now() + 75 * 60_000;
  for (;;) {
    const run = (await state(formId)).runs.find((candidate) => candidate.id === runId);
    if (run && !["QUEUED", "RUNNING"].includes(run.state)) return run;
    if (Date.now() > deadline) throw new Error(`${label}: run ${runId} did not finish in 75 minutes (is the worker running?)`);
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
}

async function provenPublished(variable, title) {
  const existing = stored(variable);
  if (existing && (await fetch(existing)).ok) {
    log(`${variable}: reused ${existing}`);
    return;
  }
  const formId = await templateForm(title);
  const run = await verify(formId, title);
  if (run.state !== "VERIFIED") {
    console.error(`${title}: run ended ${run.state} (${JSON.stringify(run.counts)}); not published.`);
    process.exit(2);
  }
  const current = await state(formId);
  const published = await call(`/api/v1/forms/${formId}/publish`, { versionId: current.version.id, acknowledgedWarningKeys: [] });
  if (published.status !== 201) {
    console.error(`${title}: the gate refused publication (${published.json?.error?.code}: ${published.json?.error?.reasons?.join(", ")})`);
    process.exit(2);
  }
  setVariable(variable, `${baseUrl}/f/${published.json.slug}`, `Public URL of the verified, published fixture "${title}".`);
  log(`${variable}: published ${baseUrl}/f/${published.json.slug}`);
}

if (!stored("certificate_fixture")) setVariable("certificate_fixture", "CERT-TEST-0042", "Synthetic achievement certificate number.");

const fromLoop = option("--published-from");
if (fromLoop) {
  const record = JSON.parse(readFileSync(fromLoop, "utf8"));
  const publish = record.steps.find((step) => step.name === "publish after proof");
  if (publish?.status !== 201 || !publish.slug) {
    console.error(`${fromLoop}: the loop did not publish a form, so it cannot serve as the published fixture.`);
    process.exit(2);
  }
  setVariable("published_form_url", `${baseUrl}/f/${publish.slug}`, "Public URL of the form published by PROD-LOOP-01.");
  log(`published_form_url: from ${fromLoop} → ${baseUrl}/f/${publish.slug}`);
}
if (flag("--published")) await provenPublished("published_form_url", "Kane Published Scholarship B");
if (flag("--other-published")) await provenPublished("other_published_form_url", "Kane Second Published Scholarship B");
if (flag("--verified-owned")) {
  const formId = stored("owned_form_name__id");
  if (!formId) throw new Error("owned_form_name__id is missing; run `pnpm seed:kane` first");
  const run = await verify(formId, stored("owned_form_name") ?? "owned form");
  if (run.state !== "VERIFIED") {
    console.error(`owned form: run ended ${run.state} (${JSON.stringify(run.counts)}).`);
    process.exit(2);
  }
  log("owned form: VERIFIED and left unpublished");
}
log("done");
