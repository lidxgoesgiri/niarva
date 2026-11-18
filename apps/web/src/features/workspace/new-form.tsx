"use client";

import { FileText, LoaderCircle, PenLine, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { api, ClientApiError } from "./api";

/** The server refuses shorter AI prompts (`createFormInput`, 20 characters after trimming). */
const MIN_PROMPT = 20;

/** Three honest ways to start: the labeled template, AI drafting (when configured), or manual entry. */
export function NewForm({ aiConfigured }: { aiConfigured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const promptLength = prompt.trim().length;
  const promptTooShort = promptLength < MIN_PROMPT;

  async function create(body: unknown, key: string) {
    setPending(key);
    setError(null);
    try {
      const { formId } = await api<{ formId: string }>("/api/v1/forms", { method: "POST", body });
      router.push(`/app/forms/${formId}`);
    } catch (caught) {
      setError(caught instanceof ClientApiError ? caught.message : "The form could not be created.");
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="new-form-heading" className="rounded-2xl border border-line bg-elevated p-5 sm:p-6">
      <h2 id="new-form-heading" className="text-xl">Start a new form</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas/60 p-4">
          <p className="flex items-center gap-2 font-medium"><FileText aria-hidden="true" className="size-4 text-lavender" />Scholarship template</p>
          <p className="text-sm text-ink-muted">The golden case: name and GPA required; an achievement certificate when GPA is 3.5 or higher.</p>
          <Button variant="secondary" className="mt-auto" disabled={pending !== null} onClick={() => create({ source: "template", template: "scholarship" }, "template")}>
            {pending === "template" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            Use scholarship template
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas/60 p-4">
          <p className="flex items-center gap-2 font-medium"><Sparkles aria-hidden="true" className="size-4 text-lavender" />Describe it in plain language</p>
          <Label htmlFor="ai-prompt" className="sr-only">Describe the form</Label>
          <Textarea id="ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Create an event registration. Email is required…" maxLength={4000} disabled={!aiConfigured} aria-describedby="ai-prompt-hint" />
          {!aiConfigured ? (
            <p id="ai-prompt-hint" className="text-xs text-warn">AI drafting is not configured on this deployment. Use the template or start manually.</p>
          ) : (
            <div id="ai-prompt-hint" className="flex flex-col gap-1 text-xs">
              <p className="text-ink-muted">AI drafts claims for your review. Nothing is approved automatically.</p>
              <p data-testid="ai-prompt-length" className={promptTooShort ? "text-warn" : "text-ink-muted"}>
                {promptTooShort ? `Describe the form in at least ${MIN_PROMPT} characters (${promptLength}/${MIN_PROMPT}).` : `${promptLength} characters. Ready to extract claims.`}
              </p>
            </div>
          )}
          <Button variant="secondary" className="mt-auto" disabled={!aiConfigured || pending !== null || promptTooShort} onClick={() => create({ source: "ai", prompt }, "ai")}>
            {pending === "ai" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            {pending === "ai" ? "Extracting claims…" : "Extract claims"}
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas/60 p-4">
          <p className="flex items-center gap-2 font-medium"><PenLine aria-hidden="true" className="size-4 text-lavender" />Start manually</p>
          <Label htmlFor="manual-title">Form title</Label>
          <Input id="manual-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
          <Button variant="secondary" className="mt-auto" disabled={pending !== null || title.trim() === ""} onClick={() => create({ source: "manual", title, prompt: "" }, "manual")}>
            {pending === "manual" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            Create blank form
          </Button>
        </div>
      </div>
      <div role="alert" aria-live="assertive" className="mt-4 min-h-5 text-sm text-fail">{error}</div>
    </section>
  );
}
