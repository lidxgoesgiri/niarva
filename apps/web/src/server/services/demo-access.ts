import "server-only";
import { getEnv } from "../config/env";
import { isUuid } from "../ids";
import type { Actor } from "../context/session";

const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

/** A judge account, active only with `DEMO_MODE=true`. */
export function isJudge(actor: Pick<Actor, "email">): boolean {
  const env = getEnv();
  if (!env.DEMO_MODE) return false;
  const email = actor.email.trim().toLowerCase();
  return list(env.DEMO_JUDGE_EMAILS).some((entry) => entry.toLowerCase() === email);
}

/** The demo showcase forms judges may read; empty unless `DEMO_MODE=true`. */
export function showcaseFormIds(): string[] {
  const env = getEnv();
  return env.DEMO_MODE ? list(env.DEMO_SHOWCASE_FORM_IDS).filter(isUuid) : [];
}

/** Whether the actor may read a form it does not own: a judge reading a showcase form. */
export function canReadShowcase(actor: Pick<Actor, "email">, formId: string): boolean {
  return isJudge(actor) && showcaseFormIds().includes(formId);
}
