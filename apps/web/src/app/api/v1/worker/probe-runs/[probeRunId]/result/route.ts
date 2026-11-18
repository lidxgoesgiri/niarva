import { z } from "zod";
import { ApiError } from "@/server/http/errors";
import { json, readJson, route } from "@/server/http/route";
import { verifyWorkerToken } from "@/server/security/tokens";
import { recordResult, workerResultInput } from "@/server/services/verification.service";

export const dynamic = "force-dynamic";

export const POST = route<{ probeRunId: string }>(async (request, { probeRunId }) => {
  if (!verifyWorkerToken(request.headers.get("authorization"))) throw new ApiError("WORKER_UNAUTHORIZED", "Worker authentication failed.");
  const workerId = z.string().regex(/^[a-z0-9-]{3,40}$/).parse(request.headers.get("x-worker-id"));
  return json(await recordResult(workerId, probeRunId, await readJson(request, workerResultInput)));
});
