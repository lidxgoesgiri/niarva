import { decimalFromLiteral, compareDecimal, parseDecimal } from "../decimal/decimal";
import { DECIMAL_STRING, LIMITS, formDefinitionSchema, type Condition, type FormDefinition } from "../dsl/schema";
import { conditionDepth, conditionFields, topologicalOrder } from "../eval/evaluate";
import type { FieldLike } from "../eval/values";
import { makeFinding, type Finding } from "./findings";

/**
 * Checks that every atomic predicate in a condition references a known field with an
 * operator and literal valid for that field's type. Returns human-readable problems.
 */
export function conditionTypeProblems(condition: Condition, fields: Map<string, FieldLike>): { code: string; field?: string; message: string }[] {
  const problems: { code: string; field?: string; message: string }[] = [];
  const visit = (node: Condition) => {
    switch (node.kind) {
      case "and":
      case "or":
        node.items.forEach(visit);
        return;
      case "not":
        visit(node.item);
        return;
      case "always":
        return;
    }
    const field = fields.get(node.field);
    if (!field) {
      problems.push({ code: "UNKNOWN_FIELD_REF", field: node.field, message: `The condition refers to an unknown field "${node.field}".` });
      return;
    }
    const mismatch = (what: string) =>
      problems.push({ code: "TYPE_MISMATCH", field: node.field, message: `${what} cannot be used with "${field.label}" (${field.type}).` });
    switch (node.kind) {
      case "is_checked":
        if (field.type !== "checkbox") mismatch("\"is checked\"");
        return;
      case "is_empty":
      case "is_filled":
        if (field.type === "checkbox") mismatch("\"is empty\"");
        return;
      case "in":
        if (field.type !== "single_select") mismatch("\"is one of\"");
        else
          for (const value of node.values)
            if (!field.options?.some((option) => option.value === value))
              problems.push({ code: "INVALID_LITERAL", field: node.field, message: `"${value}" is not an option of "${field.label}".` });
        return;
      case "cmp": {
        if (field.type === "checkbox") return mismatch("A comparison");
        if (field.type === "number") {
          if (!DECIMAL_STRING.test(node.value)) {
            problems.push({ code: "INVALID_LITERAL", field: node.field, message: `"${node.value}" is not a number.` });
            return;
          }
          const parsed = parseDecimal(node.value, 4);
          if (parsed.ok && parsed.value.scale > (field.precision ?? 0)) {
            problems.push({
              code: "LITERAL_PRECISION_MISMATCH",
              field: node.field,
              message: `"${node.value}" has more decimal places than "${field.label}" allows (${field.precision ?? 0}).`,
            });
          }
          return;
        }
        if (node.op !== "eq" && node.op !== "neq") return mismatch(`The operator "${node.op}"`);
        if (field.type === "single_select" && !field.options?.some((option) => option.value === node.value)) {
          problems.push({ code: "INVALID_LITERAL", field: node.field, message: `"${node.value}" is not an option of "${field.label}".` });
        }
        return;
      }
    }
  };
  visit(condition);
  if (conditionDepth(condition) > LIMITS.conditionDepth) {
    problems.push({ code: "CONDITION_TOO_DEEP", message: `Conditions may nest at most ${LIMITS.conditionDepth} levels.` });
  }
  return problems;
}

export type StructureResult =
  | { ok: true; definition: FormDefinition; findings: Finding[] }
  | { ok: false; definition: null; findings: Finding[] };

/**
 * Gate 1 (L0): schema, identifiers, references, types, literals, depth, cycles.
 * A failure here stops every later analysis.
 */
export function validateStructure(input: unknown): StructureResult {
  const parsed = formDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    const findings = parsed.error.issues.slice(0, 20).map((issue) =>
      makeFinding({
        code: "SCHEMA_INVALID",
        layer: "L0",
        severity: "error",
        fieldKeys: [],
        ruleIds: [],
        claimKeys: [],
        message: `${issue.path.join(".") || "definition"}: ${issue.message}`,
      }),
    );
    return { ok: false, definition: null, findings };
  }
  const definition = parsed.data;
  const findings: Finding[] = [];
  const error = (code: string, message: string, fieldKeys: string[] = [], ruleIds: string[] = []) =>
    findings.push(makeFinding({ code, layer: "L0", severity: "error", fieldKeys, ruleIds, claimKeys: [], message }));

  const duplicates = (keys: string[]) => keys.filter((key, index) => keys.indexOf(key) !== index);
  for (const key of new Set(duplicates(definition.fields.map((field) => field.key)))) error("DUPLICATE_KEY", `Field key "${key}" is used more than once.`, [key]);
  for (const key of new Set(duplicates(definition.sections.map((section) => section.key)))) error("DUPLICATE_KEY", `Section key "${key}" is used more than once.`);
  for (const id of new Set(duplicates(definition.rules.map((rule) => rule.id)))) error("DUPLICATE_KEY", `Rule id "${id}" is used more than once.`, [], [id]);

  const sectionKeys = new Set(definition.sections.map((section) => section.key));
  const fields = new Map<string, FieldLike>();
  for (const field of definition.fields) {
    fields.set(field.key, {
      key: field.key,
      type: field.type,
      label: field.label,
      options: field.options,
      precision: field.type === "number" ? (field.validation?.precision ?? 0) : undefined,
    });
    if (!sectionKeys.has(field.sectionKey)) error("UNKNOWN_SECTION_REF", `"${field.label}" refers to an unknown section.`, [field.key]);
    if (field.type === "single_select" && !field.options) error("SCHEMA_INVALID", `"${field.label}" needs options.`, [field.key]);
    if (field.type !== "single_select" && field.options) error("SCHEMA_INVALID", `"${field.label}" cannot have options.`, [field.key]);
    if (field.options) for (const value of new Set(duplicates(field.options.map((option) => option.value)))) error("DUPLICATE_KEY", `Option "${value}" appears twice in "${field.label}".`, [field.key]);
    const rules = field.validation;
    if (rules) {
      const numeric = rules.min !== undefined || rules.max !== undefined || rules.precision !== undefined;
      const textual = rules.minLength !== undefined || rules.maxLength !== undefined || rules.pattern !== undefined;
      if (numeric && field.type !== "number") error("TYPE_MISMATCH", `Numeric limits do not apply to "${field.label}".`, [field.key]);
      if (textual && !["short_text", "long_text"].includes(field.type)) error("TYPE_MISMATCH", `Text limits do not apply to "${field.label}".`, [field.key]);
      if (rules.min !== undefined && rules.max !== undefined && compareDecimal(decimalFromLiteral(rules.min), decimalFromLiteral(rules.max)) > 0) {
        error("SCHEMA_INVALID", `The minimum of "${field.label}" is greater than its maximum.`, [field.key]);
      }
      if (rules.minLength !== undefined && rules.maxLength !== undefined && rules.minLength > rules.maxLength) {
        error("SCHEMA_INVALID", `The minimum length of "${field.label}" is greater than its maximum.`, [field.key]);
      }
    }
  }

  const perTarget = new Map<string, number>();
  for (const rule of definition.rules) {
    perTarget.set(rule.target, (perTarget.get(rule.target) ?? 0) + 1);
    if (!fields.has(rule.target)) error("UNKNOWN_FIELD_REF", `Rule ${rule.id} targets an unknown field "${rule.target}".`, [], [rule.id]);
    if (conditionFields(rule.when).has(rule.target)) error("DEPENDENCY_CYCLE", `Rule ${rule.id} depends on its own target.`, [rule.target], [rule.id]);
    for (const problem of conditionTypeProblems(rule.when, fields)) {
      error(problem.code, `Rule ${rule.id}: ${problem.message}`, problem.field ? [problem.field] : [], [rule.id]);
    }
  }
  for (const [target, count] of perTarget) {
    if (count > LIMITS.rulesPerTarget) error("SCHEMA_INVALID", `"${target}" has more than ${LIMITS.rulesPerTarget} rules.`, [target]);
  }

  if (findings.length === 0) {
    const edges = new Map<string, Set<string>>();
    for (const rule of definition.rules)
      for (const source of conditionFields(rule.when)) {
        if (!edges.has(source)) edges.set(source, new Set());
        edges.get(source)?.add(rule.target);
      }
    if (!topologicalOrder(definition.fields.map((field) => field.key), edges)) {
      error("DEPENDENCY_CYCLE", "The rules depend on each other in a cycle.");
    }
  }

  return findings.length === 0 ? { ok: true, definition, findings } : { ok: false, definition: null, findings };
}
