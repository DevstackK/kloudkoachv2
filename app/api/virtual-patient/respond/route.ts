import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { anthropic, cachedSystem, CLAUDE_MODEL_FAST } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rateLimit";
import { logAiCall } from "@/lib/aiLogger";
import { withCors, corsPreflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

const schema = z.object({
  sessionId: z.string().min(1),
  question: z.string().min(1).max(2000),
});

// Recent turns only, same reasoning as /api/coach/respond - the case file
// itself is prompt-cached, so trimming history keeps time-to-first-token
// low without losing the thread of the conversation.
const HISTORY_TURNS = 8;

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return withCors(req, NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 }));

  const limit = rateLimit(`virtual-patient-respond:${userId}`, 30, 60_000);
  if (!limit.allowed) {
    return withCors(req, NextResponse.json({ success: false, message: "Too many requests, please wait a moment." }, { status: 429 }));
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return withCors(req, NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 }));
  const { sessionId, question } = parsed.data;

  const session = await prisma.coachingSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId || session.type !== "virtual_patient") {
    return withCors(req, NextResponse.json({ success: false, message: "Session not found" }, { status: 404 }));
  }

  const priorTurns = await prisma.interactionRecord.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS,
  });
  priorTurns.reverse();

  const systemPromptText = [
    "You are role-playing as a patient in a standardized-patient diagnostic-interview training exercise for a " +
      "3rd-year medical student. Stay completely in character as the patient at all times.",
    `Your case (for your reference only - this includes your real diagnosis, which you must NEVER state directly):\n${session.jobDescription?.slice(0, 4000)}`,
    "Rules: Speak only as a real patient would - describe symptoms in plain lay language, express appropriate " +
      "emotion, worry, or discomfort, and never use clinical/diagnostic terminology about your own condition. " +
      "If asked something the case doesn't cover, improvise a plausible answer consistent with the case and with " +
      "anything you've already said in this conversation. If asked what you think is wrong, you may express a " +
      "worried guess in lay terms, but never the precise clinical diagnosis. Keep answers short and conversational " +
      "(1-3 sentences), like real spoken dialogue. Never break character or mention you are an AI.",
  ].join("\n\n");

  const messages: { role: "user" | "assistant"; content: string }[] = [];
  priorTurns.forEach((turn) => {
    messages.push({ role: "user", content: turn.questionText });
    if (turn.suggestedAnswer) messages.push({ role: "assistant", content: turn.suggestedAnswer });
  });
  messages.push({ role: "user", content: question });

  const startedAt = Date.now();
  let answer = "";
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL_FAST,
      max_tokens: 200,
      system: cachedSystem(systemPromptText),
      messages,
    });
    const textBlock = response.content.find((b) => b.type === "text");
    answer = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    logAiCall({
      provider: "anthropic",
      route: "virtual-patient.respond",
      userId,
      model: CLAUDE_MODEL_FAST,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? undefined,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? undefined,
      latencyMs: Date.now() - startedAt,
      success: true,
    });
  } catch (err) {
    logAiCall({
      provider: "anthropic",
      route: "virtual-patient.respond",
      userId,
      model: CLAUDE_MODEL_FAST,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return withCors(req, NextResponse.json({ success: false, message: "The patient didn't respond - please try again." }, { status: 502 }));
  }

  if (!answer) {
    return withCors(req, NextResponse.json({ success: false, message: "The patient didn't respond - please try again." }, { status: 502 }));
  }

  await prisma.interactionRecord.create({
    data: { sessionId, questionText: question, suggestedAnswer: answer },
  });

  return withCors(req, NextResponse.json({ success: true, data: { text: answer } }));
}
