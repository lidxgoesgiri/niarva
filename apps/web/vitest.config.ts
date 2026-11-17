import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(here, "src"),
      // `server-only` throws outside a React Server Component bundle; integration tests run in plain Node.
      "server-only": path.join(here, "tests/support/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Each file gets its own in-memory database; files must not share module state.
    isolate: true,
    fileParallelism: false,
    passWithNoTests: true,
  },
});
