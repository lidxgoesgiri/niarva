import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Workspace } from "@/features/workspace/workspace";
import { getActor } from "@/server/context/session";
import { ApiError } from "@/server/http/errors";
import { isUuid } from "@/server/ids";
import { getFormState } from "@/server/services/state.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Form workspace" };

export default async function FormWorkspacePage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const actor = await getActor();
  if (!actor) redirect(`/sign-in?next=${encodeURIComponent(`/app/forms/${formId}`)}`);
  if (!isUuid(formId)) notFound();
  const state = await getFormState(actor, formId).catch((error: unknown) => {
    if (error instanceof ApiError && error.code === "NOT_FOUND") return null;
    throw error;
  });
  if (!state) notFound();
  return <Workspace initial={JSON.parse(JSON.stringify(state))} />;
}
