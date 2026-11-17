import { sha256Hex } from "../hash/hash";
import type { FieldBehavior } from "../eval/evaluate";

export type Layer = "L0" | "L1" | "L2";
export type Severity = "error" | "warning" | "info";

export type Counterexample = {
  /** The field whose behavior differs from the approved intent. */
  field: string;
  aspect: "visible" | "required";
  /** Raw controller inputs of the witness cell; "" means empty. */
  assignment: Record<string, string>;
  expected: FieldBehavior;
  actual: FieldBehavior;
  /** Present when the witness sits on a numeric threshold named by a claim. */
  boundary?: { field: string; value: string };
};

export type Finding = {
  /** Deterministic: identical input always yields identical keys. */
  key: string;
  code: string;
  layer: Layer;
  severity: Severity;
  fieldKeys: string[];
  ruleIds: string[];
  claimKeys: string[];
  message: string;
  counterexample?: Counterexample;
};

export function makeFinding(input: Omit<Finding, "key">): Finding {
  const subject = [input.code, ...input.fieldKeys, ...input.ruleIds, ...input.claimKeys, input.counterexample?.aspect ?? ""].join("|");
  return { key: sha256Hex(`fk1|${subject}`).slice(0, 16), ...input };
}
