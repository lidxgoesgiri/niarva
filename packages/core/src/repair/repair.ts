import { z } from "zod";
import { analyze, type AnalysisResult } from "../analysis/analyze";
import type { Finding } from "../analysis/findings";
import { activeClaims } from "../claims/claims";
import {
  CMP_OPS,
  cmpOpSchema,
  conditionSchema,
  ruleSchema,
  type Claim,
  type ClaimSetContent,
  type CmpOp,
  type Condition,
  type FormDefinition,
  type Rule,
} from "../dsl/schema";
import { canonicalJson, definitionHash } from "../hash/hash";
import { makeRule } from "../generate/skeleton";
import { literalsFor } from "../analysis/partition";

/**
 * The only edits a repair may make. They change form configuration, never approved
 * claims, expected results, probe policy, identity, evidence, or source code.
 */
export const patchOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_operator"), ruleId: z.string(), path: z.array(z.number().int().min(0)).max(4), from: cmpOpSchema, to: cmpOpSchema }).strict(),
  z.object({ op: z.literal("set_literal"), ruleId: z.string(), path: z.array(z.number().int().min(0)).max(4), from: z.string(), to: z.string().min(1).max(200) }).strict(),
  z.object({ op: z.literal("set_condition"), ruleId: z.string(), from: conditionSchema, to: conditionSchema }).strict(),
  z.object({ op: z.literal("set_field_required"), field: z.string(), from: z.boolean(), to: z.boolean() }).strict(),
  z.object({ op: z.literal("add_rule"), rule: ruleSchema }).strict(),
  z.object({ op: z.literal("remove_rule"), rule: ruleSchema }).strict(),
]);
export type PatchOp = z.infer<typeof patchOpSchema>;

export const MAX_PATCH_OPS = 5;

export const patchSchema = z
  .object({ baseDefinitionHash: z.string().regex(/^[a-f0-9]{64}$/), ops: z.array(patchOpSchema).min(1).max(MAX_PATCH_OPS) })
  .strict();
export type Patch = z.infer<typeof patchSchema>;

export type ApplyResult =
  | { ok: true; definition: FormDefinition }
  | { ok: false; code: "STALE_BASE" | "PRECONDITION_FAILED" | "INVALID_PATCH"; message: string };

function nodeAt(condition: Condition, path: number[]): Condition | null {
  let node: Condition = condition;
  for (const index of path) {
    if (node.kind === "and" || node.kind === "or") node = node.items[index] as Condition;
    else if (node.kind === "not" && index === 0) node = node.item;
    else return null;
    if (!node) return null;
  }
  return node;
}

function replaceAt(condition: Condition, path: number[], replacement: Condition): Condition {
  if (path.length === 0) return replacement;
  const [head, ...rest] = path as [number, ...number[]];
  if (condition.kind === "and" || condition.kind === "or") {
    return { ...condition, items: condition.items.map((item, index) => (index === head ? replaceAt(item, rest, replacement) : item)) };
  }
  if (condition.kind === "not") return { ...condition, item: replaceAt(condition.item, rest, replacement) };
  return condition;
}

/**
 * Applies a patch to the exact base version it was proposed for. Every operation states the
 * value it expects to replace; any difference means the base changed and the patch is refused.
 */
export function applyPatch(definition: FormDefinition, input: unknown): ApplyResult {
  const parsed = patchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_PATCH", message: "The patch uses an operation or shape that is not allowed." };
  const patch = parsed.data;
  if (patch.baseDefinitionHash !== definitionHash(definition)) {
    return { ok: false, code: "STALE_BASE", message: "The form changed after this repair was proposed." };
  }
  // Every operation below builds new objects; the base definition is never mutated.
  let next: FormDefinition = definition;
  const fail = (message: string): ApplyResult => ({ ok: false, code: "PRECONDITION_FAILED", message });

  for (const op of patch.ops) {
    switch (op.op) {
      case "set_operator":
      case "set_literal": {
        const rule = next.rules.find((candidate) => candidate.id === op.ruleId);
        const node = rule ? nodeAt(rule.when, op.path) : null;
        if (!rule || !node || node.kind !== "cmp") return fail(`Rule ${op.ruleId} has no comparison at that position.`);
        if (op.op === "set_operator" && node.op !== op.from) return fail(`Rule ${op.ruleId} no longer uses "${op.from}".`);
        if (op.op === "set_literal" && node.value !== op.from) return fail(`Rule ${op.ruleId} no longer compares with "${op.from}".`);
        const updated: Condition = op.op === "set_operator" ? { ...node, op: op.to } : { ...node, value: op.to };
        next = { ...next, rules: next.rules.map((candidate) => (candidate.id === op.ruleId ? { ...candidate, when: replaceAt(candidate.when, op.path, updated) } : candidate)) };
        break;
      }
      case "set_condition": {
        const rule = next.rules.find((candidate) => candidate.id === op.ruleId);
        if (!rule || canonicalJson(rule.when) !== canonicalJson(op.from)) return fail(`Rule ${op.ruleId} changed.`);
        next = { ...next, rules: next.rules.map((candidate) => (candidate.id === op.ruleId ? { ...candidate, when: op.to } : candidate)) };
        break;
      }
      case "set_field_required": {
        const field = next.fields.find((candidate) => candidate.key === op.field);
        if (!field || field.required !== op.from) return fail(`Field ${op.field} changed.`);
        next = { ...next, fields: next.fields.map((candidate) => (candidate.key === op.field ? { ...candidate, required: op.to } : candidate)) };
        break;
      }
      case "add_rule": {
        if (next.rules.some((candidate) => candidate.id === op.rule.id)) return fail(`Rule ${op.rule.id} already exists.`);
        if (!next.fields.some((field) => field.key === op.rule.target)) return fail(`Unknown target ${op.rule.target}.`);
        next = {
          ...next,
          rules: [...next.rules, op.rule],
          fields: next.fields.map((field) => (field.key === op.rule.target && op.rule.effect === "show" ? { ...field, visibility: "conditional" as const } : field)),
        };
        break;
      }
      case "remove_rule": {
        const rule = next.rules.find((candidate) => candidate.id === op.rule.id);
        if (!rule || canonicalJson(rule) !== canonicalJson(op.rule)) return fail(`Rule ${op.rule.id} changed.`);
        next = { ...next, rules: next.rules.filter((candidate) => candidate.id !== op.rule.id) };
        break;
      }
    }
  }
  return { ok: true, definition: next };
}

export type RepairValidation = {
  ok: boolean;
  gate1: AnalysisResult["gate1"];
  verdict: AnalysisResult["verdict"];
  resolvedFindingKeys: string[];
  remainingTargetFindingKeys: string[];
  newErrorCodes: string[];
  reasons: string[];
};

/**
 * A repair is valid only if, against the unchanged approved claims, the patched definition
 * passes Gate 1, removes every targeted finding, and introduces no new error.
 */
export function validateRepair(base: FormDefinition, content: ClaimSetContent, patch: Patch, targetFindingKeys: string[]): RepairValidation & { definition?: FormDefinition } {
  const before = analyze(base, content);
  const applied = applyPatch(base, patch);
  if (!applied.ok) {
    return { ok: false, gate1: "FAILED", verdict: "FAILED", resolvedFindingKeys: [], remainingTargetFindingKeys: targetFindingKeys, newErrorCodes: [], reasons: [applied.message] };
  }
  const after = analyze(applied.definition, content);
  const afterKeys = new Set(after.findings.map((finding) => finding.key));
  const beforeErrors = new Set(before.findings.filter((finding) => finding.severity === "error").map((finding) => finding.key));
  const remaining = targetFindingKeys.filter((key) => afterKeys.has(key));
  const newErrors = after.findings.filter((finding) => finding.severity === "error" && !beforeErrors.has(finding.key));
  const reasons: string[] = [];
  if (after.gate1 !== "PASS") reasons.push("The repaired form fails structural validation.");
  if (remaining.length > 0) reasons.push("The repair does not resolve the diagnosed mismatch.");
  if (newErrors.length > 0) reasons.push(`The repair introduces new problems: ${[...new Set(newErrors.map((finding) => finding.code))].join(", ")}.`);
  return {
    ok: reasons.length === 0,
    gate1: after.gate1,
    verdict: after.verdict,
    resolvedFindingKeys: targetFindingKeys.filter((key) => !afterKeys.has(key)),
    remainingTargetFindingKeys: remaining,
    newErrorCodes: [...new Set(newErrors.map((finding) => finding.code))],
    reasons,
    definition: applied.definition,
  };
}

export type RepairCandidate = {
  strategy: "ALIGN_OPERATOR" | "ALIGN_LITERAL" | "REGENERATE_FROM_CLAIM";
  findingKeys: string[];
  claimKeys: string[];
  patch: Patch;
  explanation: string;
  predictedEffects: string[];
  validation: RepairValidation;
};

function comparisons(condition: Condition, path: number[] = []): { path: number[]; node: Extract<Condition, { kind: "cmp" }> }[] {
  switch (condition.kind) {
    case "cmp":
      return [{ path, node: condition }];
    case "and":
    case "or":
      return condition.items.flatMap((item, index) => comparisons(item, [...path, index]));
    case "not":
      return comparisons(condition.item, [...path, 0]);
    default:
      return [];
  }
}

const OP_SYMBOL: Record<CmpOp, string> = { eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤" };

/**
 * Deterministic repair proposals for intent mismatches. Each candidate is validated by the
 * engine before it is offered; the creator must still approve it, and approval creates a new
 * immutable version. Infrastructure failures and unknown results are never repaired.
 */
export function proposeRepairs(definition: FormDefinition, content: ClaimSetContent, analysis: AnalysisResult, limit = 5): RepairCandidate[] {
  const targets = analysis.findings.filter(
    (finding): finding is Finding & { counterexample: NonNullable<Finding["counterexample"]> } =>
      (finding.code === "INTENT_MISMATCH_VISIBILITY" || finding.code === "INTENT_MISMATCH_REQUIRED") && finding.counterexample !== undefined,
  );
  if (targets.length === 0 || analysis.gate1 !== "PASS") return [];
  const baseHash = definitionHash(definition);
  const byField = new Map<string, typeof targets>();
  for (const finding of targets) {
    const list = byField.get(finding.counterexample.field) ?? [];
    list.push(finding);
    byField.set(finding.counterexample.field, list);
  }
  const claims = activeClaims(content);
  const labels = new Map(content.fields.map((field) => [field.key, field.label]));
  const candidates: RepairCandidate[] = [];
  const seen = new Set<string>();

  const consider = (strategy: RepairCandidate["strategy"], fieldFindings: typeof targets, ops: PatchOp[], explanation: string, predictedEffects: string[]) => {
    if (ops.length === 0 || ops.length > MAX_PATCH_OPS) return;
    const patch: Patch = { baseDefinitionHash: baseHash, ops };
    const id = canonicalJson(ops);
    if (seen.has(id)) return;
    seen.add(id);
    const findingKeys = fieldFindings.map((finding) => finding.key);
    const validation = validateRepair(definition, content, patch, findingKeys);
    if (!validation.ok) return;
    const { definition: _definition, ...rest } = validation;
    candidates.push({ strategy, findingKeys, claimKeys: [...new Set(fieldFindings.flatMap((finding) => finding.claimKeys))], patch, explanation, predictedEffects, validation: rest });
  };

  for (const [field, fieldFindings] of byField) {
    const label = labels.get(field) ?? field;
    const fieldClaims = claims.filter((claim): claim is Extract<Claim, { kind: "VISIBLE_WHEN" | "REQUIRED_WHEN" }> => (claim.kind === "VISIBLE_WHEN" || claim.kind === "REQUIRED_WHEN") && claim.field === field);
    const claimLiterals = (controller: string) => literalsFor(controller, fieldClaims.map((claim) => claim.when));
    const witness = fieldFindings[0]?.counterexample;
    const effect = witness
      ? `At ${Object.entries(witness.assignment).map(([key, raw]) => `${labels.get(key) ?? key} = ${raw || "(empty)"}`).join(", ") || "the initial state"}, "${label}" becomes ${witness.expected.visible ? "visible" : "hidden"}${witness.expected.visible ? (witness.expected.required ? " and required" : " and optional") : ""}, as approved.`
      : `"${label}" behaves as approved.`;

    for (const rule of definition.rules.filter((candidate) => candidate.target === field)) {
      for (const { path, node } of comparisons(rule.when)) {
        for (const op of CMP_OPS) {
          if (op === node.op) continue;
          consider(
            "ALIGN_OPERATOR",
            fieldFindings,
            [{ op: "set_operator", ruleId: rule.id, path, from: node.op, to: op }],
            `Change the comparison in ${rule.id} from "${OP_SYMBOL[node.op]}" to "${OP_SYMBOL[op]}" so ${labels.get(node.field) ?? node.field} ${node.value} is handled as the approved claim states.`,
            [effect],
          );
        }
        for (const literal of claimLiterals(node.field)) {
          if (literal === node.value) continue;
          consider(
            "ALIGN_LITERAL",
            fieldFindings,
            [{ op: "set_literal", ruleId: rule.id, path, from: node.value, to: literal }],
            `Change the threshold in ${rule.id} from ${node.value} to ${literal}, the value in the approved claim.`,
            [effect],
          );
        }
      }
    }

    // Rebuild the field's rules from its claims.
    const existing = definition.rules.filter((rule) => rule.target === field);
    const fresh: Rule[] = [
      ...fieldClaims.filter((claim) => claim.kind === "VISIBLE_WHEN").map((claim) => makeRule(field, "show", claim.when, [claim.key])),
      ...fieldClaims.filter((claim) => claim.kind === "REQUIRED_WHEN").map((claim) => makeRule(field, "require", claim.when, [claim.key])),
    ];
    const keep = new Set(fresh.map((rule) => rule.id));
    const ops: PatchOp[] = [
      ...existing.filter((rule) => !keep.has(rule.id)).map((rule) => ({ op: "remove_rule" as const, rule })),
      ...fresh.filter((rule) => !existing.some((other) => other.id === rule.id)).map((rule) => ({ op: "add_rule" as const, rule })),
    ];
    const visibleClaim = fieldClaims.find((claim): claim is Extract<Claim, { kind: "VISIBLE_WHEN" }> => claim.kind === "VISIBLE_WHEN");
    const fieldDefinition = definition.fields.find((candidate) => candidate.key === field);
    const fieldClaim = claims.find((claim) => claim.kind === "FIELD" && claim.field === field);
    const wantRequired = visibleClaim ? visibleClaim.requiredWhenVisible : fieldClaim?.kind === "FIELD" ? fieldClaim.required === "always" : fieldDefinition?.required;
    if (fieldDefinition && wantRequired !== undefined && fieldDefinition.required !== wantRequired) {
      ops.push({ op: "set_field_required", field, from: fieldDefinition.required, to: wantRequired });
    }
    consider("REGENERATE_FROM_CLAIM", fieldFindings, ops, `Rebuild the rules for "${label}" directly from its approved claims.`, [effect]);
  }

  return candidates.sort((a, b) => a.patch.ops.length - b.patch.ops.length).slice(0, limit);
}
