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
    <section aria-labelledby="new-form-heading" className="glass-card rounded-2xl p-5 sm:p-6">
      <h2 id="new-form-heading" className="text-xl">Start a new form</h2>
      <p className="mt-1 text-sm text-ink-muted">Three ways to start. Whatever you choose, nothing is approved or published for you.</p>
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative flex flex-col gap-3 rounded-xl border border-line-active/60 bg-gradient-to-b from-sapphire/10 to-canvas/60 p-4">
          <span className="absolute right-3 top-3 rounded-full border border-lavender/40 bg-lavender/10 px-2 py-0.5 text-[11px] text-lavender">Recommended</span>
          <p className="flex items-center gap-2.5 font-medium"><span className="grid size-8 place-items-center rounded-lg border border-line bg-raised/70"><FileText aria-hidden="true" className="size-4 text-lavender" /></span>Scholarship template</p>
          <p className="text-sm text-ink-muted">The golden case: name and GPA required; an achievement certificate when GPA is 3.5 or higher.</p>
          <Button className="mt-auto" disabled={pending !== null} onClick={() => create({ source: "template", template: "scholarship" }, "template")}>
            {pending === "template" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            Use scholarship template
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas/50 p-4 transition-colors hover:border-line-strong">
          <p className="flex items-center gap-2.5 font-medium"><span className="grid size-8 place-items-center rounded-lg border border-line bg-raised/70"><Sparkles aria-hidden="true" className="size-4 text-lavender" /></span>Describe it in plain language</p>
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

        <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas/50 p-4 transition-colors hover:border-line-strong">
          <p className="flex items-center gap-2.5 font-medium"><span className="grid size-8 place-items-center rounded-lg border border-line bg-raised/70"><PenLine aria-hidden="true" className="size-4 text-lavender" /></span>Start manually</p>
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
