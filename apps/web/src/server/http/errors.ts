import type { ErrorCode } from "@niarva/contracts";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  // Foreign resources answer 404, never 403, so their existence is not disclosed.
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  CONFLICT: 409,
  STALE_REVISION: 409,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  PROVIDER_UNAVAILABLE: 503,
  INTENT_NOT_APPROVED: 409,
  ANALYSIS_REQUIRED: 409,
  GATE_BLOCKED: 409,
  SUBMISSION_INVALID: 422,
  IDEMPOTENCY_KEY_REUSED: 409,
  FORM_VERSION_CHANGED: 409,
  FORM_CLOSED: 410,
  FORM_FULL: 410,
  PREVIEW_TOKEN_INVALID: 401,
  WORKER_UNAUTHORIZED: 401,
  LEASE_LOST: 409,
  INTERNAL: 500,
};

/**
 * An expected failure with a stable code and a message that is safe to show to a user.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;
  readonly reasons?: string[];

  constructor(
    code: ErrorCode,
    message: string,
    extra: { fieldErrors?: Record<string, string>; reasons?: string[] } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fieldErrors = extra.fieldErrors;
    this.reasons = extra.reasons;
  }
}

export const notFound = (what = "Resource") => new ApiError("NOT_FOUND", `${what} was not found.`);
export const unauthenticated = () => new ApiError("UNAUTHENTICATED", "Sign in to continue.");
