import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import type { ClaimSetContent, FormDefinition } from "../dsl/schema";
import { ENGINE_VERSION } from "../version";

/**
 * Canonical JSON: object keys sorted, `undefined` members dropped, no whitespace.
 * Two semantically identical snapshots always serialise to the same bytes.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Non-finite number in canonical JSON");
    if (typeof value === "bigint") throw new Error("BigInt is not allowed in canonical JSON");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item === undefined ? null : item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, inner]) => inner !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, inner]) => `${JSON.stringify(key)}:${canonicalJson(inner)}`).join(",")}}`;
}

export function sha256Hex(text: string): string {
  return bytesToHex(sha256(utf8ToBytes(text)));
}

/**
 * Hash of the approved meaning. Review metadata (who proposed it, quotes, review state)
 * is excluded so that it cannot change the identity of the approved semantics.
 */
export function claimsHash(content: ClaimSetContent): string {
  const semantic = {
    fields: content.fields,
    claims: content.claims.map((claim) => {
      const { origin: _origin, reviewState: _review, sourceSpan: _span, sourceQuote: _quote, ambiguity: _ambiguity, ...rest } = claim;
      return rest;
    }),
  };
  return sha256Hex(`ch1|${canonicalJson(semantic)}`);
}

export function definitionHash(definition: FormDefinition): string {
  return sha256Hex(`dh1|${canonicalJson(definition)}`);
}

export function analysisKey(claimsHashValue: string, definitionHashValue: string): string {
  return sha256Hex(`ak1|${claimsHashValue}|${definitionHashValue}|${ENGINE_VERSION}`);
}

export type VerificationKeyParts = {
  workspaceId: string;
  formId: string;
  formVersionId: string;
  claimsHash: string;
  definitionHash: string;
  rendererBuildId: string;
  runtimeConfigHash: string;
  environmentId: string;
  probePolicyVersion: string;
  scenarioSetHash: string;
  serverValidationVersion: string;
};

const VERIFICATION_KEY_ORDER: (keyof VerificationKeyParts)[] = [
  "workspaceId",
  "formId",
  "formVersionId",
  "claimsHash",
  "definitionHash",
  "rendererBuildId",
  "runtimeConfigHash",
  "environmentId",
  "probePolicyVersion",
  "scenarioSetHash",
  "serverValidationVersion",
];

/** Identity of browser proof: any component change makes earlier proof unusable for this key. */
export function verificationKey(parts: VerificationKeyParts): string {
  return sha256Hex(`vk3|${VERIFICATION_KEY_ORDER.map((name) => parts[name]).join("|")}`);
}

/** First 8 hex characters of the definition hash: the page identity shown in the preview footer. */
export function pageIdentity(definitionHashValue: string): string {
  return definitionHashValue.slice(0, 8);
}
