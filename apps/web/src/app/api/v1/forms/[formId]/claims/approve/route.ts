import { z } from "zod";
import { approveClaims } from "@/server/services/intent.service";
import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, readJson, route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const POST = route<{ formId: string }>(async (request, { formId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  const input = await readJson(request, z.object({ revision: z.number().int().min(1) }));
  return json(await approveClaims(actor, formId, input, requestId));
});
