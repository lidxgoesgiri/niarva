import { randomUUID } from "node:crypto";
import type { HttpCheckResult, ServerCheck } from "@niarva/core";

/**
 * Executes server contract checks directly against the preview submission API, independent of any
 * browser. The worker reports raw responses; the server judges them.
 */
export async function runServerContract(submitUrl: string, previewToken: string, checks: ServerCheck[]): Promise<HttpCheckResult[]> {
  const results: HttpCheckResult[] = [];
  for (const check of checks) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(submitUrl, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", "x-preview-token": previewToken },
        body: JSON.stringify({ submissionId: randomUUID(), answers: check.payload }),
      });
      const body = (await response.json().catch(() => null)) as { storedAnswers?: Record<string, unknown>; error?: { fieldErrors?: Record<string, string> } } | null;
      results.push({
        checkKey: check.checkKey,
        status: response.status,
        fieldErrorKeys: Object.keys(body?.error?.fieldErrors ?? {}),
        storedAnswers: response.ok ? (body?.storedAnswers ?? {}) : null,
      });
    } catch {
      results.push({ checkKey: check.checkKey, status: null, fieldErrorKeys: [], storedAnswers: null });
    } finally {
      clearTimeout(timer);
    }
  }
  return results;
}
