import { z } from "zod";
import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";
import { json, readJson, route } from "@/server/http/route";
import { verifyWorkerToken } from "@/server/security/tokens";
import { leaseNext } from "@/server/services/verification.service";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  if (!verifyWorkerToken(request.headers.get("authorization"))) throw new ApiError("WORKER_UNAUTHORIZED", "Worker authentication failed.");
  const input = await readJson(
    request,
    z.object({
      workerId: z.string().regex(/^[a-z0-9-]{3,40}$/),
      kaneCliVersion: z.string().max(40).nullable(),
      /** Optional: lease only runs whose workspace owner has one of these emails. */
      ownerEmails: z.array(z.string().email().max(254)).max(20).optional(),
    }),
  );
  const lease = await leaseNext(input.workerId, input.kaneCliVersion, getEnv().NIARVA_BASE_URL, input.ownerEmails ?? []);
  return json({ lease });
});
