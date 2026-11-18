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
      <div>
        <h1 className="text-3xl">Your forms</h1>
        <p className="mt-1 text-sm text-ink-muted">Each form is published only after its exact version is proven in a real browser.</p>
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
