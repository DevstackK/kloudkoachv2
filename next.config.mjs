import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(import.meta.dirname),
  // Not needed on Vercel (its build pipeline handles this natively) - only
  // used by the Dockerfile for self-hosted/portable deployments.
  output: "standalone",
  // Next's output file tracing (which determines what each Vercel
  // serverless function - or Docker standalone build - actually bundles)
  // doesn't reliably detect Prisma's generated WASM query-compiler engine
  // file, since it's loaded dynamically rather than via a static import.
  // Without this, every Prisma query 500s at runtime with
  // "ENOENT: query_compiler_bg.wasm" despite the build succeeding cleanly.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
