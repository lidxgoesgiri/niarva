"use client";

import { liveState, validateSubmission, type Field, type FormDefinition } from "@niarva/core";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";

type Raw = Record<string, string | boolean>;

export type RendererProps = {
  definition: FormDefinition;
  versionNo: number;
  pageIdentity: string;
  submitUrl: string;
  /** Preview submissions carry a scoped token; public submissions carry the version they were made against. */
  previewToken?: string;
  formVersionId?: string;
  /** Text shown in the footer before the version code (public proof label or preview notice). */
  footerNote: string;
};

function newSubmissionId(): string {
  return crypto.randomUUID();
}

/**
 * The single renderer for preview and public forms. A hidden field is removed from the page and
 * its value is discarded, so it can never be submitted; the server validates everything again.
 */
export function FormRenderer({ definition, versionNo, pageIdentity, submitUrl, previewToken, formVersionId, footerNote }: RendererProps) {
  const [raw, setRaw] = useState<Raw>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const submissionId = useRef<string>(newSubmissionId());

  const state = useMemo(() => liveState(definition, raw), [definition, raw]);

  function update(field: Field, value: string | boolean) {
    setRaw((current) => {
      const next = { ...current, [field.key]: value };
      // Discard values of fields that this change hides (and of fields hidden in turn).
      const visible = liveState(definition, next);
      for (const other of definition.fields) if (!visible.get(other.key)?.visible) delete next[other.key];
      return next;
    });
    if (errors[field.key]) setErrors(({ [field.key]: _removed, ...rest }) => rest);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    const visibleAnswers: Raw = {};
    for (const field of definition.fields) {
      if (state.get(field.key)?.visible && raw[field.key] !== undefined) visibleAnswers[field.key] = raw[field.key] as string | boolean;
    }
    const check = validateSubmission(definition, visibleAnswers);
    if (!check.ok) {
      setErrors(Object.fromEntries(Object.entries(check.errors).map(([key, error]) => [key, error.message])));
      const first = Object.keys(check.errors)[0];
      if (first) document.getElementById(`field-${first}`)?.focus();
      return;
    }
    setPending(true);
    try {
      const response = await fetch(submitUrl, {
        method: "POST",
        headers: { "content-type": "application/json", ...(previewToken ? { "x-preview-token": previewToken } : {}) },
        body: JSON.stringify(
          previewToken
            ? { submissionId: submissionId.current, answers: visibleAnswers }
            : { submissionId: submissionId.current, formVersionId, answers: visibleAnswers },
        ),
      });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.receiptCode) {
        setReceipt(body.receiptCode);
        return;
      }
      if (body?.error?.fieldErrors) setErrors(body.error.fieldErrors);
      setFormError(body?.error?.message ?? "The response could not be sent. Try again.");
    } catch {
      setFormError("The response could not be sent. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const footer = (
    <footer className="mt-10 border-t border-line pt-4 text-xs text-ink-muted" data-testid="form-footer">
      {footerNote} · Version {versionNo} · {pageIdentity}
    </footer>
  );

  if (receipt) {
    return (
      <div className="w-full max-w-xl">
        <section role="status" aria-live="polite" className="rounded-2xl border border-pass/40 bg-pass/10 p-6" data-testid="confirmation">
          <p className="flex items-center gap-2 text-lg font-semibold text-ink">
            <CircleCheck aria-hidden="true" className="size-5 text-pass" />
            {definition.settings.successMessage ?? "Thank you. Your response has been recorded."}
          </p>
          <p className="mt-3 text-ink">
            Receipt code: <span className="font-mono text-lg tracking-widest" data-testid="receipt-code">{receipt}</span>
          </p>
          <p className="mt-2 text-sm text-ink-muted">Keep this code as proof that your response was received.</p>
        </section>
        {footer}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <h1 className="text-3xl">{definition.title}</h1>
      {definition.description ? <p className="mt-2 text-ink-muted">{definition.description}</p> : null}
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6" aria-busy={pending}>
        {definition.fields.map((field) => {
          const behavior = state.get(field.key);
          if (!behavior?.visible) return null;
          return (
            <FieldControl
              key={field.key}
              field={field}
              required={behavior.required}
              value={raw[field.key]}
              error={errors[field.key]}
              onChange={(value) => update(field, value)}
            />
          );
        })}
        {formError ? (
          <p role="alert" className="rounded-lg border border-fail/40 bg-fail/10 px-4 py-3 text-sm text-ink">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cta px-6 font-medium text-cta-fg hover:bg-cta-hover disabled:opacity-60"
        >
          {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
          {definition.settings.submitLabel ?? "Submit"}
        </button>
      </form>
      {footer}
    </div>
  );
}

function FieldControl({
  field,
  required,
  value,
  error,
  onChange,
}: {
  field: Field;
  required: boolean;
  value: string | boolean | undefined;
  error?: string;
  onChange: (value: string | boolean) => void;
}) {
  const id = `field-${field.key}`;
  const describedBy = [field.helpText ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const inputClass =
    "mt-2 w-full min-h-12 rounded-lg border border-line-strong bg-canvas px-3 text-base text-ink aria-[invalid=true]:border-fail";
  const label = (
    <>
      {field.label}
      {required ? <span className="ml-1 font-normal text-ink-muted">(required)</span> : null}
    </>
  );

  return (
    <div data-field={field.key}>
      {field.type === "checkbox" ? (
        <label htmlFor={id} className="flex min-h-11 items-center gap-3 font-medium">
          <input
            id={id}
            type="checkbox"
            className="size-5 accent-[var(--color-sapphire)]"
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
          />
          <span>{label}</span>
        </label>
      ) : (
        <>
          <label htmlFor={id} className="block font-medium">
            {label}
          </label>
          {field.type === "single_select" ? (
            <select id={id} className={inputClass} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={describedBy}>
              <option value="">Choose an option</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === "long_text" ? (
            <textarea id={id} className={`${inputClass} min-h-32 py-2`} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
          ) : (
            <input
              id={id}
              type={field.type === "email" ? "email" : "text"}
              inputMode={field.type === "number" ? "decimal" : field.type === "email" ? "email" : "text"}
              autoComplete="off"
              placeholder={field.placeholder}
              className={inputClass}
              value={typeof value === "string" ? value : ""}
              onChange={(event) => onChange(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy}
            />
          )}
        </>
      )}
      {field.helpText ? (
        <p id={`${id}-help`} className="mt-1 text-sm text-ink-muted">
          {field.helpText}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-fail" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
