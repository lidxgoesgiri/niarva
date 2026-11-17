import { redirect } from "next/navigation";
import { EmptyState } from "@/components/composites/states";
import { StatusBadge, type StatusKind } from "@/components/composites/status-badge";
import { getActor } from "@/server/context/session";
import { listForms } from "@/server/services/form.service";

export const dynamic = "force-dynamic";

const statusOf: Record<string, StatusKind> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  closed: "BLOCKED",
  archived: "BLOCKED",
};

export default async function WorkspacePage() {
  const actor = await getActor();
  if (!actor) redirect("/sign-in?next=%2Fapp");
  const forms = await listForms(actor);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Your forms</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Each form is published only after its exact version is proven in a real browser.
          </p>
        </div>
      </div>

      {forms.length === 0 ? (
        <EmptyState
          title="No forms yet"
          description="Describe what your form must do. NIARVA turns it into reviewable claims, builds the form, and verifies it before you publish."
        />
      ) : (
        <ul className="grid gap-3" aria-label="Forms">
          {forms.map((form) => (
            <li
              key={form.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-elevated px-5 py-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{form.title}</p>
                <p className="font-mono text-xs text-ink-muted">/f/{form.slug}</p>
              </div>
              <StatusBadge status={statusOf[form.status] ?? "DRAFT"} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
