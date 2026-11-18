import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/server/config/env";
import { responseFault } from "@/server/testing/response-faults";
import { bootTestApp } from "../support/test-app";

// The Kane tests of the responses view's error and loading states need a configured retrieval
// fault. The hook must be inert unless configured, scoped to the listed forms, and never active on
// the production environment.
describe("test-only response faults", () => {
  let close: () => Promise<void>;
  const saved = { faults: process.env.NIARVA_TEST_RESPONSE_FAULTS, environment: process.env.NIARVA_ENVIRONMENT_ID };
  const configure = (faults: string | undefined, environment = "local") => {
    if (faults === undefined) delete process.env.NIARVA_TEST_RESPONSE_FAULTS;
    else process.env.NIARVA_TEST_RESPONSE_FAULTS = faults;
    process.env.NIARVA_ENVIRONMENT_ID = environment;
    resetEnvCache();
  };

  beforeAll(async () => {
    ({ close } = await bootTestApp());
  });
  afterAll(async () => {
    configure(saved.faults, saved.environment ?? "local");
    if (saved.environment === undefined) delete process.env.NIARVA_ENVIRONMENT_ID;
    resetEnvCache();
    await close();
  });

  it("is inert when nothing is configured", () => {
    configure(undefined);
    expect(responseFault("form-a")).toBeNull();
  });

  it("applies only to the listed forms", () => {
    configure("error:form-a, delay:form-b");
    expect(responseFault("form-a")).toBe("error");
    expect(responseFault("form-b")).toBe("delay");
    expect(responseFault("form-c")).toBeNull();
  });

  it("ignores unknown fault kinds", () => {
    configure("explode:form-a");
    expect(responseFault("form-a")).toBeNull();
  });

  it("is never active on the production environment", () => {
    configure("error:form-a,delay:form-b", "vercel-production");
    expect(responseFault("form-a")).toBeNull();
    expect(responseFault("form-b")).toBeNull();
  });
});
