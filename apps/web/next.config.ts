import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM; let Node load it directly instead of bundling.
  // OpenTelemetry has to be loaded by Node itself so it can wrap pg and http.
  serverExternalPackages: ["@electric-sql/pglite", "pglite-prisma-adapter", "@microsoft/opentelemetry"],
};

export default nextConfig;
