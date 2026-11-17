"use client";

import type { Claim, ClaimSetContent } from "@niarva/core";
import { CircleAlert, Lock, Quote } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/composites/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { FormState } from "@/server/services/state.service";

type ClaimView = NonNullable<FormState["claimSet"]>["claims"][number];

const KIND_LABEL: Record<Claim["kind"], string> = {
  FIELD: "Field",
  VISIBLE_WHEN: "Shown when",
  REQUIRED_WHEN: "Required when",
  CONSTRAINT: "Constraint",
  MANUAL: "Manual check",
};

/** Approved intent: the creator reviews deterministic statements, not AI prose, and approves them explicitly. */
export function IntentPanel({
  state,
  busy,
  onAction,
}: {
  state: FormState;
  busy: boolean;
  onAction: (path: string, body?: unknown, method?: string) => Promise<boolean>;
}) {
  const claimSet = state.claimSet;
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  if (!claimSet) return <p className="text-sm text-ink-muted">No claims yet.</p>;
  const draft = claimSet.status === "draft";

  async function resolve(claim: ClaimView, choice: string) {
    if (!claimSet?.content) return;
    const content: ClaimSetContent = {
      ...claimSet.content,
      claims: claimSet.content.claims.map((candidate) => {
        if (candidate.key !== claim.key) return candidate;
        const resolved = { ...candidate, reviewState: "edited" as const, ambiguity: candidate.ambiguity ? { ...candidate.ambiguity, resolvedChoice: choice } : undefined };
        if ((resolved.kind === "VISIBLE_WHEN" || resolved.kind === "REQUIRED_WHEN") && resolved.when.kind === "cmp" && /exclude/i.test(choice)) {
          const op = resolved.when.op === "gte" ? "gt" : resolved.when.op === "lte" ? "lt" : resolved.when.op;
          return { ...resolved, when: { ...resolved.when, op } };
        }
        if ((resolved.kind === "VISIBLE_WHEN" || resolved.kind === "REQUIRED_WHEN") && resolved.when.kind === "cmp" && /include/i.test(choice)) {
          const op = resolved.when.op === "gt" ? "gte" : resolved.when.op === "lt" ? "lte" : resolved.when.op;
          return { ...resolved, when: { ...resolved.when, op } };
        }
        return resolved;
      }),
    };
    await onAction(`/api/v1/forms/${state.form.id}/claims`, { revision: claimSet.revision, content }, "PATCH");
  }

  async function reject(claim: ClaimView) {
    if (!claimSet?.content) return;
    const content = { ...claimSet.content, claims: claimSet.content.claims.map((candidate) => (candidate.key === claim.key ? { ...candidate, reviewState: "rejected" as const } : candidate)) };
    await onAction(`/api/v1/forms/${state.form.id}/claims`, { revision: claimSet.revision, content }, "PATCH");
  }

  async function saveJson() {
    setJsonError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonError("This is not valid JSON.");
      return;
    }
    if (await onAction(`/api/v1/forms/${state.form.id}/claims`, { revision: claimSet!.revision, content: parsed }, "PATCH")) setJsonOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={draft ? "NEEDS_REVIEW" : "VERIFIED"} label={draft ? "Awaiting your approval" : `Approved · revision ${claimSet.versionNo}`} />
        <span className="text-xs text-ink-muted">Source: {claimSet.origin === "template" ? "template" : claimSet.origin === "ai" ? "AI draft (reviewed by you)" : "manual"}</span>
      </div>

      {claimSet.sourcePrompt ? (
        <figure className="rounded-xl border border-line bg-canvas/60 p-4">
          <figcaption className="text-xs font-medium uppercase tracking-wide text-ink-muted">Original requirement</figcaption>
          <blockquote className="mt-2 text-sm leading-relaxed text-ink">{claimSet.sourcePrompt}</blockquote>
        </figure>
      ) : null}

      <ul className="flex flex-col gap-3" aria-label="Claims">
        {claimSet.claims.map((claim) => (
          <li key={claim.key} data-claim={claim.key} className={`rounded-xl border p-4 ${claim.reviewState === "rejected" ? "border-line opacity-60" : claim.staticStatus === "FAILED" ? "border-fail/50 bg-fail/5" : "border-line bg-canvas/60"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-lavender">{claim.key}</span>
              <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink-muted">{KIND_LABEL[claim.kind]}</span>
              {claim.reviewState === "needs_review" ? <StatusBadge status="NEEDS_REVIEW" /> : null}
              {claim.reviewState === "rejected" ? <StatusBadge status="CANCELED" label="Rejected" /> : null}
              {claim.staticStatus === "PASS" ? <StatusBadge status="STATIC_PASS" label="Static pass" /> : null}
              {claim.staticStatus === "FAILED" ? <StatusBadge status="FAILED" label="Mismatch" /> : null}
              {claim.staticStatus === "UNKNOWN" ? <StatusBadge status="UNKNOWN" /> : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink">{claim.statement}</p>
            {claim.sourceQuote ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-muted"><Quote aria-hidden="true" className="mt-0.5 size-3 shrink-0" />{claim.sourceQuote}</p>
            ) : null}
            {draft && claim.ambiguity && !claim.ambiguity.resolvedChoice ? (
              <div className="mt-3 rounded-lg border border-warn/40 bg-warn/10 p-3">
                <p className="flex items-start gap-2 text-sm text-ink"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warn" />{claim.ambiguity.question}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {claim.ambiguity.choices.map((choice) => (
                    <Button key={choice} size="sm" variant="secondary" disabled={busy} onClick={() => (/remove/i.test(choice) ? reject(claim) : resolve(claim, choice))}>{choice}</Button>
                  ))}
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {draft && claimSet.problems.length > 0 ? (
        <div role="status" className="rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
          <p className="font-medium text-ink">Resolve before approving</p>
          <ul className="mt-2 list-disc pl-5 text-ink-muted">{claimSet.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
        </div>
      ) : null}

      {draft ? (
        <div className="flex flex-col gap-2">
          <Button disabled={busy || claimSet.problems.length > 0} onClick={() => onAction(`/api/v1/forms/${state.form.id}/claims/approve`, { revision: claimSet.revision })}>
            Approve claims
          </Button>
          <p className="text-xs text-ink-muted">Approval freezes this meaning. Every form version and every proof is checked against it.</p>
          <button type="button" className="self-start text-xs text-lavender underline underline-offset-4" onClick={() => { setJsonText(JSON.stringify(claimSet.content, null, 2)); setJsonOpen((open) => !open); }}>
            {jsonOpen ? "Close the advanced editor" : "Edit claims as JSON (advanced)"}
          </button>
          {jsonOpen ? (
            <div className="flex flex-col gap-2">
              <Textarea aria-label="Claims JSON" className="min-h-64 font-mono text-xs" value={jsonText} onChange={(event) => setJsonText(event.target.value)} />
              {jsonError ? <p role="alert" className="text-sm text-fail">{jsonError}</p> : null}
              <Button size="sm" variant="secondary" disabled={busy} onClick={saveJson}>Save draft claims</Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-canvas/60 p-3">
          <p className="flex items-center gap-2 text-xs text-ink-muted"><Lock aria-hidden="true" className="size-3.5" />Approved claims hash</p>
          <code className="break-all font-mono text-xs text-ink" data-testid="claims-hash">{claimSet.claimsHash}</code>
          <Button size="sm" variant="ghost" className="self-start" disabled={busy} onClick={() => onAction(`/api/v1/forms/${state.form.id}/claims/revise`, {})}>
            Start a new claims revision
          </Button>
        </div>
      )}
    </div>
  );
}
