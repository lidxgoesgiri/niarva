"use client";

import { ArrowRight, ChevronDown, Lock, LockOpen, Server, Terminal } from "lucide-react";
import { useState } from "react";
import { StatusBadge, type StatusKind } from "@/components/composites/status-badge";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/server/services/state.service";
import { IntentTrace, type TraceFocus } from "./intent-trace";

type Run = FormState["runs"][number];
type ProbeView = Run["probes"][number];

const PROBE_TEXT: Record<string, string> = {
  initial_required: "Initial state and empty submit",
  boundary_bundle: "Boundary values",
  conditional_required_empty: "Conditionally required field left empty",
  hidden_exclusion: "Hidden answer is not submitted",
  valid_submission: "Valid answers produce a receipt",
  decimal_comma: "Decimal comma input",
  constraint_check: "Out-of-range value rejected",
  server_contract: "Server validation (no browser)",
  counterexample_confirmation: "Counterexample confirmed in a real browser",
};

const REASON_TEXT: Record<string, string> = {
  OBSERVATION_MISMATCH: "The browser showed something different from the approved intent.",
  SERVER_MISMATCH: "The server stored or accepted something the approved intent forbids.",
  TIMEOUT: "The browser run did not finish in time.",
  MISSING_OBSERVATION: "An expected observation is missing, so the result is unknown.",
  UNPARSEABLE_STATE: "The run produced output that could not be trusted.",
  RUN_NOT_STARTED: "The browser run did not start.",
  WORKER_ERROR: "The worker reported an error.",
  AGENT_INCONSISTENT: "Kane's own verdict contradicts the observations.",
  STALE_TARGET: "The page observed was not this version.",
  LEASE_EXPIRED: "The worker stopped responding.",
  AUTH_OR_CREDITS: "Kane could not authenticate or has no credits.",
  SERVER_EVIDENCE_MISSING: "The submission could not be found on the server.",
  ENV_UNREACHABLE: "The server could not be reached.",
};

function runBadge(run: Run): { status: StatusKind; label?: string } {
  if (run.mode === "full" && run.fresh === false) return { status: "STALE" };
  if (run.state === "UNVERIFIED") return { status: "UNKNOWN", label: run.detail === "DIAGNOSTIC_ONLY" ? "Diagnostic only" : "Unverified" };
  return { status: run.state as StatusKind };
}

function verdictBadge(probe: ProbeView): { status: StatusKind; label?: string } {
  const latest = probe.latest;
  if (!latest || latest.status === "queued") return { status: "QUEUED" };
  if (latest.status === "leased" || latest.status === "running") return { status: "RUNNING" };
  if (latest.status === "canceled") return { status: "CANCELED" };
  return { status: (latest.verdict ?? "UNKNOWN") as StatusKind };
}

export function VerifyPanel({
  state,
  busy,
  onAction,
  traceFocus = null,
}: {
  state: FormState;
  busy: boolean;
  onAction: (path: string, body?: unknown, method?: string) => Promise<boolean>;
  traceFocus?: TraceFocus;
}) {
  const { analysis, version, gate } = state;
  const base = `/api/v1/forms/${state.form.id}`;
  const activeRun = state.runs.find((run) => run.state === "QUEUED" || run.state === "RUNNING");
  const counterexamples = (analysis?.findings ?? []).filter((finding) => finding.counterexample);
  const openRepairs = state.repairs.filter((repair) => repair.status === "proposed");
  const fullRuns = state.runs.filter((run) => run.mode === "full");

  if (!version) return <p className="text-sm text-ink-muted">Verification starts once a form version exists.</p>;

  return (
    <div className="flex flex-col gap-5">
      <IntentTrace state={state} focus={traceFocus} />

      {/* Static analysis */}
      <section aria-labelledby="static-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 id="static-heading" className="text-sm font-semibold">Static checks (v{version.versionNo})</h3>
          {analysis ? <StatusBadge status={analysis.verdict === "PASS" ? "STATIC_PASS" : analysis.verdict === "FAILED" ? "FAILED" : "UNKNOWN"} label={analysis.verdict === "PASS" ? "Static checks passed" : undefined} /> : <StatusBadge status="UNVERIFIED" />}
        </div>
        {analysis?.verdict === "PASS" ? <p className="text-xs text-ink-muted">Every input combination was checked against the approved claims ({String((analysis.stats as { cells?: number }).cells ?? 0)} cells). Browser proof is still required.</p> : null}
        {(analysis?.findings ?? []).filter((finding) => !finding.counterexample).map((finding) => (
          <p key={finding.key} className={`rounded-lg border px-3 py-2 text-sm ${finding.severity === "error" ? "border-fail/40 bg-fail/10" : "border-warn/40 bg-warn/10"}`}>
            <span className="font-mono text-xs text-ink-muted">{finding.code}</span>
            <br />
            {finding.message}
          </p>
        ))}
        {counterexamples.map((finding) => {
          const cex = finding.counterexample!;
          const label = (state.claimSet?.fields ?? []).find((field) => field.key === cex.field)?.label ?? cex.field;
          return (
            <article key={finding.key} data-testid="counterexample" className="rounded-xl border border-fail/50 bg-fail/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-fail">Counterexample · {finding.claimKeys.join(", ")}</p>
              <p className="mt-1 text-sm">{finding.message}</p>
              {state.version?.createdVia === "template" ? <p className="mt-1 text-xs font-medium text-warn">Seeded defect for demonstration</p> : null}
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-ink-muted">Witness</dt>
                <dd className="font-mono">{Object.entries(cex.assignment).map(([key, value]) => `${key} = ${value || "(empty)"}`).join(", ") || "initial state"}</dd>
                <dt className="text-ink-muted">Expected</dt>
                <dd>{label} {cex.expected.visible ? "visible" : "hidden"}{cex.expected.visible ? (cex.expected.required ? " and required" : ", optional") : ""}</dd>
                <dt className="text-ink-muted">Actual</dt>
                <dd className="text-fail">{label} {cex.actual.visible ? "visible" : "hidden"}{cex.actual.visible ? (cex.actual.required ? " and required" : ", optional") : ""}</dd>
              </dl>
              <p className="mt-3 text-xs text-ink-muted">
                The expected behavior comes from the approved claim {finding.claimKeys.join(", ")}, not from the generated rule. This mismatch was found by static analysis; it is not yet observed in a browser.
              </p>
            </article>
          );
        })}
        {analysis?.verdict === "FAILED" && counterexamples.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={busy || Boolean(activeRun)} onClick={() => onAction(`${base}/versions/${version.id}/verify`, { mode: "diagnostic", findingKey: counterexamples[0]!.key })}>
              Confirm in a real browser
            </Button>
            <Button size="sm" disabled={busy} onClick={() => onAction(`${base}/versions/${version.id}/repairs`, {})}>
              Propose repair
            </Button>
          </div>
        ) : null}
      </section>

      {/* Repairs */}
      {openRepairs.length > 0 ? (
        <section aria-labelledby="repair-heading" className="flex flex-col gap-3">
          <h3 id="repair-heading" className="text-sm font-semibold">Proposed repairs</h3>
          {openRepairs.map((repair, index) => (
            <article key={repair.id} data-testid="repair-proposal" className="rounded-xl border border-sapphire/50 bg-sapphire/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-lavender">{index === 0 ? "Recommended · " : ""}{repair.strategy.replace(/_/g, " ").toLowerCase()} · validated by the engine</p>
              <p className="mt-1 text-sm">{repair.explanation}</p>
              <ul className="mt-2 flex flex-col gap-1 font-mono text-xs">
                {(repair.patch as { ops: { op: string; from?: unknown; to?: unknown; ruleId?: string }[] }).ops.map((op, opIndex) => (
                  <li key={opIndex} className="flex flex-wrap items-center gap-2">
                    <span className="text-ink-muted">{op.op}{op.ruleId ? ` ${op.ruleId}` : ""}</span>
                    {op.from !== undefined ? <span className="rounded bg-fail/15 px-1.5 text-fail line-through">{String(typeof op.from === "object" ? JSON.stringify(op.from) : op.from)}</span> : null}
                    {op.to !== undefined ? <><ArrowRight aria-hidden="true" className="size-3" /><span className="rounded bg-pass/15 px-1.5 text-pass">{String(typeof op.to === "object" ? JSON.stringify(op.to) : op.to)}</span></> : null}
                  </li>
                ))}
              </ul>
              {repair.predictedEffects.map((effect) => <p key={effect} className="mt-2 text-xs text-ink-muted">{effect}</p>)}
              <p className="mt-2 text-xs text-ink-muted">The approved claims do not change. Approving creates a new version that must be verified again.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => onAction(`${base}/repairs/${repair.id}`, { decision: "approve" })}>Approve repair</Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction(`${base}/repairs/${repair.id}`, { decision: "reject" })}>Reject</Button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {/* Browser verification */}
      <section aria-labelledby="browser-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 id="browser-heading" className="text-sm font-semibold">Browser verification with Kane CLI</h3>
          <span className="flex items-center gap-1.5 text-xs text-ink-muted"><Server aria-hidden="true" className="size-3.5" />{state.workers.online > 0 ? `${state.workers.online} worker online` : "No worker online"}</span>
        </div>
        {analysis?.verdict === "PASS" ? (
          <>
            <p className="text-xs text-ink-muted">{analysis.probes.filter((probe) => probe.executor === "kane").length} browser probes and 1 server contract probe, derived from the approved claims. Each browser probe uses Kane credits.</p>
            <Button disabled={busy || Boolean(activeRun)} onClick={() => onAction(`${base}/versions/${version.id}/verify`, { mode: "full", force: true })}>
              {activeRun ? "Verification running…" : "Run browser verification"}
            </Button>
            {state.workers.online === 0 ? <p className="text-xs text-warn">Runs stay queued until a worker connects (`pnpm worker`).</p> : null}
          </>
        ) : (
          <p className="text-xs text-ink-muted">Full browser verification starts once static checks pass.</p>
        )}
        {activeRun ? <Button size="sm" variant="ghost" className="self-start" disabled={busy} onClick={() => onAction(`${base}/runs/${activeRun.id}/cancel`, {})}>Cancel run</Button> : null}
        {state.runs.map((run) => <RunCard key={run.id} run={run} />)}
      </section>

      {/* Publish gate */}
      <section aria-labelledby="publish-heading" className="flex flex-col gap-3 rounded-xl border border-line bg-canvas/60 p-4" data-testid="publish-gate">
        <div className="flex items-center justify-between gap-2">
          <h3 id="publish-heading" className="text-sm font-semibold">Publish gate</h3>
          {gate.eligible ? <StatusBadge status="VERIFIED" label="Ready to publish" /> : <StatusBadge status="BLOCKED" label="Publishing blocked" />}
        </div>
        {gate.eligible ? (
          <p className="flex items-center gap-2 text-sm"><LockOpen aria-hidden="true" className="size-4 text-pass" />Version v{version.versionNo} is proven for this renderer and environment.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm" aria-label="Reasons publishing is blocked">
            {gate.reasonTexts.map((text) => <li key={text} className="flex items-start gap-2"><Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warn" />{text}</li>)}
          </ul>
        )}
        {gate.instability.unstable && fullRuns.some((run) => run.state === "FAILED") ? (
          <p className="text-xs text-warn">After a failed run, {gate.instability.required} consecutive fresh verified runs are required ({gate.instability.consecutiveVerifiedAfterFailure} so far).</p>
        ) : null}
        <Button disabled={busy || !gate.eligible} onClick={() => onAction(`${base}/publish`, { versionId: version.id, acknowledgedWarningKeys: (analysis?.findings ?? []).filter((finding) => finding.severity === "warning").map((finding) => finding.key) })}>
          Publish v{version.versionNo}
        </Button>
        {state.publication ? (
          <p className="text-sm">
            Live at <a className="text-lavender underline underline-offset-4" href={`/f/${state.publication.slug}`} target="_blank" rel="noopener">/f/{state.publication.slug}</a>
            {state.publication.versionId !== version.id ? <span className="text-warn"> · still serving an earlier version</span> : null}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function RunCard({ run }: { run: Run }) {
  const [open, setOpen] = useState(run.state !== "VERIFIED");
  const badge = runBadge(run);
  return (
    <article className="rounded-xl border border-line bg-canvas/60" data-testid="verification-run" data-run-state={run.state}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={badge.status} label={badge.label} />
          <span className="text-xs text-ink-muted">{run.mode === "full" ? "Full suite" : "Diagnostic"} · {run.counts.pass}/{run.counts.required} pass{run.counts.fail ? ` · ${run.counts.fail} fail` : ""}{run.counts.unknown ? ` · ${run.counts.unknown} unknown` : ""}</span>
        </span>
        <span className="flex items-center gap-2 text-xs text-ink-muted">
          {run.creditsTotal ? `${Number(run.creditsTotal).toFixed(1)} credits` : null}
          <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? (
        <ol className="flex flex-col gap-2 border-t border-line px-4 py-3">
          {run.probes.map((probe) => <ProbeRow key={probe.probeKey} probe={probe} />)}
          <li className="text-[11px] text-ink-muted">Renderer {run.rendererBuildId} · environment {run.environmentId} · requested {new Date(run.requestedAt).toLocaleString()}</li>
        </ol>
      ) : null}
    </article>
  );
}

function ProbeRow({ probe }: { probe: ProbeView }) {
  const [details, setDetails] = useState(false);
  const badge = verdictBadge(probe);
  const latest = probe.latest;
  const mismatches = ((latest?.observation as { mismatches?: { key: string; expected: string; observed: string }[] } | null)?.mismatches ?? []);
  return (
    <li className="rounded-lg border border-line px-3 py-2" data-probe={probe.probeKey} data-verdict={latest?.verdict ?? "pending"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm"><span className="font-mono text-xs text-ink-muted">{probe.probeKey}</span> {PROBE_TEXT[probe.kind] ?? probe.kind}</span>
        <StatusBadge status={badge.status} label={badge.label} />
      </div>
      {latest?.reasonCode ? <p className="mt-1 text-xs text-ink-muted">{REASON_TEXT[latest.reasonCode] ?? latest.reasonCode}</p> : null}
      {mismatches.length > 0 ? (
        <table className="mt-2 w-full text-left text-xs">
          <thead><tr className="text-ink-muted"><th className="font-normal">Observation</th><th className="font-normal">Expected</th><th className="font-normal">Observed</th></tr></thead>
          <tbody>{mismatches.map((mismatch) => <tr key={mismatch.key}><td className="font-mono">{mismatch.key}</td><td>{mismatch.expected}</td><td className="text-fail">{mismatch.observed}</td></tr>)}</tbody>
        </table>
      ) : null}
      {latest?.agentVerdictMismatch ? <p className="mt-1 text-xs text-warn">Kane reported “passed”, but the observations contradict the approved intent; NIARVA judged FAIL from the observations.</p> : null}
      {latest && latest.status === "completed" ? (
        <button type="button" className="mt-1 flex items-center gap-1 text-xs text-lavender" aria-expanded={details} onClick={() => setDetails((value) => !value)}>
          <Terminal aria-hidden="true" className="size-3" />{details ? "Hide evidence" : "Show evidence"}
        </button>
      ) : null}
      {details && latest ? (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
          <dt className="text-ink-muted">Kane run ID</dt><dd className="break-all font-mono">{latest.kaneRunId ?? "—"}</dd>
          <dt className="text-ink-muted">Kane CLI</dt><dd className="font-mono">{latest.kaneCliVersion ?? "—"}</dd>
          <dt className="text-ink-muted">Kane status</dt><dd className="font-mono">{latest.agentVerdict ?? "—"}</dd>
          <dt className="text-ink-muted">Credits</dt><dd className="font-mono">{latest.creditsConsumed ?? "—"}</dd>
          <dt className="text-ink-muted">Pack SHA-256</dt><dd className="break-all font-mono">{(latest.evidence as { packSha256?: string } | null)?.packSha256 ?? "—"}</dd>
          <dt className="text-ink-muted">Objective hash</dt><dd className="break-all font-mono">{probe.objectiveHash}</dd>
          <dt className="text-ink-muted">Attempt</dt><dd className="font-mono">{latest.attempt}</dd>
          <dt className="text-ink-muted">Observed</dt><dd className="break-all font-mono">{JSON.stringify(Object.fromEntries(Object.entries((latest.observation ?? {}) as Record<string, unknown>).filter(([key]) => key !== "mismatches")))}</dd>
        </dl>
      ) : null}
    </li>
  );
}
