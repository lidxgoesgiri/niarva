import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, route } from "@/server/http/route";
import { deleteDraftForm } from "@/server/services/form.service";
import { getFormState } from "@/server/services/state.service";

export const dynamic = "force-dynamic";

export const GET = route<{ formId: string }>(async (request, { formId }) => {
  const actor = await requireActor(request.headers);
  return json(await getFormState(actor, formId));
});

/** Deletes (archives) an unpublished draft of the signed-in owner. */
export const DELETE = route<{ formId: string }>(async (request, { formId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  return json(await deleteDraftForm(actor, formId, requestId));
});
