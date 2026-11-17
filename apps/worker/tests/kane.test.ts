import { describe, expect, it } from "vitest";
import { redactTokens } from "../src/kane";

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
