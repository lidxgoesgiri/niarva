import { reviseClaims } from "@/server/services/intent.service";
import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const POST = route<{ formId: string }>(async (request, { formId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  return json(await reviseClaims(actor, formId, requestId));
});
