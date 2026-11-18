import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Actor } from "../context/session";
import { getDb } from "../db/client";
import { forms } from "../db/schema";
import { isJudge, showcaseFormIds } from "./demo-access";

export type FormListItem = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "closed" | "archived";
  updatedAt: Date;
};

/** Forms of the actor's own workspace, newest first. Never crosses the workspace boundary. */
export async function listForms(actor: Actor): Promise<FormListItem[]> {
  const db = await getDb();
  return db
    .select({
      id: forms.id,
      title: forms.title,
      slug: forms.slug,
      status: forms.status,
      updatedAt: forms.updatedAt,
    })
    .from(forms)
    .where(and(eq(forms.workspaceId, actor.workspaceId), isNull(forms.archivedAt)))
    .orderBy(desc(forms.updatedAt))
    .limit(100);
}

/** Demo showcase forms a judge may read (read-only); empty for everyone else. */
export async function listShowcaseForms(actor: Actor): Promise<FormListItem[]> {
  const ids = showcaseFormIds();
  if (!isJudge(actor) || ids.length === 0) return [];
  const db = await getDb();
  return db
    .select({ id: forms.id, title: forms.title, slug: forms.slug, status: forms.status, updatedAt: forms.updatedAt })
    .from(forms)
    .where(and(inArray(forms.id, ids), isNull(forms.archivedAt)))
    .orderBy(desc(forms.updatedAt));
}
