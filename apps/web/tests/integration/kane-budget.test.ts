import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/server/config/env";
import type { Actor } from "@/server/context/session";
import type { Db } from "@/server/db/client";
import { probes, verificationRuns } from "@/server/db/schema";
import { approveClaims, createForm } from "@/server/services/intent.service";
import { getFormState } from "@/server/services/state.service";
import { requestVerification } from "@/server/services/verification.service";
import { generateVersion } from "@/server/services/version.service";
import { bootTestApp, createCreator } from "../support/test-app";

// Every Kane probe spends the operator's credits, and sign-up is open on a public deployment, so
// the backend caps the Kane probes queued in a rolling 24 hours, per workspace and overall.
describe("Kane probe budget", () => {
  let db: Db;
  let close: () => Promise<void>;
  let ownerA: Actor;
  let ownerB: Actor;
  const saved = {
    perWorkspace: process.env.KANE_PROBE_BUDGET_PER_WORKSPACE_24H,
    global: process.env.KANE_PROBE_BUDGET_GLOBAL_24H,
  };

  const setBudget = (perWorkspace: number, global: number) => {
    process.env.KANE_PROBE_BUDGET_PER_WORKSPACE_24H = String(perWorkspace);
    process.env.KANE_PROBE_BUDGET_GLOBAL_24H = String(global);
    resetEnvCache();
  };

  /** A scholarship form whose latest version passes static analysis, ready for a full run. */
  async function verifiableForm(owner: Actor) {
    const { formId } = await createForm(owner, { source: "template", template: "scholarship" }, "test");
    let state = await getFormState(owner, formId);
    await approveClaims(owner, formId, { revision: state.claimSet!.revision }, "test");
    await generateVersion(owner, formId, { strategy: "skeleton" }, "test");
    state = await getFormState(owner, formId);
    expect(state.analysis?.verdict).toBe("PASS");
    return { formId, versionId: state.version!.id };
  }

  const runsOf = (formId: string) => db.select({ id: verificationRuns.id }).from(verificationRuns).where(eq(verificationRuns.formId, formId));

  let kanePerRun = 0;
  let firstRunId = "";

  beforeAll(async () => {
    ({ db, close } = await bootTestApp());
    ({ actor: ownerA } = await createCreator("budget-a"));
    ({ actor: ownerB } = await createCreator("budget-b"));
  });
  afterAll(async () => {
    process.env.KANE_PROBE_BUDGET_PER_WORKSPACE_24H = saved.perWorkspace;
    process.env.KANE_PROBE_BUDGET_GLOBAL_24H = saved.global;
    resetEnvCache();
    await close();
  });

  it("queues a full run within the budget and counts only its Kane probes", async () => {
    const { formId, versionId } = await verifiableForm(ownerA);
    const queued = await requestVerification(ownerA, formId, versionId, { mode: "full", force: false }, "test");
    firstRunId = queued.runId;
    const kane = await db.select({ id: probes.id }).from(probes).where(and(eq(probes.verificationRunId, queued.runId), eq(probes.executor, "kane")));
    kanePerRun = kane.length;
    expect(kanePerRun).toBeGreaterThan(3);
  });

  it("returns an active run for a repeated request without charging the budget again", async () => {
    setBudget(kanePerRun, kanePerRun);
    const state = await getFormState(ownerA, (await db.select({ formId: verificationRuns.formId }).from(verificationRuns).where(eq(verificationRuns.id, firstRunId)))[0]!.formId);
    const again = await requestVerification(ownerA, state.form.id, state.version!.id, { mode: "full", force: false }, "test");
    expect(again).toMatchObject({ runId: firstRunId, deduplicated: true });
  });

  it("refuses a run over the workspace budget and queues nothing", async () => {
    setBudget(kanePerRun + 1, 10_000);
    const { formId, versionId } = await verifiableForm(ownerA);
    await expect(requestVerification(ownerA, formId, versionId, { mode: "full", force: false }, "test")).rejects.toMatchObject({
      code: "RATE_LIMITED",
      message: expect.stringContaining("this workspace queued"),
    });
    expect(await runsOf(formId)).toHaveLength(0);
  });

  it("refuses another workspace when the deployment-wide budget is used up", async () => {
    setBudget(10_000, kanePerRun + 3);
    const { formId, versionId } = await verifiableForm(ownerB);
    await expect(requestVerification(ownerB, formId, versionId, { mode: "full", force: false }, "test")).rejects.toMatchObject({
      code: "RATE_LIMITED",
      message: expect.stringContaining("deployment's browser verification budget"),
    });
    expect(await runsOf(formId)).toHaveLength(0);
  });

  it("stops counting runs older than 24 hours", async () => {
    await db.update(verificationRuns).set({ requestedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) }).where(eq(verificationRuns.id, firstRunId));
    setBudget(kanePerRun, kanePerRun);
    const { formId, versionId } = await verifiableForm(ownerB);
    const queued = await requestVerification(ownerB, formId, versionId, { mode: "full", force: false }, "test");
    expect(queued.deduplicated).toBe(false);
    expect(await runsOf(formId)).toHaveLength(1);
  });

  it("disables new browser verification when the budget is 0", async () => {
    setBudget(0, 10_000);
    const { formId, versionId } = await verifiableForm(ownerA);
    await expect(requestVerification(ownerA, formId, versionId, { mode: "full", force: false }, "test")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(await runsOf(formId)).toHaveLength(0);
  });
});
