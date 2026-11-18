-- Immutability guards for proof-relevant rows.
-- Enforced in the database so that no code path can rewrite a proof-relevant row.

-- Form versions are immutable snapshots.
CREATE OR REPLACE FUNCTION niarva_reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'NIARVA_IMMUTABLE: % rows cannot be changed or removed', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER form_versions_immutable
  BEFORE UPDATE OR DELETE ON form_versions
  FOR EACH ROW EXECUTE FUNCTION niarva_reject_mutation();
--> statement-breakpoint
-- The audit trail is append-only.
CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION niarva_reject_mutation();
--> statement-breakpoint
-- An approved claim set keeps its meaning: content, hash, prompt, and approval metadata are frozen.
-- Only the lifecycle fields (status -> superseded, superseded_by, updated_at) may change.
CREATE OR REPLACE FUNCTION niarva_guard_approved_claim_set() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('approved', 'superseded') THEN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.claims_hash IS DISTINCT FROM OLD.claims_hash
       OR NEW.source_prompt IS DISTINCT FROM OLD.source_prompt
       OR NEW.form_id IS DISTINCT FROM OLD.form_id
       OR NEW.version_no IS DISTINCT FROM OLD.version_no
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
      RAISE EXCEPTION 'NIARVA_IMMUTABLE: an approved claim set cannot be modified'
        USING ERRCODE = 'restrict_violation';
    END IF;
    IF NEW.status = 'draft' THEN
      RAISE EXCEPTION 'NIARVA_IMMUTABLE: an approved claim set cannot return to draft'
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER claim_sets_approved_guard
  BEFORE UPDATE ON claim_sets
  FOR EACH ROW EXECUTE FUNCTION niarva_guard_approved_claim_set();
--> statement-breakpoint
CREATE TRIGGER claim_sets_no_delete_approved
  BEFORE DELETE ON claim_sets
  FOR EACH ROW WHEN (OLD.status <> 'draft') EXECUTE FUNCTION niarva_reject_mutation();
--> statement-breakpoint
-- An approved claim set must carry its hash and approval time.
ALTER TABLE claim_sets ADD CONSTRAINT claim_sets_approved_has_hash
  CHECK (status = 'draft' OR (claims_hash IS NOT NULL AND approved_at IS NOT NULL));
--> statement-breakpoint
-- Quota is a last line of defence; the service validates under a row lock first.
ALTER TABLE publications ADD CONSTRAINT publications_response_limit_check
  CHECK (response_limit IS NULL OR response_count <= response_limit);
