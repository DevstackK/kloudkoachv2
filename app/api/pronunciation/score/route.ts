import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { scorePronunciation } from "@/lib/speechace";
import { logAiCall } from "@/lib/aiLogger";
import { withCors, corsPreflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

// Below this, a word is called out by name in the feedback text rather than
// just contributing to the overall average.
const WEAK_WORD_THRESHOLD = 70;

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return withCors(req, NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 }));

  const limit = rateLimit(`pronunciation-score:${userId}`, 20, 60_000);
  if (!limit.allowed) {
    return withCors(req, NextResponse.json({ success: false, message: "Too many requests, please wait a moment." }, { status: 429 }));
  }

  const form = await req.formData().catch(() => null);
  const sessionId = form?.get("sessionId");
  const promptId = form?.get("promptId");
  const audio = form?.get("audio");

  if (typeof sessionId !== "string" || typeof promptId !== "string" || !(audio instanceof Blob)) {
    return withCors(req, NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 }));
  }

  const [session, prompt] = await Promise.all([
    prisma.coachingSession.findUnique({ where: { id: sessionId } }),
    prisma.interactionRecord.findUnique({ where: { id: promptId } }),
  ]);
  if (!session || session.userId !== userId || session.type !== "pronunciation_practice") {
    return withCors(req, NextResponse.json({ success: false, message: "Session not found" }, { status: 404 }));
  }
  if (!prompt || prompt.sessionId !== sessionId) {
    return withCors(req, NextResponse.json({ success: false, message: "Prompt not found" }, { status: 404 }));
  }

  const startedAt = Date.now();
  try {
    const result = await scorePronunciation(prompt.questionText, audio);
    logAiCall({ provider: "speechace", route: "pronunciation.score", userId, latencyMs: Date.now() - startedAt, success: true });

    const overall100 = result.text_score.speechace_score?.pronunciation ?? 0;
    const words = result.text_score.word_score_list ?? [];
    const weakWords = words.filter((w) => w.quality_score < WEAK_WORD_THRESHOLD);

    const feedback =
      weakWords.length === 0
        ? "Great job - every word came through clearly."
        : `Words to practice: ${weakWords.map((w) => `"${w.word}" (${Math.round(w.quality_score)}/100)`).join(", ")}.`;

    await prisma.interactionRecord.update({
      where: { id: promptId },
      data: { rating: Math.round(overall100 / 10), feedback },
    });

    return withCors(
      req,
      NextResponse.json({
        success: true,
        data: {
          overallScore: Math.round(overall100),
          ieltsScore: result.text_score.ielts_score?.pronunciation ?? null,
          cefrScore: result.text_score.cefr_score?.pronunciation ?? null,
          words: words.map((w) => ({ word: w.word, score: Math.round(w.quality_score) })),
          feedback,
        },
      })
    );
  } catch (err) {
    logAiCall({
      provider: "speechace",
      route: "pronunciation.score",
      userId,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return withCors(req, NextResponse.json({ success: false, message: "Could not score that recording. Please try again." }, { status: 502 }));
  }
}
