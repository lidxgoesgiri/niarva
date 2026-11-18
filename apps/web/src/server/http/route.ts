import "server-only";
import type { ErrorBody } from "@niarva/contracts";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { correlationId } from "../ids";
import { logger } from "../logging/logger";
import { ApiError } from "./errors";

export type RouteContext<P> = { params: Promise<P> };

type Handler<P> = (request: Request, params: P, requestId: string) => Promise<Response>;

const MAX_JSON_BYTES = 64 * 1024;

/**
 * Wraps a route handler: resolves params, assigns a correlation ID, and converts
 * every failure into the standard error envelope. Stack traces never leave the server.
 */
export function route<P = Record<string, never>>(handler: Handler<P>) {
  return async (request: Request, context: RouteContext<P>): Promise<Response> => {
    const requestId = correlationId();
    try {
      const params = context?.params ? await context.params : ({} as P);
      const response = await handler(request, params, requestId);
      response.headers.set("x-correlation-id", requestId);
      return response;
    } catch (error) {
      return errorResponse(error, requestId, request);
    }
  };
}

export function json<T>(body: T, init: { status?: number; headers?: HeadersInit } = {}): Response {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: { "cache-control": "no-store", ...init.headers },
  });
}

/** Reads a bounded JSON body and validates it against a schema. */
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_JSON_BYTES) {
    throw new ApiError("PAYLOAD_TOO_LARGE", "The request body is too large.");
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_JSON_BYTES) {
    throw new ApiError("PAYLOAD_TOO_LARGE", "The request body is too large.");
  }
  let parsed: unknown;
  try {
    parsed = text === "" ? {} : JSON.parse(text);
  } catch {
    throw new ApiError("VALIDATION_FAILED", "The request body is not valid JSON.");
  }
  return schema.parse(parsed);
}

function errorResponse(error: unknown, requestId: string, request: Request): Response {
  if (error instanceof ApiError) {
    const body: ErrorBody = {
      error: {
        code: error.code,
        message: error.message,
        correlationId: requestId,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        ...(error.reasons ? { reasons: error.reasons } : {}),
      },
    };
    return json(body, { status: error.status, headers: { "x-correlation-id": requestId } });
  }
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      fieldErrors[key] ??= issue.message;
    }
    const body: ErrorBody = {
      error: {
        code: "VALIDATION_FAILED",
        message: "The request is not valid.",
        correlationId: requestId,
        fieldErrors,
      },
    };
    return json(body, { status: 422, headers: { "x-correlation-id": requestId } });
  }
  logger.error({
    msg: "unhandled route error",
    requestId,
    method: request.method,
    path: new URL(request.url).pathname,
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
  });
  const body: ErrorBody = {
    error: {
      code: "INTERNAL",
      message: "Something went wrong. Try again, and quote the correlation ID if it persists.",
      correlationId: requestId,
    },
  };
  return json(body, { status: 500, headers: { "x-correlation-id": requestId } });
}
