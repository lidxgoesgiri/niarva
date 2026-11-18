import { generateInput, generateVersion } from "@/server/services/version.service";
import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, readJson, route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const POST = route<{ formId: string }>(async (request, { formId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  return json(await generateVersion(actor, formId, await readJson(request, generateInput), requestId), { status: 201 });
});
