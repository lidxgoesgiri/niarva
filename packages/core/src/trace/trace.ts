import type { AnalysisResult, RuleTrace } from "../analysis/analyze";
import type { Finding } from "../analysis/findings";
import { activeClaims, catalogFields, renderStatement } from "../claims/claims";
import { addUnits, decimalFromLiteral, type Decimal } from "../decimal/decimal";
import type { Claim, ClaimSetContent, Condition, FormDefinition, Rule } from "../dsl/schema";
import { behaviorOf, definitionModel, intentModel, type BehaviorModel, type FieldBehavior } from "../eval/evaluate";
import { parseValue, type FieldLike } from "../eval/values";

/**
 * Intent Trace: one row per approved claim, linking the creator's source sentence, the claim,
 * the generated rules that implement it, the static result, and (in the app) browser evidence.
 *
 * Expectations in the trace always come from the approved claims (the intent model). The
 * generated rules are shown only as the implementation under test, never as the oracle.
 */

/** Compact DSL notation, for example `gte(gpa, 3.5)`. */
export function conditionDsl(condition: Condition): string {
  switch (condition.kind) {
    case "always":
      return "always";
    case "cmp":
      return `${condition.op}(${condition.field}, ${condition.value})`;
    case "in":
      return `in(${condition.field}, [${condition.values.join(", ")}])`;
    case "is_empty":
    case "is_filled":
    case "is_checked":
      return `${condition.kind}(${condition.field})`;
    case "and":
    case "or":
      return `${condition.kind}(${condition.items.map(conditionDsl).join(", ")})`;
    case "not":
      return `not(${conditionDsl(condition.item)})`;
  }
}

/** `gt(gpa, 3.5) → show certificate` */
export function ruleDsl(rule: Pick<Rule, "when" | "effect" | "target">): string {
  return `${conditionDsl(rule.when)} → ${rule.effect} ${rule.target}`;
}

/** The approved claim in the same notation, for example `gte(gpa, 3.5) → certificate visible AND required`. */
export function claimDsl(claim: Claim): string | null {
  switch (claim.kind) {
    case "FIELD":
      return `always → ${claim.field} visible${claim.required === "always" ? " AND required" : ""}`;
    case "VISIBLE_WHEN":
      return `${conditionDsl(claim.when)} → ${claim.field} visible${claim.requiredWhenVisible ? " AND required" : ""}`;
    case "REQUIRED_WHEN":
      return `${conditionDsl(claim.when)} → ${claim.field} required`;
    case "CONSTRAINT": {
      const rule = claim.constraint;
      const parts: string[] = [];
      if (rule.min !== undefined || rule.max !== undefined) parts.push(`range [${rule.min ?? "−∞"}, ${rule.max ?? "∞"}]`);
      if (rule.precision !== undefined) parts.push(`precision ${rule.precision}`);
      if (rule.minLength !== undefined) parts.push(`minLength ${rule.minLength}`);
      if (rule.maxLength !== undefined) parts.push(`maxLength ${rule.maxLength}`);
      if (rule.pattern !== undefined) parts.push(`pattern ${rule.pattern}`);
      return `${claim.field}: ${parts.join(", ") || "no constraint"}`;
    }
    case "MANUAL":
      return null;
  }
}

export type TraceRuleLink = {
  ruleId: string;
  dsl: string;
  /** From the analysis rule trace; `unanalysed` when no analysis covers the rule. */
  status: RuleTrace["status"] | "unanalysed";
};

export type TraceBoundaryPoint = {
  /** The controller value, written with the field's precision (e.g. "3.50"). */
  value: string;
  relation: "below" | "at" | "above";
  /** What the approved claims require at this value (the oracle). */
  expected: FieldBehavior;
  /** What the generated form does at this value. */
  implemented: FieldBehavior;
  agrees: boolean;
};

export type IntentTraceRow = {
  claimKey: string;
  kind: Claim["kind"];
  field: string | null;
  statement: string;
  /** The approved claim in DSL notation; this is where every expectation comes from. */
  expectationDsl: string | null;
  source: { quote: string; start: number | null; end: number | null } | null;
  rules: TraceRuleLink[];
  /**
   * linked: generated rules implement the claim. base_setting: the claim is implemented by field
   * settings (always shown, required, constraints), so no rule is expected. missing: a
   * conditional claim has no generated rule. manual: not checked automatically.
   */
  ruleCoverage: "linked" | "base_setting" | "missing" | "manual";
  staticStatus: "PASS" | "FAILED" | "UNKNOWN" | "NOT_ANALYSED";
  findings: Finding[];
  /** Threshold neighbourhood t − ε, t, t + ε for a numeric condition; empty otherwise. */
  boundary: TraceBoundaryPoint[];
  controller: { key: string; label: string } | null;
};

export type IntentTrace = {
  rows: IntentTraceRow[];
  /** Generated rules that no approved claim asks for. */
  unrequestedRules: TraceRuleLink[];
};

type AnalysisSlice = Pick<AnalysisResult, "findings" | "claimStatuses" | "ruleTrace">;

function fixed(value: Decimal, precision: number): string {
  const scaled = value.units * 10n ** BigInt(Math.max(0, precision - value.scale));
  const negative = scaled < 0n;
  const digits = (negative ? -scaled : scaled).toString().padStart(precision + 1, "0");
  const whole = precision === 0 ? digits : digits.slice(0, -precision);
  const frac = precision === 0 ? "" : digits.slice(-precision);
  return `${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

const NUMERIC_OPS = new Set(["gt", "gte", "lt", "lte", "eq", "neq"]);

function boundaryPoints(
  claim: Claim,
  catalog: Map<string, FieldLike>,
  intent: BehaviorModel | null,
  implementation: BehaviorModel | null,
): { points: TraceBoundaryPoint[]; controller: IntentTraceRow["controller"] } {
  if (claim.kind !== "VISIBLE_WHEN" && claim.kind !== "REQUIRED_WHEN") return { points: [], controller: null };
  const when = claim.when;
  if (when.kind !== "cmp" || !NUMERIC_OPS.has(when.op)) return { points: [], controller: null };
  const controller = catalog.get(when.field);
  if (!controller || controller.type !== "number") return { points: [], controller: null };
  const controllerView = { key: controller.key, label: controller.label };
  if (!intent || !implementation) return { points: [], controller: controllerView };

  const precision = Math.max(controller.precision ?? 0, 0);
  const threshold = decimalFromLiteral(when.value);
  const candidates: [TraceBoundaryPoint["relation"], Decimal][] = [
    ["below", addUnits(threshold, -1n, precision)],
    ["at", threshold],
    ["above", addUnits(threshold, 1n, precision)],
  ];
  const absent: FieldBehavior = { visible: false, required: false };
  try {
    const points = candidates.map(([relation, value]) => {
      const raw = fixed(value, precision);
      const assignment = { [controller.key]: parseValue(controller, raw).value };
      const expected = behaviorOf(intent, assignment).get(claim.field) ?? absent;
      const implemented = behaviorOf(implementation, assignment).get(claim.field) ?? absent;
      return {
        value: raw,
        relation,
        expected,
        implemented,
        agrees: expected.visible === implemented.visible && expected.required === implemented.required,
      };
    });
    return { points, controller: controllerView };
  } catch {
    // A definition that fails structural checks (for example a literal that is not a number)
    // cannot be evaluated; its findings already say why. The trace omits the table instead of
    // failing the whole workspace.
    return { points: [], controller: controllerView };
  }
}

/**
 * Builds the Intent Trace for a version. `analysis` may be null when no analysis exists yet;
 * the rows then report `NOT_ANALYSED` instead of guessing.
 */
export function buildIntentTrace(content: ClaimSetContent, definition: FormDefinition, analysis: AnalysisSlice | null): IntentTrace {
  const claims = activeClaims(content);
  const catalogList = catalogFields(content);
  const catalog = new Map(catalogList.map((field) => [field.key, field]));
  const traceById = new Map((analysis?.ruleTrace ?? []).map((entry) => [entry.ruleId, entry]));
  const rulesById = new Map(definition.rules.map((rule) => [rule.id, rule]));

  let intent: BehaviorModel | null = null;
  let implementation: BehaviorModel | null = null;
  try {
    intent = intentModel(catalogList, claims);
    implementation = definitionModel(definition);
  } catch {
    // A cycle is reported by structural analysis; the trace then omits boundary tables.
  }

  const link = (rule: Rule): TraceRuleLink => ({ ruleId: rule.id, dsl: ruleDsl(rule), status: traceById.get(rule.id)?.status ?? "unanalysed" });

  const rows = claims.map((claim): IntentTraceRow => {
    const findings = (analysis?.findings ?? []).filter((finding) => finding.claimKeys.includes(claim.key));
    const field = claim.kind === "MANUAL" ? (claim.field ?? null) : claim.field;
    const relevantEffects: Rule["effect"][] = claim.kind === "REQUIRED_WHEN" ? ["require"] : ["show", "require"];
    const linkedIds = new Set<string>();
    if (claim.kind === "VISIBLE_WHEN" || claim.kind === "REQUIRED_WHEN") {
      for (const rule of definition.rules) if (rule.target === claim.field && relevantEffects.includes(rule.effect)) linkedIds.add(rule.id);
    }
    for (const entry of analysis?.ruleTrace ?? []) if (entry.servesClaims.includes(claim.key)) linkedIds.add(entry.ruleId);
    for (const finding of findings) for (const ruleId of finding.ruleIds) linkedIds.add(ruleId);
    const rules = [...linkedIds].flatMap((ruleId) => {
      const rule = rulesById.get(ruleId);
      return rule ? [link(rule)] : [];
    });

    const conditional = claim.kind === "VISIBLE_WHEN" || claim.kind === "REQUIRED_WHEN";
    const ruleCoverage: IntentTraceRow["ruleCoverage"] =
      claim.kind === "MANUAL" ? "manual" : rules.length > 0 ? "linked" : conditional ? "missing" : "base_setting";
    const staticStatus = analysis
      ? ((analysis.claimStatuses[claim.key]?.status ?? "UNKNOWN") as IntentTraceRow["staticStatus"])
      : "NOT_ANALYSED";
    const { points, controller } = boundaryPoints(claim, catalog, intent, implementation);

    return {
      claimKey: claim.key,
      kind: claim.kind,
      field,
      statement: renderStatement(claim, catalog),
      expectationDsl: claimDsl(claim),
      source: claim.sourceQuote ? { quote: claim.sourceQuote, start: claim.sourceSpan?.start ?? null, end: claim.sourceSpan?.end ?? null } : null,
      rules,
      ruleCoverage,
      staticStatus,
      findings,
      boundary: points,
      controller,
    };
  });

  const unrequestedRules = (analysis?.ruleTrace ?? [])
    .filter((entry) => entry.status === "unrequested")
    .flatMap((entry) => {
      const rule = rulesById.get(entry.ruleId);
      return rule ? [link(rule)] : [];
    });

  return { rows, unrequestedRules };
}

/* ------------------------------------------------------------ browser status per claim */

export type TraceRunInput = {
  id: string;
  mode: string;
  /** For full runs: whether the run belongs to the current proof identity. */
  fresh: boolean | null;
  probes: { probeKey: string; claimKeys: string[]; status: string | null; verdict: string | null }[];
};

export type ClaimBrowserStatus = {
  /**
   * From the latest full run (§7.5 of the verification rules): VERIFIED only when every covering
   * probe passed. A diagnostic run never yields VERIFIED.
   */
  status: "VERIFIED" | "FAILED" | "BLOCKED" | "PARTIAL" | "STALE" | "UNVERIFIED" | "NOT_COVERED" | "MANUAL";
  runId: string | null;
  probeKeys: string[];
  /** Latest diagnostic observation for this claim, reported separately and never as proof. */
  diagnostic: { runId: string; probeKeys: string[]; outcome: "MISMATCH_OBSERVED" | "NO_MISMATCH_OBSERVED" | "UNKNOWN" | "PENDING" } | null;
};

/** `runs` must be ordered from newest to oldest. */
export function claimBrowserStatus(claimKey: string, kind: Claim["kind"], runs: TraceRunInput[]): ClaimBrowserStatus {
  const diagnosticRun = runs.find((run) => run.mode !== "full" && run.probes.some((probe) => probe.claimKeys.includes(claimKey)));
  let diagnostic: ClaimBrowserStatus["diagnostic"] = null;
  if (diagnosticRun) {
    const covering = diagnosticRun.probes.filter((probe) => probe.claimKeys.includes(claimKey));
    const outcome = covering.some((probe) => probe.verdict === "FAIL")
      ? "MISMATCH_OBSERVED"
      : covering.some((probe) => probe.status !== "completed" && probe.status !== "canceled")
        ? "PENDING"
        : covering.length > 0 && covering.every((probe) => probe.verdict === "PASS")
          ? "NO_MISMATCH_OBSERVED"
          : "UNKNOWN";
    diagnostic = { runId: diagnosticRun.id, probeKeys: covering.map((probe) => probe.probeKey), outcome };
  }

  if (kind === "MANUAL") return { status: "MANUAL", runId: null, probeKeys: [], diagnostic: null };
  const full = runs.find((run) => run.mode === "full");
  if (!full) return { status: "UNVERIFIED", runId: null, probeKeys: [], diagnostic };
  const covering = full.probes.filter((probe) => probe.claimKeys.includes(claimKey));
  const probeKeys = covering.map((probe) => probe.probeKey);
  if (full.fresh === false) return { status: "STALE", runId: full.id, probeKeys, diagnostic };
  if (covering.length === 0) return { status: "NOT_COVERED", runId: full.id, probeKeys, diagnostic };
  const status: ClaimBrowserStatus["status"] = covering.some((probe) => probe.verdict === "FAIL")
    ? "FAILED"
    : covering.some((probe) => probe.verdict === "UNKNOWN" || probe.status === "canceled")
      ? "BLOCKED"
      : covering.every((probe) => probe.verdict === "PASS")
        ? "VERIFIED"
        : "PARTIAL";
  return { status, runId: full.id, probeKeys, diagnostic };
}
