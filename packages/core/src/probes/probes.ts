import { decimalFromLiteral, addUnits, formatFixed } from "../decimal/decimal";
import { activeClaims, catalogFields } from "../claims/claims";
import type { Claim, ClaimSetContent, FormDefinition } from "../dsl/schema";
import { behaviorOf, conditionFields, intentModel, type BehaviorModel, type FieldBehavior } from "../eval/evaluate";
import { parseValue, serializeValue, type Assignment, type FieldLike } from "../eval/values";
import { canonicalJson, sha256Hex } from "../hash/hash";
import { claimConditions, enumerateCells, literalsFor, representatives, type Cell } from "../analysis/partition";
import type { Counterexample } from "../analysis/findings";
import { PROBE_POLICY_VERSION } from "../version";

export type ProbeKind =
  | "initial_required"
  | "boundary_bundle"
  | "conditional_required_empty"
  | "hidden_exclusion"
  | "valid_submission"
  | "decimal_comma"
  | "constraint_check"
  | "server_contract"
  | "counterexample_confirmation";

export type Expectation = { type: "bool"; value: boolean } | { type: "receipt" };

export type Stage = { stage: number; name: string; expect: Record<string, Expectation> };

export type ServerEvidenceSpec = {
  /** Exactly this many preview submissions must exist for the probe run. */
  expectSubmissions: number;
  /** Keys that must not be stored, nor sent by the browser while hidden. */
  forbiddenKeys: string[];
  /** Values that must not appear anywhere in stored answers. */
  markers: string[];
  /** When set, stored answers must equal this map exactly. */
  expectedAnswers?: Record<string, string | boolean>;
};

export type ServerCheck = {
  checkKey: string;
  code: "S0" | "S1" | "S2" | "S3" | "S4";
  claimKeys: string[];
  payload: Record<string, string | boolean>;
  expect:
    | { status: 201; storedAnswers?: Record<string, string | boolean>; absentKeys?: string[] }
    | { status: 422; fieldErrorKeys: string[] };
};

export type ProbeSpec = {
  probeKey: string;
  kind: ProbeKind;
  executor: "kane" | "http";
  claimKeys: string[];
  /** Golden scenario probe IDs this probe proves, when applicable. */
  goldenIds: string[];
  stages: Stage[];
  objectiveTemplate: string | null;
  objectiveHash: string;
  serverEvidence: ServerEvidenceSpec | null;
  checks: ServerCheck[] | null;
  timeoutSeconds: number;
};

export type CoverageGap = { claimKey: string; obligation: string };

export type ProbePlan = {
  policyVersion: string;
  probes: ProbeSpec[];
  scenarioSetHash: string;
  gaps: CoverageGap[];
  /** Obligation → probe keys, per claim. */
  coverage: Record<string, Record<string, string[]>>;
};

/* ----------------------------------------------------------- context */

type Ctx = {
  definition: FormDefinition;
  claims: Claim[];
  catalog: Map<string, FieldLike>;
  labels: Map<string, string>;
  intent: BehaviorModel;
  controllers: string[];
  cells: Cell[];
  pageIdentity: string;
  submitLabel: string;
};

const MARKER = (index: number) => `NIARVA-HIDDEN-${index}`;

function buildContext(definition: FormDefinition, content: ClaimSetContent, pageIdentity: string): Ctx {
  const claims = activeClaims(content);
  const catalogList = catalogFields(content);
  const catalog = new Map(catalogList.map((field) => [field.key, field]));
  const labels = new Map(definition.fields.map((field) => [field.key, field.label]));
  const conditions = claimConditions(claims);
  const referenced = new Set<string>();
  conditions.forEach((condition) => conditionFields(condition, referenced));
  const controllers = catalogList.map((field) => field.key).filter((key) => referenced.has(key));
  const cells = enumerateCells(
    controllers.map((key) => ({ key, reps: representatives(catalog.get(key) as FieldLike, literalsFor(key, conditions)) })),
    5_000,
  ) ?? [];
  return {
    definition,
    claims,
    catalog,
    labels,
    intent: intentModel(catalogList, claims),
    controllers,
    cells,
    pageIdentity,
    submitLabel: definition.settings.submitLabel ?? "Submit",
  };
}

function expectedAt(ctx: Ctx, raw: Record<string, string>): Map<string, FieldBehavior> {
  const assignment: Assignment = {};
  for (const [key, value] of Object.entries(raw)) {
    const field = ctx.catalog.get(key);
    if (field) assignment[key] = parseValue(field, value).value;
  }
  return behaviorOf(ctx.intent, assignment);
}

/** A valid synthetic answer for a field that is not a controller. */
function fixtureValue(ctx: Ctx, key: string, index: number): string | boolean {
  const field = ctx.catalog.get(key) as FieldLike;
  const validation = ctx.definition.fields.find((candidate) => candidate.key === key)?.validation;
  switch (field.type) {
    case "checkbox":
      return true;
    case "single_select":
      return field.options?.[0]?.value ?? "";
    case "email":
      return `applicant${index}@niarva.test`;
    case "number": {
      const precision = field.precision ?? 0;
      if (validation?.min !== undefined) return formatFixed(decimalFromLiteral(validation.min), precision);
      return formatFixed(decimalFromLiteral("1"), precision);
    }
    default: {
      const minLength = validation?.minLength ?? 0;
      const base = `Test Applicant ${index}`;
      return validation?.pattern === "digits_only" ? "1234567890".slice(0, Math.max(minLength, 6)) : base.padEnd(minLength, "x");
    }
  }
}

/** Non-controller fields to fill so the form can be submitted in every listed cell. */
function fillPlan(ctx: Ctx, cells: Record<string, string>[], exclude: string[]): [string, string | boolean][] {
  const keys = new Set<string>();
  for (const raw of cells) {
    const behavior = expectedAt(ctx, raw);
    for (const [key, state] of behavior) if (state.visible && !ctx.controllers.includes(key) && !exclude.includes(key)) keys.add(key);
  }
  return [...ctx.catalog.keys()].filter((key) => keys.has(key)).map((key, index) => [key, fixtureValue(ctx, key, index + 1)]);
}

/**
 * Emits fill steps for non-controller fields that are visible in `raw` and not yet filled.
 * Call it right after the controllers are set to `raw`, so every field is on the page when typed into.
 */
function fillVisible(ctx: Ctx, objective: Objective, raw: Record<string, string>, exclude: string[], filled: Map<string, string | boolean>): void {
  const behavior = expectedAt(ctx, raw);
  let index = filled.size;
  for (const key of ctx.catalog.keys()) {
    if (filled.has(key) || exclude.includes(key) || ctx.controllers.includes(key) || !behavior.get(key)?.visible) continue;
    index += 1;
    const value = fixtureValue(ctx, key, index);
    filled.set(key, value);
    objective.set(key, value);
  }
}

function setCell(objective: Objective, raw: Record<string, string>): void {
  for (const [key, value] of Object.entries(raw)) objective.set(key, value);
}

/* ------------------------------------------------------- objective text */

class Objective {
  private lines: string[] = [];
  constructor(private ctx: Ctx, submits: boolean) {
    this.lines.push("Open {{preview_url}}");
    this.lines.push(submits ? "This is an automated form check that uses synthetic data." : "This is an automated form check that uses synthetic data. Do not submit the form.");
    // A browser agent may plan ahead and look for a field before the answer that reveals it is
    // entered (DEV-LOOP-02). The order of the steps below is part of the check.
    if (ctx.definition.fields.some((field) => field.visibility === "conditional")) {
      this.lines.push("Some fields appear only after an earlier answer is entered. Follow the steps in order, and do not look for a field before the step that names it.");
    }
    this.lines.push("Store the 8-character code shown at the end of the page footer as 'page_definition_hash'.");
  }
  label(key: string) {
    return this.ctx.labels.get(key) ?? key;
  }
  private conditional(key: string) {
    return this.ctx.definition.fields.find((field) => field.key === key)?.visibility === "conditional";
  }
  set(key: string, value: string | boolean) {
    const field = this.ctx.catalog.get(key) as FieldLike;
    // A conditional field is only set where the approved claims make it visible, so it must be on
    // the page by now; waiting for it keeps the agent from concluding that it is missing.
    if (this.conditional(key)) this.lines.push(`Wait until a field labeled "${this.label(key)}" is shown; it appears only after the earlier answers.`);
    if (field.type === "checkbox") {
      this.lines.push(value === true || value === "true" ? `Make sure the checkbox labeled "${this.label(key)}" is checked.` : `Make sure the checkbox labeled "${this.label(key)}" is not checked.`);
    } else if (field.type === "single_select") {
      const option = field.options?.find((candidate) => candidate.value === value)?.label ?? String(value);
      this.lines.push(value === "" ? `In the field labeled "${this.label(key)}", clear the selection.` : `In the field labeled "${this.label(key)}", select the option "${option}".`);
    } else if (value === "") {
      this.lines.push(`In the field labeled "${this.label(key)}", clear any existing text, then press Tab.`);
    } else {
      this.lines.push(`In the field labeled "${this.label(key)}", clear any existing text, type exactly "${String(value)}", then press Tab.`);
    }
  }
  typeInto(key: string, value: string) {
    this.lines.push(`In the field labeled "${this.label(key)}", type exactly "${value}".`);
  }
  visible(key: string, as: string) {
    this.lines.push(`Store whether a field labeled "${this.label(key)}" is visible on the page as '${as}' (true or false).`);
  }
  required(key: string, as: string) {
    this.lines.push(`Store whether the label of the field "${this.label(key)}" shows the text "(required)" as '${as}' (true or false; false if the field is not visible).`);
  }
  error(key: string, as: string) {
    this.lines.push(`Store whether an error message is shown for the field labeled "${this.label(key)}" as '${as}' (true or false).`);
  }
  submit() {
    this.lines.push(`Click the button labeled "${this.ctx.submitLabel}".`);
  }
  submitted(as: string) {
    this.lines.push(`Store whether a confirmation message with a receipt code is shown as '${as}' (true or false).`);
  }
  receipt() {
    this.lines.push("Store the 8-character receipt code shown in the confirmation message as 'receipt_code'.");
  }
  finish() {
    this.lines.push("Finally verify that the page footer shows a version code.");
    return this.lines.join("\n");
  }
}

const bool = (value: boolean): Expectation => ({ type: "bool", value });
// Stage 0 (the page identity read from the footer) is implicit in every Kane probe; the verdict
// compares it with the identity of the version under test.

function kaneProbe(kind: ProbeKind, claimKeys: string[], goldenIds: string[], stages: Stage[], objective: string, serverEvidence: ServerEvidenceSpec | null, timeoutSeconds: number): Omit<ProbeSpec, "probeKey"> {
  return { kind, executor: "kane", claimKeys: [...new Set(claimKeys)].sort(), goldenIds, stages, objectiveTemplate: objective, objectiveHash: sha256Hex(objective), serverEvidence, checks: null, timeoutSeconds };
}

/* ------------------------------------------------------------ probes */

function claimsOn(ctx: Ctx, field: string, kinds: Claim["kind"][]): string[] {
  return ctx.claims.filter((claim) => "field" in claim && claim.field === field && kinds.includes(claim.kind)).map((claim) => claim.key);
}

function initialRequired(ctx: Ctx): Omit<ProbeSpec, "probeKey">[] {
  const empty: Record<string, string> = {};
  const behavior = expectedAt(ctx, empty);
  const keys = [...ctx.catalog.keys()];
  const requiredInitially = keys.filter((key) => behavior.get(key)?.required);
  const chunks: string[][] = [];
  for (let index = 0; index < keys.length; index += 12) chunks.push(keys.slice(index, index + 12));
  return chunks.map((chunk, chunkIndex) => {
    const objective = new Objective(ctx, chunkIndex === 0 && requiredInitially.length > 0);
    const stage1: Stage = { stage: 1, name: "initial state", expect: {} };
    for (const key of chunk) {
      objective.visible(key, `obs_${key}_visible`);
      objective.required(key, `obs_${key}_required`);
      stage1.expect[`obs_${key}_visible`] = bool(behavior.get(key)?.visible ?? false);
      stage1.expect[`obs_${key}_required`] = bool(behavior.get(key)?.required ?? false);
    }
    const stages: Stage[] = [stage1];
    if (chunkIndex === 0 && requiredInitially.length > 0) {
      objective.submit();
      objective.submitted("obs_empty_submitted");
      const stage2: Stage = { stage: 2, name: "submit with required fields empty", expect: { obs_empty_submitted: bool(false) } };
      for (const key of requiredInitially) {
        objective.error(key, `obs_${key}_error`);
        stage2.expect[`obs_${key}_error`] = bool(true);
      }
      stages.push(stage2);
    }
    const covered = chunk.flatMap((key) => claimsOn(ctx, key, ["FIELD", "VISIBLE_WHEN", "REQUIRED_WHEN"]));
    return kaneProbe("initial_required", covered, ["K-04"], stages, objective.finish(), null, 240);
  });
}

function boundaryBundles(ctx: Ctx): Omit<ProbeSpec, "probeKey">[] {
  const probes: Omit<ProbeSpec, "probeKey">[] = [];
  for (const controller of ctx.controllers) {
    const field = ctx.catalog.get(controller) as FieldLike;
    if (field.type !== "number") continue;
    const precision = field.precision ?? 0;
    for (const threshold of literalsFor(controller, claimConditions(ctx.claims))) {
      const t = decimalFromLiteral(threshold);
      const points = [-1n, 0n, 1n].map((delta) => formatFixed(addUnits(t, delta, precision), precision));
      // Other controllers: a base cell in which this threshold is decisive for some field.
      const others = ctx.cells.map((cell) => Object.fromEntries(Object.entries(cell.raw).filter(([key]) => key !== controller)));
      const unique = [...new Map(others.map((raw) => [canonicalJson(raw), raw])).values()];
      let chosen: { base: Record<string, string>; targets: string[] } | null = null;
      for (const base of unique) {
        const behaviors = points.map((point) => expectedAt(ctx, { ...base, [controller]: point }));
        const targets = [...ctx.catalog.keys()].filter((key) => key !== controller && behaviors.some((behavior) => canonicalJson(behavior.get(key)) !== canonicalJson(behaviors[0]?.get(key))));
        if (targets.length > 0) {
          chosen = { base, targets };
          break;
        }
      }
      if (!chosen) continue;
      const objective = new Objective(ctx, false);
      for (const [key, value] of Object.entries(chosen.base)) if (value !== "") objective.set(key, value);
      const stages: Stage[] = [];
      points.forEach((point, index) => {
        objective.set(controller, point);
        const behavior = expectedAt(ctx, { ...chosen.base, [controller]: point });
        const stage: Stage = { stage: index + 1, name: `${field.label} = ${point}`, expect: {} };
        for (const target of chosen.targets) {
          objective.visible(target, `obs_${index + 1}_${target}_visible`);
          objective.required(target, `obs_${index + 1}_${target}_required`);
          stage.expect[`obs_${index + 1}_${target}_visible`] = bool(behavior.get(target)?.visible ?? false);
          stage.expect[`obs_${index + 1}_${target}_required`] = bool(behavior.get(target)?.required ?? false);
        }
        stages.push(stage);
      });
      const covered = chosen.targets.flatMap((target) => claimsOn(ctx, target, ["VISIBLE_WHEN", "REQUIRED_WHEN"]));
      probes.push(kaneProbe("boundary_bundle", covered, ["K-01", "K-02", "K-03"], stages, objective.finish(), null, 300));
    }
  }
  return probes;
}

/** Cells ordered so that witnesses on approved thresholds come first. */
function rankedCells(ctx: Ctx): Cell[] {
  return [...ctx.cells].sort((a, b) => Object.keys(b.thresholds).length - Object.keys(a.thresholds).length);
}

function conditionalRequired(ctx: Ctx, gaps: CoverageGap[]): Omit<ProbeSpec, "probeKey">[] {
  const probes: Omit<ProbeSpec, "probeKey">[] = [];
  const targets = [...new Set(ctx.claims.flatMap((claim) => ((claim.kind === "VISIBLE_WHEN" && claim.requiredWhenVisible) || claim.kind === "REQUIRED_WHEN" ? [claim.field] : [])))];
  for (const target of targets) {
    const claimKeys = claimsOn(ctx, target, ["VISIBLE_WHEN", "REQUIRED_WHEN"]);
    const ranked = rankedCells(ctx);
    const active = ranked.find((cell) => expectedAt(ctx, cell.raw).get(target)?.required);
    const inactive = active
      ? [...ctx.cells]
          .filter((cell) => !expectedAt(ctx, cell.raw).get(target)?.required && Object.values(cell.raw).every((raw) => raw !== ""))
          .sort((a, b) => distance(a, active) - distance(b, active))[0]
      : undefined;
    if (!active || !inactive) {
      claimKeys.forEach((claimKey) => gaps.push({ claimKey, obligation: "conditional_required_empty" }));
      continue;
    }
    const objective = new Objective(ctx, true);
    const filled = new Map<string, string | boolean>();
    fillVisible(ctx, objective, {}, [target], filled);
    setCell(objective, inactive.raw);
    fillVisible(ctx, objective, inactive.raw, [target], filled);
    setCell(objective, active.raw);
    fillVisible(ctx, objective, active.raw, [target], filled);
    const activeBehavior = expectedAt(ctx, active.raw).get(target) as FieldBehavior;
    objective.visible(target, "obs_active_visible");
    objective.required(target, "obs_active_required");
    objective.submit();
    objective.submitted("obs_active_submitted");
    objective.error(target, "obs_active_error");
    for (const [key, value] of Object.entries(inactive.raw)) objective.set(key, value);
    objective.submit();
    objective.submitted("submitted");
    objective.receipt();
    const stages: Stage[] = [
      { stage: 1, name: "condition active", expect: { obs_active_visible: bool(activeBehavior.visible), obs_active_required: bool(true) } },
      { stage: 2, name: "submit with the conditionally required field empty", expect: { obs_active_submitted: bool(false), obs_active_error: bool(true) } },
      { stage: 3, name: "condition inactive, submit", expect: { submitted: bool(true), receipt_code: { type: "receipt" } } },
    ];
    probes.push(kaneProbe("conditional_required_empty", claimKeys, ["K-02"], stages, objective.finish(), { expectSubmissions: 1, forbiddenKeys: [], markers: [] }, 360));
  }
  return probes;
}

function distance(a: Cell, b: Cell): number {
  return Object.keys(a.raw).filter((key) => a.raw[key] !== b.raw[key]).length;
}

function hiddenExclusion(ctx: Ctx, gaps: CoverageGap[]): Omit<ProbeSpec, "probeKey">[] {
  const targets = [...new Set(ctx.claims.flatMap((claim) => (claim.kind === "VISIBLE_WHEN" ? [claim.field] : [])))];
  const groups: { targets: string[]; shown: Cell; hidden: Cell }[] = [];
  const findCells = (group: string[]) => {
    const ranked = rankedCells(ctx);
    const shown = ranked.find((cell) => group.every((target) => expectedAt(ctx, cell.raw).get(target)?.visible));
    const hidden = shown
      ? [...ctx.cells]
          .filter((cell) => group.every((target) => !expectedAt(ctx, cell.raw).get(target)?.visible) && Object.values(cell.raw).every((raw) => raw !== ""))
          .sort((a, b) => distance(a, shown) - distance(b, shown))[0]
      : undefined;
    return shown && hidden ? { shown, hidden } : null;
  };
  for (const target of targets) {
    const current = groups[groups.length - 1];
    if (current && current.targets.length < 5) {
      const cells = findCells([...current.targets, target]);
      if (cells) {
        groups[groups.length - 1] = { targets: [...current.targets, target], ...cells };
        continue;
      }
    }
    const cells = findCells([target]);
    if (!cells) {
      claimsOn(ctx, target, ["VISIBLE_WHEN"]).forEach((claimKey) => gaps.push({ claimKey, obligation: "hidden_exclusion" }));
      continue;
    }
    groups.push({ targets: [target], ...cells });
  }
  return groups.map((group) => {
    const objective = new Objective(ctx, true);
    const filled = new Map<string, string | boolean>();
    fillVisible(ctx, objective, {}, group.targets, filled);
    setCell(objective, group.shown.raw);
    fillVisible(ctx, objective, group.shown.raw, group.targets, filled);
    const stage1: Stage = { stage: 1, name: "fields shown", expect: {} };
    group.targets.forEach((target) => {
      objective.visible(target, `obs_${target}_shown`);
      stage1.expect[`obs_${target}_shown`] = bool(true);
    });
    group.targets.forEach((target, index) => objective.typeInto(target, MARKER(index + 1)));
    setCell(objective, group.hidden.raw);
    fillVisible(ctx, objective, group.hidden.raw, group.targets, filled);
    const stage2: Stage = { stage: 2, name: "fields hidden again", expect: {} };
    group.targets.forEach((target) => {
      objective.visible(target, `obs_${target}_hidden_visible`);
      stage2.expect[`obs_${target}_hidden_visible`] = bool(false);
    });
    objective.submit();
    objective.submitted("submitted");
    objective.receipt();
    const stages: Stage[] = [stage1, stage2, { stage: 3, name: "submit", expect: { submitted: bool(true), receipt_code: { type: "receipt" } } }];
    const claimKeys = group.targets.flatMap((target) => claimsOn(ctx, target, ["VISIBLE_WHEN"]));
    return kaneProbe(
      "hidden_exclusion",
      claimKeys,
      ["K-05"],
      stages,
      objective.finish(),
      { expectSubmissions: 1, forbiddenKeys: group.targets, markers: group.targets.map((_, index) => MARKER(index + 1)) },
      360,
    );
  });
}

function expectedAnswers(ctx: Ctx, raw: Record<string, string | boolean>): Record<string, string | boolean> {
  const stringRaw = Object.fromEntries(Object.entries(raw).filter(([key]) => ctx.controllers.includes(key)).map(([key, value]) => [key, String(value)]));
  const behavior = expectedAt(ctx, stringRaw);
  const out: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!behavior.get(key)?.visible) continue;
    const parsed = parseValue(ctx.catalog.get(key) as FieldLike, value).value;
    const stored = serializeValue(parsed);
    if (stored !== null && !(parsed.t === "bool" && parsed.v === false)) out[key] = stored;
  }
  return out;
}

function validCell(ctx: Ctx): Cell | undefined {
  const complete = ctx.cells.filter((cell) => Object.values(cell.raw).every((raw) => raw !== ""));
  return complete.sort((a, b) => {
    const visibleCount = (cell: Cell) => [...expectedAt(ctx, cell.raw).values()].filter((state) => state.visible).length;
    return visibleCount(b) - visibleCount(a) || Object.keys(b.thresholds).length - Object.keys(a.thresholds).length;
  })[0] ?? { assignment: {}, raw: {}, thresholds: {} };
}

function validSubmission(ctx: Ctx): { probe: Omit<ProbeSpec, "probeKey">; payload: Record<string, string | boolean> } | null {
  const cell = validCell(ctx);
  if (!cell) return null;
  const objective = new Objective(ctx, true);
  const filled = new Map<string, string | boolean>();
  fillVisible(ctx, objective, {}, [], filled);
  setCell(objective, cell.raw);
  fillVisible(ctx, objective, cell.raw, [], filled);
  const payload: Record<string, string | boolean> = { ...Object.fromEntries(filled), ...cell.raw };
  objective.submit();
  objective.submitted("submitted");
  objective.receipt();
  const stages: Stage[] = [{ stage: 1, name: "submit valid answers", expect: { submitted: bool(true), receipt_code: { type: "receipt" } } }];
  const claimKeys = ctx.claims.filter((claim) => claim.kind !== "MANUAL").map((claim) => claim.key);
  return {
    probe: kaneProbe("valid_submission", claimKeys, ["K-06"], stages, objective.finish(), { expectSubmissions: 1, forbiddenKeys: [], markers: [], expectedAnswers: expectedAnswers(ctx, payload) }, 300),
    payload,
  };
}

function decimalComma(ctx: Ctx): Omit<ProbeSpec, "probeKey">[] {
  const probes: Omit<ProbeSpec, "probeKey">[] = [];
  for (const controller of ctx.controllers) {
    const field = ctx.catalog.get(controller) as FieldLike;
    if (field.type !== "number" || (field.precision ?? 0) === 0) continue;
    const threshold = literalsFor(controller, claimConditions(ctx.claims)).find((literal) => literal.includes("."));
    if (!threshold) continue;
    const typed = threshold.replace(".", ",");
    const behavior = expectedAt(ctx, { [controller]: threshold });
    const targets = [...ctx.catalog.keys()].filter((key) => key !== controller && claimsOn(ctx, key, ["VISIBLE_WHEN", "REQUIRED_WHEN"]).length > 0);
    if (targets.length === 0) continue;
    const objective = new Objective(ctx, false);
    objective.set(controller, typed);
    const stage: Stage = { stage: 1, name: `${field.label} typed as "${typed}"`, expect: {} };
    for (const target of targets) {
      objective.visible(target, `obs_${target}_visible`);
      objective.required(target, `obs_${target}_required`);
      stage.expect[`obs_${target}_visible`] = bool(behavior.get(target)?.visible ?? false);
      stage.expect[`obs_${target}_required`] = bool(behavior.get(target)?.required ?? false);
    }
    probes.push(kaneProbe("decimal_comma", targets.flatMap((target) => claimsOn(ctx, target, ["VISIBLE_WHEN", "REQUIRED_WHEN"])), ["K-02"], [stage], objective.finish(), null, 240));
  }
  return probes;
}

function numericConstraints(ctx: Ctx) {
  return ctx.claims.filter(
    (claim): claim is Extract<Claim, { kind: "CONSTRAINT" }> =>
      claim.kind === "CONSTRAINT" && ctx.catalog.get(claim.field)?.type === "number" && (claim.constraint.min !== undefined || claim.constraint.max !== undefined),
  );
}

function outOfRange(ctx: Ctx, claim: Extract<Claim, { kind: "CONSTRAINT" }>): string[] {
  const precision = ctx.catalog.get(claim.field)?.precision ?? 0;
  const values: string[] = [];
  if (claim.constraint.max !== undefined) values.push(formatFixed(addUnits(decimalFromLiteral(claim.constraint.max), 1n, precision), precision));
  if (claim.constraint.min !== undefined) values.push(formatFixed(addUnits(decimalFromLiteral(claim.constraint.min), -1n, precision), precision));
  return values;
}

function constraintCheck(ctx: Ctx, valid: Record<string, string | boolean>): Omit<ProbeSpec, "probeKey">[] {
  const constraints = numericConstraints(ctx).slice(0, 5);
  if (constraints.length === 0) return [];
  const objective = new Objective(ctx, true);
  const controllerRaw = Object.fromEntries(Object.entries(valid).filter(([key]) => ctx.controllers.includes(key)).map(([key, value]) => [key, String(value)]));
  const filled = new Map<string, string | boolean>();
  fillVisible(ctx, objective, {}, [], filled);
  setCell(objective, controllerRaw);
  fillVisible(ctx, objective, controllerRaw, [], filled);
  const stages: Stage[] = [];
  constraints.forEach((claim, index) => {
    const value = outOfRange(ctx, claim)[0] as string;
    objective.set(claim.field, value);
    objective.submit();
    objective.submitted(`obs_${index + 1}_submitted`);
    objective.error(claim.field, `obs_${index + 1}_${claim.field}_error`);
    stages.push({ stage: index + 1, name: `${ctx.labels.get(claim.field)} = ${value}`, expect: { [`obs_${index + 1}_submitted`]: bool(false), [`obs_${index + 1}_${claim.field}_error`]: bool(true) } });
  });
  return [kaneProbe("constraint_check", constraints.map((claim) => claim.key), [], stages, objective.finish(), null, 300)];
}

function serverContract(ctx: Ctx, valid: Record<string, string | boolean>): Omit<ProbeSpec, "probeKey"> {
  const checks: ServerCheck[] = [];
  let index = 0;
  const add = (check: Omit<ServerCheck, "checkKey">) => checks.push({ checkKey: `${check.code}-${String(++index).padStart(2, "0")}`, ...check });
  add({ code: "S0", claimKeys: ctx.claims.filter((claim) => claim.kind !== "MANUAL").map((claim) => claim.key), payload: valid, expect: { status: 201, storedAnswers: expectedAnswers(ctx, valid) } });

  const initial = expectedAt(ctx, {});
  for (const key of ctx.catalog.keys()) {
    if (!initial.get(key)?.required) continue;
    const payload = { ...valid };
    delete payload[key];
    add({ code: "S1", claimKeys: claimsOn(ctx, key, ["FIELD"]), payload, expect: { status: 422, fieldErrorKeys: [key] } });
  }
  for (const claim of ctx.claims) {
    if (!((claim.kind === "VISIBLE_WHEN" && claim.requiredWhenVisible) || claim.kind === "REQUIRED_WHEN")) continue;
    const active = rankedCells(ctx).find((cell) => expectedAt(ctx, cell.raw).get(claim.field)?.required);
    if (!active) continue;
    const payload = { ...Object.fromEntries(fillPlan(ctx, [active.raw], [claim.field])), ...active.raw };
    add({ code: "S2", claimKeys: [claim.key], payload, expect: { status: 422, fieldErrorKeys: [claim.field] } });
  }
  for (const claim of ctx.claims) {
    if (claim.kind !== "VISIBLE_WHEN") continue;
    const hidden = ctx.cells.find((cell) => !expectedAt(ctx, cell.raw).get(claim.field)?.visible && Object.values(cell.raw).every((raw) => raw !== ""));
    if (!hidden) continue;
    const payload = { ...Object.fromEntries(fillPlan(ctx, [hidden.raw], [claim.field])), ...hidden.raw, [claim.field]: `NIARVA-HIDDEN-S3-${claim.key}` };
    add({ code: "S3", claimKeys: [claim.key], payload, expect: { status: 201, absentKeys: [claim.field] } });
  }
  for (const claim of numericConstraints(ctx)) {
    for (const value of outOfRange(ctx, claim)) {
      add({ code: "S4", claimKeys: [claim.key], payload: { ...valid, [claim.field]: value }, expect: { status: 422, fieldErrorKeys: [claim.field] } });
    }
  }
  for (const claim of ctx.claims) {
    if (claim.kind !== "CONSTRAINT" || ctx.catalog.get(claim.field)?.type === "number") continue;
    const max = claim.constraint.maxLength;
    if (max !== undefined) add({ code: "S4", claimKeys: [claim.key], payload: { ...valid, [claim.field]: "x".repeat(max + 1) }, expect: { status: 422, fieldErrorKeys: [claim.field] } });
  }
  const body = canonicalJson(checks);
  return { kind: "server_contract", executor: "http", claimKeys: [...new Set(checks.flatMap((check) => check.claimKeys))].sort(), goldenIds: ["K-04", "K-05", "K-06"], stages: [], objectiveTemplate: null, objectiveHash: sha256Hex(body), serverEvidence: null, checks, timeoutSeconds: 120 };
}

/* ---------------------------------------------------------------- plan */

function coverageOf(ctx: Ctx, probes: ProbeSpec[]): { coverage: ProbePlan["coverage"]; gaps: CoverageGap[] } {
  const coverage: ProbePlan["coverage"] = {};
  const gaps: CoverageGap[] = [];
  const keysOf = (kind: ProbeKind, claimKey: string) => probes.filter((probe) => probe.kind === kind && probe.claimKeys.includes(claimKey)).map((probe) => probe.probeKey);
  const checkKeys = (code: ServerCheck["code"], claimKey: string) =>
    probes.flatMap((probe) => (probe.checks ?? []).filter((check) => check.code === code && check.claimKeys.includes(claimKey)).map((check) => `${probe.probeKey}:${check.checkKey}`));
  for (const claim of ctx.claims) {
    if (claim.kind === "MANUAL") continue;
    const obligations: Record<string, string[]> = {};
    const initial = expectedAt(ctx, {});
    if (claim.kind === "FIELD") {
      obligations.presence = keysOf("initial_required", claim.key);
      if (claim.required === "always" && initial.get(claim.field)?.required) {
        obligations.server_required = checkKeys("S1", claim.key);
      }
    }
    if (claim.kind === "VISIBLE_WHEN" || claim.kind === "REQUIRED_WHEN") {
      const numeric = [...conditionFields(claim.when)].some((key) => ctx.catalog.get(key)?.type === "number");
      if (numeric) obligations.boundary = keysOf("boundary_bundle", claim.key);
      if (claim.kind === "VISIBLE_WHEN") {
        obligations.hidden_exclusion = keysOf("hidden_exclusion", claim.key);
        obligations.server_hidden = checkKeys("S3", claim.key);
      }
      if ((claim.kind === "VISIBLE_WHEN" && claim.requiredWhenVisible) || claim.kind === "REQUIRED_WHEN") {
        obligations.conditional_required = keysOf("conditional_required_empty", claim.key);
        obligations.server_conditional_required = checkKeys("S2", claim.key);
      }
    }
    if (claim.kind === "CONSTRAINT") {
      if (ctx.catalog.get(claim.field)?.type === "number" && (claim.constraint.min !== undefined || claim.constraint.max !== undefined)) {
        obligations.constraint = keysOf("constraint_check", claim.key);
      }
      obligations.server_constraint = checkKeys("S4", claim.key);
      if (obligations.server_constraint.length === 0 && ctx.catalog.get(claim.field)?.type !== "number" && claim.constraint.maxLength === undefined) {
        delete obligations.server_constraint;
      }
    }
    coverage[claim.key] = obligations;
    for (const [obligation, keys] of Object.entries(obligations)) if (keys.length === 0) gaps.push({ claimKey: claim.key, obligation });
  }
  return { coverage, gaps };
}

/**
 * Derives the mandatory probe set for a statically verified version. The oracle of every probe
 * comes from the approved claims; the definition only supplies the labels the browser shows.
 * The same input always yields the same plan and `scenarioSetHash`.
 */
export function deriveProbePlan(definition: FormDefinition, content: ClaimSetContent, pageIdentityValue: string): ProbePlan {
  const ctx = buildContext(definition, content, pageIdentityValue);
  const gaps: CoverageGap[] = [];
  const valid = validSubmission(ctx);
  const drafts: Omit<ProbeSpec, "probeKey">[] = [
    ...initialRequired(ctx),
    ...boundaryBundles(ctx),
    ...conditionalRequired(ctx, gaps),
    ...hiddenExclusion(ctx, gaps),
    ...(valid ? [valid.probe] : []),
    ...decimalComma(ctx),
    ...(valid ? constraintCheck(ctx, valid.payload) : []),
    ...(valid ? [serverContract(ctx, valid.payload)] : []),
  ];
  const probes: ProbeSpec[] = drafts.map((draft, index) => ({ probeKey: `P-${String(index + 1).padStart(2, "0")}`, ...draft }));
  const { coverage, gaps: coverageGaps } = coverageOf(ctx, probes);
  const allGaps = [...gaps, ...coverageGaps].filter((gap, index, list) => list.findIndex((other) => other.claimKey === gap.claimKey && other.obligation === gap.obligation) === index);
  return {
    policyVersion: PROBE_POLICY_VERSION,
    probes,
    scenarioSetHash: sha256Hex(`ss1|${PROBE_POLICY_VERSION}|${canonicalJson(probes)}`),
    gaps: allGaps,
    coverage,
  };
}

/**
 * A diagnostic probe that replays a static counterexample in a real browser. It can confirm a
 * failure but never verifies a version.
 */
export function deriveConfirmationProbe(definition: FormDefinition, content: ClaimSetContent, pageIdentityValue: string, counterexample: Counterexample, claimKeys: string[]): ProbeSpec {
  const ctx = buildContext(definition, content, pageIdentityValue);
  const objective = new Objective(ctx, false);
  for (const [key, value] of Object.entries(counterexample.assignment)) if (value !== "") objective.set(key, value);
  objective.visible(counterexample.field, `obs_${counterexample.field}_visible`);
  objective.required(counterexample.field, `obs_${counterexample.field}_required`);
  const text = objective.finish();
  const stages: Stage[] = [
    {
      stage: 1,
      name: Object.entries(counterexample.assignment).map(([key, value]) => `${ctx.labels.get(key) ?? key} = ${value || "(empty)"}`).join(", ") || "initial state",
      expect: {
        [`obs_${counterexample.field}_visible`]: bool(counterexample.expected.visible),
        [`obs_${counterexample.field}_required`]: bool(counterexample.expected.required),
      },
    },
  ];
  return { probeKey: "D-01", ...kaneProbe("counterexample_confirmation", claimKeys, ["K-02"], stages, text, null, 240) };
}
