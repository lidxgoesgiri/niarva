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

const GENERATED = ["BETTER_AUTH_SECRET", "PREVIEW_TOKEN_SECRET", "IP_HASH_SECRET", "WORKER_SHARED_TOKEN"];
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

// Append variables introduced after .env.local was first created; drop retired ones.
const RETIRED = new Set(["NIARVA_WORKER_TOKEN"]);
const kept = lines.filter((line) => !RETIRED.has(line.split("=")[0]));
const present = new Set(kept.map((line) => line.split("=")[0]));
for (const line of readFileSync(examplePath, "utf8").split(/\r?\n/)) {
  const name = line.match(/^([A-Z0-9_]+)=/)?.[1];
  if (!name || present.has(name)) continue;
  if (GENERATED.includes(name)) {
    filled.push(name);
    kept.push(`${name}=${randomBytes(32).toString("base64url")}`);
  } else {
    kept.push(line);
  }
}
// Fill empty worker defaults from the example.
const defaults = Object.fromEntries(
  readFileSync(examplePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^(NIARVA_WORKER_[A-Z_]+)=(.+)$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);
const final = kept.map((line) => {
  const match = line.match(/^(NIARVA_WORKER_[A-Z_]+)=$/);
  return match && defaults[match[1]] ? `${match[1]}=${defaults[match[1]]}` : line;
});

writeFileSync(targetPath, final.join("\n"));

// Report names only; secret values are never printed.
console.log(
  filled.length > 0
    ? `.env.local written. Generated: ${filled.join(", ")}.`
    : ".env.local already had every required secret; nothing changed.",
);
console.log("Optional: set OPENROUTER_API_KEY and OPENROUTER_MODEL in .env.local to enable AI drafting.");
