import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/context/session";
import { approveClaims, createForm, reviseClaims } from "@/server/services/intent.service";
import { getFormState } from "@/server/services/state.service";
import { requestVerification } from "@/server/services/verification.service";
import { generateVersion } from "@/server/services/version.service";
import { bootTestApp, createCreator } from "../support/test-app";

// FR-05 / FR-VER-09 — the workspace state carries the Intent Trace for the version on screen.
describe("Intent Trace in the form state", () => {
  let close: () => Promise<void>;
  let owner: Actor;
  let formId: string;

  beforeAll(async () => {
    ({ close } = await bootTestApp());
    ({ actor: owner } = await createCreator("trace-owner"));
    ({ formId } = await createForm(owner, { source: "template", template: "scholarship" }, "test"));
    const state = await getFormState(owner, formId);
    await approveClaims(owner, formId, { revision: state.claimSet!.revision }, "test");
    await generateVersion(owner, formId, { strategy: "seeded_demo" }, "test");
  });
  afterAll(async () => {
    await close();
  });

  it("links the seeded rule to C-GPA, its source sentence, and the GPA 3.50 witness without browser proof", async () => {
    const state = await getFormState(owner, formId);
    const row = state.intentTrace?.rows.find((candidate) => candidate.claimKey === "C-GPA");
    expect(row).toMatchObject({
      expectationDsl: "gte(gpa, 3.5) → certificate visible AND required",
      staticStatus: "FAILED",
      ruleCoverage: "linked",
      source: { quote: "Applicants with a GPA of 3.5 or higher must provide an achievement certificate." },
      browser: { status: "UNVERIFIED", diagnostic: null },
    });
    expect(row!.rules.map((rule) => [rule.dsl, rule.status])).toEqual([["gt(gpa, 3.5) → show certificate", "conflicting"]]);
    expect(row!.boundary.find((point) => point.value === "3.50")).toMatchObject({ expected: { visible: true, required: true }, implemented: { visible: false }, agrees: false });
    expect(state.intentTraceNote).toBeNull();
  });

  it("shows a queued diagnostic run as pending, never as proof", async () => {
    const before = await getFormState(owner, formId);
    await requestVerification(owner, formId, before.version!.id, { mode: "diagnostic", force: false }, "test");
    const state = await getFormState(owner, formId);
    const row = state.intentTrace?.rows.find((candidate) => candidate.claimKey === "C-GPA");
    expect(row?.browser.status).toBe("UNVERIFIED");
    expect(row?.browser.diagnostic?.outcome).toBe("PENDING");
  });

  it("does not trace an older version against a newer claims revision", async () => {
    await reviseClaims(owner, formId, "test");
    const state = await getFormState(owner, formId);
    expect(state.intentTrace).toBeNull();
    expect(state.intentTraceNote).toMatch(/newer claims revision/);
  });
});
