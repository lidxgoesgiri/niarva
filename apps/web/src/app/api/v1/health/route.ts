import { ENGINE_VERSION, PROBE_POLICY_VERSION } from "@niarva/core";
import { sql } from "drizzle-orm";
import { getEnv } from "@/server/config/env";
import { getDbHandle } from "@/server/db/client";
import { json, route } from "@/server/http/route";

export const dynamic = "force-dynamic";

/** Liveness and dependency check. Exposes no secrets and no tenant data. */
export const GET = route(async () => {
  const env = getEnv();
  const { db, driver } = await getDbHandle();
  await db.execute(sql`select 1`);
  return json({
    status: "ok",
    environment: env.NIARVA_ENVIRONMENT_ID,
    database: driver,
    engineVersion: ENGINE_VERSION,
    probePolicyVersion: PROBE_POLICY_VERSION,
    ai: env.OPENROUTER_API_KEY && env.OPENROUTER_MODEL ? "configured" : "unavailable",
  });
});
