"use client";

/** Thin browser → API client. Errors keep the server's safe message and reasons. */
export class ClientApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly reasons: string[] = [],
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(path, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error;
    throw new ClientApiError(error?.message ?? "The request failed.", error?.code ?? "INTERNAL", error?.reasons ?? [], error?.fieldErrors ?? {});
  }
  return body as T;
}
