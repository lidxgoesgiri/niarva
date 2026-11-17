import { randomBytes } from "node:crypto";
import { resetAuthForTests, getAuth } from "@/server/auth/better-auth";
import { resetEnvCache } from "@/server/config/env";
import { createPglite, MIGRATIONS_DIR, setDbHandleForTests, type Db } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { getActor, type Actor } from "@/server/context/session";

type TestHandle = { db: Db; driver: "pg" | "pglite"; close: () => Promise<void> };

/**
 * A throwaway database on a real PostgreSQL server (used in CI through TEST_DATABASE_URL).
 * Real row locks and concurrent transactions behave exactly as in production.
 */
async function createPostgresTestDatabase(adminUrl: string): Promise<TestHandle> {
  const { Client, Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");

  const name = `niarva_test_${randomBytes(6).toString("hex")}`;
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const pool = new Pool({ connectionString: url.toString(), max: 10 });
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });

  return {
    db: db as unknown as Db,
    driver: "pg",
    close: async () => {
      await pool.end();
      const cleanup = new Client({ connectionString: adminUrl });
      await cleanup.connect();
      await cleanup.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await cleanup.end();
    },
  };
}

/**
 * Boots an isolated NIARVA backend for one test file with all migrations applied and a
 * Better Auth instance bound to it.
 *
 * - Default: in-memory embedded PostgreSQL (PGlite); no setup required.
 * - TEST_DATABASE_URL set: a fresh database on that PostgreSQL server, dropped afterwards.
 */
export async function bootTestApp(): Promise<{ db: Db; driver: "pg" | "pglite"; close: () => Promise<void> }> {
  Object.assign(process.env, {
    NODE_ENV: "test",
    NIARVA_BASE_URL: "http://localhost:3000",
    NIARVA_ENVIRONMENT_ID: "test",
    BETTER_AUTH_SECRET: "test-only-better-auth-secret-0123456789abcdef",
    PREVIEW_TOKEN_SECRET: "test-only-preview-token-secret-0123456789abcd",
    IP_HASH_SECRET: "test-only-ip-hash-secret-0123456789abcdefghij",
  });
  resetEnvCache();
  resetAuthForTests();

  const adminUrl = process.env.TEST_DATABASE_URL;
  const handle: TestHandle = adminUrl ? await createPostgresTestDatabase(adminUrl) : await createPglite();
  setDbHandleForTests(Promise.resolve(handle));
  return {
    db: handle.db,
    driver: handle.driver,
    close: async () => {
      setDbHandleForTests(undefined);
      resetAuthForTests();
      await handle.close();
    },
  };
}

let counter = 0;

/** Registers a synthetic creator and returns the actor plus request headers carrying the session. */
export async function createCreator(label = "creator"): Promise<{ actor: Actor; headers: Headers }> {
  counter += 1;
  const auth = await getAuth();
  const email = `${label}-${counter}-${randomBytes(3).toString("hex")}@niarva.test`;
  const result = await auth.api.signUpEmail({
    body: { name: `Test ${label} ${counter}`, email, password: "synthetic-password-123" },
    returnHeaders: true,
  });
  const setCookie = result.headers.getSetCookie();
  const headers = new Headers({
    cookie: setCookie.map((cookie) => cookie.split(";")[0]).join("; "),
  });
  const actor = await getActor(headers);
  if (!actor) throw new Error("test setup: session was not established");
  return { actor, headers };
}
