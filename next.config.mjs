import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(import.meta.dirname),
  // Not needed on Vercel (its build pipeline handles this natively) - only
  // used by the Dockerfile for self-hosted/portable deployments.
  output: "standalone",
};

export default nextConfig;
