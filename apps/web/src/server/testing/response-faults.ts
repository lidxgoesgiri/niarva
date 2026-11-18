import { getEnv } from "../config/env";

/** How long a `delay:` fault holds the owner's responses request, so a browser can observe the loading state. */
export const RESPONSE_FAULT_DELAY_MS = 25_000;

export type ResponseFault = "error" | "delay";

/**
 * The test-only fault configured for one form's responses endpoint (`NIARVA_TEST_RESPONSE_FAULTS`),
 * or null. Never active on the production environment, whatever the variable says.
 */
export function responseFault(formId: string): ResponseFault | null {
  const env = getEnv();
  if (!env.NIARVA_TEST_RESPONSE_FAULTS || env.NIARVA_ENVIRONMENT_ID === "vercel-production") return null;
  for (const entry of env.NIARVA_TEST_RESPONSE_FAULTS.split(",")) {
    const [kind, id] = entry.trim().split(":");
    if (id === formId && (kind === "error" || kind === "delay")) return kind;
  }
  return null;
}
