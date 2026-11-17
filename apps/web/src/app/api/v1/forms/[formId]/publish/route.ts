import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, readJson, route } from "@/server/http/route";
import { publish, publishInput, unpublish } from "@/server/services/publish.service";

export const dynamic = "force-dynamic";

/** The gate is enforced here, inside the publish transaction, whatever the UI shows. */
export const POST = route<{ formId: string }>(async (request, { formId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  return json(await publish(actor, formId, await readJson(request, publishInput), requestId), { status: 201 });
});

export const DELETE = route<{ formId: string }>(async (request, { formId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  return json(await unpublish(actor, formId, requestId));
});
