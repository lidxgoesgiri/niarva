import { requireActor } from "@/server/context/session";
import { json, route } from "@/server/http/route";
import { getFormState } from "@/server/services/state.service";

export const dynamic = "force-dynamic";

export const GET = route<{ formId: string }>(async (request, { formId }) => {
  const actor = await requireActor(request.headers);
  return json(await getFormState(actor, formId));
});
