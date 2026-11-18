import { z } from "zod";
import { json, readJson, route } from "@/server/http/route";
import { submitPreview } from "@/server/services/submission.service";

export const dynamic = "force-dynamic";

/** Test submissions for a token-scoped preview. Never touches public responses or counters. */
export const POST = route<{ versionId: string }>(async (request, { versionId }) => {
  const input = await readJson(request, z.object({ submissionId: z.string().uuid(), answers: z.record(z.string(), z.unknown()) }));
  return json(await submitPreview(versionId, request.headers.get("x-preview-token"), input), { status: 201 });
});
