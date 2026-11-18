import { decimalFromLiteral, compareDecimal } from "../decimal/decimal";
import { claimSetContentSchema, type Claim, type ClaimSetContent, type Condition, type FieldSpec } from "../dsl/schema";
import { conditionFields, topologicalOrder } from "../eval/evaluate";
import type { FieldLike } from "../eval/values";
import { conditionTypeProblems } from "../analysis/structure";

export function catalogFields(content: ClaimSetContent): FieldLike[] {
  return content.fields.map((field: FieldSpec) => ({
    key: field.key,
    type: field.type,
    label: field.label,
    options: field.options,
    precision: field.type === "number" ? (field.precision ?? 0) : undefined,
  }));
}

/** Claims that take part in the approved meaning (rejected claims are ignored). */
export function activeClaims(content: ClaimSetContent): Claim[] {
  return content.claims.filter((claim) => claim.reviewState !== "rejected");
}

export type CompositionProblem = { code: string; message: string; claimKey?: string; fieldKey?: string };

/**
 * Approval-time rules: every catalog field has exactly one kind of existence claim, claims
 * agree with each other, conditions are typed and acyclic, ambiguities are resolved,
 * unsupported or manual requirements are explicitly handled.
 */
export function compositionProblems(input: unknown, sourcePrompt?: string): CompositionProblem[] {
  const parsed = claimSetContentSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.slice(0, 20).map((issue) => ({ code: "SCHEMA_INVALID", message: `${issue.path.join(".")}: ${issue.message}` }));
  }
  const content = parsed.data;
  const problems: CompositionProblem[] = [];
  const catalog = new Map(catalogFields(content).map((field) => [field.key, field]));
  const keys = content.claims.map((claim) => claim.key);
  for (const key of new Set(keys.filter((key, index) => keys.indexOf(key) !== index))) {
    problems.push({ code: "DUPLICATE_KEY", claimKey: key, message: `Claim ${key} appears more than once.` });
  }
  const fieldKeys = content.fields.map((field) => field.key);
  for (const key of new Set(fieldKeys.filter((key, index) => fieldKeys.indexOf(key) !== index))) {
    problems.push({ code: "DUPLICATE_KEY", fieldKey: key, message: `Field "${key}" appears more than once.` });
  }

  for (const claim of content.claims) {
    if (claim.reviewState === "needs_review") problems.push({ code: "NEEDS_REVIEW", claimKey: claim.key, message: `${claim.key} still needs review.` });
    if (claim.ambiguity && !claim.ambiguity.resolvedChoice && claim.reviewState !== "rejected") {
      problems.push({ code: "AMBIGUITY_UNRESOLVED", claimKey: claim.key, message: `${claim.key}: ${claim.ambiguity.question}` });
    }
    if (claim.kind === "MANUAL" && claim.reviewState !== "rejected" && !claim.acknowledged) {
      problems.push({ code: "MANUAL_NOT_ACKNOWLEDGED", claimKey: claim.key, message: `${claim.key} needs manual checking; acknowledge it before approval.` });
    }
    if (claim.sourceSpan && sourcePrompt !== undefined) {
      const { start, end } = claim.sourceSpan;
      if (start >= end || end > sourcePrompt.length) {
        problems.push({ code: "SOURCE_SPAN_INVALID", claimKey: claim.key, message: `${claim.key} points outside the source text.` });
      }
    }
  }

  const active = activeClaims(content);
  for (const field of content.fields) {
    const fieldClaims = active.filter((claim) => "field" in claim && claim.field === field.key);
    const existence = fieldClaims.filter((claim) => claim.kind === "FIELD");
    const visibleWhen = fieldClaims.filter((claim): claim is Extract<Claim, { kind: "VISIBLE_WHEN" }> => claim.kind === "VISIBLE_WHEN");
    if (existence.length + (visibleWhen.length > 0 ? 1 : 0) !== 1 || existence.length > 1) {
      problems.push({
        code: "CLAIM_CONFLICT",
        fieldKey: field.key,
        message: existence.length + visibleWhen.length === 0
          ? `"${field.label}" has no claim saying when it appears.`
          : `"${field.label}" must be either always shown or shown under conditions, not both.`,
      });
    }
    if (new Set(visibleWhen.map((claim) => claim.requiredWhenVisible)).size > 1) {
      problems.push({ code: "CLAIM_CONFLICT", fieldKey: field.key, message: `Claims disagree on whether "${field.label}" is required when shown.` });
    }
    const baseRequired = existence.some((claim) => claim.kind === "FIELD" && claim.required === "always") || visibleWhen.some((claim) => claim.requiredWhenVisible);
    if (baseRequired && fieldClaims.some((claim) => claim.kind === "REQUIRED_WHEN")) {
      problems.push({ code: "CLAIM_CONFLICT", fieldKey: field.key, message: `"${field.label}" is already always required when shown.` });
    }
    const constraints = fieldClaims.filter((claim): claim is Extract<Claim, { kind: "CONSTRAINT" }> => claim.kind === "CONSTRAINT");
    if (constraints.length > 1) problems.push({ code: "CLAIM_CONFLICT", fieldKey: field.key, message: `"${field.label}" has more than one constraint.` });
    for (const claim of constraints) {
      const { min, max } = claim.constraint;
      if (min !== undefined && max !== undefined && compareDecimal(decimalFromLiteral(min), decimalFromLiteral(max)) > 0) {
        problems.push({ code: "CLAIM_CONFLICT", claimKey: claim.key, message: `${claim.key}: the minimum is greater than the maximum.` });
      }
    }
  }

  for (const claim of active) {
    if ("field" in claim && claim.field !== undefined && !catalog.has(claim.field)) {
      problems.push({ code: "UNKNOWN_FIELD_REF", claimKey: claim.key, message: `${claim.key} refers to an unknown field "${claim.field}".` });
    }
    if (claim.kind === "VISIBLE_WHEN" || claim.kind === "REQUIRED_WHEN") {
      for (const problem of conditionTypeProblems(claim.when, catalog)) {
        problems.push({ code: problem.code, claimKey: claim.key, message: `${claim.key}: ${problem.message}` });
      }
      if (conditionFields(claim.when).has(claim.field)) {
        problems.push({ code: "CLAIM_CONFLICT", claimKey: claim.key, message: `${claim.key} depends on its own field.` });
      }
    }
  }
  const edges = new Map<string, Set<string>>();
  for (const claim of active) {
    if (claim.kind !== "VISIBLE_WHEN" && claim.kind !== "REQUIRED_WHEN") continue;
    for (const source of conditionFields(claim.when)) {
      if (!edges.has(source)) edges.set(source, new Set());
      edges.get(source)?.add(claim.field);
    }
  }
  if (!topologicalOrder(fieldKeys, edges)) problems.push({ code: "CLAIM_CONFLICT", message: "The claims depend on each other in a cycle." });
  return problems;
}

/* ------------------------------------------------------- deterministic text */

const OP_TEXT: Record<string, (label: string, value: string) => string> = {
  gte: (label, value) => `${label} ≥ ${value} (${value} included)`,
  gt: (label, value) => `${label} > ${value} (${value} not included)`,
  lte: (label, value) => `${label} ≤ ${value} (${value} included)`,
  lt: (label, value) => `${label} < ${value} (${value} not included)`,
  eq: (label, value) => `${label} = ${value}`,
  neq: (label, value) => `${label} ≠ ${value}`,
};

/** Renders a condition in plain English. The boundary note ("included") prevents ≥ / > confusion. */
export function renderCondition(condition: Condition, fields: Map<string, FieldLike>, nested = false): string {
  const label = (key: string) => fields.get(key)?.label ?? key;
  const optionLabel = (key: string, value: string) => fields.get(key)?.options?.find((option) => option.value === value)?.label ?? value;
  switch (condition.kind) {
    case "always":
      return "always";
    case "and":
    case "or": {
      const text = condition.items.map((item) => renderCondition(item, fields, true)).join(condition.kind === "and" ? " and " : " or ");
      return nested ? `(${text})` : text;
    }
    case "not":
      return `not ${renderCondition(condition.item, fields, true)}`;
    case "is_empty":
      return `${label(condition.field)} is empty`;
    case "is_filled":
      return `${label(condition.field)} is filled in`;
    case "is_checked":
      return `${label(condition.field)} is checked`;
    case "in":
      return `${label(condition.field)} is one of ${condition.values.map((value) => `"${optionLabel(condition.field, value)}"`).join(", ")}`;
    case "cmp": {
      const field = fields.get(condition.field);
      if (field?.type === "number") return (OP_TEXT[condition.op] ?? OP_TEXT.eq!)(label(condition.field), condition.value);
      const shown = field?.type === "single_select" ? optionLabel(condition.field, condition.value) : condition.value;
      return condition.op === "eq" ? `${label(condition.field)} is "${shown}"` : `${label(condition.field)} is not "${shown}"`;
    }
  }
}

/** The sentence a creator approves. Generated from the typed claim, never from AI text. */
export function renderStatement(claim: Claim, fields: Map<string, FieldLike>): string {
  const label = (key: string | undefined) => (key ? (fields.get(key)?.label ?? key) : "");
  switch (claim.kind) {
    case "FIELD":
      return claim.required === "always"
        ? `${label(claim.field)} is always shown and must be filled in.`
        : `${label(claim.field)} is always shown and may be left empty.`;
    case "VISIBLE_WHEN": {
      const when = renderCondition(claim.when, fields);
      return claim.requiredWhenVisible
        ? `${label(claim.field)} is shown and must be filled in when ${when}. Otherwise it is hidden and its answer is not submitted.`
        : `${label(claim.field)} is shown (optional) when ${when}. Otherwise it is hidden and its answer is not submitted.`;
    }
    case "REQUIRED_WHEN":
      return `${label(claim.field)} must be filled in when ${renderCondition(claim.when, fields)}; otherwise it may be left empty.`;
    case "CONSTRAINT": {
      const rule = claim.constraint;
      const parts: string[] = [];
      if (rule.min !== undefined && rule.max !== undefined) parts.push(`a number from ${rule.min} to ${rule.max}`);
      else if (rule.min !== undefined) parts.push(`a number of at least ${rule.min}`);
      else if (rule.max !== undefined) parts.push(`a number of at most ${rule.max}`);
      if (rule.precision !== undefined) parts.push(`with at most ${rule.precision} decimal places`);
      if (rule.minLength !== undefined) parts.push(`at least ${rule.minLength} characters`);
      if (rule.maxLength !== undefined) parts.push(`at most ${rule.maxLength} characters`);
      if (rule.pattern === "digits_only") parts.push("digits only");
      if (rule.pattern === "alphanumeric") parts.push("letters and digits only");
      return `${label(claim.field)} must be ${parts.join(", ")}.`;
    }
    case "MANUAL":
      return `Needs manual checking: "${claim.text}". NIARVA cannot verify this automatically.`;
  }
}
