import Anthropic from "@anthropic-ai/sdk";
import { logAiCall } from "@/lib/aiLogger";

const globalForAnthropic = globalThis as unknown as { anthropic?: Anthropic };

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (process.env.NODE_ENV !== "production") {
  globalForAnthropic.anthropic = anthropic;
}

/**
 * Model routing: default to the cheap/fast model everywhere, and only pay
 * for the stronger model on the specific calls that need its reasoning
 * quality (structured extraction, exam generation, post-session scoring) or
 * on individual live-coaching turns that look genuinely hard. This keeps
 * per-session cost low - the live coaching loop is the highest-frequency
 * call in the whole app (many turns per session), so its default model is
 * the single biggest cost lever we have.
 */
export const CLAUDE_MODEL_FAST = process.env.CLAUDE_MODEL_FAST || "claude-haiku-4-5-20251001";
export const CLAUDE_MODEL_SMART = process.env.CLAUDE_MODEL_SMART || "claude-sonnet-5";

/** @deprecated use CLAUDE_MODEL_FAST / CLAUDE_MODEL_SMART directly */
export const CLAUDE_MODEL = CLAUDE_MODEL_SMART;

const COMPLEX_QUESTION_SIGNALS = [
  "design",
  "architecture",
  "walk me through",
  "trade-off",
  "tradeoff",
  "system design",
  "explain your approach",
  "why did you choose",
  "how would you scale",
  "deep dive",
];

/**
 * Cheap heuristic for escalating a single live-coaching turn to the smarter
 * model: long questions and system-design-style phrasing genuinely benefit
 * from stronger reasoning; short factual/behavioral questions don't need it.
 */
export function pickCoachModel(question: string): string {
  const normalized = question.toLowerCase();
  const isLong = question.split(/\s+/).length > 40;
  const hasComplexSignal = COMPLEX_QUESTION_SIGNALS.some((signal) => normalized.includes(signal));
  return isLong || hasComplexSignal ? CLAUDE_MODEL_SMART : CLAUDE_MODEL_FAST;
}

/**
 * Wraps a system prompt for Anthropic prompt caching. Within a live session
 * the resume/job-description context is identical across many turns - this
 * caches that context (5 min ephemeral TTL) so repeat turns only pay full
 * price for the new question, not the whole context again.
 */
export function cachedSystem(text: string): Anthropic.TextBlockParam[] {
  return [{ type: "text", text, cache_control: { type: "ephemeral" } }];
}

type JsonSchema = Record<string, unknown>;

/**
 * Forces Claude to respond with structured JSON matching `inputSchema` by
 * making the schema a required tool call rather than parsing free-form text.
 * Defaults to the smart model - these are low-frequency, quality-sensitive
 * calls (resume parsing, exam generation, session scoring), not the
 * high-frequency live loop.
 */
export async function generateStructured<T = unknown>({
  system,
  prompt,
  toolName,
  toolDescription,
  inputSchema,
  maxTokens = 4096,
  model = CLAUDE_MODEL_SMART,
  route = "unknown",
  userId,
}: {
  system: string;
  prompt: string;
  toolName: string;
  toolDescription: string;
  inputSchema: JsonSchema;
  maxTokens?: number;
  model?: string;
  route?: string;
  userId?: string | null;
}): Promise<T> {
  const startedAt = Date.now();
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          name: toolName,
          description: toolDescription,
          input_schema: inputSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: toolName },
    });

    logAiCall({
      provider: "anthropic",
      route,
      userId,
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? undefined,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? undefined,
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Claude did not return the expected structured tool call.");
    }

    return toolUse.input as T;
  } catch (err) {
    logAiCall({
      provider: "anthropic",
      route,
      userId,
      model,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function generateText({
  system,
  prompt,
  maxTokens = 2048,
  model = CLAUDE_MODEL_FAST,
  route = "unknown",
  userId,
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
  model?: string;
  route?: string;
  userId?: string | null;
}): Promise<string> {
  const startedAt = Date.now();
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    });

    logAiCall({
      provider: "anthropic",
      route,
      userId,
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text : "";
  } catch (err) {
    logAiCall({
      provider: "anthropic",
      route,
      userId,
      model,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
