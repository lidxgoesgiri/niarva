import { compareDecimal, decimalFromLiteral, formatFixed, parseDecimal } from "../decimal/decimal";
import type { Claim, Condition, Field, FormDefinition } from "../dsl/schema";
import {
  EMPTY,
  compareWithLiteral,
  isEmpty,
  parseValue,
  serializeValue,
  type Assignment,
  type FieldLike,
  type Value,
} from "./values";

/* ------------------------------------------------------------ conditions */

/** Truth table of the DSL: any atomic predicate over an EMPTY value is false (except `is_empty`). */
export function evalCondition(condition: Condition, assignment: Assignment): boolean {
  switch (condition.kind) {
    case "always":
      return true;
    case "and":
      return condition.items.every((item) => evalCondition(item, assignment));
    case "or":
      return condition.items.some((item) => evalCondition(item, assignment));
    case "not":
      return !evalCondition(condition.item, assignment);
    case "is_empty":
      return isEmpty(assignment[condition.field]);
    case "is_filled":
      return !isEmpty(assignment[condition.field]);
    case "is_checked": {
      const value = assignment[condition.field];
      return value?.t === "bool" && value.v;
    }
    case "in": {
      const value = assignment[condition.field];
      if (!value || isEmpty(value)) return false;
      return condition.values.some((literal) => compareWithLiteral(value, literal) === 0);
    }
    case "cmp": {
      const value = assignment[condition.field];
      if (!value || isEmpty(value)) return false;
      const order = compareWithLiteral(value, condition.value);
      if (order === null) return false;
      switch (condition.op) {
        case "eq":
          return order === 0;
        case "neq":
          return order !== 0;
        case "gt":
          return order > 0;
        case "gte":
          return order >= 0;
        case "lt":
          return order < 0;
        case "lte":
          return order <= 0;
      }
    }
  }
}

/** Every field key a condition reads. */
export function conditionFields(condition: Condition, out: Set<string> = new Set()): Set<string> {
  switch (condition.kind) {
    case "and":
    case "or":
      condition.items.forEach((item) => conditionFields(item, out));
      break;
    case "not":
      conditionFields(condition.item, out);
      break;
    case "always":
      break;
    default:
      out.add(condition.field);
  }
  return out;
}

export function conditionDepth(condition: Condition): number {
  switch (condition.kind) {
    case "and":
    case "or":
      return 1 + Math.max(...condition.items.map(conditionDepth));
    case "not":
      return 1 + conditionDepth(condition.item);
    default:
      return 0;
  }
}

/* ------------------------------------------------------- behavior models */

export type FieldBehavior = { visible: boolean; required: boolean };

/**
 * A model answers "is this field visible / required" for an effective assignment.
 * The definition (implementation) and the approved claims (intent) are both models,
 * so their behavior can be compared cell by cell.
 */
export type BehaviorModel = {
  /** Fields in evaluation order: every controller precedes the fields it controls. */
  order: string[];
  fields: Map<string, FieldLike>;
  visible(key: string, effective: Assignment): boolean;
  required(key: string, effective: Assignment): boolean;
};

/**
 * Topological order of `keys` under `edges` (controller → target), ties broken by the
 * given key order. Returns null when the dependency graph has a cycle.
 */
export function topologicalOrder(keys: string[], edges: Map<string, Set<string>>): string[] | null {
  const indegree = new Map(keys.map((key) => [key, 0]));
  for (const [, targets] of edges) for (const target of targets) if (indegree.has(target)) indegree.set(target, (indegree.get(target) ?? 0) + 1);
  const position = new Map(keys.map((key, index) => [key, index]));
  const ready = keys.filter((key) => indegree.get(key) === 0);
  const order: string[] = [];
  while (ready.length > 0) {
    ready.sort((a, b) => (position.get(a) ?? 0) - (position.get(b) ?? 0));
    const next = ready.shift() as string;
    order.push(next);
    for (const target of edges.get(next) ?? []) {
      if (!indegree.has(target)) continue;
      const remaining = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, remaining);
      if (remaining === 0) ready.push(target);
    }
  }
  return order.length === keys.length ? order : null;
}

export function fieldLikeFromField(field: Field): FieldLike {
  return {
    key: field.key,
    type: field.type,
    label: field.label,
    options: field.options,
    precision: field.type === "number" ? (field.validation?.precision ?? 0) : undefined,
  };
}

/** Behavior of a form definition. Throws on a dependency cycle (structural validation rejects those first). */
export function definitionModel(definition: FormDefinition): BehaviorModel {
  const fields = new Map(definition.fields.map((field) => [field.key, fieldLikeFromField(field)]));
  const byKey = new Map(definition.fields.map((field) => [field.key, field]));
  const edges = new Map<string, Set<string>>();
  for (const rule of definition.rules) {
    for (const source of conditionFields(rule.when)) {
      if (!edges.has(source)) edges.set(source, new Set());
      edges.get(source)?.add(rule.target);
    }
  }
  const order = topologicalOrder(definition.fields.map((field) => field.key), edges);
  if (!order) throw new Error("DEPENDENCY_CYCLE");
  const rulesFor = (key: string, effect: "show" | "require") =>
    definition.rules.filter((rule) => rule.target === key && rule.effect === effect);

  const visible = (key: string, effective: Assignment) => {
    const field = byKey.get(key);
    if (!field) return false;
    if (field.visibility === "always") return true;
    return rulesFor(key, "show").some((rule) => evalCondition(rule.when, effective));
  };
  return {
    order,
    fields,
    visible,
    required: (key, effective) => {
      const field = byKey.get(key);
      if (!field || !visible(key, effective)) return false;
      return field.required || rulesFor(key, "require").some((rule) => evalCondition(rule.when, effective));
    },
  };
}

/** Behavior the approved claims ask for (the oracle). */
export function intentModel(catalog: FieldLike[], claims: Claim[]): BehaviorModel {
  const fields = new Map(catalog.map((field) => [field.key, field]));
  const active = claims.filter((claim) => claim.reviewState !== "rejected");
  const edges = new Map<string, Set<string>>();
  for (const claim of active) {
    if (claim.kind !== "VISIBLE_WHEN" && claim.kind !== "REQUIRED_WHEN") continue;
    for (const source of conditionFields(claim.when)) {
      if (!edges.has(source)) edges.set(source, new Set());
      edges.get(source)?.add(claim.field);
    }
  }
  const order = topologicalOrder(catalog.map((field) => field.key), edges);
  if (!order) throw new Error("CLAIM_DEPENDENCY_CYCLE");

  const visible = (key: string, effective: Assignment) => {
    if (active.some((claim) => claim.kind === "FIELD" && claim.field === key)) return true;
    return active.some((claim) => claim.kind === "VISIBLE_WHEN" && claim.field === key && evalCondition(claim.when, effective));
  };
  return {
    order,
    fields,
    visible,
    required: (key, effective) => {
      if (!visible(key, effective)) return false;
      return active.some(
        (claim) =>
          (claim.kind === "FIELD" && claim.field === key && claim.required === "always") ||
          (claim.kind === "VISIBLE_WHEN" && claim.field === key && claim.requiredWhenVisible) ||
          (claim.kind === "REQUIRED_WHEN" && claim.field === key && evalCondition(claim.when, effective)),
      );
    },
  };
}

/** Effective assignment: a field that is not visible counts as EMPTY for every later condition. */
export function effectiveAssignment(model: BehaviorModel, input: Assignment): Assignment {
  const effective: Assignment = {};
  for (const key of model.order) {
    effective[key] = model.visible(key, effective) ? (input[key] ?? EMPTY) : EMPTY;
  }
  return effective;
}

export function behaviorOf(model: BehaviorModel, input: Assignment): Map<string, FieldBehavior> {
  const effective = effectiveAssignment(model, input);
  const result = new Map<string, FieldBehavior>();
  for (const key of model.order) {
    result.set(key, { visible: model.visible(key, effective), required: model.required(key, effective) });
  }
  return result;
}

/* ------------------------------------------------------------ submission */

export type FieldError = { code: string; message: string };

export type SubmissionCheck = {
  ok: boolean;
  /** Errors for visible fields only. */
  errors: Record<string, FieldError>;
  /** Visible, non-empty answers in canonical form: the only values that may ever be stored. */
  answers: Record<string, string | boolean>;
  visibleKeys: string[];
  /** Fields that carried a non-empty raw value while hidden (the value is discarded). */
  hiddenNonEmptyKeys: string[];
  /** Keys in the raw payload that the form does not define (ignored, never stored). */
  unknownKeys: string[];
};

function checkConstraints(field: Field, value: Value): FieldError | null {
  const rules = field.validation;
  if (!rules) return null;
  if (value.t === "num") {
    const below = rules.min !== undefined && compareDecimal(value.d, decimalFromLiteral(rules.min)) < 0;
    const above = rules.max !== undefined && compareDecimal(value.d, decimalFromLiteral(rules.max)) > 0;
    if (below || above) {
      const precision = rules.precision ?? 0;
      const min = rules.min !== undefined ? formatFixed(decimalFromLiteral(rules.min), precision) : null;
      const max = rules.max !== undefined ? formatFixed(decimalFromLiteral(rules.max), precision) : null;
      const range = min !== null && max !== null ? `between ${min} and ${max}` : min !== null ? `of at least ${min}` : `of at most ${max}`;
      return { code: "OUT_OF_RANGE", message: `Enter a value ${range}.` };
    }
  }
  if (value.t === "text") {
    const length = [...value.v].length;
    if (rules.minLength !== undefined && length < rules.minLength) {
      return { code: "TOO_SHORT", message: `Use at least ${rules.minLength} characters.` };
    }
    const maxLength = rules.maxLength ?? (field.type === "long_text" ? 2000 : 200);
    if (length > maxLength) return { code: "TOO_LONG", message: `Use at most ${maxLength} characters.` };
    if (rules.pattern === "digits_only" && !/^\d+$/.test(value.v)) return { code: "PATTERN", message: "Use digits only." };
    if (rules.pattern === "alphanumeric" && !/^[A-Za-z0-9]+$/.test(value.v)) {
      return { code: "PATTERN", message: "Use letters and digits only." };
    }
  }
  return null;
}

/** Parses raw answers for every field. Unparseable input is EMPTY and keeps its error. */
export function parseAnswers(definition: FormDefinition, raw: Record<string, unknown>) {
  const values: Assignment = {};
  const parseErrors: Record<string, FieldError> = {};
  for (const field of definition.fields) {
    const result = parseValue(fieldLikeFromField(field), raw[field.key]);
    values[field.key] = result.value;
    if (result.error) parseErrors[field.key] = result.error;
  }
  return { values, parseErrors };
}

function rawIsNonEmpty(raw: unknown): boolean {
  if (raw === undefined || raw === null || raw === false) return false;
  if (typeof raw === "string") return raw.trim() !== "";
  return true;
}

/**
 * Authoritative validation, identical in the browser renderer and on the server.
 * Hidden fields are never validated and their values are never kept.
 */
export function validateSubmission(definition: FormDefinition, raw: Record<string, unknown>): SubmissionCheck {
  const model = definitionModel(definition);
  const { values, parseErrors } = parseAnswers(definition, raw);
  const effective = effectiveAssignment(model, values);
  const byKey = new Map(definition.fields.map((field) => [field.key, field]));

  const errors: Record<string, FieldError> = {};
  const answers: Record<string, string | boolean> = {};
  const visibleKeys: string[] = [];
  const hiddenNonEmptyKeys: string[] = [];

  for (const field of definition.fields) {
    const key = field.key;
    if (!model.visible(key, effective)) {
      if (rawIsNonEmpty(raw[key])) hiddenNonEmptyKeys.push(key);
      continue;
    }
    visibleKeys.push(key);
    const value = effective[key] ?? EMPTY;
    const parseError = parseErrors[key];
    if (parseError) {
      errors[key] = parseError;
      continue;
    }
    if (model.required(key, effective)) {
      const missing = field.type === "checkbox" ? !(value.t === "bool" && value.v) : isEmpty(value);
      if (missing) {
        errors[key] = { code: "REQUIRED", message: `${byKey.get(key)?.label ?? "This field"} is required.` };
        continue;
      }
    }
    if (isEmpty(value)) continue;
    const constraint = checkConstraints(field, value);
    if (constraint) {
      errors[key] = constraint;
      continue;
    }
    const stored = serializeValue(value);
    if (stored !== null) answers[key] = stored;
  }

  const unknownKeys = Object.keys(raw).filter((key) => !byKey.has(key));
  return { ok: Object.keys(errors).length === 0, errors, answers, visibleKeys, hiddenNonEmptyKeys, unknownKeys };
}

/** Visibility and requiredness for the live renderer, computed from raw (in-progress) input. */
export function liveState(definition: FormDefinition, raw: Record<string, unknown>): Map<string, FieldBehavior> {
  const model = definitionModel(definition);
  const { values } = parseAnswers(definition, raw);
  return behaviorOf(model, values);
}

/** True when `raw` parses as a number within the field's precision (used by inputs for hints). */
export function isDecimalInput(raw: string, precision: number): boolean {
  const parsed = parseDecimal(raw, 4);
  return parsed.ok && parsed.value.scale <= precision;
}
