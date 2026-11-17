import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const webFiles = ["apps/web/**/*.{ts,tsx,mjs}"];

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/coverage/**",
    "**/next-env.d.ts",
    "apps/web/src/server/db/migrations/**",
    ".context/**",
    ".testmuai/**",
    "m0-lab/results/**",
    "evidence/**",
  ]),

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Next.js rules apply only to the web app.
  ...nextVitals.map((config) => ({
    ...config,
    files: webFiles,
    settings: { ...(config.settings ?? {}), next: { rootDir: "apps/web" } },
  })),

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      // `Boolean("false")` is true: observations must be parsed against an allowlist instead.
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='eval']",
          message: "eval is forbidden: rules are a declarative DSL.",
        },
        {
          selector: "NewExpression[callee.name='Function']",
          message: "Dynamic code is forbidden: rules are a declarative DSL.",
        },
      ],
    },
  },

  // The domain core is pure: no clock, no randomness, no I/O, no framework imports.
  {
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "packages/core must not perform I/O." },
        { name: "process", message: "packages/core must not read the environment." },
        { name: "setTimeout", message: "packages/core must be synchronous and deterministic." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "packages/core must not read the clock." },
        { object: "Math", property: "random", message: "packages/core must be deterministic." },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["node:*", "fs", "path", "crypto", "http", "https"], message: "packages/core must not import Node built-ins." },
            { group: ["next", "next/*", "react", "react-dom", "@niarva/contracts"], message: "packages/core must not depend on apps or contracts." },
          ],
        },
      ],
    },
  },

  // Client and feature code never reaches into server-only modules.
  {
    files: ["apps/web/src/features/**/*.{ts,tsx}", "apps/web/src/components/**/*.{ts,tsx}", "apps/web/src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/server/*", "**/server/**"], message: "UI code must go through the HTTP API, not server modules." }] },
      ],
    },
  },

  // Node scripts and tooling.
  {
    files: ["**/*.mjs", "scripts/**", "m0-lab/**"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", setTimeout: "readonly", clearTimeout: "readonly", URL: "readonly", URLSearchParams: "readonly", fetch: "readonly", Buffer: "readonly" },
    },
  },
]);
