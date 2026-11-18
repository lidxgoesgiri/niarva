// PROD-LOOP-01: drives the product-level closed loop through NIARVA's own API, exactly as the
// workspace UI does, while a real worker runs Kane CLI for every browser probe.
//
//   seeded gt version → static FAILED → diagnostic Kane run (real browser) → bounded repair
//   → creator approval → new version (same claims hash) → full suite (real Kane) → publish
//   → public submission
//
// Requires: the web app running, `pnpm worker` running, and the synthetic owner from
// `pnpm seed:kane`. Writes evidence/product-loop/prod-loop-01.json (sanitized).
// Usage: node scripts/run-product-loop.mjs [baseUrl] [--resume <formId>] [--out <file name>]
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const vars = JSON.parse(readFileSync(join(root, ".testmuai", "variables", "assurance.json"), "utf8"));
const log = (...parts) => console.log(new Date().toISOString(), ...parts);

const signIn = await fetch(`${base}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: base },
  body: JSON.stringify({ email: vars.owner_email.value, password: vars.owner_password.value }),
});
if (!signIn.ok) throw new Error(`sign-in failed (HTTP ${signIn.status})`);
const cookie = signIn.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");

async function call(path, body, method = "POST") {
  // A read is retried after a transient network error (a remote deployment is polled for an hour
  // or more). A write is never retried, so no request with side effects can be sent twice.
  const attempts = method === "GET" ? 5 : 1;
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { cookie, origin: base, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const json = await response.json().catch(() => null);
      return { status: response.status, json };
    } catch (error) {
      if (attempt >= attempts) throw error;
      log(`network error on GET ${path} (${error.cause?.code ?? error.message}); retry ${attempt} of ${attempts - 1}`);
      await new Promise((resolve) => setTimeout(resolve, 15_000 * attempt));
    }
  }
}
const state = async (formId) => (await call(`/api/v1/forms/${formId}`, undefined, "GET")).json;

/**
 * Waits for a run to finish. The Kane lock is shared with other work on this machine, so a run
 * can pause between probes; the wait only gives up after `idleMinutes` without a newly judged
 * probe, and never after more than `maxMinutes` in total.
 */
async function waitForRun(formId, runId, { idleMinutes = 30, maxMinutes = 180 } = {}) {
  const hardDeadline = Date.now() + maxMinutes * 60_000;
  let lastProgress = Date.now();
  let lastDone = -1;
  for (;;) {
    const current = await state(formId);
    const run = current.runs.find((candidate) => candidate.id === runId);
    if (run && !["QUEUED", "RUNNING"].includes(run.state)) return { run, state: current };
    const done = run ? run.probes.filter((probe) => probe.latest?.status === "completed").length : 0;
    if (done !== lastDone) {
      lastDone = done;
      lastProgress = Date.now();
    }
    if (Date.now() - lastProgress > idleMinutes * 60_000 || Date.now() > hardDeadline) {
      throw new Error(`run ${runId} made no progress for ${idleMinutes} minutes (or exceeded ${maxMinutes} minutes)`);
    }
    log(`run ${runId.slice(-8)} ${run?.state ?? "?"} · ${done}/${run?.probes.length ?? "?"} probes judged`);
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
}

const summarizeRun = (run) => ({
  id: run.id,
  mode: run.mode,
  state: run.state,
  detail: run.detail,
  counts: run.counts,
  creditsTotal: run.creditsTotal,
  rendererBuildId: run.rendererBuildId,
  requestedAt: run.requestedAt,
  completedAt: run.completedAt,
  probes: run.probes.map((probe) => ({
    probeKey: probe.probeKey,
    kind: probe.kind,
    executor: probe.executor,
    claimKeys: probe.claimKeys,
    goldenIds: probe.goldenIds,
    objectiveHash: probe.objectiveHash,
    verdict: probe.latest?.verdict ?? null,
    reasonCode: probe.latest?.reasonCode ?? null,
    failedStage: probe.latest?.failedStage ?? null,
    mismatches: probe.latest?.observation?.mismatches ?? [],
    kaneStatus: probe.latest?.agentVerdict ?? null,
    agentVerdictMismatch: probe.latest?.agentVerdictMismatch ?? false,
    kaneSessionId: probe.latest?.kaneRunId ?? null,
    kaneCliVersion: probe.latest?.kaneCliVersion ?? null,
    credits: probe.latest?.creditsConsumed ?? null,
    packSha256: probe.latest?.evidence?.packSha256 ?? null,
    attempt: probe.latest?.attempt ?? null,
  })),
});

const record = { loop: "PROD-LOOP-01", base, startedAt: new Date().toISOString(), steps: [] };
const step = (name, data) => {
  record.steps.push({ name, at: new Date().toISOString(), ...data });
  log(name, JSON.stringify(data).slice(0, 300));
};

// --resume <formId>: continue a loop whose driver stopped while its full run was still going.
// Nothing is redone; the run is read from the server, then steps 6 onward run normally.
const resumeIndex = process.argv.indexOf("--resume");
const resumeFormId = resumeIndex > 0 ? process.argv[resumeIndex + 1] : null;
const outIndex = process.argv.indexOf("--out");
const outName = outIndex > 0 ? process.argv[outIndex + 1] : "prod-loop-01.json";
let formId;
let v2;
let fullDone;
if (resumeFormId) {
  formId = resumeFormId;
  const current = await state(formId);
  v2 = current.version;
  const fullRun = current.runs.find((run) => run.mode === "full");
  if (!fullRun) throw new Error(`form ${formId} has no full verification run to resume`);
  step("resumed", {
    formId,
    reason: "the driver stopped waiting before the full run finished; the steps before this point are in the attempt log",
    versions: current.versions,
    claimsHash: current.claimSet.claimsHash,
    staticVerdict: current.analysis?.verdict ?? null,
    approvedRepairs: current.repairs.filter((repair) => repair.status === "applied" || repair.resultingVersionId).map((repair) => ({ strategy: repair.strategy, ops: repair.patch.ops, resultingVersionId: repair.resultingVersionId })),
    fullRunId: fullRun.id,
  });
  fullDone = await waitForRun(formId, fullRun.id);
  step("full verification finished", { run: summarizeRun(fullDone.run), gate: fullDone.state.gate });
} else {
// 1. Template form, approved claims, seeded defect.
const title = `Product Loop Scholarship ${new Date().toISOString().slice(0, 16)}`;
const created = await call("/api/v1/forms", { source: "template", template: "scholarship", title });
formId = created.json.formId;
let current = await state(formId);
await call(`/api/v1/forms/${formId}/claims/approve`, { revision: current.claimSet.revision });
await call(`/api/v1/forms/${formId}/generate`, { strategy: "seeded_demo" });
current = await state(formId);
const v1 = current.version;
step("seeded version created", { formId, versionNo: v1.versionNo, definitionHash: v1.definitionHash, claimsHash: current.claimSet.claimsHash, staticVerdict: current.analysis.verdict, counterexample: current.analysis.findings.find((finding) => finding.counterexample)?.counterexample ?? null });

// 2. Diagnostic run: confirm the static counterexample in a real browser.
const diagnostic = await call(`/api/v1/forms/${formId}/versions/${v1.id}/verify`, { mode: "diagnostic" });
step("diagnostic requested", { status: diagnostic.status, runId: diagnostic.json.runId });
const diagnosticDone = await waitForRun(formId, diagnostic.json.runId);
step("diagnostic finished", { run: summarizeRun(diagnosticDone.run) });

// 3. Bounded repair proposal and explicit approval.
const proposals = await call(`/api/v1/forms/${formId}/versions/${v1.id}/repairs`, {});
const chosen = proposals.json.proposals[0];
step("repair proposed", { proposals: proposals.json.proposals.map((proposal) => ({ strategy: proposal.strategy, ops: proposal.patch.ops, explanation: proposal.explanation })) });
const applied = await call(`/api/v1/forms/${formId}/repairs/${chosen.id}`, { decision: "approve" });
current = await state(formId);
v2 = current.version;
step("repair approved", { status: applied.status, newVersionNo: v2.versionNo, definitionHash: v2.definitionHash, parentVersionId: v2.parentVersionId, claimsHash: current.claimSet.claimsHash, claimsHashUnchanged: current.claimSet.claimsHash === record.steps[0].claimsHash, staticVerdict: current.analysis.verdict });

// 4. Publishing before proof is refused by the backend.
const early = await call(`/api/v1/forms/${formId}/publish`, { versionId: v2.id, acknowledgedWarningKeys: [] });
step("publish before proof", { status: early.status, code: early.json?.error?.code, reasons: early.json?.error?.reasons });

// 5. Full suite with real Kane runs.
const full = await call(`/api/v1/forms/${formId}/versions/${v2.id}/verify`, { mode: "full", force: true });
step("full verification requested", { status: full.status, runId: full.json.runId });
fullDone = await waitForRun(formId, full.json.runId);
step("full verification finished", { run: summarizeRun(fullDone.run), gate: fullDone.state.gate });
}

// 6. Publish only if the backend gate allows it, then submit as a respondent.
const published = await call(`/api/v1/forms/${formId}/publish`, { versionId: v2.id, acknowledgedWarningKeys: [] });
step("publish after proof", { status: published.status, slug: published.json?.slug, code: published.json?.error?.code, reasons: published.json?.error?.reasons });
if (published.status === 201) {
  const submission = await fetch(`${base}/api/v1/public/forms/${published.json.slug}/submissions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ submissionId: randomUUID(), formVersionId: v2.id, answers: { full_name: "Synthetic Respondent", gpa: "3.5", certificate: "CERT-TEST-0042" } }),
  });
  const body = await submission.json();
  step("public submission", { status: submission.status, receiptCode: body.receiptCode ?? null });
}

record.finishedAt = new Date().toISOString();
mkdirSync(join(root, "evidence", "product-loop"), { recursive: true });
writeFileSync(join(root, "evidence", "product-loop", outName), JSON.stringify(record, null, 2) + "\n");
log(`wrote evidence/product-loop/${outName}`);
