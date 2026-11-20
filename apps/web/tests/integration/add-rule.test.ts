import type { FormDefinition } from "@niarva/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/server/context/session";
import { approveClaims, createForm } from "@/server/services/intent.service";
import { getFormState } from "@/server/services/state.service";
import { generateVersion, saveEdits } from "@/server/services/version.service";
import { bootTestApp, createCreator } from "../support/test-app";

// The builder's "Add a rule" sends the same edit as any manual change. A rule that no approved
// claim asks for must be stored as a new version and flagged against the approved intent,
// never silently accepted.
describe("adding a rule in the builder", () => {
  let close: () => Promise<void>;
  let owner: Actor;

  beforeAll(async () => {
    ({ close } = await bootTestApp());
    ({ actor: owner } = await createCreator("add-rule"));
  });
  afterAll(async () => {
    await close();
  });

  it("stores the added rule in a new version and flags it as unrequested", async () => {
    const { formId } = await createForm(owner, { source: "template", template: "scholarship" }, "test");
    let state = await getFormState(owner, formId);
    await approveClaims(owner, formId, { revision: state.claimSet!.revision }, "test");
    await generateVersion(owner, formId, { strategy: "skeleton" }, "test");
    state = await getFormState(owner, formId);
    const base = state.version!;
    expect(state.analysis?.ruleTrace.some((entry) => entry.status === "unrequested")).toBe(false);

    const definition = structuredClone(base.definition) as FormDefinition;
    const added = { id: "rule_ab12cd34", target: "full_name", effect: "require" as const, when: { kind: "cmp" as const, field: "gpa", op: "gte" as const, value: "3.9" }, originClaimKeys: [] };
    definition.rules.push(added);
    await saveEdits(owner, formId, { baseVersionId: base.id, definition }, "test");

    state = await getFormState(owner, formId);
    expect(state.version!.id).not.toBe(base.id);
    expect((state.version!.definition as FormDefinition).rules.map((rule) => rule.id)).toContain(added.id);
    expect(state.analysis?.ruleTrace.find((entry) => entry.ruleId === added.id)?.status).toBe("unrequested");
    expect(state.intentTrace?.unrequestedRules.map((rule) => (typeof rule === "string" ? rule : rule.ruleId))).toContain(added.id);
  });
});
