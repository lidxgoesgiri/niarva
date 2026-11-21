"use client";

import { ChevronDown, Quote, TriangleAlert, Waypoints } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StatusBadge, type StatusKind } from "@/components/composites/status-badge";
import type { FormState } from "@/server/services/state.service";

type Trace = NonNullable<FormState["intentTrace"]>;
type Row = Trace["rows"][number];
type Run = FormState["runs"][number];
export type TraceFocus = { claimKey: string; nonce: number } | null;

const STATIC_BADGE: Record<Row["staticStatus"], { status: StatusKind; label: string }> = {
  PASS: { status: "STATIC_PASS", label: "Static match" },
  FAILED: { status: "FAILED", label: "Static mismatch" },
  UNKNOWN: { status: "UNKNOWN", label: "Needs manual check" },
  NOT_ANALYSED: { status: "UNVERIFIED", label: "Not analysed" },
};

function browserBadge(row: Row): { status: StatusKind; label: string } {
  const { browser } = row;
  switch (browser.status) {
    case "VERIFIED":
      return { status: "VERIFIED", label: "Verified in a browser" };
    case "FAILED":
      return { status: "FAILED", label: "Failed in a browser" };
    case "BLOCKED":
      return { status: "UNKNOWN", label: "Unknown in a browser" };
    case "PARTIAL":
      return { status: "UNKNOWN", label: "Partially observed" };
    case "STALE":
      return { status: "STALE", label: "Stale proof" };
    case "NOT_COVERED":
      return { status: "UNKNOWN", label: "No probe covers this" };
    case "MANUAL":
      return { status: "UNVERIFIED", label: "Not tested automatically" };
    case "UNVERIFIED":
      if (browser.diagnostic?.outcome === "MISMATCH_OBSERVED") return { status: "FAIL", label: "Mismatch observed (diagnostic)" };
      if (browser.diagnostic?.outcome === "PENDING") return { status: "RUNNING", label: "Diagnostic running" };
      return { status: "UNVERIFIED", label: "Not observed in a browser" };
  }
}

const RULE_STATUS_TEXT: Record<Row["rules"][number]["status"], string> = {
  supported: "supports the claim",
  conflicting: "conflicts with the claim",
  unrequested: "not requested by any claim",
  unanalysed: "not analysed",
};

function behaviorText(behavior: { visible: boolean; required: boolean }) {
  return behavior.visible ? (behavior.required ? "shown, required" : "shown, optional") : "hidden";
}

type Cex = NonNullable<Row["findings"][number]["counterexample"]>;

/** The concrete effect of a discrepancy, stated only as far as the counterexample shows it. */
function consequence(cex: Cex, label: string): string {
  if (cex.expected.visible && !cex.actual.visible) return `Consequence: the ${label} field is hidden at the witness, so it is not collected.`;
  if (cex.expected.required && !cex.actual.required) return `Consequence: the ${label} field is not required at the witness, so it can be left empty.`;
  if (!cex.expected.visible && cex.actual.visible) return `Consequence: the ${label} field is shown at the witness although the approved claim hides it.`;
  return `Consequence: the ${label} field is required at the witness although the approved claim leaves it optional.`;
}

function evidenceFor(runs: Run[], runId: string | null, probeKeys: string[]) {
  const run = runs.find((candidate) => candidate.id === runId);
  return probeKeys.map((probeKey) => {
    const probe = run?.probes.find((candidate) => candidate.probeKey === probeKey);
    return {
      probeKey,
      kaneRunId: probe?.latest?.kaneRunId ?? null,
      pack: (probe?.latest?.evidence as { packSha256?: string } | null)?.packSha256 ?? null,
      mismatches: ((probe?.latest?.observation as { mismatches?: { key: string; expected: string; observed: string }[] } | null)?.mismatches ?? []),
    };
  });
}

/**
 * Intent Trace ledger (FR-VER-09): one row per approved claim, linking the source sentence,
 * the claim, the generated rule, the static result, the browser result, and the evidence.
 * Static and browser status are kept apart: a static match is never shown as browser proof.
 */
export function IntentTrace({ state, focus }: { state: FormState; focus: TraceFocus }) {
  const trace = state.intentTrace;
  const rowRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!focus) return;
    const element = rowRefs.current.get(focus.claimKey);
    // The workspace renders panels for both layouts; only act on the visible one.
    if (!element || element.offsetParent === null) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    element.querySelector<HTMLElement>("[data-trace-heading]")?.focus({ preventScroll: true });
  }, [focus]);

  if (!trace) {
    return state.intentTraceNote ? <p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm">{state.intentTraceNote}</p> : null;
  }

  const manual = trace.rows.filter((row) => row.kind === "MANUAL").length;
  const cells = (state.analysis?.stats as { cells?: number } | undefined)?.cells;

  return (
    <section aria-labelledby="intent-trace-heading" data-testid="intent-trace" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id="intent-trace-heading" className="flex items-center gap-2 text-sm font-semibold"><Waypoints aria-hidden="true" className="size-4 text-lavender" />Intent Trace</h3>
        <p className="text-xs text-ink-muted">
          Source sentence → approved claim → generated rule → static check → browser → evidence. Every expectation comes from the approved claim; the generated rules are what is being tested.
        </p>
        <p className="font-mono text-[11px] text-ink-muted" data-testid="trace-coverage">
          {trace.rows.length - manual} automatic claims{manual ? ` · ${manual} manual` : ""} · {cells !== undefined ? `${cells} partition cells checked` : "not analysed"}{state.analysis ? ` · engine ${state.analysis.engineVersion}` : ""}
        </p>
      </div>

      <ol className="flex flex-col gap-2" aria-label="Intent Trace ledger">
        {trace.rows.map((row) => (
          <TraceRow
            key={row.claimKey}
            row={row}
            state={state}
            focused={focus?.claimKey === row.claimKey}
            register={(element) => {
              if (element) rowRefs.current.set(row.claimKey, element);
              else rowRefs.current.delete(row.claimKey);
            }}
          />
        ))}
      </ol>

      {trace.unrequestedRules.length > 0 ? (
        <div className="rounded-xl border border-warn/40 bg-warn/10 p-3" data-testid="trace-unrequested">
          <p className="flex items-center gap-2 text-sm font-medium"><TriangleAlert aria-hidden="true" className="size-4 text-warn" />Unrequested rules</p>
          <p className="mt-1 text-xs text-ink-muted">No approved claim asks for these generated rules.</p>
          <ul className="mt-2 flex flex-col gap-1 font-mono text-xs">
            {trace.unrequestedRules.map((rule) => <li key={rule.ruleId}>{rule.ruleId} · {rule.dsl}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function TraceRow({ row, state, focused, register }: { row: Row; state: FormState; focused: boolean; register: (element: HTMLElement | null) => void }) {
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? (focused || row.staticStatus === "FAILED" || row.browser.status === "FAILED");
  const staticBadge = STATIC_BADGE[row.staticStatus];
  const browser = browserBadge(row);
  const counterexamples = row.findings.filter((finding) => finding.counterexample);
  const fullEvidence = evidenceFor(state.runs, row.browser.runId, row.browser.probeKeys);
  const diagnosticEvidence = row.browser.diagnostic ? evidenceFor(state.runs, row.browser.diagnostic.runId, row.browser.diagnostic.probeKeys) : [];
  const fieldLabel = (key: string | null) => (key ? ((state.claimSet?.fields ?? []).find((field) => field.key === key)?.label ?? key) : "");
  const seeded = state.version?.createdVia === "template" && row.staticStatus === "FAILED";
  const detailsId = `trace-details-${row.claimKey}`;

  return (
    <li
      ref={register}
      data-trace-claim={row.claimKey}
      data-static={row.staticStatus}
      data-browser={row.browser.status}
      className={`scroll-mt-4 rounded-xl border p-3 ${row.staticStatus === "FAILED" || row.browser.status === "FAILED" ? "border-fail/50 bg-fail/5" : "border-line bg-canvas/60"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 data-trace-heading tabIndex={-1} className="font-mono text-xs text-lavender outline-none focus-visible:ring-2 focus-visible:ring-sapphire">{row.claimKey}</h4>
        <span className="flex flex-wrap gap-1.5">
          <StatusBadge status={staticBadge.status} label={staticBadge.label} />
          <StatusBadge status={browser.status} label={browser.label} />
        </span>
      </div>
      <p className="mt-1.5 text-sm">{row.statement}</p>

      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] [&>dd]:break-words gap-x-3 gap-y-1 text-xs">
        <dt className="text-ink-muted">Rule</dt>
        <dd className="font-mono">
          {row.ruleCoverage === "manual"
            ? "— manual check, no rule"
            : row.ruleCoverage === "base_setting"
              ? "— field settings (no conditional rule needed)"
              : row.ruleCoverage === "missing"
                ? <span className="text-fail">Missing: no generated rule implements this claim</span>
                : row.rules.map((rule) => <span key={rule.ruleId} className="block">{rule.dsl}</span>)}
        </dd>
        <dt className="text-ink-muted">Evidence</dt>
        <dd className="font-mono">
          {fullEvidence.length > 0
            ? fullEvidence.map((item) => <span key={item.probeKey} className="block">{item.probeKey}{item.kaneRunId ? ` · Kane ${item.kaneRunId.slice(0, 8)}` : " · not run"}</span>)
            : diagnosticEvidence.length > 0
              ? diagnosticEvidence.map((item) => <span key={item.probeKey} className="block">{item.probeKey} (diagnostic){item.kaneRunId ? ` · Kane ${item.kaneRunId.slice(0, 8)}` : ""}</span>)
              : "— no browser run yet"}
        </dd>
      </dl>

      <button type="button" aria-expanded={open} aria-controls={detailsId} onClick={() => setToggled(!open)} className="mt-2 flex items-center gap-1 text-xs text-lavender">
        <ChevronDown aria-hidden="true" className={`size-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        {open ? "Hide trace details" : "Show trace details"}
      </button>

      {open ? (
        <div id={detailsId} className="mt-2 flex flex-col gap-3 border-t border-line pt-3 text-xs">
          <div>
            <p className="font-medium text-ink-muted">Source sentence</p>
            {row.source ? (
              <p className="mt-1 flex items-start gap-1.5 text-sm" data-testid="trace-source">
                <Quote aria-hidden="true" className="mt-0.5 size-3 shrink-0 text-ink-muted" />
                <span>
                  “{row.source.quote}”
                  {row.source.start !== null && row.source.end !== null ? <span className="block text-xs text-ink-muted">Characters {row.source.start}–{row.source.end} of the original requirement</span> : null}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-ink-muted">Not linked to a sentence of the original requirement.</p>
            )}
          </div>

          {row.expectationDsl ? (
            <div data-testid="trace-expectation">
              <p className="font-medium text-ink-muted">Expectation source: approved claim {row.claimKey}</p>
              <p className="mt-1 font-mono text-sm">{row.expectationDsl}</p>
              <p className="mt-1 text-ink-muted">Probe expectations are derived from this approved claim, not from the generated rule.</p>
            </div>
          ) : null}

          {row.rules.length > 0 ? (
            <div>
              <p className="font-medium text-ink-muted">Generated rule under test</p>
              {row.rules.map((rule) => (
                <p key={rule.ruleId} className="mt-1 font-mono">
                  <span className="text-sm">{rule.dsl}</span>
                  <span className={`ml-2 ${rule.status === "conflicting" ? "text-fail" : "text-ink-muted"}`}>{rule.ruleId} · {RULE_STATUS_TEXT[rule.status]}</span>
                </p>
              ))}
            </div>
          ) : null}

          {row.boundary.length > 0 && row.controller ? (
            <table className="w-full text-left" data-testid="trace-boundary">
              <caption className="pb-1 text-left font-medium text-ink-muted">Boundary check for {fieldLabel(row.field)}</caption>
              <thead>
                <tr className="text-ink-muted">
                  <th scope="col" className="py-1 font-normal">{row.controller.label}</th>
                  <th scope="col" className="font-normal">Approved claim</th>
                  <th scope="col" className="font-normal">Generated form</th>
                  <th scope="col" className="font-normal"><span className="sr-only">Agreement</span></th>
                </tr>
              </thead>
              <tbody>
                {row.boundary.map((point) => (
                  <tr key={point.value} className={`border-t border-line ${point.agrees ? "" : "text-fail"}`}>
                    <td className="py-1 font-mono">{point.value}</td>
                    <td>{behaviorText(point.expected)}</td>
                    <td>{behaviorText(point.implemented)}</td>
                    <td>{point.agrees ? "agrees" : "differs"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {counterexamples.length > 0 ? (
            <div className="rounded-lg border border-fail/40 bg-fail/5 p-3" data-testid="trace-discrepancy">
              <p className="font-medium text-fail">Claim-to-rule discrepancy</p>
              {seeded ? <p className="mt-1 font-medium text-warn">Seeded defect for demonstration</p> : null}
              {counterexamples.map((finding) => {
                const cex = finding.counterexample!;
                const witness = Object.entries(cex.assignment).map(([key, value]) => `${fieldLabel(key)} = ${value || "(empty)"}`).join(", ") || "initial state";
                return (
                  <dl key={finding.key} className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] [&>dd]:break-words gap-x-3 gap-y-1">
                    <dt className="text-ink-muted">Counterexample</dt>
                    <dd className="font-mono">{witness}</dd>
                    <dt className="text-ink-muted">Approved claim</dt>
                    <dd>{fieldLabel(cex.field)} {behaviorText(cex.expected)}</dd>
                    <dt className="text-ink-muted">Generated rule</dt>
                    <dd className="text-fail">{fieldLabel(cex.field)} {behaviorText(cex.actual)}</dd>
                  </dl>
                );
              })}
              {row.rules.length > 0 && row.expectationDsl ? (
                <p className="mt-2">
                  {counterexamples[0]!.counterexample!.boundary ? `${fieldLabel(counterexamples[0]!.counterexample!.boundary.field)} = ${counterexamples[0]!.counterexample!.boundary.value} is the witness` : "The witness above separates"} for approved <span className="font-mono">{row.expectationDsl.split(" → ")[0]}</span> versus generated <span className="font-mono">{row.rules[0]!.dsl.split(" → ")[0]}</span>.
                </p>
              ) : null}
              <p className="mt-2">
                Source reference: the mismatch maps to approved claim {row.claimKey}
                {row.source ? ", which comes from the source sentence above." : "."}
              </p>
              <p className="mt-2 text-ink-muted" data-testid="trace-consequence">
                {row.browser.diagnostic?.outcome === "MISMATCH_OBSERVED"
                  ? `Observed in a real browser (diagnostic Kane CLI run): ${diagnosticEvidence.flatMap((item) => item.mismatches.map((mismatch) => `${mismatch.key} expected ${mismatch.expected}, observed ${mismatch.observed}`)).join("; ") || "the observation differed from the approved claim"}. `
                  : "Not yet observed in a browser: this is a static finding. "}
                {consequence(counterexamples[0]!.counterexample!, fieldLabel(counterexamples[0]!.counterexample!.field))} No applicant rejection was observed, and NIARVA does not claim one.
              </p>
            </div>
          ) : null}

          <p className="text-ink-muted" data-testid="trace-browser-note">
            {row.browser.status === "VERIFIED"
              ? "Browser proof: every probe covering this claim passed in the latest full Kane CLI run for this exact version."
              : row.browser.status === "FAILED" && row.staticStatus === "PASS"
                ? "The generated rule matches the approved claim, but the browser behaved differently. The approved claim decides, so this is a failure."
                : row.browser.status === "MANUAL"
                  ? "Manual check: NIARVA does not verify this automatically and never reports it as verified."
                  : row.staticStatus === "PASS"
                    ? "Static match only. A structural match between rule and claim is not browser proof; this claim is not yet verified in a browser."
                    : "Not verified: browser proof requires static checks to pass and a full Kane CLI run for this exact version."}
          </p>
        </div>
      ) : null}
    </li>
  );
}
