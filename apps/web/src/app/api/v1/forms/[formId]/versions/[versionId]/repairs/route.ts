import { proposeVersionRepairs } from "@/server/services/version.service";
import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const POST = route<{ formId: string; versionId: string }>(async (request, { formId, versionId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  return json(await proposeVersionRepairs(actor, formId, versionId, requestId));
});
