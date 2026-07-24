import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { generateStructured } from "@/lib/anthropic";
import { withCors, corsPreflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

const RATING_SCHEMA = {
  type: "object",
  properties: {
    ratings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          interactionId: { type: "string" },
          rating: { type: "number", description: "0-10 score for how strong the suggested answer was." },
          feedback: { type: "string", description: "One or two sentences of constructive feedback." },
        },
        required: ["interactionId", "rating", "feedback"],
      },
    },
  },
  required: ["ratings"],
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req);
  if (!userId) return withCors(req, NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 }));

  const { id } = await params;
  const session = await prisma.coachingSession.findUnique({
    where: { id },
    include: { interactions: true },
  });
  if (!session || session.userId !== userId) {
    return withCors(req, NextResponse.json({ success: false, message: "Session not found" }, { status: 404 }));
  }

  const endedAt = new Date();
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000));

  let averageScore: number | null = null;

  const unratedTurns = session.interactions.filter((i) => i.rating === null && i.suggestedAnswer);
  if (unratedTurns.length > 0) {
    try {
      const result = await generateStructured<{ ratings: { interactionId: string; rating: number; feedback: string }[] }>({
        system:
          "You are an interview coaching evaluator. Rate how strong each suggested answer was for its question, " +
          "on a 0-10 scale, with brief constructive feedback.",
        prompt: unratedTurns
          .map((t) => `Interaction ${t.id}\nQuestion: ${t.questionText}\nSuggested answer: ${t.suggestedAnswer}`)
          .join("\n\n"),
        toolName: "record_ratings",
        toolDescription: "Records a rating and feedback for each interaction.",
        inputSchema: RATING_SCHEMA,
        route: "coach.session.rate",
        userId,
      });

      await Promise.all(
        result.ratings.map((r) =>
          prisma.interactionRecord.update({
            where: { id: r.interactionId },
            data: { rating: Math.round(r.rating), feedback: r.feedback },
          })
        )
      );

      const allRatings = [
        ...session.interactions.filter((i) => i.rating !== null).map((i) => i.rating as number),
        ...result.ratings.map((r) => r.rating),
      ];
      if (allRatings.length > 0) {
        averageScore = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
      }
    } catch (err) {
      console.error("Failed to generate session ratings:", err);
    }
  } else {
    const rated = session.interactions.filter((i) => i.rating !== null).map((i) => i.rating as number);
    if (rated.length > 0) averageScore = rated.reduce((a, b) => a + b, 0) / rated.length;
  }

  await prisma.coachingSession.update({
    where: { id },
    data: { status: "completed", endedAt, durationMinutes, averageScore },
  });

  return withCors(req, NextResponse.json({ success: true }));
}
