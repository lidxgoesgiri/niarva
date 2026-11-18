import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** Public origin of this deployment, e.g. https://niarva.example.com. No trailing slash. */
  NIARVA_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .transform((value) => value.replace(/\/+$/, "")),

  /** Identifies the environment a proof was produced in; part of the verification key. */
  NIARVA_ENVIRONMENT_ID: z.string().min(1).max(40).default("local"),

  /** PostgreSQL connection string. When absent, an embedded PGlite database is used. */
  DATABASE_URL: z.string().min(1).optional(),
  /** Directory of the embedded database. Ignored when DATABASE_URL is set. */
  PGLITE_DIR: z.string().min(1).optional(),

  BETTER_AUTH_SECRET: z.string().min(32),
  /** HMAC key for preview tokens (scoped to a form version and purpose). */
  PREVIEW_TOKEN_SECRET: z.string().min(32),
  /** HMAC key used to hash respondent IP addresses; raw addresses are never stored. */
  IP_HASH_SECRET: z.string().min(32),

  /** Optional. Without it the AI path reports PROVIDER_UNAVAILABLE and templates/manual entry are used. */
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_MODEL: z.string().min(1).optional(),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),

  /** Mandatory Kane probes allowed per full verification before the request is rejected. */
  KANE_MAX_RUNS_PER_VERIFICATION: z.coerce.number().int().min(1).max(50).default(10),
  /** Enables the seeded demo account and the labeled golden scenario. */
  DEMO_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Validated environment. Throws once with the names of invalid variables (never their values).
 */
export function getEnv(): Env {
  if (cached) return cached;
  const emptyToUndefined = Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => [key, value === "" ? undefined : value]),
  );
  const parsed = envSchema.safeParse(emptyToUndefined);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(
      `Invalid environment configuration: ${names.join(", ")}. ` +
        "Copy .env.example to .env.local at the repository root or run `pnpm setup:env`.",
    );
  }
  cached = parsed.data;
  return cached;
}

/** Test-only: forget the cached environment after mutating process.env. */
export function resetEnvCache(): void {
  cached = undefined;
}
