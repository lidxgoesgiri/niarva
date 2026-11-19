import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { extractClaims, summarizeFailures } from "@/server/ai/extract-claims";
import { resetEnvCache } from "@/server/config/env";
import { bootTestApp } from "../support/test-app";

// A failed AI extraction must report why it failed across every model attempt, not only the last
// one. On the live site a retired fallback model (HTTP 404) turned every failure into "provider
// unavailable" although the earlier models had answered.
describe("AI extraction failure reasons", () => {
  let close: () => Promise<void>;
  const saved = { key: process.env.OPENROUTER_API_KEY, models: process.env.OPENROUTER_MODEL };
  const prompt = "Create a scholarship application. Name and GPA are required.";

  beforeAll(async () => {
    ({ close } = await bootTestApp());
    process.env.OPENROUTER_API_KEY = "test-only-openrouter-key";
    process.env.OPENROUTER_MODEL = "first/model:free, second/model:free";
    resetEnvCache();
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    if (saved.key === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = saved.key;
    if (saved.models === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = saved.models;
    resetEnvCache();
    await close();
  });

  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("reports a draft in the wrong format even when the last fallback model is retired", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(reply(200, { choices: [{ message: { content: "not json" } }] }))
        .mockResolvedValueOnce(reply(404, { error: { code: 404, message: "This model is unavailable for free." } })),
    );
    expect(await extractClaims(prompt)).toMatchObject({ ok: false, code: "INVALID_OUTPUT", attempts: 2 });
  });

  it("reports a rate limit when every model is rate limited", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(429, { error: { code: 429, message: "Rate limit exceeded" } })));
    expect(await extractClaims(prompt)).toMatchObject({ ok: false, code: "RATE_LIMITED" });
  });

  it("still reports the provider as unavailable when every model refuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(503, { error: { code: 503, message: "Provider down" } })));
    expect(await extractClaims(prompt)).toMatchObject({ ok: false, code: "PROVIDER_UNAVAILABLE" });
  });

  it("chooses one actionable reason for mixed failures", () => {
    expect(summarizeFailures([])).toBe("PROVIDER_UNAVAILABLE");
    expect(summarizeFailures(["TIMEOUT", "TIMEOUT"])).toBe("TIMEOUT");
    expect(summarizeFailures(["INVALID_OUTPUT", "PROVIDER_UNAVAILABLE"])).toBe("INVALID_OUTPUT");
    expect(summarizeFailures(["PROVIDER_UNAVAILABLE", "TIMEOUT", "INVALID_OUTPUT"])).toBe("TIMEOUT");
    expect(summarizeFailures(["INVALID_OUTPUT", "RATE_LIMITED"])).toBe("RATE_LIMITED");
  });
});
