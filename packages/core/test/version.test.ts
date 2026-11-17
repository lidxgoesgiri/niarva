import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, PROBE_POLICY_VERSION } from "../src/index";

describe("engine identity", () => {
  it("exposes a semantic engine version", () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("exposes a probe policy version", () => {
    expect(PROBE_POLICY_VERSION).toMatch(/^MPP-v\d+$/);
  });
});
