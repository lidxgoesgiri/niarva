import { canonicalJson, sha256Hex } from "../hash/hash";
import { formDefinitionSchema, type Claim, type ClaimSetContent, type Condition, type Field, type FormDefinition, type Rule } from "../dsl/schema";
import { activeClaims } from "../claims/claims";

/** Deterministic rule id derived from the rule's content. */
export function ruleId(rule: Omit<Rule, "id">): string {
  return `rule_${sha256Hex(`rid1|${canonicalJson({ target: rule.target, effect: rule.effect, when: rule.when })}`).slice(0, 8)}`;
}

export function makeRule(target: string, effect: Rule["effect"], when: Condition, originClaimKeys: string[]): Rule {
  const body = { target, effect, when, originClaimKeys };
  return { id: ruleId(body), ...body };
}

/**
 * Builds a form definition directly from approved claims. No AI is involved, so the
 * result implements exactly the approved meaning; it is the fallback when AI generation
 * is unavailable and the reference for "regenerate from claim" repairs.
 */
export function skeletonFromClaims(content: ClaimSetContent, options: { title: string; submitLabel?: string }): FormDefinition {
  const claims = activeClaims(content);
  const fields: Field[] = [];
  const rules: Rule[] = [];
  for (const spec of content.fields) {
    const own = claims.filter((claim): claim is Exclude<Claim, { kind: "MANUAL" }> => claim.kind !== "MANUAL" && claim.field === spec.key);
    const existence = own.find((claim) => claim.kind === "FIELD");
    const visibleWhen = own.filter((claim): claim is Extract<Claim, { kind: "VISIBLE_WHEN" }> => claim.kind === "VISIBLE_WHEN");
    const requiredWhen = own.filter((claim): claim is Extract<Claim, { kind: "REQUIRED_WHEN" }> => claim.kind === "REQUIRED_WHEN");
    const constraint = own.find((claim): claim is Extract<Claim, { kind: "CONSTRAINT" }> => claim.kind === "CONSTRAINT");

    const validation =
      spec.type === "number"
        ? { ...(constraint?.constraint ?? {}), precision: constraint?.constraint.precision ?? spec.precision ?? 0 }
        : constraint
          ? { ...constraint.constraint }
          : undefined;
    fields.push({
      key: spec.key,
      sectionKey: "main",
      type: spec.type,
      label: spec.label,
      required: existence?.kind === "FIELD" ? existence.required === "always" : visibleWhen.some((claim) => claim.requiredWhenVisible),
      visibility: visibleWhen.length > 0 ? "conditional" : "always",
      ...(spec.options ? { options: spec.options } : {}),
      ...(validation && Object.keys(validation).length > 0 ? { validation } : {}),
    });
    for (const claim of visibleWhen) rules.push(makeRule(spec.key, "show", claim.when, [claim.key]));
    for (const claim of requiredWhen) rules.push(makeRule(spec.key, "require", claim.when, [claim.key]));
  }
  return formDefinitionSchema.parse({
    schemaVersion: 1,
    title: options.title,
    sections: [{ key: "main" }],
    fields,
    rules,
    settings: options.submitLabel ? { submitLabel: options.submitLabel } : {},
  });
}
