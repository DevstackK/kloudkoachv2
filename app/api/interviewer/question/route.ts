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
  // Omitted for the very first question of a session; present on every
  // subsequent call, since the candidate just finished answering.
  previousAnswer: z.string().max(4000).optional(),
});

// Caps the interview length so it has a natural end rather than running
// forever - also keeps a hard ceiling on per-session Claude/TTS cost.
const MAX_QUESTIONS = 6;

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return withCors(req, NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 }));

  const limit = rateLimit(`interviewer-question:${userId}`, 20, 60_000);
  if (!limit.allowed) {
    return withCors(req, NextResponse.json({ success: false, message: "Too many requests, please wait a moment." }, { status: 429 }));
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return withCors(req, NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 }));
  const { sessionId, previousAnswer } = parsed.data;

  const session = await prisma.coachingSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId || session.type !== "ai_interview") {
    return withCors(req, NextResponse.json({ success: false, message: "Session not found" }, { status: 404 }));
  }

  const priorTurns = await prisma.interactionRecord.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  // The candidate just answered the most recently asked (still-unanswered)
  // question - record it. No real-time scoring here by design: grading
  // every turn would add a Claude round trip to the middle of a live
  // back-and-forth conversation, which is exactly the latency this mode
  // needs to avoid to feel like a real interview rather than a quiz app.
  const pending = priorTurns.find((t) => t.userAnswerText === null);
  if (previousAnswer && pending) {
    await prisma.interactionRecord.update({
      where: { id: pending.id },
      data: { userAnswerText: previousAnswer },
    });
    pending.userAnswerText = previousAnswer;
  }

  const answeredCount = priorTurns.filter((t) => t.userAnswerText !== null).length;
  if (answeredCount >= MAX_QUESTIONS) {
    return withCors(req, NextResponse.json({ success: true, data: { done: true, question: null, questionNumber: answeredCount } }));
  }

  const [user, activeResume] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.resume.findFirst({ where: { userId, isActive: true } }),
  ]);

  const nextQuestionNumber = answeredCount + 1;
  const isFinalQuestion = nextQuestionNumber === MAX_QUESTIONS;

  const systemPromptText = [
    `You are a professional, warm but focused interviewer conducting a live mock interview with ${user?.name ?? "a candidate"} for the role: ${session.jobRole}.`,
    session.jobDescription ? `Job description context:\n${session.jobDescription.slice(0, 1500)}` : null,
    activeResume ? `Candidate's resume:\n${activeResume.rawText.slice(0, 2000)}` : null,
    `Ask exactly ONE interview question at a time. This will be question ${nextQuestionNumber} of ${MAX_QUESTIONS} total. ` +
      "Mix behavioral, situational, and role-specific questions - don't repeat the style or topic of an earlier question. " +
      (answeredCount === 0
        ? "This is the opening question - start naturally (a brief warm-up like asking them to introduce themselves, or go straight into a relevant question)."
        : "Briefly acknowledge their previous answer in one short natural phrase (e.g. \"Got it, thanks.\" / \"That's helpful context.\") before asking the next question - don't summarize or repeat what they said.") +
      (isFinalQuestion
        ? ` This IS the final question (${nextQuestionNumber} of ${MAX_QUESTIONS}) - you may signal that naturally (e.g. "Last question:" / "To wrap up...").`
        : ` This is NOT the final question - there are ${MAX_QUESTIONS - nextQuestionNumber} more after it, so do NOT say or imply this is the last/final question, that you're "wrapping up", or anything suggesting the interview is ending.`) +
      " Output ONLY what you would actually say aloud - no question numbering, no labels, no meta-commentary, no markdown.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: { role: "user" | "assistant"; content: string }[] = [];
  priorTurns.forEach((turn) => {
    messages.push({ role: "assistant", content: turn.questionText });
    if (turn.userAnswerText) messages.push({ role: "user", content: turn.userAnswerText });
  });
  messages.push({
    role: "user",
    content: priorTurns.length === 0 ? "(Begin the interview.)" : "(Continue - ask the next question.)",
  });

  const startedAt = Date.now();
  let question = "";
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL_FAST,
      max_tokens: 150,
      system: cachedSystem(systemPromptText),
      messages,
    });
    const textBlock = response.content.find((b) => b.type === "text");
    question = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    logAiCall({
      provider: "anthropic",
      route: "interviewer.question",
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
      route: "interviewer.question",
      userId,
      model: CLAUDE_MODEL_FAST,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return withCors(req, NextResponse.json({ success: false, message: "Could not generate the next question." }, { status: 502 }));
  }

  if (!question) {
    return withCors(req, NextResponse.json({ success: false, message: "Could not generate the next question." }, { status: 502 }));
  }

  await prisma.interactionRecord.create({
    data: { sessionId, questionText: question, userAnswerText: null },
  });

  return withCors(
    req,
    NextResponse.json({ success: true, data: { done: false, question, questionNumber: answeredCount + 1 } })
  );
}
