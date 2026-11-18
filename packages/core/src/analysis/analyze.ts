import { compareDecimal, decimalFromLiteral } from "../decimal/decimal";
import { LIMITS, claimSetContentSchema, type Claim, type ClaimSetContent, type FormDefinition, type Validation } from "../dsl/schema";
import { activeClaims, catalogFields, compositionProblems } from "../claims/claims";
import { behaviorOf, definitionModel, intentModel, type FieldBehavior } from "../eval/evaluate";
import type { FieldLike } from "../eval/values";
import { ENGINE_VERSION } from "../version";
import { makeFinding, type Counterexample, type Finding } from "./findings";
import { claimConditions, controllersOf, enumerateCells, literalsFor, representatives, ruleConditions, type Cell } from "./partition";
import { validateStructure } from "./structure";

export type ClaimStatus = { status: "PASS" | "FAILED" | "UNKNOWN"; findingKeys: string[] };

/** How each rule relates to the approved claims (rule → claim direction of the Intent Trace). */
export type RuleTrace = {
  ruleId: string;
  target: string;
  /** Claims whose behavior this rule is needed for (removing it breaks them). */
  servesClaims: string[];
  /**
   * supported: needed by an approved claim and its target matches the intent.
   * conflicting: its target behaves differently from the approved intent.
   * unrequested: removing it changes nothing; no approved claim asks for it.
   */
  status: "supported" | "unrequested" | "conflicting";
};

export type AnalysisResult = {
  engineVersion: string;
  gate1: "PASS" | "FAILED";
  verdict: "PASS" | "FAILED" | "UNKNOWN";
  findings: Finding[];
  claimStatuses: Record<string, ClaimStatus>;
  ruleTrace: RuleTrace[];
  stats: { cells: number; controllers: string[] };
};

type CellBehavior = { cell: Cell; expected: Map<string, FieldBehavior>; actual: Map<string, FieldBehavior> };

const describeCell = (cell: Cell, fields: Map<string, FieldLike>) => {
  const parts = Object.entries(cell.raw).map(([key, raw]) => `${fields.get(key)?.label ?? key} = ${raw === "" ? "(empty)" : raw}`);
  return parts.length > 0 ? parts.join(", ") : "the initial state";
};

/** Prefers witnesses that sit exactly on a threshold named by an approved claim, then simpler cells. */
function witnessScore(cell: Cell, claimThresholds: Map<string, Set<string>>): number {
  let score = 0;
  for (const [key, threshold] of Object.entries(cell.thresholds)) if (claimThresholds.get(key)?.has(threshold)) score += 100;
  score -= Object.values(cell.raw).filter((raw) => raw !== "" && raw !== "false").length;
  return score;
}

function constraintOf(field: FieldLike, definitionField: FormDefinition["fields"][number] | undefined, claims: Claim[]) {
  const claim = claims.find((candidate): candidate is Extract<Claim, { kind: "CONSTRAINT" }> => candidate.kind === "CONSTRAINT" && candidate.field === field.key);
  const expected: Validation = { ...(claim?.constraint ?? {}) };
  if (field.type === "number") expected.precision = claim?.constraint.precision ?? field.precision ?? 0;
  const actual: Validation = { ...(definitionField?.validation ?? {}) };
  if (definitionField?.type === "number") actual.precision = actual.precision ?? 0;
  return { claim, expected, actual };
}

function sameValidation(a: Validation, b: Validation): boolean {
  const decimalEq = (x?: string, y?: string) =>
    x === undefined || y === undefined ? x === y : compareDecimal(decimalFromLiteral(x), decimalFromLiteral(y)) === 0;
  return (
    decimalEq(a.min, b.min) &&
    decimalEq(a.max, b.max) &&
    (a.precision ?? null) === (b.precision ?? null) &&
    (a.minLength ?? null) === (b.minLength ?? null) &&
    (a.maxLength ?? null) === (b.maxLength ?? null) &&
    (a.pattern ?? null) === (b.pattern ?? null)
  );
}

/**
 * Gate 1 (L0) and Gate 2 (L1 + L2) for one form version against its approved claims.
 * Deterministic and exhaustive within DSL v1: the oracle is the approved intent, never
 * the candidate implementation.
 */
export function analyze(definitionInput: unknown, contentInput: ClaimSetContent): AnalysisResult {
  const structure = validateStructure(definitionInput);
  const base = { engineVersion: ENGINE_VERSION, ruleTrace: [] as RuleTrace[], claimStatuses: {} as Record<string, ClaimStatus> };
  if (!structure.ok) {
    return { ...base, gate1: "FAILED", verdict: "FAILED", findings: structure.findings, stats: { cells: 0, controllers: [] } };
  }
  const definition = structure.definition;
  const content = claimSetContentSchema.parse(contentInput);
  const claims = activeClaims(content);
  const catalog = catalogFields(content);
  const catalogMap = new Map(catalog.map((field) => [field.key, field]));
  const findings: Finding[] = [];
  const add = (input: Omit<Finding, "key">) => findings.push(makeFinding(input));

  for (const problem of compositionProblems(content)) {
    add({ code: "CLAIM_CONFLICT", layer: "L2", severity: "error", fieldKeys: problem.fieldKey ? [problem.fieldKey] : [], ruleIds: [], claimKeys: problem.claimKey ? [problem.claimKey] : [], message: problem.message });
  }

  // Field catalog: two-way correspondence and types.
  const definitionFields = new Map(definition.fields.map((field) => [field.key, field]));
  const claimsFor = (key: string, kinds?: Claim["kind"][]) =>
    claims.filter((claim) => "field" in claim && claim.field === key && (!kinds || kinds.includes(claim.kind))).map((claim) => claim.key);
  for (const field of catalog) {
    const implemented = definitionFields.get(field.key);
    if (!implemented) {
      add({ code: "INTENT_MISSING_FIELD", layer: "L2", severity: "error", fieldKeys: [field.key], ruleIds: [], claimKeys: claimsFor(field.key), message: `The approved intent asks for "${field.label}", but the form does not contain it.` });
      continue;
    }
    const sameOptions =
      JSON.stringify((implemented.options ?? []).map((option) => option.value)) === JSON.stringify((field.options ?? []).map((option) => option.value));
    if (implemented.type !== field.type || (field.type === "single_select" && !sameOptions)) {
      add({ code: "INTENT_MISMATCH_TYPE", layer: "L2", severity: "error", fieldKeys: [field.key], ruleIds: [], claimKeys: claimsFor(field.key), message: `"${implemented.label}" is a ${implemented.type} field, but the approved intent describes a ${field.type} field${field.type === "single_select" ? " with these options" : ""}.` });
    }
    const { claim, expected, actual } = constraintOf(field, implemented, claims);
    if (!sameValidation(expected, actual)) {
      add({ code: "INTENT_MISMATCH_CONSTRAINT", layer: "L2", severity: "error", fieldKeys: [field.key], ruleIds: [], claimKeys: claim ? [claim.key] : claimsFor(field.key, ["FIELD", "VISIBLE_WHEN"]), message: `The input limits of "${implemented.label}" differ from the approved intent.` });
    }
  }
  for (const field of definition.fields) {
    if (!catalogMap.has(field.key)) {
      add({ code: "INTENT_UNREQUESTED_FIELD", layer: "L2", severity: "error", fieldKeys: [field.key], ruleIds: [], claimKeys: [], message: `"${field.label}" is in the form but not in the approved intent.` });
    }
  }
  const typeBroken = findings.some((finding) => ["INTENT_MISSING_FIELD", "INTENT_UNREQUESTED_FIELD", "INTENT_MISMATCH_TYPE", "CLAIM_CONFLICT"].includes(finding.code));
  if (typeBroken) return finish(base, definition, claims, findings, [], { cells: 0, controllers: [] });

  // Exhaustive partition over every controller named by a claim or a rule.
  const allConditions = [...claimConditions(claims), ...ruleConditions(definition)];
  const controllers = controllersOf(catalog.map((field) => field.key), allConditions).map((key) => {
    const field = catalogMap.get(key) as FieldLike;
    return { key, reps: representatives(field, literalsFor(key, allConditions)) };
  });
  const cells = enumerateCells(controllers, LIMITS.cellsPerAnalysis);
  if (!cells) {
    add({ code: "ENUMERATION_BOUND_EXCEEDED", layer: "L2", severity: "error", fieldKeys: controllers.map((controller) => controller.key), ruleIds: [], claimKeys: [], message: "The conditions combine too many inputs to be checked exhaustively. Simplify them." });
    return finish(base, definition, claims, findings, [], { cells: 0, controllers: controllers.map((controller) => controller.key) }, true);
  }

  const intent = intentModel(catalog, claims);
  const implementation = definitionModel(definition);
  const evaluated: CellBehavior[] = cells.map((cell) => ({ cell, expected: behaviorOf(intent, cell.assignment), actual: behaviorOf(implementation, cell.assignment) }));

  const claimThresholds = new Map<string, Set<string>>();
  for (const controller of controllers) claimThresholds.set(controller.key, new Set(literalsFor(controller.key, claimConditions(claims))));

  for (const field of catalog) {
    for (const aspect of ["visible", "required"] as const) {
      const mismatches = evaluated.filter(({ expected, actual }) => expected.get(field.key)?.[aspect] !== actual.get(field.key)?.[aspect]);
      if (mismatches.length === 0) continue;
      mismatches.sort((a, b) => witnessScore(b.cell, claimThresholds) - witnessScore(a.cell, claimThresholds));
      const witness = mismatches[0] as CellBehavior;
      const expected = witness.expected.get(field.key) as FieldBehavior;
      const actual = witness.actual.get(field.key) as FieldBehavior;
      const boundaryEntry = Object.entries(witness.cell.thresholds).find(([key, value]) => claimThresholds.get(key)?.has(value));
      const counterexample: Counterexample = {
        field: field.key,
        aspect,
        assignment: witness.cell.raw,
        expected,
        actual,
        ...(boundaryEntry ? { boundary: { field: boundaryEntry[0], value: boundaryEntry[1] } } : {}),
      };
      const rules = definition.rules.filter((rule) => rule.target === field.key).map((rule) => rule.id);
      const where = describeCell(witness.cell, catalogMap);
      const verb = aspect === "visible" ? (expected.visible ? "shown" : "hidden") : expected.required ? "required" : "optional";
      const actualVerb = aspect === "visible" ? (actual.visible ? "shows" : "hides") : actual.required ? "requires" : "does not require";
      add({
        code: aspect === "visible" ? "INTENT_MISMATCH_VISIBILITY" : "INTENT_MISMATCH_REQUIRED",
        layer: "L2",
        severity: "error",
        fieldKeys: [field.key],
        ruleIds: rules,
        claimKeys: claimsFor(field.key, aspect === "visible" ? ["FIELD", "VISIBLE_WHEN"] : ["FIELD", "VISIBLE_WHEN", "REQUIRED_WHEN"]),
        message: `At ${where}, the approved intent expects "${field.label}" to be ${verb}, but the form ${actualVerb} it.`,
        counterexample,
      });
    }
  }

  // L1: unreachable conditional fields and dead requirements.
  for (const field of definition.fields) {
    if (field.visibility === "conditional" && evaluated.every(({ actual }) => !actual.get(field.key)?.visible)) {
      add({ code: "UNREACHABLE_FIELD", layer: "L1", severity: "error", fieldKeys: [field.key], ruleIds: definition.rules.filter((rule) => rule.target === field.key).map((rule) => rule.id), claimKeys: [], message: `"${field.label}" can never be shown.` });
    }
  }

  const ruleTrace = traceRules(definition, catalog, claims, evaluated, cells);
  for (const trace of ruleTrace) {
    if (trace.status === "unrequested") {
      add({ code: "INTENT_UNREQUESTED_RULE", layer: "L2", severity: "warning", fieldKeys: [trace.target], ruleIds: [trace.ruleId], claimKeys: [], message: `Rule ${trace.ruleId} is not needed by any approved claim; it has no effect on the verified behavior.` });
    }
  }
  return finish(base, definition, claims, findings, ruleTrace, { cells: cells.length, controllers: controllers.map((controller) => controller.key) });
}

/** Rule → claim direction: ablate each rule and see which claimed behaviors depend on it. */
function traceRules(
  definition: FormDefinition,
  catalog: FieldLike[],
  claims: Claim[],
  evaluated: CellBehavior[],
  cells: Cell[],
): RuleTrace[] {
  return definition.rules.map((rule) => {
    const without = definitionModel({ ...definition, rules: definition.rules.filter((other) => other.id !== rule.id) });
    const servesFields = new Set<string>();
    let changesBehavior = false;
    let causesMismatch = false;
    let targetMismatch = false;
    cells.forEach((cell, index) => {
      const withRule = evaluated[index] as CellBehavior;
      const withoutRule = behaviorOf(without, cell.assignment);
      const targetActual = withRule.actual.get(rule.target);
      const targetExpected = withRule.expected.get(rule.target);
      if (targetActual && targetExpected && (targetActual.visible !== targetExpected.visible || targetActual.required !== targetExpected.required)) {
        targetMismatch = true;
      }
      for (const field of catalog) {
        const a = withRule.actual.get(field.key);
        const b = withoutRule.get(field.key);
        const e = withRule.expected.get(field.key);
        if (!a || !b || !e) continue;
        if (a.visible !== b.visible || a.required !== b.required) {
          changesBehavior = true;
          const correctWith = a.visible === e.visible && a.required === e.required;
          const correctWithout = b.visible === e.visible && b.required === e.required;
          if (correctWith && !correctWithout) servesFields.add(field.key);
          if (!correctWith && correctWithout) causesMismatch = true;
        }
      }
    });
    const servesClaims = claims.filter((claim) => "field" in claim && claim.field !== undefined && servesFields.has(claim.field)).map((claim) => claim.key);
    // A rule whose target still deviates from the approved intent implements that intent incorrectly.
    const status: RuleTrace["status"] = causesMismatch || (changesBehavior && targetMismatch) ? "conflicting" : changesBehavior ? "supported" : "unrequested";
    return { ruleId: rule.id, target: rule.target, servesClaims, status };
  });
}

function finish(
  base: { engineVersion: string; ruleTrace: RuleTrace[]; claimStatuses: Record<string, ClaimStatus> },
  _definition: FormDefinition,
  claims: Claim[],
  findings: Finding[],
  ruleTrace: RuleTrace[],
  stats: AnalysisResult["stats"],
  boundExceeded = false,
): AnalysisResult {
  const claimStatuses: Record<string, ClaimStatus> = {};
  for (const claim of claims) {
    if (claim.kind === "MANUAL") {
      claimStatuses[claim.key] = { status: "UNKNOWN", findingKeys: [] };
      continue;
    }
    const field = claim.field;
    const related = findings.filter(
      (finding) =>
        finding.severity === "error" &&
        (finding.claimKeys.includes(claim.key) || (finding.code === "CLAIM_CONFLICT" && field !== undefined && finding.fieldKeys.includes(field))),
    );
    claimStatuses[claim.key] = {
      status: related.length > 0 ? "FAILED" : boundExceeded ? "UNKNOWN" : "PASS",
      findingKeys: related.map((finding) => finding.key),
    };
  }
  const hasError = findings.some((finding) => finding.severity === "error" && finding.code !== "ENUMERATION_BOUND_EXCEEDED");
  const verdict: AnalysisResult["verdict"] = hasError ? "FAILED" : boundExceeded ? "UNKNOWN" : "PASS";
  return { ...base, gate1: "PASS", verdict, findings, claimStatuses, ruleTrace, stats };
}
