import { redirect } from "next/navigation";
import { EmptyState } from "@/components/composites/states";
import { FormList } from "@/features/workspace/form-list";
import { NewForm } from "@/features/workspace/new-form";
import { configuredModels } from "@/server/ai/extract-claims";
import { getEnv } from "@/server/config/env";
import { getActor } from "@/server/context/session";
import { listForms, listShowcaseForms } from "@/server/services/form.service";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const actor = await getActor();
  if (!actor) redirect("/sign-in?next=%2Fapp");
  const [forms, showcase] = await Promise.all([listForms(actor), listShowcaseForms(actor)]);
  const env = getEnv();
  const aiConfigured = Boolean(env.OPENROUTER_API_KEY && configuredModels().length > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-lavender">WORKSPACE</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Your forms</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">Each form is published only after its exact version is proven in a real browser.</p>
        </div>
        <dl className="flex gap-2" aria-label="Form summary">
          {[
            ["Forms", forms.length],
            ["Published", forms.filter((form) => form.status === "published").length],
            ["Drafts", forms.filter((form) => form.status === "draft").length],
          ].map(([label, value]) => (
            <div key={label} className="glass-card min-w-24 rounded-xl px-4 py-2.5">
              <dt className="text-xs text-ink-muted">{label}</dt>
              <dd className="font-heading text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {showcase.length > 0 ? (
        <section aria-labelledby="demo-examples" className="flex flex-col gap-3">
          <div>
            <h2 id="demo-examples" className="text-lg">Demo examples (read-only)</h2>
            <p className="mt-1 text-sm text-ink-muted">Synthetic forms with recorded proof from the live deployment. Open one to follow the golden case; create your own form below to try every step.</p>
          </div>
          <FormList forms={showcase} label="Demo examples" />
        </section>
      ) : null}

      <NewForm aiConfigured={aiConfigured} />

      {forms.length === 0 ? (
        <EmptyState
          title="No forms yet"
          description="Describe what your form must do. NIARVA turns it into reviewable claims, builds the form, and verifies it before you publish."
        />
      ) : (
        <FormList forms={forms} label="Forms" canDelete />
      )}
    </div>
  );
}
