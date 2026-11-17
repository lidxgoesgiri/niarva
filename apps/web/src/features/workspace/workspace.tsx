"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/composites/status-badge";
import { cn } from "@/lib/cn";
import type { FormState } from "@/server/services/state.service";
import { api, ClientApiError } from "./api";
import { FormPanel } from "./form-panel";
import { IntentPanel } from "./intent-panel";
import type { TraceFocus } from "./intent-trace";
import { VerifyPanel } from "./verify-panel";

type Stage = "intent" | "form" | "verify" | "responses";
const STAGES: { id: Stage; label: string }[] = [
  { id: "intent", label: "Intent" },
  { id: "form", label: "Form" },
  { id: "verify", label: "Verify & publish" },
  { id: "responses", label: "Responses" },
];

type Responses = { total: number; rows: { receiptCode: string; submittedAt: string; versionNo: number; answers: Record<string, unknown> }[] };

export function Workspace({ initial }: { initial: FormState }) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string; reasons?: string[] } | null>(null);
  const [stage, setStage] = useState<Stage>(initial.version ? "verify" : "intent");
  const [responses, setResponses] = useState<Responses | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [traceFocus, setTraceFocus] = useState<TraceFocus>(null);

  // Opens a claim's Intent Trace in the verification workspace (a tab below xl, a column on xl).
  const openTrace = useCallback((claimKey: string) => {
    setStage("verify");
    setTraceFocus({ claimKey, nonce: Date.now() });
  }, []);

  const refresh = useCallback(async () => {
    try {
      setState(await api<FormState>(`/api/v1/forms/${initial.form.id}`));
    } catch {
      // Keep the last known state; the next poll retries.
    }
  }, [initial.form.id]);

  const active = state.runs.some((run) => run.state === "QUEUED" || run.state === "RUNNING");
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [active, refresh]);

  useEffect(() => {
    if (stage !== "responses") return;
    api<Responses>(`/api/v1/forms/${initial.form.id}/responses`).then(setResponses).catch(() => setResponses({ total: 0, rows: [] }));
  }, [stage, initial.form.id, state.responses]);

  const onAction = useCallback(
    async (path: string, body?: unknown, method = "POST") => {
      setBusy(true);
      setMessage(null);
      try {
        const result = await api<{ cached?: boolean }>(path, { method, body: body ?? {} });
        if (result && result.cached) setMessage({ tone: "info", text: "This exact version already has fresh browser proof; the existing result is shown." });
        await refresh();
        return true;
      } catch (error) {
        if (error instanceof ClientApiError) setMessage({ tone: "error", text: error.message, reasons: error.reasons });
        else setMessage({ tone: "error", text: "Something went wrong. Try again." });
        await refresh();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const panel = (id: Stage) => {
    switch (id) {
      case "intent":
        return <IntentPanel state={state} busy={busy} onAction={onAction} onOpenTrace={state.intentTrace ? openTrace : undefined} />;
      case "form":
        return <FormPanel key={state.version?.id ?? "none"} state={state} busy={busy} onAction={onAction} />;
      case "verify":
        return <VerifyPanel state={state} busy={busy} onAction={onAction} traceFocus={traceFocus} />;
      case "responses":
        return <ResponsesPanel data={responses} />;
    }
  };

  const onTabKey = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = (index + (event.key === "ArrowRight" ? 1 : STAGES.length - 1)) % STAGES.length;
    setStage(STAGES[next]!.id);
    tabs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">Form</p>
          <h1 className="truncate text-2xl">{state.form.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {state.version ? <span className="rounded-md bg-raised px-2 py-1 font-mono text-xs">v{state.version.versionNo}</span> : null}
          {state.publication ? <StatusBadge status="PUBLISHED" /> : <StatusBadge status="DRAFT" />}
          {state.gate.eligible ? <StatusBadge status="VERIFIED" label="Ready to publish" /> : <StatusBadge status="BLOCKED" label="Not publishable" />}
        </div>
      </header>

      <div aria-live="polite" className="min-h-0">
        {message ? (
          <div role={message.tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", message.tone === "error" ? "border-fail/40 bg-fail/10" : "border-sapphire/40 bg-sapphire/10")}>
            <p>{message.text}</p>
            {message.reasons && message.reasons.length > 0 ? <ul className="mt-1 list-disc pl-5 text-ink-muted">{message.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
          </div>
        ) : null}
      </div>

      {/* Stage tabs: the only navigation below xl; on xl they switch the right-hand column. */}
      <div role="tablist" aria-label="Workspace stages" className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-elevated p-1 xl:hidden">
        {STAGES.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => { tabs.current[index] = element; }}
            role="tab"
            type="button"
            id={`tab-${item.id}`}
            aria-selected={stage === item.id}
            aria-controls={`panel-${item.id}`}
            tabIndex={stage === item.id ? 0 : -1}
            onKeyDown={(event) => onTabKey(event, index)}
            onClick={() => setStage(item.id)}
            className={cn("min-h-11 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors", stage === item.id ? "bg-raised text-ink" : "text-ink-muted hover:text-ink")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="xl:hidden" role="tabpanel" id={`panel-${stage}`} aria-labelledby={`tab-${stage}`}>
        <div className="rounded-2xl border border-line bg-elevated p-4 sm:p-5">{panel(stage)}</div>
      </div>

      <div className="hidden gap-4 xl:grid xl:grid-cols-[minmax(300px,1fr)_minmax(320px,1fr)_minmax(380px,1.25fr)]">
        <section aria-labelledby="col-intent" className="rounded-2xl border border-line bg-elevated p-5">
          <h2 id="col-intent" className="mb-4 text-lg">Intent &amp; claims</h2>
          {panel("intent")}
        </section>
        <section aria-labelledby="col-form" className="rounded-2xl border border-line bg-elevated p-5">
          <h2 id="col-form" className="mb-4 text-lg">Form</h2>
          {panel("form")}
        </section>
        <section aria-labelledby="col-verify" className="rounded-2xl border border-line bg-elevated p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 id="col-verify" className="text-lg">{stage === "responses" ? "Responses" : "Verification"}</h2>
            <button type="button" className="text-xs text-lavender underline underline-offset-4" onClick={() => setStage(stage === "responses" ? "verify" : "responses")}>
              {stage === "responses" ? "Back to verification" : `Responses (${state.responses})`}
            </button>
          </div>
          {stage === "responses" ? panel("responses") : panel("verify")}
        </section>
      </div>
    </div>
  );
}

function ResponsesPanel({ data }: { data: Responses | null }) {
  if (!data) return <p className="text-sm text-ink-muted">Loading responses…</p>;
  if (data.total === 0) return <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">No responses yet. They appear here after the form is published.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Responses</caption>
        <thead><tr className="text-xs text-ink-muted"><th className="py-2 font-normal">Receipt</th><th className="font-normal">Submitted</th><th className="font-normal">Version</th><th className="font-normal">Answers</th></tr></thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.receiptCode} className="border-t border-line align-top">
              <td className="py-2 font-mono">{row.receiptCode}</td>
              <td className="whitespace-nowrap pr-3">{new Date(row.submittedAt).toLocaleString()}</td>
              <td>v{row.versionNo}</td>
              <td className="font-mono text-xs">{Object.entries(row.answers).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
