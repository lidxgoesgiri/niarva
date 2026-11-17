CREATE TYPE "public"."ai_status" AS ENUM('succeeded', 'invalid_output', 'provider_error', 'timeout', 'rate_limited', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."ai_task" AS ENUM('extract_claims', 'generate_form', 'suggest_repair');--> statement-breakpoint
CREATE TYPE "public"."analysis_verdict" AS ENUM('PASS', 'FAILED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."claim_set_origin" AS ENUM('ai', 'template', 'manual');--> statement-breakpoint
CREATE TYPE "public"."claim_set_status" AS ENUM('draft', 'approved', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."form_status" AS ENUM('draft', 'published', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."gate1_result" AS ENUM('PASS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."probe_executor" AS ENUM('kane', 'http');--> statement-breakpoint
CREATE TYPE "public"."probe_run_status" AS ENUM('queued', 'leased', 'running', 'completed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."probe_verdict" AS ENUM('PASS', 'FAIL', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."repair_source" AS ENUM('deterministic', 'ai');--> statement-breakpoint
CREATE TYPE "public"."repair_status" AS ENUM('proposed', 'applied', 'rejected', 'stale');--> statement-breakpoint
CREATE TYPE "public"."run_state" AS ENUM('QUEUED', 'RUNNING', 'VERIFIED', 'FAILED', 'UNVERIFIED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."verification_mode" AS ENUM('full', 'diagnostic');--> statement-breakpoint
CREATE TYPE "public"."version_origin" AS ENUM('ai_generate', 'template', 'skeleton', 'manual_edit', 'repair');--> statement-breakpoint
CREATE TYPE "public"."worker_state" AS ENUM('idle', 'busy', 'not_ready');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_verification_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ai_invocations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"form_id" uuid,
	"task" "ai_task" NOT NULL,
	"model_requested" text,
	"model_used" text,
	"prompt_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"status" "ai_status" NOT NULL,
	"error_code" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"latency_ms" integer,
	"tokens_prompt" integer,
	"tokens_completion" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"form_version_id" uuid NOT NULL,
	"claim_set_id" uuid NOT NULL,
	"analysis_key" text NOT NULL,
	"engine_version" text NOT NULL,
	"gate1" "gate1_result" NOT NULL,
	"verdict" "analysis_verdict" NOT NULL,
	"claim_statuses" jsonb NOT NULL,
	"findings" jsonb NOT NULL,
	"counterexamples" jsonb NOT NULL,
	"probe_plan" jsonb,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"form_id" uuid,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before_hash" text,
	"after_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_sets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"form_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"status" "claim_set_status" DEFAULT 'draft' NOT NULL,
	"origin" "claim_set_origin" NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"source_prompt" text NOT NULL,
	"content" jsonb NOT NULL,
	"review_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"claims_hash" text,
	"ai_invocation_id" uuid,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"superseded_by" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_drafts" (
	"form_id" uuid PRIMARY KEY NOT NULL,
	"definition" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"base_version_id" uuid,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"form_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"claim_set_id" uuid NOT NULL,
	"definition" jsonb NOT NULL,
	"definition_hash" text NOT NULL,
	"schema_version" integer NOT NULL,
	"created_via" "version_origin" NOT NULL,
	"parent_version_id" uuid,
	"repair_proposal_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"status" "form_status" DEFAULT 'draft' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_claim_set_id" uuid,
	"active_publication_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "forms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "probe_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"probe_id" uuid NOT NULL,
	"verification_run_id" uuid NOT NULL,
	"status" "probe_run_status" DEFAULT 'queued' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"retry_reason" text,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"exit_code" integer,
	"run_end" jsonb,
	"observation" jsonb,
	"verdict" "probe_verdict",
	"reason_code" text,
	"failed_stage" integer,
	"agent_verdict" text,
	"agent_verdict_mismatch" boolean DEFAULT false NOT NULL,
	"server_evidence_result" jsonb,
	"http_results" jsonb,
	"credits_consumed" numeric,
	"kane_run_id" text,
	"evidence" jsonb,
	"kane_cli_version" text,
	"stream_version" text,
	"stdout_tail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "probes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"verification_run_id" uuid NOT NULL,
	"probe_key" text NOT NULL,
	"kind" text NOT NULL,
	"executor" "probe_executor" NOT NULL,
	"mandatory" boolean NOT NULL,
	"claim_keys" text[] NOT NULL,
	"golden_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"stages" jsonb NOT NULL,
	"fixture" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"server_evidence" jsonb,
	"checks" jsonb,
	"objective_template" text,
	"objective_hash" text NOT NULL,
	"timeout_seconds" integer DEFAULT 240 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"form_version_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"verification_run_id" uuid NOT NULL,
	"gate_result" jsonb NOT NULL,
	"slug" text NOT NULL,
	"response_limit" integer,
	"response_count" integer DEFAULT 0 NOT NULL,
	"published_by" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unpublished_by" text,
	"unpublished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"form_version_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"verification_run_id" uuid,
	"finding_keys" text[] NOT NULL,
	"claim_keys" text[] NOT NULL,
	"source" "repair_source" NOT NULL,
	"strategy" text NOT NULL,
	"ai_invocation_id" uuid,
	"patch" jsonb NOT NULL,
	"explanation" text NOT NULL,
	"predicted_effects" jsonb NOT NULL,
	"validation" jsonb NOT NULL,
	"status" "repair_status" DEFAULT 'proposed' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"resulting_version_id" uuid,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"form_id" uuid NOT NULL,
	"form_version_id" uuid NOT NULL,
	"publication_id" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"receipt_code" text NOT NULL,
	"answers" jsonb NOT NULL,
	"ip_hash" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_receipt_code_unique" UNIQUE("receipt_code")
);
--> statement-breakpoint
CREATE TABLE "test_submissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"form_version_id" uuid NOT NULL,
	"probe_run_id" uuid,
	"token_jti" text NOT NULL,
	"token_purpose" text NOT NULL,
	"payload_hash" text NOT NULL,
	"receipt_code" text NOT NULL,
	"answers" jsonb NOT NULL,
	"raw_payload_keys" text[] NOT NULL,
	"raw_hidden_nonempty_keys" text[] NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "test_submissions_receipt_code_unique" UNIQUE("receipt_code")
);
--> statement-breakpoint
CREATE TABLE "verification_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"form_version_id" uuid NOT NULL,
	"claim_set_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"mode" "verification_mode" NOT NULL,
	"verification_key" text NOT NULL,
	"renderer_build_id" text NOT NULL,
	"runtime_config_hash" text NOT NULL,
	"environment_id" text NOT NULL,
	"probe_policy_version" text NOT NULL,
	"scenario_set_hash" text NOT NULL,
	"state" "run_state" DEFAULT 'QUEUED' NOT NULL,
	"detail" text,
	"counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"credits_total" numeric,
	"requested_by" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"canceled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"token_hash" text NOT NULL,
	"state" "worker_state" DEFAULT 'not_ready' NOT NULL,
	"worker_version" text,
	"kane_cli_version" text,
	"host_label" text,
	"current_probe_run_id" uuid,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_id" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_claim_set_id_claim_sets_id_fk" FOREIGN KEY ("claim_set_id") REFERENCES "public"."claim_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_sets" ADD CONSTRAINT "claim_sets_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_sets" ADD CONSTRAINT "claim_sets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_sets" ADD CONSTRAINT "claim_sets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_drafts" ADD CONSTRAINT "form_drafts_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_drafts" ADD CONSTRAINT "form_drafts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_claim_set_id_claim_sets_id_fk" FOREIGN KEY ("claim_set_id") REFERENCES "public"."claim_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "probe_runs" ADD CONSTRAINT "probe_runs_probe_id_probes_id_fk" FOREIGN KEY ("probe_id") REFERENCES "public"."probes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "probe_runs" ADD CONSTRAINT "probe_runs_verification_run_id_verification_runs_id_fk" FOREIGN KEY ("verification_run_id") REFERENCES "public"."verification_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "probe_runs" ADD CONSTRAINT "probe_runs_lease_owner_workers_id_fk" FOREIGN KEY ("lease_owner") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "probes" ADD CONSTRAINT "probes_verification_run_id_verification_runs_id_fk" FOREIGN KEY ("verification_run_id") REFERENCES "public"."verification_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_verification_run_id_verification_runs_id_fk" FOREIGN KEY ("verification_run_id") REFERENCES "public"."verification_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_unpublished_by_users_id_fk" FOREIGN KEY ("unpublished_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_proposals" ADD CONSTRAINT "repair_proposals_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_proposals" ADD CONSTRAINT "repair_proposals_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_proposals" ADD CONSTRAINT "repair_proposals_verification_run_id_verification_runs_id_fk" FOREIGN KEY ("verification_run_id") REFERENCES "public"."verification_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_proposals" ADD CONSTRAINT "repair_proposals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_submissions" ADD CONSTRAINT "test_submissions_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_claim_set_id_claim_sets_id_fk" FOREIGN KEY ("claim_set_id") REFERENCES "public"."claim_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_accounts_user_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification_tokens" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_runs_version_key_uq" ON "analysis_runs" USING btree ("form_version_id","analysis_key");--> statement-breakpoint
CREATE INDEX "audit_events_form_idx" ON "audit_events" USING btree ("form_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_sets_form_version_uq" ON "claim_sets" USING btree ("form_id","version_no");--> statement-breakpoint
CREATE UNIQUE INDEX "form_versions_form_no_uq" ON "form_versions" USING btree ("form_id","version_no");--> statement-breakpoint
CREATE UNIQUE INDEX "form_versions_dedupe_uq" ON "form_versions" USING btree ("form_id","claim_set_id","definition_hash");--> statement-breakpoint
CREATE INDEX "forms_workspace_updated_idx" ON "forms" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "probe_runs_queue_idx" ON "probe_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "probe_runs_lease_idx" ON "probe_runs" USING btree ("lease_expires_at");--> statement-breakpoint
CREATE INDEX "probe_runs_probe_idx" ON "probe_runs" USING btree ("probe_id","attempt");--> statement-breakpoint
CREATE UNIQUE INDEX "probes_run_key_uq" ON "probes" USING btree ("verification_run_id","probe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "publications_active_form_uq" ON "publications" USING btree ("form_id") WHERE "publications"."unpublished_at" is null;--> statement-breakpoint
CREATE INDEX "publications_slug_idx" ON "publications" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "repair_proposals_version_idx" ON "repair_proposals" USING btree ("form_version_id","created_at");--> statement-breakpoint
CREATE INDEX "submissions_form_time_idx" ON "submissions" USING btree ("form_id","submitted_at");--> statement-breakpoint
CREATE INDEX "test_submissions_probe_idx" ON "test_submissions" USING btree ("probe_run_id");--> statement-breakpoint
CREATE INDEX "verification_runs_lookup_idx" ON "verification_runs" USING btree ("form_version_id","mode","verification_key","state");--> statement-breakpoint
CREATE INDEX "verification_runs_recent_idx" ON "verification_runs" USING btree ("form_version_id","requested_at");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");