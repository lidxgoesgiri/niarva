import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(path.join(repoRoot, file));
  } catch {
    // Optional file.
  }
}

const schema = z.object({
  NIARVA_WORKER_API_URL: z.string().url().transform((value) => value.replace(/\/+$/, "")),
  NIARVA_WORKER_ID: z.string().regex(/^[a-z0-9-]{3,40}$/, "Use 3–40 lower-case letters, digits, or hyphens."),
  WORKER_SHARED_TOKEN: z.string().min(32),
  /** Optional absolute path to the Kane CLI bin script; resolved from the global npm root otherwise. */
  KANE_CLI_ENTRY: z.string().optional(),
  /** Seconds added to a probe's timeout before the watchdog kills the Kane process tree. */
  WORKER_WATCHDOG_MARGIN: z.coerce.number().int().min(5).max(600).default(45),
  WORKER_IDLE_POLL_MS: z.coerce.number().int().min(500).max(60_000).default(4000),
  /** Optional: the Test Manager project Kane sessions must upload to; the worker refuses to start otherwise. */
  NIARVA_KANE_PROJECT_ID: z.string().regex(/^[0-9A-Z]{26}$/, "Use the 26-character Test Manager project id.").optional(),
});

export type WorkerConfig = z.infer<typeof schema>;

export function loadConfig(): WorkerConfig {
  const parsed = schema.safeParse(Object.fromEntries(Object.entries(process.env).map(([key, value]) => [key, value === "" ? undefined : value])));
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Worker configuration is invalid: ${names.join(", ")}. Run \`pnpm setup:env\` at the repository root.`);
  }
  return parsed.data;
}
