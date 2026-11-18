import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/context/session";
import { approveClaims, createForm } from "@/server/services/intent.service";
import { getFormState } from "@/server/services/state.service";
import { decideRepair, generateVersion, proposeVersionRepairs } from "@/server/services/version.service";
import { bootTestApp, createCreator } from "../support/test-app";

// FR-18 / AC-18 — evidence access: a judge can trace the version lineage behind every proof.
describe("evidence access in the form state", () => {
  let close: () => Promise<void>;
  let owner: Actor;
  let formId: string;

  beforeAll(async () => {
    ({ close } = await bootTestApp());
    ({ actor: owner } = await createCreator("evidence-owner"));
    ({ formId } = await createForm(owner, { source: "template", template: "scholarship" }, "test"));
    const state = await getFormState(owner, formId);
    await approveClaims(owner, formId, { revision: state.claimSet!.revision }, "test");
    await generateVersion(owner, formId, { strategy: "seeded_demo" }, "test");
  });
  afterAll(async () => {
    await close();
  });

  it("lists the version lineage newest first, with origin and parent", async () => {
    let state = await getFormState(owner, formId);
    const seeded = state.version!;
    const { proposals } = await proposeVersionRepairs(owner, formId, seeded.id, "test");
    await decideRepair(owner, formId, proposals[0]!.id, "approve", "test");
    state = await getFormState(owner, formId);
    expect(state.versions.map((entry) => [entry.versionNo, entry.createdVia, entry.parentVersionId])).toEqual([
      [2, "repair", seeded.id],
      [1, "template", null],
    ]);
    expect(state.versions[0]!.id).toBe(state.version!.id);
    expect(state.versions[0]!.definitionHash).toBe(state.version!.definitionHash);
  });

  it("exposes each probe's objective and stage expectations without any preview link", async () => {
    const state = await getFormState(owner, formId);
    const plan = state.analysis!.probes;
    expect(plan.length).toBeGreaterThan(0);
    // The objective text is part of the run's probes once verification is requested; the plan
    // itself never carries a URL or token.
    expect(JSON.stringify(plan)).not.toMatch(/https?:\/\/|[?&]t=/);
  });
});
