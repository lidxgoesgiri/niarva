import { requireActor } from "@/server/context/session";
import { ApiError } from "@/server/http/errors";
import { json, route } from "@/server/http/route";
import { listResponses } from "@/server/services/submission.service";
import { RESPONSE_FAULT_DELAY_MS, responseFault } from "@/server/testing/response-faults";

export const dynamic = "force-dynamic";

export const GET = route<{ formId: string }>(async (request, { formId }) => {
  const actor = await requireActor(request.headers);
  const page = Number(new URL(request.url).searchParams.get("page") ?? "1") || 1;
  // Ownership is checked first, so a configured test fault never changes what a non-owner sees.
  const result = await listResponses(actor, formId, page);
  const fault = responseFault(formId);
  if (fault === "error") throw new ApiError("INTERNAL", "Responses could not be loaded. Try again.");
  if (fault === "delay") await new Promise((resolve) => setTimeout(resolve, RESPONSE_FAULT_DELAY_MS));
  return json(result);
});
