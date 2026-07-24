/**
 * Structured logging for every AI provider call - the practical, app-scale
 * version of "AI cost observability" and "token spend tracking". Written as
 * single-line JSON to stdout, which Vercel/any log drain captures and makes
 * searchable/alertable without needing a dedicated observability platform.
 *
 * We call hosted Anthropic/Deepgram APIs rather than operating our own
 * inference infrastructure, so GPU/TPU capacity planning, accelerator
 * utilization, and inference-endpoint DDoS protection are the providers'
 * responsibility, not ours - logging what we DO control (which model, how
 * many tokens, how long, did it fail) is the right-sized version of that
 * observability layer for this app.
 */
type AiCallLog = {
  provider: "anthropic" | "deepgram";
  route: string;
  userId?: string | null;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
};

export function logAiCall(entry: AiCallLog) {
  console.log(
    JSON.stringify({
      type: "ai_call",
      timestamp: new Date().toISOString(),
      ...entry,
    })
  );
}
