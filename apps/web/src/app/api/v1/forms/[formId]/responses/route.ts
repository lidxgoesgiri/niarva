import { requireActor } from "@/server/context/session";
import { json, route } from "@/server/http/route";
import { listResponses } from "@/server/services/submission.service";

export const dynamic = "force-dynamic";

export const GET = route<{ formId: string }>(async (request, { formId }) => {
  const actor = await requireActor(request.headers);
  const page = Number(new URL(request.url).searchParams.get("page") ?? "1") || 1;
  return json(await listResponses(actor, formId, page));
});
