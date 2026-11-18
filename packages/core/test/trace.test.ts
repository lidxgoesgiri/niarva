import { describe, expect, it } from "vitest";
import { analyze } from "../src/analysis/analyze";
import { makeRule } from "../src/generate/skeleton";
import { GOLDEN_CLAIMS, goldenDefinition, goldenDefinitionWithSeededDefect } from "../src/generate/golden";
import { buildIntentTrace, claimBrowserStatus, conditionDsl, ruleDsl, type TraceRunInput } from "../src/trace/trace";
import type { ClaimSetContent, FormDefinition } from "../src/dsl/schema";

// FR-05 / FR-VER-09 — Intent Trace ledger: source sentence → claim → rule → static → browser.
const row = (trace: ReturnType<typeof buildIntentTrace>, key: string) => trace.rows.find((candidate) => candidate.claimKey === key)!;

describe("Intent Trace", () => {
  it("writes conditions and rules in compact DSL notation", () => {
    expect(conditionDsl({ kind: "cmp", field: "gpa", op: "gte", value: "3.5" })).toBe("gte(gpa, 3.5)");
    expect(conditionDsl({ kind: "and", items: [{ kind: "is_filled", field: "a" }, { kind: "not", item: { kind: "in", field: "b", values: ["x", "y"] } }] })).toBe(
      "and(is_filled(a), not(in(b, [x, y])))",
    );
    expect(ruleDsl({ when: { kind: "cmp", field: "gpa", op: "gt", value: "3.5" }, effect: "show", target: "certificate" })).toBe("gt(gpa, 3.5) → show certificate");
  });

  it("traces the seeded gt rule to the approved C-GPA claim with the GPA 3.50 witness and its source sentence", () => {
    const definition = goldenDefinitionWithSeededDefect();
    const trace = buildIntentTrace(GOLDEN_CLAIMS, definition, analyze(definition, GOLDEN_CLAIMS));
    const gpa = row(trace, "C-GPA");

    // The expectation is the approved claim, never the generated rule.
    expect(gpa.expectationDsl).toBe("gte(gpa, 3.5) → certificate visible AND required");
    expect(gpa.rules).toEqual([expect.objectContaining({ dsl: "gt(gpa, 3.5) → show certificate", status: "conflicting" })]);
    expect(gpa.staticStatus).toBe("FAILED");
    expect(gpa.findings.map((finding) => finding.counterexample?.assignment)).toContainEqual({ gpa: "3.50" });

    expect(gpa.source?.quote).toBe("Applicants with a GPA of 3.5 or higher must provide an achievement certificate.");
    expect(gpa.source?.start).not.toBeNull();

    expect(gpa.boundary.map((point) => [point.value, point.expected, point.implemented, point.agrees])).toEqual([
      ["3.49", { visible: false, required: false }, { visible: false, required: false }, true],
      ["3.50", { visible: true, required: true }, { visible: false, required: false }, false],
      ["3.51", { visible: true, required: true }, { visible: true, required: true }, true],
    ]);
    expect(trace.unrequestedRules).toEqual([]);
  });

  it("shows agreement at every boundary point for the correct gte implementation, without claiming browser proof", () => {
    const definition = goldenDefinition();
    const trace = buildIntentTrace(GOLDEN_CLAIMS, definition, analyze(definition, GOLDEN_CLAIMS));
    const gpa = row(trace, "C-GPA");
    expect(gpa.staticStatus).toBe("PASS");
    expect(gpa.rules.every((rule) => rule.status === "supported")).toBe(true);
    expect(gpa.boundary.every((point) => point.agrees)).toBe(true);
    // Field claims are implemented by field settings, not rules.
    expect(row(trace, "C-01").ruleCoverage).toBe("base_setting");
    expect(row(trace, "C-04").ruleCoverage).toBe("base_setting");
    // Without browser runs the claim is not verified.
    expect(claimBrowserStatus("C-GPA", "VISIBLE_WHEN", []).status).toBe("UNVERIFIED");
  });

  it("flags a generated rule that no approved claim asks for as unrequested", () => {
    const base = goldenDefinition();
    const definition: FormDefinition = {
      ...base,
      rules: [...base.rules, makeRule("full_name", "require", { kind: "cmp", field: "gpa", op: "lt", value: "2" }, [])],
    };
    const trace = buildIntentTrace(GOLDEN_CLAIMS, definition, analyze(definition, GOLDEN_CLAIMS));
    expect(trace.unrequestedRules.map((rule) => rule.dsl)).toEqual(["lt(gpa, 2) → require full_name"]);
  });

  it("flags an approved conditional claim with no generated rule as missing", () => {
    const base = goldenDefinition();
    const definition: FormDefinition = { ...base, rules: [] };
    const trace = buildIntentTrace(GOLDEN_CLAIMS, definition, analyze(definition, GOLDEN_CLAIMS));
    expect(row(trace, "C-GPA").ruleCoverage).toBe("missing");
    expect(row(trace, "C-GPA").staticStatus).toBe("FAILED");
  });

  it("does not fail on a stored definition whose numeric literal is not a number", () => {
    // Found by Kane test t-33, which typed "alert(1)" into a rule condition.
    const base = goldenDefinition();
    const broken: FormDefinition = { ...base, rules: base.rules.map((rule) => ({ ...rule, when: { kind: "cmp" as const, field: "gpa", op: "gte" as const, value: "alert(1)" } })) };
    const trace = buildIntentTrace(GOLDEN_CLAIMS, broken, analyze(broken, GOLDEN_CLAIMS));
    expect(row(trace, "C-GPA").boundary).toEqual([]);
    expect(row(trace, "C-GPA").staticStatus).not.toBe("PASS");
  });

  it("reports NOT_ANALYSED instead of guessing when no analysis exists", () => {
    const trace = buildIntentTrace(GOLDEN_CLAIMS, goldenDefinition(), null);
    expect(trace.rows.every((candidate) => candidate.staticStatus === "NOT_ANALYSED")).toBe(true);
  });

  it("keeps manual claims visible and never verified", () => {
    const content: ClaimSetContent = {
      ...GOLDEN_CLAIMS,
      claims: [...GOLDEN_CLAIMS.claims, { key: "C-90", kind: "MANUAL", text: "Original recommendation letter", acknowledged: true, origin: "user", reviewState: "approved" }],
    };
    const definition = goldenDefinition();
    const trace = buildIntentTrace(content, definition, analyze(definition, content));
    expect(row(trace, "C-90")).toMatchObject({ ruleCoverage: "manual", staticStatus: "UNKNOWN", expectationDsl: null });
    expect(claimBrowserStatus("C-90", "MANUAL", []).status).toBe("MANUAL");
  });
});

describe("browser status per claim", () => {
  const probe = (probeKey: string, claimKeys: string[], verdict: string | null, status = "completed") => ({ probeKey, claimKeys, verdict, status });
  const full = (fresh: boolean, probes: TraceRunInput["probes"]): TraceRunInput => ({ id: `full-${fresh}`, mode: "full", fresh, probes });

  it("is VERIFIED only when every covering probe of the latest full run passed", () => {
    expect(claimBrowserStatus("C-GPA", "VISIBLE_WHEN", [full(true, [probe("P-01", ["C-GPA"], "PASS"), probe("P-02", ["C-GPA", "C-01"], "PASS")])])).toMatchObject({
      status: "VERIFIED",
      probeKeys: ["P-01", "P-02"],
    });
    expect(claimBrowserStatus("C-GPA", "VISIBLE_WHEN", [full(true, [probe("P-01", ["C-GPA"], "PASS"), probe("P-02", ["C-GPA"], null, "queued")])]).status).toBe("PARTIAL");
    expect(claimBrowserStatus("C-GPA", "VISIBLE_WHEN", [full(true, [probe("P-01", ["C-GPA"], "PASS"), probe("P-02", ["C-GPA"], "UNKNOWN")])]).status).toBe("BLOCKED");
    expect(claimBrowserStatus("C-GPA", "VISIBLE_WHEN", [full(true, [probe("P-01", ["C-GPA"], "FAIL"), probe("P-02", ["C-GPA"], "UNKNOWN")])]).status).toBe("FAILED");
  });

  it("marks proof from another identity as STALE", () => {
    expect(claimBrowserStatus("C-GPA", "VISIBLE_WHEN", [full(false, [probe("P-01", ["C-GPA"], "PASS")])]).status).toBe("STALE");
  });

  it("reports a diagnostic observation separately and never as proof", () => {
    const diagnostic: TraceRunInput = { id: "diag", mode: "diagnostic", fresh: null, probes: [probe("P-CX", ["C-GPA"], "FAIL")] };
    expect(claimBrowserStatus("C-GPA", "VISIBLE_WHEN", [diagnostic])).toMatchObject({
      status: "UNVERIFIED",
      diagnostic: { runId: "diag", outcome: "MISMATCH_OBSERVED" },
    });
    const passed: TraceRunInput = { ...diagnostic, probes: [probe("P-CX", ["C-GPA"], "PASS")] };
    expect(claimBrowserStatus("C-GPA", "VISIBLE_WHEN", [passed])).toMatchObject({ status: "UNVERIFIED", diagnostic: { outcome: "NO_MISMATCH_OBSERVED" } });
  });
});
