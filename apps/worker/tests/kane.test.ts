import { describe, expect, it } from "vitest";
import { redactTokens, startOrigin } from "../src/kane";

describe("worker redaction", () => {
  it("removes preview tokens and secret values from retained output", () => {
    const secret = "http://localhost:3000/preview/abc?t=eyJ2Ijoi.sig";
    const text = `navigate ${secret} then ?t=other.token&x=1 and again ${secret}`;
    const redacted = redactTokens(text, [secret]);
    expect(redacted).not.toContain("eyJ2Ijoi.sig");
    expect(redacted).not.toContain("other.token");
    expect(redacted).toContain("[redacted]");
  });
});

describe("worker start page", () => {
  it("starts Kane on the origin of the preview link, without its path or token", () => {
    const variables = { preview_url: { value: "http://localhost:3200/preview/0199-aa?t=eyJ2.sig", secret: true } };
    expect(startOrigin(variables)).toBe("http://localhost:3200");
    expect(startOrigin({})).toBeNull();
    expect(startOrigin({ preview_url: { value: "not a url", secret: true } })).toBeNull();
  });
});
