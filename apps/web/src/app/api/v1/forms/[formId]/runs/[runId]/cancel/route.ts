import { cancelRun } from "@/server/services/verification.service";
import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const POST = route<{ formId: string; runId: string }>(async (request, { formId, runId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  return json(await cancelRun(actor, formId, runId, requestId));
});
