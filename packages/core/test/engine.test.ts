import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { analyze } from "../src/analysis/analyze";
import { compareDecimal, formatDecimal, parseDecimal } from "../src/decimal/decimal";
import { evaluateGate, instabilityOf, type GateInput } from "../src/gate/gate";
import { GOLDEN_CLAIMS, goldenDefinition, goldenDefinitionWithSeededDefect } from "../src/generate/golden";
import { claimsHash, definitionHash, verificationKey } from "../src/hash/hash";
import { deriveProbePlan } from "../src/probes/probes";
import { applyPatch, proposeRepairs, validateRepair } from "../src/repair/repair";
import { validateSubmission } from "../src/eval/evaluate";

const RUNS = Number(process.env.PROPERTY_RUNS ?? 10_000);

describe("decimal arithmetic (T-01)", () => {
  it("accepts comma and dot and never rounds", () => {
    expect(parseDecimal("3,5")).toEqual(parseDecimal("3.5"));
    expect(parseDecimal("3.50")).toEqual(parseDecimal("3.5"));
    expect(parseDecimal("3.555", 2)).toEqual({ ok: false, reason: "precision" });
    expect(parseDecimal("1,000.5")).toEqual({ ok: false, reason: "format" });
    expect(parseDecimal("NaN")).toEqual({ ok: false, reason: "format" });
    expect(parseDecimal("  ")).toEqual({ ok: false, reason: "empty" });
  });

  it("orders exactly like integer hundredths", () => {
    fc.assert(
      fc.property(fc.integer({ min: -400_000, max: 400_000 }), fc.integer({ min: -400_000, max: 400_000 }), (a, b) => {
        const toText = (n: number) => `${n < 0 ? "-" : ""}${Math.floor(Math.abs(n) / 100)}.${String(Math.abs(n) % 100).padStart(2, "0")}`;
        const left = parseDecimal(toText(a));
        const right = parseDecimal(toText(b));
        if (!left.ok || !right.ok) return false;
        return compareDecimal(left.value, right.value) === Math.sign(a - b);
      }),
      { numRuns: RUNS },
    );
  });

  it("round-trips through the canonical form", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10_000_000, max: 10_000_000 }), fc.integer({ min: 0, max: 4 }), (units, scale) => {
        const text = (units / 10 ** scale).toFixed(scale);
        const parsed = parseDecimal(text);
        if (!parsed.ok) return false;
        const again = parseDecimal(formatDecimal(parsed.value));
        return again.ok && compareDecimal(again.value, parsed.value) === 0;
      }),
      { numRuns: RUNS },
    );
  });
});

describe("server validation equals the approved intent for every GPA (property)", () => {
  const definition = goldenDefinition();
  it("requires the certificate exactly when GPA >= 3.5 and never stores it otherwise", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 400 }), fc.boolean(), (hundredths, withCertificate) => {
        const gpa = `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
        const result = validateSubmission(definition, { full_name: "Test", gpa, ...(withCertificate ? { certificate: "ABC-1" } : {}) });
        const qualifies = hundredths >= 350;
        if (qualifies && !withCertificate) return !result.ok && result.errors.certificate?.code === "REQUIRED";
        if (qualifies) return result.ok && result.answers.certificate === "ABC-1";
        return result.ok && !("certificate" in result.answers) && (withCertificate ? result.hiddenNonEmptyKeys.includes("certificate") : true);
      }),
      { numRuns: RUNS },
    );
  });

  it("rejects out-of-range, over-precise, and non-numeric GPA values", () => {
    expect(validateSubmission(definition, { full_name: "A", gpa: "4.01" }).errors.gpa?.code).toBe("OUT_OF_RANGE");
    expect(validateSubmission(definition, { full_name: "A", gpa: "3.555" }).errors.gpa?.code).toBe("PRECISION");
    expect(validateSubmission(definition, { full_name: "A", gpa: "abc" }).errors.gpa?.code).toBe("INVALID_NUMBER");
    expect(validateSubmission(definition, { gpa: "3" }).errors.full_name?.code).toBe("REQUIRED");
  });
});

describe("canonical hashing (T-02)", () => {
  it("is stable under key order and changes with behavior", () => {
    const definition = goldenDefinition();
    const reverseKeys = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(reverseKeys)
        : value && typeof value === "object"
          ? Object.fromEntries(Object.entries(value).reverse().map(([key, inner]) => [key, reverseKeys(inner)]))
          : value;
    const reordered = reverseKeys(definition) as typeof definition;
    expect(Object.keys(reordered)).not.toEqual(Object.keys(definition));
    expect(definitionHash(reordered)).toBe(definitionHash(definition));
    expect(definitionHash(goldenDefinitionWithSeededDefect())).not.toBe(definitionHash(definition));
  });

  it("ignores review metadata in the claims hash but not semantics", () => {
    const reviewed = { ...GOLDEN_CLAIMS, claims: GOLDEN_CLAIMS.claims.map((claim) => ({ ...claim, reviewState: "approved" as const })) };
    expect(claimsHash(reviewed)).toBe(claimsHash(GOLDEN_CLAIMS));
    const changed = {
      ...GOLDEN_CLAIMS,
      claims: GOLDEN_CLAIMS.claims.map((claim) => (claim.kind === "VISIBLE_WHEN" ? { ...claim, when: { kind: "cmp" as const, field: "gpa", op: "gt" as const, value: "3.5" } } : claim)),
    };
    expect(claimsHash(changed)).not.toBe(claimsHash(GOLDEN_CLAIMS));
  });

  it("binds proof to every identity component", () => {
    const parts = {
      workspaceId: "w",
      formId: "f",
      formVersionId: "v",
      claimsHash: "c",
      definitionHash: "d",
      rendererBuildId: "r",
      runtimeConfigHash: "rc",
      environmentId: "e",
      probePolicyVersion: "MPP-v3",
      scenarioSetHash: "s",
      serverValidationVersion: "1",
    };
    const key = verificationKey(parts);
    for (const name of Object.keys(parts) as (keyof typeof parts)[]) {
      expect(verificationKey({ ...parts, [name]: `${parts[name]}x` })).not.toBe(key);
    }
  });
});

describe("controlled repair (T-08)", () => {
  const broken = goldenDefinitionWithSeededDefect();
  const analysis = analyze(broken, GOLDEN_CLAIMS);

  it("proposes gt → gte first and validates it against the unchanged claims", () => {
    const [first] = proposeRepairs(broken, GOLDEN_CLAIMS, analysis);
    expect(first?.strategy).toBe("ALIGN_OPERATOR");
    expect(first?.patch.ops).toEqual([expect.objectContaining({ op: "set_operator", from: "gt", to: "gte" })]);
    expect(first?.validation.verdict).toBe("PASS");
    const applied = applyPatch(broken, first!.patch);
    expect(applied.ok && analyze(applied.definition, GOLDEN_CLAIMS).verdict).toBe("PASS");
  });

  it("refuses a patch for a stale base", () => {
    const [first] = proposeRepairs(broken, GOLDEN_CLAIMS, analysis);
    const other = { ...broken, title: "Changed title" };
    expect(applyPatch(other, first!.patch)).toMatchObject({ ok: false, code: "STALE_BASE" });
  });

  it("refuses operations outside the allowlist and too many operations", () => {
    const base = definitionHash(broken);
    expect(applyPatch(broken, { baseDefinitionHash: base, ops: [{ op: "run_shell", command: "rm -rf /" }] })).toMatchObject({ ok: false, code: "INVALID_PATCH" });
    expect(applyPatch(broken, { baseDefinitionHash: base, ops: [{ op: "edit_claim", claimKey: "C-03" }] })).toMatchObject({ ok: false, code: "INVALID_PATCH" });
    const op = { op: "set_field_required", field: "full_name", from: true, to: true };
    expect(applyPatch(broken, { baseDefinitionHash: base, ops: [op, op, op, op, op, op] })).toMatchObject({ ok: false, code: "INVALID_PATCH" });
  });

  it("rejects a patch that does not resolve the mismatch", () => {
    const base = definitionHash(broken);
    const rule = broken.rules[0]!;
    const wrong = { baseDefinitionHash: base, ops: [{ op: "set_operator" as const, ruleId: rule.id, path: [], from: "gt" as const, to: "lt" as const }] };
    const keys = analysis.findings.filter((finding) => finding.code === "INTENT_MISMATCH_VISIBILITY").map((finding) => finding.key);
    expect(validateRepair(broken, GOLDEN_CLAIMS, wrong, keys).ok).toBe(false);
  });
});

describe("probe plan", () => {
  it("is deterministic and fully covers every automated claim", () => {
    const definition = goldenDefinition();
    const first = deriveProbePlan(definition, GOLDEN_CLAIMS, "abcd1234");
    const second = deriveProbePlan(definition, GOLDEN_CLAIMS, "abcd1234");
    expect(second.scenarioSetHash).toBe(first.scenarioSetHash);
    expect(first.gaps).toEqual([]);
    expect(first.probes.filter((probe) => probe.executor === "kane").map((probe) => probe.kind)).toEqual([
      "initial_required",
      "boundary_bundle",
      "conditional_required_empty",
      "hidden_exclusion",
      "valid_submission",
      "decimal_comma",
      "constraint_check",
    ]);
    for (const probe of first.probes) if (probe.objectiveTemplate) expect(probe.objectiveTemplate).not.toMatch(/https?:\/\//);
  });

  // DEV-LOOP-02: Kane looked for the certificate field before entering the GPA that reveals it,
  // found nothing, and the valid-submission probe ended UNKNOWN (session 87f8a649).
  it("tells the browser agent that conditional fields appear only after the answers that reveal them", () => {
    const plan = deriveProbePlan(goldenDefinition(), GOLDEN_CLAIMS, "abcd1234");
    const lines = plan.probes.find((probe) => probe.kind === "valid_submission")!.objectiveTemplate!.split("\n");
    const at = (pattern: RegExp) => lines.findIndex((line) => pattern.test(line));
    expect(at(/appear only after an earlier answer is entered\. Follow the steps in order/)).toBeGreaterThan(0);
    const gpa = at(/field labeled "GPA", clear any existing text, type exactly "3\.50"/);
    const wait = at(/^Wait until a field labeled "Achievement certificate number" is shown/);
    const certificate = at(/field labeled "Achievement certificate number", clear any existing text, type exactly/);
    expect(gpa).toBeGreaterThan(0);
    expect(wait).toBe(certificate - 1);
    expect(gpa).toBeLessThan(wait);
    // Always-visible fields get no wait line.
    expect(lines.some((line) => /^Wait until a field labeled "(Full name|GPA)"/.test(line))).toBe(false);
  });

  it("derives expectations from the claims, not from the implementation", () => {
    const fromCorrect = deriveProbePlan(goldenDefinition(), GOLDEN_CLAIMS, "abcd1234");
    const fromBroken = deriveProbePlan(goldenDefinitionWithSeededDefect(), GOLDEN_CLAIMS, "abcd1234");
    const boundary = (plan: typeof fromCorrect) => plan.probes.find((probe) => probe.kind === "boundary_bundle")?.stages;
    expect(boundary(fromBroken)).toEqual(boundary(fromCorrect));
  });
});

describe("publication gate and instability (T-07)", () => {
  const ready: GateInput = {
    claimSet: { approved: true, hashMatches: true },
    analysis: { verdict: "PASS", current: true, warningKeys: [] },
    latestFullRun: { state: "VERIFIED", fresh: true },
    history: [{ state: "VERIFIED", cached: false }],
    acknowledgedWarningKeys: [],
    manualClaimKeys: [],
    acknowledgedManualClaimKeys: [],
    slug: { valid: true, available: true },
    formArchived: false,
  };

  it("allows publication only when every gate passes", () => {
    expect(evaluateGate(ready)).toMatchObject({ eligible: true, reasons: [] });
    expect(evaluateGate({ ...ready, latestFullRun: null }).reasons).toContain("BROWSER_UNVERIFIED");
    expect(evaluateGate({ ...ready, latestFullRun: { state: "VERIFIED", fresh: false } }).reasons).toContain("BROWSER_STALE");
    expect(evaluateGate({ ...ready, analysis: { verdict: "FAILED", current: true, warningKeys: [] } }).reasons).toContain("STATIC_FAILED");
    expect(evaluateGate({ ...ready, claimSet: { approved: false, hashMatches: true } }).reasons).toContain("INTENT_NOT_APPROVED");
  });

  it("requires two consecutive fresh VERIFIED runs after a FAILED run", () => {
    expect(instabilityOf([{ state: "FAILED", cached: false }, { state: "VERIFIED", cached: false }]).unstable).toBe(true);
    expect(instabilityOf([{ state: "FAILED", cached: false }, { state: "VERIFIED", cached: true }, { state: "VERIFIED", cached: false }]).unstable).toBe(true);
    expect(instabilityOf([{ state: "FAILED", cached: false }, { state: "VERIFIED", cached: false }, { state: "VERIFIED", cached: false }]).unstable).toBe(false);
    expect(
      instabilityOf([{ state: "FAILED", cached: false }, { state: "VERIFIED", cached: false }, { state: "UNVERIFIED", cached: false }, { state: "VERIFIED", cached: false }]).unstable,
    ).toBe(true);
    const gate = evaluateGate({ ...ready, history: [{ state: "FAILED", cached: false }, { state: "VERIFIED", cached: false }] });
    expect(gate.reasons).toContain("BROWSER_UNSTABLE");
  });
});
