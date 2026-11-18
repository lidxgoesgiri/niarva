import { updateClaimsInput, updateDraftClaims } from "@/server/services/intent.service";
import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, readJson, route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const PATCH = route<{ formId: string }>(async (request, { formId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  return json(await updateDraftClaims(actor, formId, await readJson(request, updateClaimsInput), requestId));
});
