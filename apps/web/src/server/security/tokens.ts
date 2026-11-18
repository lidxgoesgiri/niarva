import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getEnv } from "../config/env";

export type PreviewPurpose = "probe" | "creator";

export type PreviewClaims = {
  /** Form version the token opens. */
  v: string;
  /** Purpose: Kane probe runs get "probe"; signed-in creators previewing get "creator". */
  p: PreviewPurpose;
  /** Probe run the token belongs to (probe tokens only). */
  r: string | null;
  /** Expiry, seconds since epoch. */
  e: number;
  /** Unique token id, recorded with preview submissions. */
  j: string;
};

const PROBE_TTL_SECONDS = 25 * 60;
const CREATOR_TTL_SECONDS = 60 * 60;

function sign(payload: string): string {
  return createHmac("sha256", getEnv().PREVIEW_TOKEN_SECRET).update(payload).digest("base64url");
}

/** A short-lived token scoped to one form version (and one probe run). It is never stored. */
export function issuePreviewToken(versionId: string, purpose: PreviewPurpose, probeRunId: string | null, now = Date.now()): { token: string; claims: PreviewClaims } {
  const claims: PreviewClaims = {
    v: versionId,
    p: purpose,
    r: probeRunId,
    e: Math.floor(now / 1000) + (purpose === "probe" ? PROBE_TTL_SECONDS : CREATOR_TTL_SECONDS),
    j: randomBytes(9).toString("base64url"),
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, claims };
}

/** Verifies signature, expiry, and version scope. Returns null for any invalid token. */
export function verifyPreviewToken(token: string | null | undefined, versionId: string, now = Date.now()): PreviewClaims | null {
  if (!token || token.length > 512) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let claims: PreviewClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PreviewClaims;
  } catch {
    return null;
  }
  if (claims.v !== versionId || claims.e * 1000 < now) return null;
  if (claims.p !== "probe" && claims.p !== "creator") return null;
  return claims;
}

/** Constant-time check of the worker bearer token. */
export function verifyWorkerToken(header: string | null): boolean {
  const configured = getEnv().WORKER_SHARED_TOKEN;
  if (!configured || !header?.startsWith("Bearer ")) return false;
  const given = createHash("sha256").update(header.slice(7)).digest();
  const expected = createHash("sha256").update(configured).digest();
  return timingSafeEqual(given, expected);
}

/** Respondent IP addresses are only ever stored as a keyed hash. */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHmac("sha256", getEnv().IP_HASH_SECRET).update(ip).digest("hex").slice(0, 32);
}

const RECEIPT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 8-character receipt without ambiguous characters (no 0/O, 1/I). */
export function receiptCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => RECEIPT_ALPHABET[byte % RECEIPT_ALPHABET.length]).join("");
}
