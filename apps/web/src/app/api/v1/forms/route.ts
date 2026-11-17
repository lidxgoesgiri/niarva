import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, readJson, route } from "@/server/http/route";
import { createForm, createFormInput } from "@/server/services/intent.service";

export const dynamic = "force-dynamic";

export const POST = route(async (request, _params, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  const input = await readJson(request, createFormInput);
  return json(await createForm(actor, input, requestId), { status: 201 });
});
