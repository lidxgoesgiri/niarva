import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/context/session";
import { approveClaims, createForm } from "@/server/services/intent.service";
import { getFormState } from "@/server/services/state.service";
import { requestVerification } from "@/server/services/verification.service";
import { decideRepair, generateVersion, proposeVersionRepairs } from "@/server/services/version.service";
import { bootTestApp, createCreator } from "../support/test-app";

// FR-18: a repaired form must still show how it got there. The seeded version keeps its own
// diagnostic run and the approved repair, while the current version starts without proof.
describe("proof history across versions", () => {
  let close: () => Promise<void>;
  let owner: Actor;

  beforeAll(async () => {
    ({ close } = await bootTestApp());
    ({ actor: owner } = await createCreator("history"));
  });
  afterAll(async () => {
    await close();
  });

  it("keeps the seeded version's run and approved repair after the repair creates a new version", async () => {
    const { formId } = await createForm(owner, { source: "template", template: "scholarship" }, "test");
    let state = await getFormState(owner, formId);
    await approveClaims(owner, formId, { revision: state.claimSet!.revision }, "test");
    await generateVersion(owner, formId, { strategy: "seeded_demo" }, "test");
    state = await getFormState(owner, formId);
    const seeded = state.version!;
    expect(state.history).toEqual([]);

    const diagnostic = await requestVerification(owner, formId, seeded.id, { mode: "diagnostic", force: false }, "test");
    const { proposals } = await proposeVersionRepairs(owner, formId, seeded.id, "test");
    const { versionId: repairedId } = await decideRepair(owner, formId, proposals[0]!.id, "approve", "test");

    state = await getFormState(owner, formId);
    expect(state.version!.id).toBe(repairedId);
    // Proof never carries over: the current version has no runs of its own yet.
    expect(state.runs).toEqual([]);
    const earlier = state.history.find((entry) => entry.versionId === seeded.id);
    expect(earlier).toBeDefined();
    expect(earlier!.versionNo).toBe(seeded.versionNo);
    expect(earlier!.createdVia).toBe(seeded.createdVia);
    expect(earlier!.claimsHash).toBe(state.claimSet!.claimsHash);
    expect(earlier!.runs.map((run) => run.id)).toEqual([diagnostic.runId]);
    expect(earlier!.runs[0]!.mode).toBe("diagnostic");
    expect(earlier!.runs[0]!.fresh).toBeNull();
    const applied = earlier!.repairs.find((repair) => repair.id === proposals[0]!.id);
    expect(applied?.status).toBe("applied");
    expect(applied?.resultingVersionId).toBe(repairedId);
    expect(state.history.some((entry) => entry.versionId === repairedId)).toBe(false);
  });
});
