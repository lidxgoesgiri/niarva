import { clientIp, json, readJson, route } from "@/server/http/route";
import { submitInput, submitPublic } from "@/server/services/submission.service";

export const dynamic = "force-dynamic";

export const POST = route<{ slug: string }>(async (request, { slug }) => {
  const result = await submitPublic(slug, await readJson(request, submitInput), clientIp(request));
  return json(result, { status: result.replayed ? 200 : 201 });
});
