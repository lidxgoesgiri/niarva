import { z } from "zod";
import { decideRepair } from "@/server/services/version.service";
import { requireActor } from "@/server/context/session";
import { assertSameOrigin, json, readJson, route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const POST = route<{ formId: string; proposalId: string }>(async (request, { formId, proposalId }, requestId) => {
  assertSameOrigin(request);
  const actor = await requireActor(request.headers);
  const { decision } = await readJson(request, z.object({ decision: z.enum(["approve", "reject"]) }));
  return json(await decideRepair(actor, formId, proposalId, decision, requestId));
});
