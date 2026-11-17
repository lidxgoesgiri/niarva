/**
 * Exact decimal arithmetic for form values. Numbers are never converted to binary
 * floating point: 3.5 and 3.50 compare equal, and 3.49 is strictly below 3.5.
 */
export type Decimal = { readonly units: bigint; readonly scale: number };

export type DecimalParse =
  | { ok: true; value: Decimal }
  | { ok: false; reason: "empty" | "format" | "precision" };

const INPUT = /^\s*(-?)(\d+)(?:[.,](\d+))?\s*$/;

/**
 * Parses user input. Both "." and "," are accepted as the decimal separator; thousands
 * separators are not. Excess precision is rejected, never rounded.
 */
export function parseDecimal(raw: string, maxPrecision = 4): DecimalParse {
  if (raw.trim() === "") return { ok: false, reason: "empty" };
  const match = INPUT.exec(raw);
  if (!match) return { ok: false, reason: "format" };
  const [, sign, whole, frac = ""] = match;
  const trimmedFrac = frac.replace(/0+$/, "");
  if (trimmedFrac.length > maxPrecision) return { ok: false, reason: "precision" };
  if ((whole ?? "").replace(/^0+/, "").length > 15) return { ok: false, reason: "format" };
  const digits = BigInt(`${whole}${trimmedFrac}` || "0");
  const units = sign === "-" ? -digits : digits;
  return { ok: true, value: normalize({ units, scale: trimmedFrac.length }) };
}

/** Parses a canonical literal from the DSL. Throws on malformed input (literals are validated earlier). */
export function decimalFromLiteral(literal: string): Decimal {
  const parsed = parseDecimal(literal, 4);
  if (!parsed.ok) throw new Error(`Invalid decimal literal: ${literal}`);
  return parsed.value;
}

function normalize(value: Decimal): Decimal {
  let { units, scale } = value;
  while (scale > 0 && units % 10n === 0n) {
    units /= 10n;
    scale -= 1;
  }
  return { units: units === 0n ? 0n : units, scale: units === 0n ? 0 : scale };
}

function rescale(value: Decimal, scale: number): bigint {
  return value.units * 10n ** BigInt(scale - value.scale);
}

export function compareDecimal(a: Decimal, b: Decimal): -1 | 0 | 1 {
  const scale = Math.max(a.scale, b.scale);
  const left = rescale(a, scale);
  const right = rescale(b, scale);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function addUnits(value: Decimal, delta: bigint, scale: number): Decimal {
  const target = Math.max(value.scale, scale);
  return normalize({ units: rescale(value, target) + delta * 10n ** BigInt(target - scale), scale: target });
}

/** Canonical string: no leading zeros, no trailing fractional zeros, "." separator, no "-0". */
export function formatDecimal(value: Decimal): string {
  const negative = value.units < 0n;
  const digits = (negative ? -value.units : value.units).toString().padStart(value.scale + 1, "0");
  const whole = value.scale === 0 ? digits : digits.slice(0, -value.scale);
  const frac = value.scale === 0 ? "" : digits.slice(-value.scale);
  return `${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** Fixed-precision display string, e.g. 3.5 with precision 2 → "3.50". */
export function formatFixed(value: Decimal, precision: number): string {
  const canonical = formatDecimal(value);
  const [whole, frac = ""] = canonical.split(".");
  return precision === 0 ? (whole ?? "0") : `${whole}.${frac.padEnd(precision, "0")}`;
}
