import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getEnv } from "../config/env";
import { getDb } from "../db/client";
import * as schema from "../db/schema";
import { uuidv7 } from "../ids";

async function createAuth() {
  const env = getEnv();
  const db = await getDb();

  return betterAuth({
    appName: "NIARVA",
    baseURL: env.NIARVA_BASE_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.authSessions,
        account: schema.authAccounts,
        verification: schema.authVerifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: "niarva",
      useSecureCookies: env.NIARVA_BASE_URL.startsWith("https://"),
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
    },
    databaseHooks: {
      user: {
        create: {
          // Every creator gets exactly one personal workspace (single-owner scope).
          after: async (user) => {
            const workspaceId = uuidv7();
            await db.transaction(async (tx) => {
              await tx.insert(schema.workspaces).values({
                id: workspaceId,
                name: `${user.name}'s workspace`.slice(0, 80),
                slug: `ws-${workspaceId.slice(-12)}`,
                ownerId: user.id,
              });
              await tx.insert(schema.workspaceMembers).values({
                workspaceId,
                userId: user.id,
                role: "owner",
              });
            });
          },
        },
      },
    },
    // Must stay last: lets server actions set the session cookie.
    plugins: [nextCookies()],
  });
}

type Auth = Awaited<ReturnType<typeof createAuth>>;

const globalKey = Symbol.for("niarva.auth");
type GlobalWithAuth = typeof globalThis & { [globalKey]?: Promise<Auth> };

/** Process-wide Better Auth instance, bound to the process-wide database handle. */
export function getAuth(): Promise<Auth> {
  const globals = globalThis as GlobalWithAuth;
  globals[globalKey] ??= createAuth();
  return globals[globalKey];
}

/** Test-only: drop the cached instance after swapping the database handle. */
export function resetAuthForTests(): void {
  (globalThis as GlobalWithAuth)[globalKey] = undefined;
}
