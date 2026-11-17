import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// One `.env.local` at the repository root serves both the web app and the worker.
// Next.js only reads env files next to the app, and its loader caches the first directory,
// so the root files are loaded with Node's own parser. Variables that are already set
// (for example by the hosting platform) are never overridden.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(path.join(repoRoot, file));
  } catch {
    // The file is optional.
  }
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js injects inline bootstrap scripts; dev mode additionally needs eval for React refresh.
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@niarva/core", "@niarva/contracts"],
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  outputFileTracingRoot: repoRoot,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
