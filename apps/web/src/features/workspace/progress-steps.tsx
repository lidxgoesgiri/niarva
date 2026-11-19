import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FormState } from "@/server/services/state.service";

type Step = { key: "intent" | "form" | "verify" | "publish"; label: string; done: boolean };

/**
 * Where this form stands on the path from intent to a published, proven version, and the one thing
 * to do next (WS-UX-01). Derived only from the authoritative form state; it never claims more.
 */
export function ProgressSteps({ state }: { state: FormState }) {
  const version = state.version;
  const approved = state.claimSet?.status === "approved";
  const staticPass = state.analysis?.verdict === "PASS";
  const activeRun = state.runs.some((run) => run.state === "QUEUED" || run.state === "RUNNING");
  const proven = state.gate.eligible;
  const live = Boolean(state.publication && version && state.publication.versionId === version.id);

  const steps: Step[] = [
    { key: "intent", label: "Approve intent", done: approved },
    { key: "form", label: "Form passes static checks", done: Boolean(version) && staticPass },
    { key: "verify", label: "Proven in a browser", done: proven || live },
    { key: "publish", label: "Published", done: live },
  ];
  const current = steps.findIndex((step) => !step.done);

  let next: string;
  if (!approved) next = "Review the claims and approve them.";
  else if (!version) next = "Generate the form from the approved claims.";
  else if (!staticPass) next = "Static checks found a mismatch. Review the counterexample and approve a repair.";
  else if (activeRun) next = "Browser verification is running for this version.";
  else if (!proven && !live) next = `Run browser verification for v${version.versionNo}.`;
  else if (!live) next = `v${version.versionNo} is proven. Publish it.`;
  else next = `v${version.versionNo} is live at /f/${state.publication!.slug}.`;

  return (
    <nav aria-label="Progress" className="glass-card rounded-2xl px-4 py-3 sm:px-5" data-testid="progress-steps">
      <ol className="grid gap-2 sm:grid-cols-4">
        {steps.map((step, index) => {
          const isCurrent = index === current;
          return (
            <li key={step.key} aria-current={isCurrent ? "step" : undefined} className="flex items-center gap-2.5" data-step={step.key} data-done={step.done}>
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                  step.done ? "border-pass/50 bg-pass/15 text-pass" : isCurrent ? "border-lavender bg-lavender/15 text-lavender" : "border-line-strong text-ink-muted",
                )}
              >
                {step.done ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}
              </span>
              <span className={cn("text-sm", step.done || isCurrent ? "text-ink" : "text-ink-muted")}>
                {step.label}
                <span className="sr-only">{step.done ? " (done)" : isCurrent ? " (current)" : " (to do)"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2.5 border-t border-line pt-2.5 text-sm" data-testid="next-step">
        <span className="text-ink-muted">Next: </span>
        {next}
      </p>
    </nav>
  );
}
