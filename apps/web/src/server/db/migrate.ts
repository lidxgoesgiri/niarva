// Applies SQL migrations to the PostgreSQL database named by DATABASE_URL.
// Usage: pnpm db:migrate   (reads .env.local from the repository root)
// The embedded PGlite database migrates itself on open and does not need this script.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../../..");

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(path.join(repoRoot, file));
  } catch {
    // File is optional.
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Nothing to migrate (the embedded database migrates itself).");
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: path.join(here, "migrations") });
  console.log("Migrations applied.");
} finally {
  await pool.end();
}
