import { saveEdits, saveEditsInput } from "@/server/services/version.service";
import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, readJson, route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const POST = route<{ formId: string }>(async (request, { formId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  return json(await saveEdits(actor, formId, await readJson(request, saveEditsInput), requestId), { status: 201 });
});
