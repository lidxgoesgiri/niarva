"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge, type StatusKind } from "@/components/composites/status-badge";
import { Button } from "@/components/ui/button";
import { api, ClientApiError } from "./api";

export type FormListEntry = { id: string; title: string; slug: string; status: "draft" | "published" | "closed" | "archived" };

const statusOf: Record<FormListEntry["status"], StatusKind> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  closed: "BLOCKED",
  archived: "BLOCKED",
};

/** The creator's forms. Drafts can be deleted after an explicit confirmation; showcase lists are read-only. */
export function FormList({ forms, label, canDelete = false }: { forms: FormListEntry[]; label: string; canDelete?: boolean }) {
  return (
    <ul className="grid gap-3" aria-label={label}>
      {forms.map((form) => (
        <FormRow key={form.id} form={form} canDelete={canDelete && form.status === "draft"} />
      ))}
    </ul>
  );
}

function FormRow({ form, canDelete }: { form: FormListEntry; canDelete: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      await api(`/api/v1/forms/${form.id}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ClientApiError ? caught.message : "The draft could not be deleted.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <li className="rounded-xl border border-line bg-elevated transition-colors hover:border-line-active" data-testid="form-row" data-form-status={form.status}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link href={`/app/forms/${form.id}`} className="min-w-0 flex-1">
          <span className="block truncate font-medium">{form.title}</span>
          <span className="block font-mono text-xs text-ink-muted">/f/{form.slug}</span>
        </Link>
        <span className="flex items-center gap-2">
          <StatusBadge status={statusOf[form.status]} />
          {canDelete && !confirming ? (
            <Button size="sm" variant="ghost" aria-label={`Delete draft ${form.title}`} onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </Button>
          ) : null}
        </span>
      </div>
      {confirming ? (
        <div role="group" aria-label={`Confirm deleting ${form.title}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
          <p>Delete this draft? Any queued verification is canceled. The draft disappears from your forms; its versions and audit trail are kept.</p>
          <span className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={deleting} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" disabled={deleting} onClick={remove}>
              {deleting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
              Delete draft
            </Button>
          </span>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="border-t border-line px-5 py-2 text-sm text-fail">
          {error}
        </p>
      ) : null}
    </li>
  );
}
