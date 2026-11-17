import { requestVerification, requestVerificationInput } from "@/server/services/verification.service";
import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, readJson, route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const POST = route<{ formId: string; versionId: string }>(async (request, { formId, versionId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  return json(await requestVerification(actor, formId, versionId, await readJson(request, requestVerificationInput), requestId), { status: 202 });
});
