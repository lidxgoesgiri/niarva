"use client";

import { CMP_OPS, renderCondition, type CmpOp, type FieldLike, type FormDefinition, type Rule } from "@niarva/core";
import { ExternalLink, FlaskConical, GitBranch } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/composites/status-badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { FormState } from "@/server/services/state.service";

const OP_SYMBOL: Record<CmpOp, string> = { eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤" };
const ORIGIN_TEXT: Record<string, string> = {
  skeleton: "generated from approved claims",
  template: "template with a seeded defect for demonstration",
  ai_generate: "AI generated",
  manual_edit: "edited by you",
  repair: "created by an approved repair",
};

/** Implementation view: the immutable version under test, with a small editor that always creates a new version. */
export function FormPanel({ state, busy, onAction }: { state: FormState; busy: boolean; onAction: (path: string, body?: unknown, method?: string) => Promise<boolean> }) {
  const version = state.version;
  const approved = state.claimSet?.status === "approved";
  const golden = state.claimSet?.origin === "template";
  // The workspace keys this panel by version id, so the editor resets whenever a new version arrives.
  const [draft, setDraft] = useState<FormDefinition | null>(() => (version ? (structuredClone(version.definition) as FormDefinition) : null));

  const fields = useMemo(() => new Map((draft?.fields ?? []).map((field) => [field.key, { key: field.key, type: field.type, label: field.label, options: field.options, precision: field.validation?.precision } satisfies FieldLike])), [draft]);
  const dirty = Boolean(draft && version && JSON.stringify(draft) !== JSON.stringify(version.definition));

  if (!version || !draft) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-muted">{approved ? "Generate the form from the approved claims." : "Approve the claims first. The form is always built against approved intent."}</p>
        <Button disabled={!approved || busy} onClick={() => onAction(`/api/v1/forms/${state.form.id}/generate`, { strategy: "skeleton" })}>Generate form</Button>
        {golden ? (
          <div className="rounded-xl border border-warn/40 bg-warn/10 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-ink"><FlaskConical aria-hidden="true" className="size-4 text-warn" />Seeded defect for demonstration</p>
            <p className="mt-1 text-xs text-ink-muted">Builds the scholarship form with <code className="font-mono">gpa &gt; 3.5</code> instead of the approved <code className="font-mono">gpa ≥ 3.5</code>, so you can watch NIARVA catch and repair it.</p>
            <Button size="sm" variant="secondary" className="mt-2" disabled={!approved || busy} onClick={() => onAction(`/api/v1/forms/${state.form.id}/generate`, { strategy: "seeded_demo" })}>Generate with the seeded defect</Button>
          </div>
        ) : null}
      </div>
    );
  }

  const setRule = (id: string, patch: (rule: Rule) => Rule) => setDraft((current) => (current ? { ...current, rules: current.rules.map((rule) => (rule.id === id ? patch(rule) : rule)) } : current));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-raised px-2 py-1 font-mono text-xs" data-testid="version-label">v{version.versionNo}</span>
        <span className="text-xs text-ink-muted">{ORIGIN_TEXT[version.createdVia] ?? version.createdVia}</span>
        {version.createdVia === "template" ? <StatusBadge status="BLOCKED" label="Seeded defect for demonstration" /> : null}
      </div>
      <p className="text-xs text-ink-muted">
        Page identity <code className="font-mono text-ink">{version.pageIdentity}</code> · {version.versionCount} version{version.versionCount === 1 ? "" : "s"} in history
      </p>
      <a href={`/preview/${version.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 self-start text-sm text-lavender underline underline-offset-4">
        Open preview <ExternalLink aria-hidden="true" className="size-3.5" />
      </a>

      <section aria-label="Fields" className="flex flex-col gap-3">
        {draft.fields.map((field) => (
          <div key={field.key} className="rounded-xl border border-line bg-canvas/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-ink-muted">{field.key} · {field.type}{field.visibility === "conditional" ? " · conditional" : ""}</span>
            </div>
            <Label htmlFor={`label-${field.key}`} className="mt-2 text-xs text-ink-muted">Label</Label>
            <Input id={`label-${field.key}`} className="mt-1 min-h-10" value={field.label} onChange={(event) => setDraft((current) => current && { ...current, fields: current.fields.map((other) => (other.key === field.key ? { ...other, label: event.target.value } : other)) })} />
            <label className="mt-2 flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={field.required} onChange={(event) => setDraft((current) => current && { ...current, fields: current.fields.map((other) => (other.key === field.key ? { ...other, required: event.target.checked } : other)) })} />
              Required{field.visibility === "conditional" ? " when shown" : ""}
            </label>
          </div>
        ))}
      </section>

      <section aria-label="Rules" className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><GitBranch aria-hidden="true" className="size-4 text-lavender" />Rules</h3>
        {draft.rules.length === 0 ? <p className="text-sm text-ink-muted">No conditional rules.</p> : null}
        {draft.rules.map((rule) => {
          const trace = state.analysis?.ruleTrace.find((entry) => entry.ruleId === rule.id);
          return (
            <div key={rule.id} data-rule={rule.id} className="rounded-xl border border-line bg-canvas/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-ink-muted">{rule.id}</span>
                {trace?.status === "supported" ? <StatusBadge status="STATIC_PASS" label={`Supports ${trace.servesClaims.join(", ")}`} /> : null}
                {trace?.status === "conflicting" ? <StatusBadge status="FAILED" label="Differs from approved claim" /> : null}
                {trace?.status === "unrequested" ? <StatusBadge status="BLOCKED" label="No claim asks for this" /> : null}
              </div>
              <p className="mt-2 text-sm">
                {rule.effect === "show" ? "Show" : "Require"} <strong>{fields.get(rule.target)?.label ?? rule.target}</strong> when {renderCondition(rule.when, fields)}
              </p>
              {rule.when.kind === "cmp" ? (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div>
                    <Label htmlFor={`op-${rule.id}`} className="text-xs text-ink-muted">Operator</Label>
                    <select id={`op-${rule.id}`} className="mt-1 min-h-10 rounded-lg border border-line-strong bg-canvas px-2 text-sm" value={rule.when.op} onChange={(event) => setRule(rule.id, (current) => (current.when.kind === "cmp" ? { ...current, when: { ...current.when, op: event.target.value as CmpOp } } : current))}>
                      {CMP_OPS.map((op) => <option key={op} value={op}>{OP_SYMBOL[op]} ({op})</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor={`value-${rule.id}`} className="text-xs text-ink-muted">Value</Label>
                    <Input id={`value-${rule.id}`} className="mt-1 min-h-10 w-28" value={rule.when.value} onChange={(event) => setRule(rule.id, (current) => (current.when.kind === "cmp" ? { ...current, when: { ...current.when, value: event.target.value } } : current))} />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      {dirty ? (
        <div className="flex flex-col gap-2 rounded-xl border border-sapphire/50 bg-sapphire/10 p-3">
          <p className="text-sm">Saving creates version v{version.versionNo + 1}. Its proof starts from zero; earlier proof never carries over.</p>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => onAction(`/api/v1/forms/${state.form.id}/versions`, { baseVersionId: version.id, definition: draft })}>Save as new version</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDraft(structuredClone(version.definition) as FormDefinition)}>Discard changes</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
