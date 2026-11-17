import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

/* ------------------------------------------------------------------ enums */

export const workspaceRole = pgEnum("workspace_role", ["owner", "editor", "viewer"]);
export const formStatus = pgEnum("form_status", ["draft", "published", "closed", "archived"]);
export const claimSetStatus = pgEnum("claim_set_status", ["draft", "approved", "superseded"]);
export const claimSetOrigin = pgEnum("claim_set_origin", ["ai", "template", "manual"]);
export const versionOrigin = pgEnum("version_origin", [
  "ai_generate",
  "template",
  "skeleton",
  "manual_edit",
  "repair",
]);
export const gate1Result = pgEnum("gate1_result", ["PASS", "FAILED"]);
export const analysisVerdict = pgEnum("analysis_verdict", ["PASS", "FAILED", "UNKNOWN"]);
export const verificationMode = pgEnum("verification_mode", ["full", "diagnostic"]);
/** Full verification run states. STALE is a freshness dimension and BROWSER_UNSTABLE a gate reason, so neither is a run state. */
export const runState = pgEnum("run_state", [
  "QUEUED",
  "RUNNING",
  "VERIFIED",
  "FAILED",
  "UNVERIFIED",
  "CANCELED",
]);
export const probeExecutor = pgEnum("probe_executor", ["kane", "http"]);
export const probeRunStatus = pgEnum("probe_run_status", [
  "queued",
  "leased",
  "running",
  "completed",
  "canceled",
]);
/** Probe verdicts. Infrastructure errors and missing observations are UNKNOWN, never PASS. */
export const probeVerdict = pgEnum("probe_verdict", ["PASS", "FAIL", "UNKNOWN"]);
export const workerState = pgEnum("worker_state", ["idle", "busy", "not_ready"]);
export const repairSource = pgEnum("repair_source", ["deterministic", "ai"]);
export const repairStatus = pgEnum("repair_status", ["proposed", "applied", "rejected", "stale"]);
export const aiTask = pgEnum("ai_task", ["extract_claims", "generate_form", "suggest_repair"]);
export const aiStatus = pgEnum("ai_status", [
  "succeeded",
  "invalid_output",
  "provider_error",
  "timeout",
  "rate_limited",
  "unavailable",
]);

/* ------------------------------------------------------- workspace & form */

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRole("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_idx").on(table.userId),
  ],
);

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    status: formStatus("status").notNull().default("draft"),
    settings: jsonb("settings").notNull().default({}),
    currentClaimSetId: uuid("current_claim_set_id"),
    activePublicationId: uuid("active_publication_id"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [index("forms_workspace_updated_idx").on(table.workspaceId, table.updatedAt)],
);

/* ------------------------------------------------------------ intent */

export const claimSets = pgTable(
  "claim_sets",
  {
    id: uuid("id").primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id),
    versionNo: integer("version_no").notNull(),
    status: claimSetStatus("status").notNull().default("draft"),
    origin: claimSetOrigin("origin").notNull(),
    /** Optimistic concurrency for draft edits. */
    revision: integer("revision").notNull().default(1),
    sourcePrompt: text("source_prompt").notNull(),
    /** `ClaimSetContent`: approved field catalog and claims. */
    content: jsonb("content").notNull(),
    /** Guard flags that block approval until resolved (lexical, capability). */
    reviewFlags: jsonb("review_flags").notNull().default([]),
    /** SHA-256 over the canonical content; set at approval and never changed afterwards. */
    claimsHash: text("claims_hash"),
    aiInvocationId: uuid("ai_invocation_id"),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    supersededBy: uuid("superseded_by"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("claim_sets_form_version_uq").on(table.formId, table.versionNo)],
);

/* -------------------------------------------------- definition & versions */

export const formDrafts = pgTable("form_drafts", {
  formId: uuid("form_id")
    .primaryKey()
    .references(() => forms.id, { onDelete: "cascade" }),
  /** Working `FormDefinition`; not trusted until snapshotted and analysed. */
  definition: jsonb("definition").notNull(),
  revision: integer("revision").notNull().default(1),
  baseVersionId: uuid("base_version_id"),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const formVersions = pgTable(
  "form_versions",
  {
    id: uuid("id").primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id),
    versionNo: integer("version_no").notNull(),
    claimSetId: uuid("claim_set_id")
      .notNull()
      .references(() => claimSets.id),
    definition: jsonb("definition").notNull(),
    definitionHash: text("definition_hash").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    createdVia: versionOrigin("created_via").notNull(),
    parentVersionId: uuid("parent_version_id"),
    repairProposalId: uuid("repair_proposal_id"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("form_versions_form_no_uq").on(table.formId, table.versionNo),
    uniqueIndex("form_versions_dedupe_uq").on(table.formId, table.claimSetId, table.definitionHash),
  ],
);

/* -------------------------------------------------- static analysis (L0–L2) */

export const analysisRuns = pgTable(
  "analysis_runs",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id),
    claimSetId: uuid("claim_set_id")
      .notNull()
      .references(() => claimSets.id),
    analysisKey: text("analysis_key").notNull(),
    engineVersion: text("engine_version").notNull(),
    gate1: gate1Result("gate1").notNull(),
    verdict: analysisVerdict("verdict").notNull(),
    claimStatuses: jsonb("claim_statuses").notNull(),
    findings: jsonb("findings").notNull(),
    counterexamples: jsonb("counterexamples").notNull(),
    /** Present only when the verdict is PASS: mandatory probe plan and its hash. */
    probePlan: jsonb("probe_plan"),
    stats: jsonb("stats").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Proof is scoped to a version: there is deliberately no global unique index on analysis_key.
    uniqueIndex("analysis_runs_version_key_uq").on(table.formVersionId, table.analysisKey),
  ],
);

/* -------------------------------------------- browser verification (L3) */

export const verificationRuns = pgTable(
  "verification_runs",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id),
    claimSetId: uuid("claim_set_id")
      .notNull()
      .references(() => claimSets.id),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id),
    mode: verificationMode("mode").notNull(),
    verificationKey: text("verification_key").notNull(),
    rendererBuildId: text("renderer_build_id").notNull(),
    runtimeConfigHash: text("runtime_config_hash").notNull(),
    environmentId: text("environment_id").notNull(),
    probePolicyVersion: text("probe_policy_version").notNull(),
    scenarioSetHash: text("scenario_set_hash").notNull(),
    state: runState("state").notNull().default("QUEUED"),
    /** Diagnostic detail for UNVERIFIED: BLOCKED, PARTIAL, or DIAGNOSTIC_ONLY. */
    detail: text("detail"),
    counts: jsonb("counts").notNull().default({}),
    creditsTotal: numeric("credits_total"),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => users.id),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
  },
  (table) => [
    index("verification_runs_lookup_idx").on(
      table.formVersionId,
      table.mode,
      table.verificationKey,
      table.state,
    ),
    index("verification_runs_recent_idx").on(table.formVersionId, table.requestedAt),
  ],
);

export const probes = pgTable(
  "probes",
  {
    id: uuid("id").primaryKey(),
    verificationRunId: uuid("verification_run_id")
      .notNull()
      .references(() => verificationRuns.id, { onDelete: "cascade" }),
    probeKey: text("probe_key").notNull(),
    kind: text("kind").notNull(),
    executor: probeExecutor("executor").notNull(),
    mandatory: boolean("mandatory").notNull(),
    claimKeys: text("claim_keys").array().notNull(),
    goldenIds: text("golden_ids").array().notNull().default(sql`'{}'::text[]`),
    /** Ordered observation stages with expected typed values; stage 0 is the page identity. */
    stages: jsonb("stages").notNull(),
    fixture: jsonb("fixture").notNull().default({}),
    /** Server-side evidence expectations (hidden exclusion, conditional requiredness). */
    serverEvidence: jsonb("server_evidence"),
    /** Server contract checks for the http executor. Never contains a token. */
    checks: jsonb("checks"),
    /** Fixed objective template with `{{preview_url}}`; null for the http executor. */
    objectiveTemplate: text("objective_template"),
    objectiveHash: text("objective_hash").notNull(),
    timeoutSeconds: integer("timeout_seconds").notNull().default(240),
    priority: integer("priority").notNull().default(0),
  },
  (table) => [uniqueIndex("probes_run_key_uq").on(table.verificationRunId, table.probeKey)],
);

export const workers = pgTable("workers", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  /** SHA-256 of the bearer token. The token itself is shown once and never stored. */
  tokenHash: text("token_hash").notNull(),
  state: workerState("state").notNull().default("not_ready"),
  workerVersion: text("worker_version"),
  kaneCliVersion: text("kane_cli_version"),
  hostLabel: text("host_label"),
  currentProbeRunId: uuid("current_probe_run_id"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const probeRuns = pgTable(
  "probe_runs",
  {
    id: uuid("id").primaryKey(),
    probeId: uuid("probe_id")
      .notNull()
      .references(() => probes.id, { onDelete: "cascade" }),
    verificationRunId: uuid("verification_run_id")
      .notNull()
      .references(() => verificationRuns.id, { onDelete: "cascade" }),
    status: probeRunStatus("status").notNull().default("queued"),
    attempt: integer("attempt").notNull().default(1),
    retryReason: text("retry_reason"),
    leaseOwner: text("lease_owner").references(() => workers.id),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    exitCode: integer("exit_code"),
    /** Redacted terminal event, at most 64 KB. */
    runEnd: jsonb("run_end"),
    /** Typed observations after allowlist normalisation. */
    observation: jsonb("observation"),
    verdict: probeVerdict("verdict"),
    reasonCode: text("reason_code"),
    failedStage: integer("failed_stage"),
    /** Raw `run_end.status` from Kane — diagnostic only, never the basis of a verdict. */
    agentVerdict: text("agent_verdict"),
    agentVerdictMismatch: boolean("agent_verdict_mismatch").notNull().default(false),
    serverEvidenceResult: jsonb("server_evidence_result"),
    httpResults: jsonb("http_results"),
    creditsConsumed: numeric("credits_consumed"),
    kaneRunId: text("kane_run_id"),
    /** `{ packDigest, packBytes, packName }` — the sealed pack itself stays on the worker. */
    evidence: jsonb("evidence"),
    kaneCliVersion: text("kane_cli_version"),
    streamVersion: text("stream_version"),
    /** Redacted tail of stdout, at most 8 KB. */
    stdoutTail: text("stdout_tail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("probe_runs_queue_idx").on(table.status, table.createdAt),
    index("probe_runs_lease_idx").on(table.leaseExpiresAt),
    index("probe_runs_probe_idx").on(table.probeId, table.attempt),
  ],
);

/* ---------------------------------------------------------------- repair */

export const repairProposals = pgTable(
  "repair_proposals",
  {
    id: uuid("id").primaryKey(),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id),
    verificationRunId: uuid("verification_run_id").references(() => verificationRuns.id),
    findingKeys: text("finding_keys").array().notNull(),
    claimKeys: text("claim_keys").array().notNull(),
    source: repairSource("source").notNull(),
    strategy: text("strategy").notNull(),
    aiInvocationId: uuid("ai_invocation_id"),
    patch: jsonb("patch").notNull(),
    explanation: text("explanation").notNull(),
    predictedEffects: jsonb("predicted_effects").notNull(),
    validation: jsonb("validation").notNull(),
    status: repairStatus("status").notNull().default("proposed"),
    attempt: integer("attempt").notNull().default(1),
    resultingVersionId: uuid("resulting_version_id"),
    decidedBy: text("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("repair_proposals_version_idx").on(table.formVersionId, table.createdAt)],
);

/* ------------------------------------------------- publication & responses */

export const publications = pgTable(
  "publications",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id),
    /** Always set: there is no publication without browser proof and no override. */
    verificationRunId: uuid("verification_run_id")
      .notNull()
      .references(() => verificationRuns.id),
    gateResult: jsonb("gate_result").notNull(),
    slug: text("slug").notNull(),
    responseLimit: integer("response_limit"),
    responseCount: integer("response_count").notNull().default(0),
    publishedBy: text("published_by")
      .notNull()
      .references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    unpublishedBy: text("unpublished_by").references(() => users.id),
    unpublishedAt: timestamp("unpublished_at", { withTimezone: true }),
  },
  (table) => [
    // At most one active publication per form.
    uniqueIndex("publications_active_form_uq")
      .on(table.formId)
      .where(sql`${table.unpublishedAt} is null`),
    index("publications_slug_idx").on(table.slug),
  ],
);

export const submissions = pgTable(
  "submissions",
  {
    /** Client-generated submission ID; the idempotency key. */
    id: uuid("id").primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id),
    publicationId: uuid("publication_id")
      .notNull()
      .references(() => publications.id),
    /** SHA-256 over the canonical ORIGINAL payload, computed before hidden-value filtering. */
    payloadHash: text("payload_hash").notNull(),
    receiptCode: text("receipt_code").notNull().unique(),
    /** Answers after hidden-field exclusion. Hidden values are never stored. */
    answers: jsonb("answers").notNull(),
    ipHash: text("ip_hash"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("submissions_form_time_idx").on(table.formId, table.submittedAt)],
);

export const testSubmissions = pgTable(
  "test_submissions",
  {
    /** Equals the preview submission ID; replay is keyed on it. */
    id: uuid("id").primaryKey(),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id),
    probeRunId: uuid("probe_run_id"),
    tokenJti: text("token_jti").notNull(),
    tokenPurpose: text("token_purpose").notNull(),
    payloadHash: text("payload_hash").notNull(),
    receiptCode: text("receipt_code").notNull().unique(),
    answers: jsonb("answers").notNull(),
    /** Keys present in the raw payload, and those that carried a non-empty value while hidden. */
    rawPayloadKeys: text("raw_payload_keys").array().notNull(),
    rawHiddenNonemptyKeys: text("raw_hidden_nonempty_keys").array().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("test_submissions_probe_idx").on(table.probeRunId)],
);

/* ------------------------------------------------------- platform tables */

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    formId: uuid("form_id"),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    beforeHash: text("before_hash"),
    afterHash: text("after_hash"),
    /** Never contains answers, tokens, or other secrets. */
    metadata: jsonb("metadata").notNull().default({}),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_events_form_idx").on(table.formId, table.createdAt)],
);

export const aiInvocations = pgTable("ai_invocations", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  formId: uuid("form_id"),
  task: aiTask("task").notNull(),
  modelRequested: text("model_requested"),
  modelUsed: text("model_used"),
  promptVersion: text("prompt_version").notNull(),
  inputHash: text("input_hash").notNull(),
  status: aiStatus("status").notNull(),
  errorCode: text("error_code"),
  attempt: integer("attempt").notNull().default(1),
  latencyMs: integer("latency_ms"),
  tokensPrompt: integer("tokens_prompt"),
  tokensCompletion: integer("tokens_completion"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
