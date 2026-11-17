import "server-only";
import type { DbOrTx } from "../db/client";
import { auditEvents } from "../db/schema";
import { uuidv7 } from "../ids";

/** Appends one audit event. Metadata must never contain answers, tokens, or other secrets. */
export async function audit(
  db: DbOrTx,
  event: {
    workspaceId: string;
    formId?: string | null;
    actorType: "user" | "worker" | "system" | "respondent";
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeHash?: string | null;
    afterHash?: string | null;
    metadata?: Record<string, unknown>;
    requestId?: string | null;
  },
): Promise<void> {
  await db.insert(auditEvents).values({
    id: uuidv7(),
    workspaceId: event.workspaceId,
    formId: event.formId ?? null,
    actorType: event.actorType,
    actorId: event.actorId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    beforeHash: event.beforeHash ?? null,
    afterHash: event.afterHash ?? null,
    metadata: event.metadata ?? {},
    requestId: event.requestId ?? null,
  });
}
