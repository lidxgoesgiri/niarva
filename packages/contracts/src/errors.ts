import { z } from "zod";

/**
 * Error codes returned by the HTTP API. Messages are safe for end users;
 * stack traces and provider credentials are never part of an error body.
 */
export const ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "CONFLICT",
  "STALE_REVISION",
  "RATE_LIMITED",
  "PAYLOAD_TOO_LARGE",
  "PROVIDER_UNAVAILABLE",
  "INTENT_NOT_APPROVED",
  "ANALYSIS_REQUIRED",
  "GATE_BLOCKED",
  "SUBMISSION_INVALID",
  "IDEMPOTENCY_KEY_REUSED",
  "FORM_VERSION_CHANGED",
  "FORM_CLOSED",
  "FORM_FULL",
  "PREVIEW_TOKEN_INVALID",
  "WORKER_UNAUTHORIZED",
  "LEASE_LOST",
  "INTERNAL",
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    correlationId: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
    reasons: z.array(z.string()).optional(),
  }),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;
