import "server-only";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getAuth } from "../auth/better-auth";
import { getDb } from "../db/client";
import { workspaceMembers, workspaces } from "../db/schema";
import { notFound, unauthenticated } from "../http/errors";

export type Actor = {
  userId: string;
  email: string;
  name: string;
  /** The creator's personal workspace. P0 scope is a single owner per workspace. */
  workspaceId: string;
  sessionCreatedAt: Date;
};

/** Resolves the signed-in creator from request headers, or null when there is no valid session. */
export async function getActor(requestHeaders?: Headers): Promise<Actor | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders ?? (await headers()) });
  if (!session) return null;

  const db = await getDb();
  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, session.user.id), eq(workspaceMembers.role, "owner")))
    .limit(1);
  if (!membership) return null;

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    workspaceId: membership.workspaceId,
    sessionCreatedAt: session.session.createdAt,
  };
}

/** Like `getActor`, but fails with UNAUTHENTICATED. Use in API routes. */
export async function requireActor(requestHeaders?: Headers): Promise<Actor> {
  const actor = await getActor(requestHeaders);
  if (!actor) throw unauthenticated();
  return actor;
}

/**
 * Ownership check for tenant data. A resource in another workspace is reported
 * as missing so that its existence is not disclosed.
 */
export function assertWorkspace(actor: Actor, workspaceId: string, what = "Resource"): void {
  if (actor.workspaceId !== workspaceId) throw notFound(what);
}
