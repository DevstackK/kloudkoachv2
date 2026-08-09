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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            // 'unsafe-inline' on script-src is needed for Next.js's own
            // inline bootstrap scripts (no nonce plumbing yet) - this still
            // blocks loading/exfiltrating to any non-self script origin,
            // which is the more common real-world attack path.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              // AI Interviewer plays ElevenLabs TTS audio via a blob: URL
              // (URL.createObjectURL on the fetched audio bytes) - without
              // this, the <audio> element's load is CSP-blocked and fails
              // silently with a generic media error event.
              "media-src 'self' blob:",
              "font-src 'self' data:",
              "connect-src 'self' wss://api.deepgram.com https://api.deepgram.com",
              "frame-src https://checkout.stripe.com https://js.stripe.com",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
