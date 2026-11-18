import type { ClaimSetContent, FormDefinition } from "../dsl/schema";
import { makeRule, skeletonFromClaims } from "./skeleton";

/**
 * The golden scholarship scenario used by the template, the judge demo, and the tests.
 * All data is synthetic.
 */
export const GOLDEN_PROMPT =
  "Create a scholarship application. Name and GPA are required. Applicants with a GPA of 3.5 or higher must provide an achievement certificate. Applicants below 3.5 must not see that field.";

const quote = (text: string) => {
  const start = GOLDEN_PROMPT.indexOf(text);
  return { sourceSpan: { start, end: start + text.length }, sourceQuote: text };
};

export const GOLDEN_CLAIMS: ClaimSetContent = {
  fields: [
    { key: "full_name", label: "Full name", type: "short_text" },
    { key: "gpa", label: "GPA", type: "number", precision: 2 },
    { key: "certificate", label: "Achievement certificate number", type: "short_text" },
  ],
  claims: [
    { key: "C-01", kind: "FIELD", field: "full_name", required: "always", origin: "template", reviewState: "proposed", ...quote("Name and GPA are required.") },
    { key: "C-02", kind: "FIELD", field: "gpa", required: "always", origin: "template", reviewState: "proposed", ...quote("Name and GPA are required.") },
    {
      key: "C-03",
      kind: "VISIBLE_WHEN",
      field: "certificate",
      when: { kind: "cmp", field: "gpa", op: "gte", value: "3.5" },
      requiredWhenVisible: true,
      origin: "template",
      reviewState: "proposed",
      ...quote("Applicants with a GPA of 3.5 or higher must provide an achievement certificate."),
    },
    {
      key: "C-04",
      kind: "CONSTRAINT",
      field: "gpa",
      constraint: { min: "0", max: "4", precision: 2 },
      origin: "template",
      reviewState: "proposed",
    },
  ],
};

export const GOLDEN_TITLE = "Scholarship Application";

/** The correct implementation of the approved claims. */
export function goldenDefinition(): FormDefinition {
  return skeletonFromClaims(GOLDEN_CLAIMS, { title: GOLDEN_TITLE, submitLabel: "Submit application" });
}

/**
 * Seeded defect for demonstration: the certificate rule uses `gt` instead of `gte`, so
 * GPA 3.5 does not show the certificate. Always labeled as seeded wherever it is shown.
 */
export function goldenDefinitionWithSeededDefect(): FormDefinition {
  const definition = goldenDefinition();
  return {
    ...definition,
    rules: [makeRule("certificate", "show", { kind: "cmp", field: "gpa", op: "gt", value: "3.5" }, ["C-03"])],
  };
}
