import { addUnits, decimalFromLiteral, formatDecimal, formatFixed } from "../decimal/decimal";
import type { Claim, Condition, FormDefinition } from "../dsl/schema";
import { conditionFields } from "../eval/evaluate";
import { EMPTY, type Assignment, type FieldLike, type Value } from "../eval/values";

/** A representative input for one controller, with its raw form (as a respondent would type it). */
export type Representative = { value: Value; raw: string; threshold?: string };

/** Literals compared against a field across a set of conditions. */
export function literalsFor(field: string, conditions: Condition[]): string[] {
  const out = new Set<string>();
  const visit = (node: Condition) => {
    switch (node.kind) {
      case "and":
      case "or":
        node.items.forEach(visit);
        return;
      case "not":
        visit(node.item);
        return;
      case "cmp":
        if (node.field === field) out.add(node.value);
        return;
      case "in":
        if (node.field === field) node.values.forEach((value) => out.add(value));
        return;
      default:
        return;
    }
  };
  conditions.forEach(visit);
  return [...out];
}

export function claimConditions(claims: Claim[]): Condition[] {
  return claims.flatMap((claim) => (claim.kind === "VISIBLE_WHEN" || claim.kind === "REQUIRED_WHEN" ? [claim.when] : []));
}

export function ruleConditions(definition: FormDefinition): Condition[] {
  return definition.rules.map((rule) => rule.when);
}

/**
 * Representatives that cover every behavior a controller can cause. For a number with
 * thresholds t and precision p the candidates are EMPTY and t − 10^−p, t, t + 10^−p for
 * every t: in DSL v1, no input between two adjacent candidates can behave differently.
 */
export function representatives(field: FieldLike, literals: string[]): Representative[] {
  switch (field.type) {
    case "checkbox":
      return [
        { value: { t: "bool", v: false }, raw: "false" },
        { value: { t: "bool", v: true }, raw: "true" },
      ];
    case "single_select":
      return [{ value: EMPTY, raw: "" }, ...(field.options ?? []).map((option) => ({ value: { t: "opt", v: option.value } as Value, raw: option.value }))];
    case "number": {
      const precision = field.precision ?? 0;
      const out = new Map<string, Representative>();
      out.set("", { value: EMPTY, raw: "" });
      const thresholds = literals.length > 0 ? literals : ["0"];
      for (const literal of thresholds) {
        const t = decimalFromLiteral(literal);
        for (const delta of [-1n, 0n, 1n]) {
          const candidate = addUnits(t, delta, precision);
          const key = formatDecimal(candidate);
          if (!out.has(key)) {
            out.set(key, {
              value: { t: "num", d: candidate },
              raw: formatFixed(candidate, precision),
              ...(delta === 0n ? { threshold: literal } : {}),
            });
          }
        }
      }
      return [...out.values()];
    }
    default: {
      const out: Representative[] = [{ value: EMPTY, raw: "" }];
      for (const literal of literals) out.push({ value: { t: "text", v: literal }, raw: literal });
      out.push({ value: { t: "text", v: "niarva-other-value" }, raw: "niarva-other-value" });
      return out;
    }
  }
}

export type Cell = { assignment: Assignment; raw: Record<string, string>; thresholds: Record<string, string> };

/** Cartesian product of representatives. Returns null when the bound would be exceeded. */
export function enumerateCells(controllers: { key: string; reps: Representative[] }[], bound: number): Cell[] | null {
  let total = 1;
  for (const controller of controllers) {
    total *= controller.reps.length;
    if (total > bound) return null;
  }
  let cells: Cell[] = [{ assignment: {}, raw: {}, thresholds: {} }];
  for (const controller of controllers) {
    const next: Cell[] = [];
    for (const cell of cells) {
      for (const rep of controller.reps) {
        next.push({
          assignment: { ...cell.assignment, [controller.key]: rep.value },
          raw: { ...cell.raw, [controller.key]: rep.raw },
          thresholds: rep.threshold ? { ...cell.thresholds, [controller.key]: rep.threshold } : cell.thresholds,
        });
      }
    }
    cells = next;
  }
  return cells;
}

/** Controllers referenced by any claim or rule condition, in catalog/definition order. */
export function controllersOf(fieldOrder: string[], conditions: Condition[]): string[] {
  const referenced = new Set<string>();
  conditions.forEach((condition) => conditionFields(condition, referenced));
  return fieldOrder.filter((key) => referenced.has(key));
}
