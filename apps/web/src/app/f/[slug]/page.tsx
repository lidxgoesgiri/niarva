import { formDefinitionSchema, pageIdentity } from "@niarva/core";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormRenderer } from "@/features/form-renderer/form-renderer";
import { publicForm } from "@/server/services/publish.service";

export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9-]{3,60}$/;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = SLUG.test(slug) ? await publicForm(slug) : null;
  return { title: data?.version ? data.form.title : "Form" };
}

/** Public form for respondents. Always renders the immutable published version. */
export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const data = await publicForm(slug);
  if (!data) notFound();
  if (!data.publication || !data.version) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5">
        <h1 className="text-2xl">This form is not accepting responses</h1>
        <p className="mt-2 text-ink-muted">It has not been published yet, or it was closed by its owner.</p>
      </main>
    );
  }
  const definition = formDefinitionSchema.parse(data.version.definition);
  const verified = data.label?.kind === "FULLY_VERIFIED";
  const date = data.label?.verifiedAt
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(data.label.verifiedAt)
    : null;
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center px-5 py-12">
      <p className="mb-8 inline-flex max-w-xl items-center gap-2 self-center rounded-full border border-line bg-elevated px-3 py-1 text-xs text-ink-muted">
        {verified ? <ShieldCheck aria-hidden="true" className="size-3.5 text-pass" /> : <ShieldAlert aria-hidden="true" className="size-3.5 text-warn" />}
        {verified
          ? `Checked automatically and tested in a real browser by NIARVA${date ? ` (${date})` : ""}`
          : "Browser proof needs to be re-run after a system update"}
      </p>
      <FormRenderer
        definition={definition}
        versionNo={data.version.versionNo}
        pageIdentity={pageIdentity(data.version.definitionHash)}
        submitUrl={`/api/v1/public/forms/${slug}/submissions`}
        formVersionId={data.version.id}
        footerNote={verified ? "Verified version" : "Proof stale"}
      />
    </main>
  );
}
