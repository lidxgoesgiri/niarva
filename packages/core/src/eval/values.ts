import { compareDecimal, decimalFromLiteral, formatDecimal, parseDecimal, type Decimal } from "../decimal/decimal";
import type { FieldType, Option } from "../dsl/schema";

/** A typed form value. Hidden, blank, and unparseable inputs are all EMPTY for rule evaluation. */
export type Value =
  | { t: "empty" }
  | { t: "num"; d: Decimal }
  | { t: "text"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "opt"; v: string };

export type Assignment = Record<string, Value>;

export const EMPTY: Value = Object.freeze({ t: "empty" }) as Value;

/** The minimum a field needs for parsing and evaluation; shared by definitions and claim catalogs. */
export type FieldLike = {
  key: string;
  type: FieldType;
  label: string;
  options?: Option[];
  precision?: number;
};

export type ParseResult = { value: Value; error?: { code: string; message: string } };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeText(text: string): string {
  return text.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Parses one raw answer. Never throws: invalid input becomes EMPTY with an error,
 * so a broken controller can never make a condition true.
 */
export function parseValue(field: FieldLike, raw: unknown): ParseResult {
  if (field.type === "checkbox") {
    if (raw === true || raw === "true" || raw === "on") return { value: { t: "bool", v: true } };
    if (raw === undefined || raw === null || raw === false || raw === "" || raw === "false") return { value: { t: "bool", v: false } };
    return { value: { t: "bool", v: false }, error: { code: "INVALID", message: "Choose yes or no." } };
  }
  if (raw === undefined || raw === null) return { value: EMPTY };
  if (typeof raw !== "string" && typeof raw !== "number") {
    return { value: EMPTY, error: { code: "INVALID", message: "Enter a valid value." } };
  }
  if (typeof raw === "number" && !Number.isFinite(raw)) {
    return { value: EMPTY, error: { code: "INVALID_NUMBER", message: "Enter a number." } };
  }
  const text = String(raw);
  if (text.trim() === "") return { value: EMPTY };

  switch (field.type) {
    case "number": {
      const parsed = parseDecimal(text, 4);
      if (!parsed.ok) {
        return parsed.reason === "precision"
          ? { value: EMPTY, error: { code: "PRECISION", message: `Use at most ${field.precision ?? 0} decimal places.` } }
          : { value: EMPTY, error: { code: "INVALID_NUMBER", message: "Enter a number." } };
      }
      if (parsed.value.scale > (field.precision ?? 0)) {
        return { value: EMPTY, error: { code: "PRECISION", message: `Use at most ${field.precision ?? 0} decimal places.` } };
      }
      return { value: { t: "num", d: parsed.value } };
    }
    case "single_select": {
      const option = field.options?.find((candidate) => candidate.value === text);
      return option
        ? { value: { t: "opt", v: option.value } }
        : { value: EMPTY, error: { code: "INVALID_OPTION", message: "Choose one of the listed options." } };
    }
    case "email": {
      const trimmed = text.trim().toLowerCase();
      return EMAIL.test(trimmed)
        ? { value: { t: "text", v: trimmed } }
        : { value: EMPTY, error: { code: "INVALID_EMAIL", message: "Enter a valid email address." } };
    }
    default:
      return { value: { t: "text", v: text.trim() } };
  }
}

export function isEmpty(value: Value | undefined): boolean {
  return value === undefined || value.t === "empty";
}

/** Stored representation of a visible, non-empty answer. */
export function serializeValue(value: Value): string | boolean | null {
  switch (value.t) {
    case "empty":
      return null;
    case "num":
      return formatDecimal(value.d);
    case "text":
    case "opt":
      return value.v;
    case "bool":
      return value.v;
  }
}

/** Compares a typed value with a DSL literal. EMPTY never satisfies a comparison. */
export function compareWithLiteral(value: Value, literal: string): number | null {
  if (value.t === "num") return compareDecimal(value.d, decimalFromLiteral(literal));
  if (value.t === "text") return normalizeText(value.v) === normalizeText(literal) ? 0 : 1;
  if (value.t === "opt") return value.v === literal ? 0 : 1;
  return null;
}
