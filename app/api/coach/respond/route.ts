import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getCompanionSessionId } from "@/lib/session";
import { anthropic, cachedSystem, pickCoachModel } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rateLimit";
import { logAiCall } from "@/lib/aiLogger";
import { corsHeaders, corsPreflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

// sessionId is optional here specifically for the companion (phone) path -
// the companion token itself is scoped to one session server-side, so the
// client never needs to (and shouldn't have to) know or send the raw id.
const schema = z.object({
  sessionId: z.string().min(1).optional(),
  question: z.string().min(1).max(2000),
});

// How many prior turns to send in full (recent context matters most for a
// natural follow-up). Older turns are summarized instead of sent verbatim -
// full history would otherwise re-cost every turn since only the system
// block is prompt-cached, not the messages array. Kept small deliberately:
// every turn of history here is uncached input tokens Claude has to read
// before it can start answering, so trimming this directly cuts
// time-to-first-token on the highest-frequency call in the app.
const FULL_HISTORY_TURNS = 2;
const TOTAL_HISTORY_TURNS = 4;
const OLD_ANSWER_SUMMARY_CHARS = 100;

export async function POST(req: NextRequest) {
  const authedUserId = await getCurrentUserId(req);
  const companionSessionId = authedUserId ? null : await getCompanionSessionId(req);
  if (!authedUserId && !companionSessionId) {
    return new Response(JSON.stringify({ success: false, message: "Not authenticated" }), { status: 401, headers: corsHeaders(req) });
  }

  // Live turns are the highest-frequency Claude call in the app - cap to
  // ~20/min/user (or /session, on the companion path) so a stuck client or
  // malicious script can't run up cost.
  const limit = rateLimit(`coach:${authedUserId ?? `companion:${companionSessionId}`}`, 20, 60_000);
  if (!limit.allowed) {
    return new Response(JSON.stringify({ success: false, message: "Too many requests, slow down." }), {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((limit.retryAfterMs ?? 1000) / 1000)), ...corsHeaders(req) },
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ success: false, message: "Invalid input" }), { status: 400, headers: corsHeaders(req) });
  }
  const { question } = parsed.data;
  // A companion token is bound to exactly one session - trust that over
  // whatever sessionId (if any) the client body claims.
  const sessionId = companionSessionId ?? parsed.data.sessionId;
  if (!sessionId) {
    return new Response(JSON.stringify({ success: false, message: "Invalid input" }), { status: 400, headers: corsHeaders(req) });
  }

  const session = await prisma.coachingSession.findUnique({ where: { id: sessionId } });
  if (!session || (authedUserId && session.userId !== authedUserId)) {
    return new Response(JSON.stringify({ success: false, message: "Session not found" }), { status: 404, headers: corsHeaders(req) });
  }
  const userId = session.userId;

  const [user, activeResume, priorTurns] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.resume.findFirst({ where: { userId, isActive: true } }),
    prisma.interactionRecord.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: TOTAL_HISTORY_TURNS,
    }),
  ]);
  priorTurns.reverse(); // back to chronological order

  const systemPromptText = [
    `You are Kloud Koach, an AI interview coach helping ${user?.name ?? "a candidate"} in a live ${session.type === "live_interview" ? "job interview" : "mock interview practice session"} for the role: ${session.jobRole}.`,
    session.jobDescription ? `Job description context:\n${session.jobDescription.slice(0, 1500)}` : null,
    // Trimmed resume context: the live loop pays for this on every cache
    // miss, so keep it tight - full-fidelity resume text is only needed
    // for the one-time parsing call, not every coaching turn.
    activeResume ? `Candidate's resume:\n${activeResume.rawText.slice(0, 3000)}` : null,
    "Answer as the candidate would, in first person - confident, natural, and SHORT (1-3 sentences; only go longer if the question genuinely can't be answered in fewer). " +
      "Output ONLY the spoken answer itself - never restate, paraphrase, or acknowledge the question first (no \"That's a great question about...\", no repeating any part of it back). " +
      "Ground answers in the resume/job context where relevant. Never mention that you are an AI or that this is generated.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: { role: "user" | "assistant"; content: string }[] = [];
  const olderCount = Math.max(0, priorTurns.length - FULL_HISTORY_TURNS);
  priorTurns.forEach((turn, i) => {
    const isOld = i < olderCount;
    messages.push({ role: "user", content: turn.questionText });
    if (turn.suggestedAnswer) {
      messages.push({
        role: "assistant",
        content: isOld ? turn.suggestedAnswer.slice(0, OLD_ANSWER_SUMMARY_CHARS) : turn.suggestedAnswer,
      });
    }
  });
  messages.push({ role: "user", content: question });

  const encoder = new TextEncoder();
  let fullAnswer = "";
  const startedAt = Date.now();
  const model = pickCoachModel(question);

  const stream = new ReadableStream({
    async start(controller) {
      let claudeStream: ReturnType<typeof anthropic.messages.stream> | undefined;
      try {
        claudeStream = anthropic.messages.stream({
          model,
          // Lowered from 500: answers are meant to be 1-3 spoken sentences,
          // and a smaller cap means less worst-case generation time on the
          // highest-frequency call in the app.
          max_tokens: 300,
          system: cachedSystem(systemPromptText),
          messages,
        });

        for await (const event of claudeStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullAnswer += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        const finalMessage = await claudeStream.finalMessage();
        logAiCall({
          provider: "anthropic",
          route: "coach.respond",
          userId,
          model,
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
          cacheReadTokens: finalMessage.usage.cache_read_input_tokens ?? undefined,
          cacheWriteTokens: finalMessage.usage.cache_creation_input_tokens ?? undefined,
          latencyMs: Date.now() - startedAt,
          success: true,
        });
      } catch (err) {
        console.error("Coach respond streaming failed:", err);
        logAiCall({
          provider: "anthropic",
          route: "coach.respond",
          userId,
          model,
          latencyMs: Date.now() - startedAt,
          success: false,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      } finally {
        try {
          await prisma.interactionRecord.create({
            data: { sessionId, questionText: question, suggestedAnswer: fullAnswer || null },
          });
        } catch (err) {
          console.error("Failed to persist interaction record:", err);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", ...corsHeaders(req) },
  });
}
