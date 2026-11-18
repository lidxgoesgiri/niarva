# NIARVA integration contract

This file is the hand-off point between the **core/backend track** (engine, creator workflow, API, AI extraction, deterministic validation, security, Kane verification) and the **UI/UX track** (landing page, visual design, layout, motion). Both tracks change the same application, so every change to the HTTP API, the form-state DTO, or a shared component is recorded here first.

Rules for both tracks:

- The backend is the only source of a verification status. The UI never derives `VERIFIED`, `PASS`, or "publishable" on its own; it shows what the API returns.
- Static results and browser results stay separate. A static match is never shown as browser proof.
- The `data-*` hooks listed in §4 are used by Kane CLI tests. Keep them when restyling or moving markup.
- Breaking changes are added to §5 with the commit that introduced them.

## 1. HTTP API (`/api/v1`)

All creator endpoints need a signed-in session and a same-origin `Origin` header. Errors use the body in `packages/contracts/src/errors.ts`: `{ error: { code, message, reasons?, fieldErrors? } }`.

| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/forms` | `{ source: "template", template: "scholarship", title? }` · `{ source: "ai", prompt }` · `{ source: "manual", title, prompt? }` | `201 { formId }` |
| GET | `/forms/{formId}` | — | form state DTO (§2) |
| PATCH | `/forms/{formId}/claims` | `{ revision, content: ClaimSetContent }` | draft claims saved |
| POST | `/forms/{formId}/claims/approve` | `{ revision }` | `{ claimsHash }` |
| POST | `/forms/{formId}/claims/revise` | `{}` | new draft revision |
| POST | `/forms/{formId}/generate` | `{ strategy: "skeleton" \| "seeded_demo" }` | new version |
| POST | `/forms/{formId}/versions` | `{ baseVersionId, definition }` | new version from a manual edit |
| POST | `/forms/{formId}/versions/{versionId}/repairs` | `{}` | `{ proposals: [...] }` (engine-validated, at most 5 operations each) |
| POST | `/forms/{formId}/repairs/{proposalId}` | `{ decision: "approve" \| "reject" }` | approve creates a new version; claims never change |
| POST | `/forms/{formId}/versions/{versionId}/verify` | `{ mode: "full" \| "diagnostic", force?, findingKey? }` | `{ runId, cached? }` |
| POST | `/forms/{formId}/runs/{runId}/cancel` | `{}` | run canceled |
| POST / DELETE | `/forms/{formId}/publish` | `{ versionId, acknowledgedWarningKeys }` | `201 { slug }` or `409` with gate `reasons` |
| GET | `/forms/{formId}/responses` | — | `{ total, rows }` |
| POST | `/preview/{versionId}/submissions?t=<token>` | `{ submissionId, formVersionId, answers }` | preview receipt (scoped token only) |
| POST | `/public/forms/{slug}/submissions` | `{ submissionId, formVersionId, answers }` | `201 { receiptCode }`; identical retry returns the first receipt |
| GET | `/health` | — | liveness |
| POST | `/worker/lease`, `/worker/heartbeat`, `/worker/probe-runs/{id}/result` | worker bearer token | verification worker only; not for the UI |

## 2. Form state DTO (`GET /forms/{formId}`)

Type: `FormState` in `apps/web/src/server/services/state.service.ts` (import it as a type in client components).

| Key | Meaning |
|---|---|
| `form` | `id`, `title`, `slug`, `status` |
| `claimSet` | latest claim set: `status` (`draft` / `approved`), `revision`, `claimsHash`, `sourcePrompt`, `fields`, `claims[]` (each with `statement` and `staticStatus`), `problems[]` |
| `version` | latest version: `versionNo`, `createdVia` (`template` = seeded demo, `skeleton`, `manual_edit`, `repair`), `definitionHash`, `pageIdentity`, `definition` |
| `analysis` | static result for the version: `verdict`, `findings[]` (with `counterexample`), `claimStatuses`, `ruleTrace`, `probes`, `gaps`, `stats`, `engineVersion` |
| `versions` | **new**: version lineage, newest first: `id`, `versionNo`, `createdVia`, `parentVersionId`, `definitionHash`, `createdAt` (FR-18) |
| `intentTrace` | **new, see §3**; `null` when there is no version or the version belongs to an older claims revision |
| `intentTraceNote` | text to show when `intentTrace` is `null` because a newer claims revision exists |
| `repairs[]` | proposals for the version |
| `runs[]` | verification runs, newest first, with `probes[].latest` (verdict, Kane session id, credits, evidence digest) |
| `gate` | publish gate: `eligible`, `reasonTexts[]`, `instability` |
| `publication`, `responses`, `workers`, `ai` | live publication, response count, online workers, AI availability |

## 3. Intent Trace (added on `feature/creator-workflow`)

Built by `buildIntentTrace` and `claimBrowserStatus` in `packages/core/src/trace/trace.ts` (pure, unit-tested). One row per approved claim:

```ts
type IntentTraceRow = {
  claimKey: string;                 // e.g. "C-GPA"
  kind: "FIELD" | "VISIBLE_WHEN" | "REQUIRED_WHEN" | "CONSTRAINT" | "MANUAL";
  field: string | null;
  statement: string;                // the sentence the creator approved
  expectationDsl: string | null;    // "gte(gpa, 3.5) → certificate visible AND required" — the oracle
  source: { quote: string; start: number | null; end: number | null } | null;
  rules: { ruleId: string; dsl: string; status: "supported" | "conflicting" | "unrequested" | "unanalysed" }[];
  ruleCoverage: "linked" | "base_setting" | "missing" | "manual";
  staticStatus: "PASS" | "FAILED" | "UNKNOWN" | "NOT_ANALYSED";
  findings: Finding[];              // with counterexample witnesses
  boundary: { value: string; relation: "below" | "at" | "above"; expected: FieldBehavior; implemented: FieldBehavior; agrees: boolean }[];
  controller: { key: string; label: string } | null;
  browser: {
    status: "VERIFIED" | "FAILED" | "BLOCKED" | "PARTIAL" | "STALE" | "UNVERIFIED" | "NOT_COVERED" | "MANUAL";
    runId: string | null;
    probeKeys: string[];
    diagnostic: { runId: string; probeKeys: string[]; outcome: "MISMATCH_OBSERVED" | "NO_MISMATCH_OBSERVED" | "UNKNOWN" | "PENDING" } | null;
  };
};
// intentTrace = { rows: IntentTraceRow[]; unrequestedRules: { ruleId; dsl; status }[] }
```

Display rules the UI must keep:

- `browser.status` is computed from the latest **full** run only. A diagnostic run is reported in `browser.diagnostic` and is never proof.
- `VERIFIED` only when every probe covering the claim passed in a fresh full run.
- `MANUAL` claims always show "not tested automatically".
- Expectations shown to the creator come from `expectationDsl` and `boundary[].expected`, never from the rule.

Shared components (in `apps/web/src/features/workspace/`):

| Component | Props | Notes |
|---|---|---|
| `IntentTrace` (`intent-trace.tsx`) | `{ state: FormState; focus: TraceFocus }` | ledger; restyle freely, keep the hooks in §4 |
| `IntentPanel` | new optional `onOpenTrace(claimKey)` | renders an "Intent Trace" button per claim when a version exists |
| `VerifyPanel` | new optional `traceFocus` | renders `IntentTrace` first |
| `Workspace` | — | owns `traceFocus`; `openTrace` switches to the verification stage and scrolls to the row |
| `StatusBadge` (`components/composites/status-badge.tsx`) | `{ status: StatusKind; label? }` | `STATIC_PASS` is deliberately not green |

## 4. Test hooks used by Kane CLI tests

Keep these attributes and visible texts; Kane tests read them.

- Run report (FR-18): `data-testid="run-report"` with `data-executed` (number of probes executed in the run); runs in the form state also carry `verificationKey`, `probePolicyVersion`, `scenarioSetHash`, `runtimeConfigHash`, `startedAt`, `canceledAt`.
- Access: `data-testid="form-access-denied"` on `/app/forms/{id}` for a missing or foreign form (HTTP 404, same page for both).
- Evidence (FR-18): `data-testid="version-lineage"`, `data-testid="probe-evidence"`, `data-testid="probe-expected-observed"` (rows carry `data-match` = `true` / `false` / `unobserved`), `data-testid="probe-objective"`; texts "Show evidence", "Objective sent to Kane CLI".
- Workspace: `data-testid="version-identity"` (version, approved-claims hash, definition hash, engine at the top of the verification column), `data-claim`, `data-testid="claims-hash"`, `data-testid="counterexample"`, `data-testid="repair-proposal"`, `data-testid="verification-run"` + `data-run-state`, `data-probe` + `data-verdict`, `data-testid="publish-gate"`.
- Intent Trace: `data-testid="intent-trace"`, heading text "Intent Trace", `data-trace-claim` + `data-static` + `data-browser`, `data-testid="trace-source" | "trace-expectation" | "trace-boundary" | "trace-discrepancy" | "trace-consequence" | "trace-browser-note" | "trace-coverage" | "trace-unrequested"`.
- Visible texts relied on: "Seeded defect for demonstration", "Intent Trace", "Static checks passed", "Publishing blocked", "Ready to publish".
- Form renderer: `data-field`, `data-rule`, `data-testid="form-footer" | "version-label" | "receipt-code" | "confirmation"`.

## 5. Change log

| Commit | Change | Impact on UI work |
|---|---|---|
| `4a3a45b` | Golden boundary claim renamed `C-03` → `C-GPA`; `CLAIM_KEY` accepts short readable names (`C-[A-Z][A-Z0-9-]{1,11}`) | Any copy that names the golden claim must say `C-GPA`. Known instance: `apps/web/src/app/demo/page.tsx` on `feature/interactive-landing` still says "C-03" (two lines). |
| `5411b9f` | `buildIntentTrace`, `claimBrowserStatus`, `conditionDsl`, `ruleDsl`, `claimDsl` exported from `@niarva/core` | none (additive) |
| `e860ecf` | `intentTrace` and `intentTraceNote` added to the form state; `IntentTrace` component; `onOpenTrace` / `traceFocus` props | additive; the verification column now starts with the ledger |
| (this branch, after `e860ecf`) | Version identity header in `VerifyPanel` (`data-testid="version-identity"`) | additive; restyle freely but keep the four facts and the hook |

## 6. Local environments during parallel work

Both tracks run servers on the same machine. Each one keeps its own port and database so a restart on one side never stops or corrupts the other.

| Use | Port | Code | Database |
|---|---|---|---|
| UI development (`pnpm dev`) | 3000 | main checkout | `apps/web/.pglite` in that checkout |
| UI preview build | 3101 | the UI track's own worktree | its own `.pglite` |
| Kane verification, worker, PROD-LOOP (core track) | 3200, production build | a separate worktree on `feature/verification-worker` | its own `.pglite`; environment id `local-verify-3200` |

Rules:

- Never stop a server you did not start. Pick a free port instead.
- An embedded PGlite directory must be opened by one server process at a time.
- Kane CLI: M0 recorded infrastructure failures when several runs overlapped. Prefer one Kane run at a time per machine. A run that ends UNKNOWN while another track's run overlaps it is recorded as such, never as a product result.
- `next dev` writes `apps/web/AGENTS.md`. It is ignored by git, like every `AGENTS.md` and `CLAUDE.md`.
