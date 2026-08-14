import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { generateStructured, CLAUDE_MODEL_FAST } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rateLimit";
import { checkFeatureLimit } from "@/lib/planLimits";
import { withCors, corsPreflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

const schema = z.object({
  // Present once a session is already running (fetching the next
  // sentence); absent on the very first call, which creates the session.
  sessionId: z.string().min(1).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  topic: z.string().max(200).optional(),
});

const difficultyLabel: Record<string, string> = {
  easy: "Pronunciation Practice - Easy",
  medium: "Pronunciation Practice - Medium",
  hard: "Pronunciation Practice - Hard",
};

const difficultyInstruction: Record<string, string> = {
  easy: "A short, simple sentence (6-10 words) using common everyday words.",
  medium: "A moderately challenging sentence (10-16 words) with some multi-syllable words.",
  hard: "A challenging sentence (14-20 words) with several multi-syllable or less common words, testing varied sounds.",
};

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return withCors(req, NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 }));

  const limit = rateLimit(`pronunciation-prompt:${userId}`, 20, 60_000);
  if (!limit.allowed) {
    return withCors(req, NextResponse.json({ success: false, message: "Too many requests, please wait a moment." }, { status: 429 }));
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return withCors(req, NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 }));
  const { difficulty, topic } = parsed.data;
  let { sessionId } = parsed.data;

  if (sessionId) {
    const existing = await prisma.coachingSession.findUnique({ where: { id: sessionId } });
    if (!existing || existing.userId !== userId || existing.type !== "pronunciation_practice") {
      return withCors(req, NextResponse.json({ success: false, message: "Session not found" }, { status: 404 }));
    }
  } else {
    const featureCheck = await checkFeatureLimit(userId, "MOCK_INTERVIEW");
    if (!featureCheck.allowed) {
      return withCors(req, NextResponse.json({ success: false, message: featureCheck.message }, { status: 403 }));
    }
    const created = await prisma.coachingSession.create({
      data: { userId, type: "pronunciation_practice", jobRole: difficultyLabel[difficulty], status: "in_progress" },
    });
    sessionId = created.id;
  }

  const promptText = [
    `Write exactly ONE sentence for a non-native English speaker to read aloud for pronunciation practice.`,
    difficultyInstruction[difficulty],
    topic ? `Theme/topic: ${topic}.` : null,
    "Output ONLY the sentence itself - no quotes, no numbering, no explanation. It must be natural, grammatically correct English a person would actually say.",
  ]
    .filter(Boolean)
    .join(" ");

  let sentence = "";
  try {
    const result = await generateStructured<{ sentence: string }>({
      system: "You write short practice sentences for a pronunciation-coaching app.",
      prompt: promptText,
      toolName: "write_sentence",
      toolDescription: "Records the generated practice sentence.",
      inputSchema: {
        type: "object",
        properties: { sentence: { type: "string" } },
        required: ["sentence"],
      },
      model: CLAUDE_MODEL_FAST,
      maxTokens: 150,
      route: "pronunciation.prompt",
      userId,
    });
    sentence = result.sentence.trim();
  } catch {
    return withCors(req, NextResponse.json({ success: false, message: "Could not generate a practice sentence." }, { status: 502 }));
  }

  if (!sentence) {
    return withCors(req, NextResponse.json({ success: false, message: "Could not generate a practice sentence." }, { status: 502 }));
  }

  const created = await prisma.interactionRecord.create({
    data: { sessionId, questionText: sentence, userAnswerText: null },
  });

  return withCors(req, NextResponse.json({ success: true, data: { sessionId, promptId: created.id, text: sentence } }));
}
