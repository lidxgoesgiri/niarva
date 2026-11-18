import { describe, expect, it } from "vitest";
import { normalizeExtraction } from "@/server/ai/extract-claims";

// FR-02 / AC-02 — AI output is untrusted: schema-checked, quotes verified, ambiguity flagged.
const PROMPT = "Create a scholarship application. Name is required. Applicants above 3.5 GPA must upload a transcript.";

const base = {
  fields: [
    { key: "full_name", label: "Full name", type: "short_text" },
    { key: "gpa", label: "GPA", type: "number", precision: 2 },
    { key: "transcript", label: "Transcript", type: "short_text" },
  ],
  claims: [
    { key: "C-01", kind: "FIELD", field: "full_name", required: "always", sourceQuote: "Name is required." },
    { key: "C-02", kind: "FIELD", field: "gpa", required: "always", sourceQuote: "this text is not in the prompt" },
    {
      key: "C-03",
      kind: "VISIBLE_WHEN",
      field: "transcript",
      when: { kind: "cmp", field: "gpa", op: "gt", value: "3.5" },
      requiredWhenVisible: true,
      sourceQuote: "Applicants above 3.5 GPA must upload a transcript.",
      reviewState: "approved",
    },
  ],
};

describe("AI extraction guard", () => {
  it("rejects output that does not match the claim schema", () => {
    expect(normalizeExtraction({ fields: [], claims: [] }, PROMPT)).toBeNull();
    expect(normalizeExtraction("not json", PROMPT)).toBeNull();
    expect(normalizeExtraction({ fields: base.fields, claims: [{ key: "C-01", kind: "RUN_CODE", code: "process.exit()" }] }, PROMPT)).toBeNull();
  });

  it("keeps verbatim quotes with their span and drops invented ones", () => {
    const content = normalizeExtraction(base, PROMPT)!;
    const first = content.claims.find((claim) => claim.key === "C-01")!;
    expect(first.sourceQuote).toBe("Name is required.");
    expect(PROMPT.slice(first.sourceSpan!.start, first.sourceSpan!.end)).toBe("Name is required.");
    expect(content.claims.find((claim) => claim.key === "C-02")!.sourceQuote).toBeUndefined();
  });

  it("never trusts the model's review state and flags ambiguous or unsupported wording", () => {
    const content = normalizeExtraction(base, PROMPT)!;
    for (const claim of content.claims) expect(claim.origin).toBe("ai");
    const flagged = content.claims.find((claim) => claim.key === "C-03")!;
    expect(flagged.reviewState).toBe("needs_review");
    expect(flagged.ambiguity?.question).toBeTruthy();
    expect(content.claims.find((claim) => claim.key === "C-01")!.reviewState).toBe("proposed");
  });

  it("never lets the model acknowledge a manual check on the creator's behalf", () => {
    const content = normalizeExtraction(
      {
        fields: base.fields.slice(0, 2),
        claims: [
          ...base.claims.slice(0, 2),
          { key: "C-03", kind: "MANUAL", text: "Certificate handled outside the form", acknowledged: true, sourceQuote: "Applicants above 3.5 GPA must upload a transcript." },
        ],
      },
      PROMPT,
    )!;
    const manual = content.claims.find((claim) => claim.key === "C-03")!;
    expect(manual.kind).toBe("MANUAL");
    expect(manual.kind === "MANUAL" && manual.acknowledged).toBe(false);
    expect(manual.reviewState).toBe("needs_review");
    expect(manual.ambiguity?.choices).toEqual(["Keep as manual check", "Remove"]);
  });
});
