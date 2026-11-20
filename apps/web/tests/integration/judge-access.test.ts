import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/server/config/env";
import type { Actor } from "@/server/context/session";
import { ApiError } from "@/server/http/errors";
import { listForms, listShowcaseForms } from "@/server/services/form.service";
import { approveClaims, createForm } from "@/server/services/intent.service";
import { publish } from "@/server/services/publish.service";
import { getFormState } from "@/server/services/state.service";
import { listResponses } from "@/server/services/submission.service";
import { requestVerification } from "@/server/services/verification.service";
import { generateVersion, saveEdits } from "@/server/services/version.service";
import { bootTestApp, createCreator } from "../support/test-app";

// Judges get scoped, least-privilege access: with DEMO_MODE on, a judge account may
// read the demo showcase forms and nothing else of another workspace, and can never change them.
describe("scoped judge access", () => {
  let close: () => Promise<void>;
  let owner: Actor;
  let judge: Actor;
  let stranger: Actor;
  let showcaseId = "";
  let privateId = "";
  const saved = {
    demo: process.env.DEMO_MODE,
    judges: process.env.DEMO_JUDGE_EMAILS,
    showcase: process.env.DEMO_SHOWCASE_FORM_IDS,
  };

  const configure = (demo: "true" | "false", judges: string, showcase: string) => {
    process.env.DEMO_MODE = demo;
    process.env.DEMO_JUDGE_EMAILS = judges;
    process.env.DEMO_SHOWCASE_FORM_IDS = showcase;
    resetEnvCache();
  };

  async function scholarshipForm(actor: Actor, title: string) {
    const { formId } = await createForm(actor, { source: "template", template: "scholarship", title }, "test");
    const state = await getFormState(actor, formId);
    await approveClaims(actor, formId, { revision: state.claimSet!.revision }, "test");
    await generateVersion(actor, formId, { strategy: "seeded_demo" }, "test");
    return formId;
  }

  const notFound = (promise: Promise<unknown>) =>
    expect(promise).rejects.toSatisfy((error: unknown) => error instanceof ApiError && error.code === "NOT_FOUND");

  beforeAll(async () => {
    ({ close } = await bootTestApp());
    ({ actor: owner } = await createCreator("showcase-owner"));
    ({ actor: judge } = await createCreator("judge"));
    ({ actor: stranger } = await createCreator("stranger"));
    showcaseId = await scholarshipForm(owner, "Showcase Scholarship");
    privateId = await scholarshipForm(owner, "Private Scholarship");
  });
  afterAll(async () => {
    process.env.DEMO_MODE = saved.demo ?? "false";
    if (saved.judges === undefined) delete process.env.DEMO_JUDGE_EMAILS;
    else process.env.DEMO_JUDGE_EMAILS = saved.judges;
    if (saved.showcase === undefined) delete process.env.DEMO_SHOWCASE_FORM_IDS;
    else process.env.DEMO_SHOWCASE_FORM_IDS = saved.showcase;
    resetEnvCache();
    await close();
  });

  it("lets a judge read a showcase form, marked read-only", async () => {
    configure("true", `other@niarva.test, ${judge.email.toUpperCase()}`, showcaseId);
    const state = await getFormState(judge, showcaseId);
    expect(state.access).toBe("judge");
    expect(state.form.id).toBe(showcaseId);
    expect((await getFormState(owner, showcaseId)).access).toBe("owner");
    expect((await listShowcaseForms(judge)).map((form) => form.id)).toEqual([showcaseId]);
    expect((await listForms(judge)).map((form) => form.id)).not.toContain(showcaseId);
  });

  it("refuses every change a judge attempts on a showcase form", async () => {
    configure("true", judge.email, showcaseId);
    const state = await getFormState(judge, showcaseId);
    const versionId = state.version!.id;
    await notFound(approveClaims(judge, showcaseId, { revision: state.claimSet!.revision }, "test"));
    await notFound(generateVersion(judge, showcaseId, { strategy: "skeleton" }, "test"));
    await notFound(saveEdits(judge, showcaseId, { baseVersionId: versionId, definition: state.version!.definition }, "test"));
    await notFound(requestVerification(judge, showcaseId, versionId, { mode: "diagnostic", force: false }, "test"));
    await notFound(publish(judge, showcaseId, { versionId, acknowledgedWarningKeys: [] }, "test"));
    await notFound(listResponses(judge, showcaseId, 1));
    const after = await getFormState(owner, showcaseId);
    expect(after.version!.id).toBe(versionId);
    expect(after.runs).toHaveLength(0);
  });

  it("keeps every other form private, even from a judge", async () => {
    configure("true", judge.email, showcaseId);
    await notFound(getFormState(judge, privateId));
  });

  it("gives non-judges no showcase access", async () => {
    configure("true", judge.email, showcaseId);
    await notFound(getFormState(stranger, showcaseId));
    expect(await listShowcaseForms(stranger)).toEqual([]);
  });

  it("is off unless DEMO_MODE is true", async () => {
    configure("false", judge.email, showcaseId);
    await notFound(getFormState(judge, showcaseId));
    expect(await listShowcaseForms(judge)).toEqual([]);
  });

  it("ignores showcase entries that are not form ids", async () => {
    configure("true", judge.email, `not-a-uuid, ${showcaseId}`);
    expect((await listShowcaseForms(judge)).map((form) => form.id)).toEqual([showcaseId]);
  });
});
