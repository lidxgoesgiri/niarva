import { describe, expect, it } from "vitest";
import { analyze } from "../src/analysis/analyze";
import { compositionProblems, renderStatement, catalogFields } from "../src/claims/claims";
import { makeRule } from "../src/generate/skeleton";
import { GOLDEN_CLAIMS, goldenDefinition, goldenDefinitionWithSeededDefect } from "../src/generate/golden";

// FR-05 / FR-06 — Intent Trace and deterministic rule analysis (T-01).
describe("intent analysis on the golden scholarship case", () => {
  it("accepts the approved claims as a valid composition", () => {
    expect(compositionProblems(GOLDEN_CLAIMS)).toEqual([]);
  });

  it("renders the boundary claim with an explicit inclusion note", () => {
    const fields = new Map(catalogFields(GOLDEN_CLAIMS).map((field) => [field.key, field]));
    const claim = GOLDEN_CLAIMS.claims.find((candidate) => candidate.key === "C-03");
    expect(renderStatement(claim!, fields)).toBe(
      "Achievement certificate number is shown and must be filled in when GPA ≥ 3.5 (3.5 included). Otherwise it is hidden and its answer is not submitted.",
    );
  });

  it("passes the correct gte implementation", () => {
    const result = analyze(goldenDefinition(), GOLDEN_CLAIMS);
    expect(result.gate1).toBe("PASS");
    expect(result.findings.filter((finding) => finding.severity === "error")).toEqual([]);
    expect(result.verdict).toBe("PASS");
    expect(Object.values(result.claimStatuses).map((status) => status.status)).toEqual(["PASS", "PASS", "PASS", "PASS"]);
    expect(result.ruleTrace).toEqual([expect.objectContaining({ target: "certificate", status: "supported", servesClaims: ["C-03"] })]);
  });

  it("finds the seeded gt defect with the GPA 3.5 witness mapped to the approved claim", () => {
    const result = analyze(goldenDefinitionWithSeededDefect(), GOLDEN_CLAIMS);
    expect(result.verdict).toBe("FAILED");
    const visibility = result.findings.find((finding) => finding.code === "INTENT_MISMATCH_VISIBILITY");
    expect(visibility?.claimKeys).toEqual(["C-03"]);
    expect(visibility?.counterexample).toMatchObject({
      field: "certificate",
      aspect: "visible",
      assignment: { gpa: "3.50" },
      expected: { visible: true, required: true },
      actual: { visible: false, required: false },
      boundary: { field: "gpa", value: "3.5" },
    });
    expect(result.findings.find((finding) => finding.code === "INTENT_MISMATCH_REQUIRED")?.counterexample?.assignment).toEqual({ gpa: "3.50" });
    expect(result.claimStatuses["C-03"]?.status).toBe("FAILED");
    expect(result.claimStatuses["C-01"]?.status).toBe("PASS");
    expect(result.claimStatuses["C-04"]?.status).toBe("PASS");
    expect(result.ruleTrace[0]?.status).toBe("conflicting");
  });

  it("flags an extra rule without a claim", () => {
    const definition = goldenDefinition();
    const extra = makeRule("full_name", "show", { kind: "cmp", field: "gpa", op: "gte", value: "1" }, []);
    const result = analyze({ ...definition, rules: [...definition.rules, extra] }, GOLDEN_CLAIMS);
    expect(result.findings).toContainEqual(expect.objectContaining({ code: "INTENT_UNREQUESTED_RULE", ruleIds: [extra.id], severity: "warning" }));
  });

  it("flags a widened condition as a mismatch below the approved boundary", () => {
    const definition = goldenDefinition();
    const widened = { ...definition, rules: [makeRule("certificate", "show", { kind: "cmp", field: "gpa", op: "gte", value: "3" }, ["C-03"])] };
    const result = analyze(widened, GOLDEN_CLAIMS);
    const finding = result.findings.find((candidate) => candidate.code === "INTENT_MISMATCH_VISIBILITY");
    expect(finding?.counterexample?.expected.visible).toBe(false);
    expect(finding?.counterexample?.actual.visible).toBe(true);
  });

  it("rejects structural errors in Gate 1 without running intent analysis", () => {
    const definition = goldenDefinition();
    const broken = { ...definition, rules: [makeRule("certificate", "show", { kind: "cmp", field: "unknown_field", op: "gte", value: "3.5" }, [])] };
    const result = analyze(broken, GOLDEN_CLAIMS);
    expect(result.gate1).toBe("FAILED");
    expect(result.findings.map((finding) => finding.code)).toContain("UNKNOWN_FIELD_REF");
  });

  it("rejects an operator that does not fit the field type", () => {
    const definition = goldenDefinition();
    const broken = { ...definition, rules: [makeRule("certificate", "show", { kind: "cmp", field: "full_name", op: "gt", value: "a" }, [])] };
    expect(analyze(broken, GOLDEN_CLAIMS).findings.map((finding) => finding.code)).toContain("TYPE_MISMATCH");
  });

  it("rejects a rule cycle", () => {
    const definition = goldenDefinition();
    const cyclic = {
      ...definition,
      fields: definition.fields.map((field) => (field.key === "gpa" ? { ...field, visibility: "conditional" as const } : field)),
      rules: [
        ...definition.rules,
        makeRule("gpa", "show", { kind: "is_filled", field: "certificate" }, []),
      ],
    };
    expect(analyze(cyclic, GOLDEN_CLAIMS).findings.map((finding) => finding.code)).toContain("DEPENDENCY_CYCLE");
  });

  it("detects a missing field and a changed constraint", () => {
    const definition = goldenDefinition();
    const missing = { ...definition, fields: definition.fields.filter((field) => field.key !== "full_name") };
    expect(analyze(missing, GOLDEN_CLAIMS).findings.map((finding) => finding.code)).toContain("INTENT_MISSING_FIELD");
    const loosened = {
      ...definition,
      fields: definition.fields.map((field) => (field.key === "gpa" ? { ...field, validation: { min: "0", max: "5", precision: 2 } } : field)),
    };
    const result = analyze(loosened, GOLDEN_CLAIMS);
    expect(result.findings.map((finding) => finding.code)).toContain("INTENT_MISMATCH_CONSTRAINT");
    expect(result.claimStatuses["C-04"]?.status).toBe("FAILED");
    expect(result.claimStatuses["C-03"]?.status).toBe("PASS");
  });
});
