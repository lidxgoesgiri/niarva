import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/context/session";
import type { Db } from "@/server/db/client";
import { probeRuns, verificationRuns } from "@/server/db/schema";
import { approveClaims, createForm } from "@/server/services/intent.service";
import { getFormState } from "@/server/services/state.service";
import { heartbeat, leaseNext, requestVerification } from "@/server/services/verification.service";
import { generateVersion } from "@/server/services/version.service";
import { bootTestApp, createCreator } from "../support/test-app";

const BASE = "http://localhost:3000";

// An operator can run the worker for chosen accounts only. Runs queued by anyone else are not
// leased (so they never spend the operator's Kane credits) and stay queued.
describe("worker owner filter", () => {
  let db: Db;
  let close: () => Promise<void>;
  let stranger: Actor;
  let demo: Actor;

  async function queueFullRun(owner: Actor) {
    const { formId } = await createForm(owner, { source: "template", template: "scholarship" }, "test");
    let state = await getFormState(owner, formId);
    await approveClaims(owner, formId, { revision: state.claimSet!.revision }, "test");
    await generateVersion(owner, formId, { strategy: "skeleton" }, "test");
    state = await getFormState(owner, formId);
    const queued = await requestVerification(owner, formId, state.version!.id, { mode: "full", force: false }, "test");
    return queued.runId as string;
  }

  const runOfProbeRun = async (probeRunId: string) => {
    const [row] = await db.select({ runId: probeRuns.verificationRunId }).from(probeRuns).where(eq(probeRuns.id, probeRunId));
    return row?.runId;
  };

  let strangerRunId = "";
  let demoRunId = "";

  beforeAll(async () => {
    ({ db, close } = await bootTestApp());
    ({ actor: stranger } = await createCreator("stranger"));
    ({ actor: demo } = await createCreator("demo"));
    // The stranger's run is older, so an unfiltered worker would take it first.
    strangerRunId = await queueFullRun(stranger);
    demoRunId = await queueFullRun(demo);
  });
  afterAll(async () => {
    await close();
  });

  it("tells the worker that the server supports the filter", async () => {
    await expect(heartbeat("filter-check", "0.10.4")).resolves.toEqual({ ok: true, ownerFilter: true });
  });

  it("leases only runs owned by the listed accounts, ignoring email case", async () => {
    const lease = await leaseNext("filter-worker", "0.10.4", BASE, [demo.email.toUpperCase()]);
    expect(lease).not.toBeNull();
    expect(await runOfProbeRun(lease!.probeRunId)).toBe(demoRunId);

    const [strangerRun] = await db.select({ state: verificationRuns.state }).from(verificationRuns).where(eq(verificationRuns.id, strangerRunId));
    expect(strangerRun?.state).toBe("QUEUED");
    const strangerProbes = await db.select({ status: probeRuns.status }).from(probeRuns).where(eq(probeRuns.verificationRunId, strangerRunId));
    expect(strangerProbes.length).toBeGreaterThan(0);
    expect(strangerProbes.every((probe) => probe.status === "queued")).toBe(true);
  });

  it("leases nothing when no listed account has a queued run", async () => {
    await expect(leaseNext("filter-worker", "0.10.4", BASE, ["nobody@niarva.test"])).resolves.toBeNull();
  });

  it("without a filter, leases the oldest queued run as before", async () => {
    const lease = await leaseNext("plain-worker", "0.10.4", BASE);
    expect(lease).not.toBeNull();
    expect(await runOfProbeRun(lease!.probeRunId)).toBe(strangerRunId);
  });
});
