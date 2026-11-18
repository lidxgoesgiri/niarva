import "server-only";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { getEnv } from "../config/env";
import * as schema from "./schema";

/** Driver-independent database type shared by the pg and PGlite drivers. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
/** A database handle or an open transaction. */
export type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

type DbHandle = { db: Db; driver: "pg" | "pglite"; close: () => Promise<void> };

const globalKey = Symbol.for("niarva.db");
type GlobalWithDb = typeof globalThis & { [globalKey]?: Promise<DbHandle> };

async function createPg(connectionString: string, max: number): Promise<DbHandle> {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString, max });
  const db = drizzle(pool, { schema }) as unknown as Db;
  return { db, driver: "pg", close: () => pool.end() };
}

/**
 * Embedded PostgreSQL (PGlite). `dataDir` undefined means in-memory, used by tests.
 * Migrations are applied on open so a fresh clone works without a manual step.
 */
export async function createPglite(dataDir?: string): Promise<DbHandle> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return { db: db as unknown as Db, driver: "pglite", close: () => client.close() };
}

async function open(): Promise<DbHandle> {
  const env = getEnv();
  if (env.DATABASE_URL) return createPg(env.DATABASE_URL, env.DATABASE_POOL_MAX);
  // A serverless filesystem is temporary: an embedded database there would silently lose data.
  if (process.env.VERCEL) throw new Error("DATABASE_URL is required on Vercel; the embedded database cannot persist there.");
  const dataDir = env.PGLITE_DIR ?? path.join(process.cwd(), ".pglite");
  return createPglite(dataDir);
}

/**
 * Process-wide database handle. Cached on `globalThis` so Next.js hot reload
 * does not open the embedded database twice.
 */
export function getDbHandle(): Promise<DbHandle> {
  const globals = globalThis as GlobalWithDb;
  globals[globalKey] ??= open();
  return globals[globalKey];
}

export async function getDb(): Promise<Db> {
  return (await getDbHandle()).db;
}

/** Test-only: replace the process-wide handle (for an isolated in-memory database). */
export function setDbHandleForTests(handle: Promise<DbHandle> | undefined): void {
  (globalThis as GlobalWithDb)[globalKey] = handle;
}
