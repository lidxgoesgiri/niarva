import { createHash } from "node:crypto";
import fs from "node:fs";
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

/**
 * Renderer fingerprint: a hash of every source file that decides how a form renders, validates,
 * or filters answers. Deny-by-default: any change in these folders yields a new identity and
 * makes existing browser proof STALE.
 */
function rendererFingerprint(): string {
  const roots = [
    path.join(repoRoot, "apps/web/src/features/form-renderer"),
    path.join(repoRoot, "apps/web/src/app/preview"),
    path.join(repoRoot, "apps/web/src/app/f"),
    path.join(repoRoot, "packages/core/src/eval"),
    path.join(repoRoot, "packages/core/src/dsl"),
    path.join(repoRoot, "packages/core/src/decimal"),
  ];
  const files: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|css)$/.test(entry.name)) files.push(full);
    }
  };
  roots.forEach(walk);
  const hash = createHash("sha256");
  for (const file of files.sort()) {
    hash.update(path.relative(repoRoot, file).replace(/\\/g, "/"));
    hash.update("\0");
    hash.update(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
    hash.update("\0");
  }
  return `r1-${hash.digest("hex").slice(0, 16)}`;
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
  env: { NIARVA_RENDERER_BUILD_ID: rendererFingerprint() },
  poweredByHeader: false,
  transpilePackages: ["@niarva/core", "@niarva/contracts"],
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  outputFileTracingRoot: repoRoot,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
