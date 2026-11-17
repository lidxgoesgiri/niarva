import { z } from "zod";

/**
 * Rule DSL v1: a deliberately small, declarative language. Nothing in it is executed as code.
 * The same `Condition` type is used for approved claims (intent) and for form rules
 * (implementation), so the two can be compared semantically.
 */

export const FIELD_KEY = /^[a-z][a-z0-9_]{1,39}$/;
export const DECIMAL_STRING = /^-?(0|[1-9]\d{0,14})(\.\d{1,4})?$/;
export const OPTION_VALUE = /^[a-z0-9_]{1,40}$/;
export const RULE_ID = /^rule_[a-f0-9]{4,12}$/;
/** "C-01" style keys, or a short readable name such as "C-GPA". */
export const CLAIM_KEY = /^C-(?:\d{2,3}|[A-Z][A-Z0-9-]{1,11})$/;

export const LIMITS = {
  fields: 50,
  rules: 60,
  rulesPerTarget: 10,
  sections: 10,
  conditionDepth: 3,
  groupItemsMin: 2,
  groupItemsMax: 10,
  options: 50,
  claims: 60,
  cellsPerAnalysis: 50_000,
} as const;

export const fieldKeySchema = z.string().regex(FIELD_KEY, "Use lower-case letters, digits, and underscores.");
export const decimalStringSchema = z.string().regex(DECIMAL_STRING, "Not a decimal number.");

export const FIELD_TYPES = ["short_text", "long_text", "email", "number", "single_select", "checkbox"] as const;
export const fieldTypeSchema = z.enum(FIELD_TYPES);
export type FieldType = z.infer<typeof fieldTypeSchema>;

export const CMP_OPS = ["eq", "neq", "gt", "gte", "lt", "lte"] as const;
export const cmpOpSchema = z.enum(CMP_OPS);
export type CmpOp = z.infer<typeof cmpOpSchema>;

export type Condition =
  | { kind: "cmp"; field: string; op: CmpOp; value: string }
  | { kind: "in"; field: string; values: string[] }
  | { kind: "is_empty"; field: string }
  | { kind: "is_filled"; field: string }
  | { kind: "is_checked"; field: string }
  | { kind: "and"; items: Condition[] }
  | { kind: "or"; items: Condition[] }
  | { kind: "not"; item: Condition }
  | { kind: "always" };

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("cmp"), field: fieldKeySchema, op: cmpOpSchema, value: z.string().min(1).max(200) }),
    z.object({ kind: z.literal("in"), field: fieldKeySchema, values: z.array(z.string().min(1).max(200)).min(1).max(50) }),
    z.object({ kind: z.literal("is_empty"), field: fieldKeySchema }),
    z.object({ kind: z.literal("is_filled"), field: fieldKeySchema }),
    z.object({ kind: z.literal("is_checked"), field: fieldKeySchema }),
    z.object({ kind: z.literal("and"), items: z.array(conditionSchema).min(2).max(10) }),
    z.object({ kind: z.literal("or"), items: z.array(conditionSchema).min(2).max(10) }),
    z.object({ kind: z.literal("not"), item: conditionSchema }),
    z.object({ kind: z.literal("always") }),
  ]),
);

export const optionSchema = z.object({
  value: z.string().regex(OPTION_VALUE),
  label: z.string().min(1).max(120),
});
export type Option = z.infer<typeof optionSchema>;

export const validationSchema = z
  .object({
    min: decimalStringSchema.optional(),
    max: decimalStringSchema.optional(),
    precision: z.number().int().min(0).max(4).optional(),
    minLength: z.number().int().min(0).max(5000).optional(),
    maxLength: z.number().int().min(1).max(5000).optional(),
    pattern: z.enum(["digits_only", "alphanumeric"]).optional(),
  })
  .strict();
export type Validation = z.infer<typeof validationSchema>;

export const fieldSchema = z
  .object({
    key: fieldKeySchema,
    sectionKey: fieldKeySchema,
    type: fieldTypeSchema,
    label: z.string().trim().min(1).max(200),
    helpText: z.string().max(500).optional(),
    placeholder: z.string().max(120).optional(),
    /** Base requiredness; it only applies while the field is visible. */
    required: z.boolean(),
    visibility: z.enum(["always", "conditional"]),
    options: z.array(optionSchema).min(2).max(LIMITS.options).optional(),
    validation: validationSchema.optional(),
  })
  .strict();
export type Field = z.infer<typeof fieldSchema>;

export const ruleSchema = z
  .object({
    id: z.string().regex(RULE_ID),
    target: fieldKeySchema,
    effect: z.enum(["show", "require"]),
    when: conditionSchema,
    /** Informational only: the engine never trusts this mapping. */
    originClaimKeys: z.array(z.string()).max(20).default([]),
    note: z.string().max(200).optional(),
  })
  .strict();
export type Rule = z.infer<typeof ruleSchema>;

export const sectionSchema = z
  .object({
    key: fieldKeySchema,
    title: z.string().max(120).optional(),
    description: z.string().max(500).optional(),
  })
  .strict();
export type Section = z.infer<typeof sectionSchema>;

export const formDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().trim().min(1).max(120),
    description: z.string().max(1000).optional(),
    sections: z.array(sectionSchema).min(1).max(LIMITS.sections),
    fields: z.array(fieldSchema).min(1).max(LIMITS.fields),
    rules: z.array(ruleSchema).max(LIMITS.rules),
    settings: z
      .object({
        submitLabel: z.string().trim().min(1).max(40).optional(),
        successMessage: z.string().trim().min(1).max(300).optional(),
      })
      .strict()
      .default({}),
  })
  .strict();
export type FormDefinition = z.infer<typeof formDefinitionSchema>;

/* ---------------------------------------------------------------- claims */

export const fieldSpecSchema = z
  .object({
    key: fieldKeySchema,
    label: z.string().trim().min(1).max(200),
    type: fieldTypeSchema,
    options: z.array(optionSchema).min(2).max(LIMITS.options).optional(),
    precision: z.number().int().min(0).max(4).optional(),
  })
  .strict();
export type FieldSpec = z.infer<typeof fieldSpecSchema>;

const claimBase = {
  key: z.string().regex(CLAIM_KEY),
  /** Character offsets into the source prompt; validated as a substring. */
  sourceSpan: z.object({ start: z.number().int().min(0), end: z.number().int().min(0) }).strict().optional(),
  sourceQuote: z.string().max(400).optional(),
  origin: z.enum(["ai", "user", "template"]),
  reviewState: z.enum(["proposed", "edited", "approved", "rejected", "needs_review"]),
  ambiguity: z
    .object({ question: z.string().max(300), choices: z.array(z.string().max(200)).max(6), resolvedChoice: z.string().optional() })
    .strict()
    .optional(),
};

export const claimSchema = z.discriminatedUnion("kind", [
  z.object({ ...claimBase, kind: z.literal("FIELD"), field: fieldKeySchema, required: z.enum(["always", "optional"]) }).strict(),
  z.object({ ...claimBase, kind: z.literal("VISIBLE_WHEN"), field: fieldKeySchema, when: conditionSchema, requiredWhenVisible: z.boolean() }).strict(),
  z.object({ ...claimBase, kind: z.literal("REQUIRED_WHEN"), field: fieldKeySchema, when: conditionSchema }).strict(),
  z.object({ ...claimBase, kind: z.literal("CONSTRAINT"), field: fieldKeySchema, constraint: validationSchema }).strict(),
  z.object({ ...claimBase, kind: z.literal("MANUAL"), field: fieldKeySchema.optional(), text: z.string().min(1).max(400), acknowledged: z.boolean() }).strict(),
]);
export type Claim = z.infer<typeof claimSchema>;

export const claimSetContentSchema = z
  .object({
    fields: z.array(fieldSpecSchema).min(1).max(LIMITS.fields),
    claims: z.array(claimSchema).min(1).max(LIMITS.claims),
  })
  .strict();
export type ClaimSetContent = z.infer<typeof claimSetContentSchema>;
