import { z } from "zod";
import { ApiError } from "@/server/http/errors";
import { json, readJson, route } from "@/server/http/route";
import { verifyWorkerToken } from "@/server/security/tokens";
import { heartbeat } from "@/server/services/verification.service";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  if (!verifyWorkerToken(request.headers.get("authorization"))) throw new ApiError("WORKER_UNAUTHORIZED", "Worker authentication failed.");
  const input = await readJson(request, z.object({ workerId: z.string().regex(/^[a-z0-9-]{3,40}$/), kaneCliVersion: z.string().max(40).nullable() }));
  return json(await heartbeat(input.workerId, input.kaneCliVersion));
});
