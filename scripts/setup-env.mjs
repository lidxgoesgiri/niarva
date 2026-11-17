// Creates `.env.local` at the repository root from `.env.example` with generated secrets.
// Existing values are kept: the script only fills secrets that are missing or still placeholders.
// Usage: pnpm setup:env
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const examplePath = join(root, ".env.example");
const targetPath = join(root, ".env.local");

const GENERATED = ["BETTER_AUTH_SECRET", "PREVIEW_TOKEN_SECRET", "IP_HASH_SECRET"];
const PLACEHOLDER = /^replace-with/;

const source = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : readFileSync(examplePath, "utf8");
const filled = [];

const lines = source.split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) return line;
  const [, name, value] = match;
  if (GENERATED.includes(name) && (value === "" || PLACEHOLDER.test(value))) {
    filled.push(name);
    return `${name}=${randomBytes(32).toString("base64url")}`;
  }
  return line;
});

writeFileSync(targetPath, lines.join("\n"));

// Report names only; secret values are never printed.
console.log(
  filled.length > 0
    ? `.env.local written. Generated: ${filled.join(", ")}.`
    : ".env.local already had every required secret; nothing changed.",
);
console.log("Optional: set OPENROUTER_API_KEY and OPENROUTER_MODEL in .env.local to enable AI drafting.");
