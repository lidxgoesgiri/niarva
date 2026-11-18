import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` only reads the schema; it never connects to a database.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./src/server/db/migrations",
  strict: true,
});
