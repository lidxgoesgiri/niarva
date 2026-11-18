import { formDefinitionSchema, pageIdentity } from "@niarva/core";
import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormRenderer } from "@/features/form-renderer/form-renderer";
import { getActor } from "@/server/context/session";
import { getDb } from "@/server/db/client";
import { formVersions, forms } from "@/server/db/schema";
import { isUuid } from "@/server/ids";
import { issuePreviewToken, verifyPreviewToken } from "@/server/security/tokens";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

/**
 * Private, immutable preview of one form version: the page Kane observes. Access needs a token
 * scoped to this version (probe runs) or a session of the form's owner.
 */
export default async function PreviewPage({ params, searchParams }: { params: Promise<{ versionId: string }>; searchParams: Promise<{ t?: string | string[] }> }) {
  const { versionId } = await params;
  const { t } = await searchParams;
  if (!isUuid(versionId)) notFound();
  const db = await getDb();
  const [row] = await db.select({ version: formVersions, workspaceId: forms.workspaceId }).from(formVersions).innerJoin(forms, eq(forms.id, formVersions.formId)).where(and(eq(formVersions.id, versionId)));
  if (!row) notFound();

  let token = verifyPreviewToken(typeof t === "string" ? t : null, versionId) ? (t as string) : null;
  if (!token) {
    const actor = await getActor();
    if (!actor || actor.workspaceId !== row.workspaceId) notFound();
    token = issuePreviewToken(versionId, "creator", null).token;
  }
  const parsed = formDefinitionSchema.safeParse(row.version.definition);
  if (!parsed.success) {
    return (
      <main id="main" className="mx-auto max-w-xl px-5 py-16">
        <h1 className="text-2xl">This version cannot be rendered</h1>
        <p className="mt-2 text-ink-muted">It fails structural validation. Open the workspace to see why.</p>
      </main>
    );
  }
  return (
    <main id="main" className="flex min-h-dvh justify-center px-5 py-12">
      <FormRenderer
        definition={parsed.data}
        versionNo={row.version.versionNo}
        pageIdentity={pageIdentity(row.version.definitionHash)}
        submitUrl={`/api/v1/preview/${versionId}/submissions`}
        previewToken={token}
        footerNote="Preview · test submissions are kept separate from real responses"
      />
    </main>
  );
}
