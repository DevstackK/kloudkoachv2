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

  // Two different things can land here: a coach-SUGGESTED answer (live/mock
  // coaching - "was this a good answer to hand the candidate") or the AI
  // Interviewer's actual transcribed CANDIDATE answer ("how did the
  // candidate do"). Both get scored the same way, just described
  // accurately in the prompt so Claude evaluates from the right angle.
  const unratedTurns = session.interactions.filter((i) => i.rating === null && (i.suggestedAnswer || i.userAnswerText));
  if (unratedTurns.length > 0) {
    try {
      const result = await generateStructured<{ ratings: { interactionId: string; rating: number; feedback: string }[] }>({
        system:
          "You are an interview coaching evaluator. For each item, rate the answer on a 0-10 scale with brief, " +
          "constructive feedback. Some items are answers a coach SUGGESTED to the candidate (rate how strong the " +
          "suggestion was); others are the CANDIDATE'S OWN real spoken answer in a mock interview (rate how well " +
          "they answered, and address the feedback directly to them, second person)." +
          (session.answerStyle === "bullets"
            ? " Write each feedback as 2-3 short bullet points (start each with \"- \") instead of prose sentences."
            : ""),
        prompt: unratedTurns
          .map((t) =>
            t.suggestedAnswer
              ? `Interaction ${t.id}\nQuestion: ${t.questionText}\nSuggested answer: ${t.suggestedAnswer}`
              : `Interaction ${t.id}\nInterviewer's question: ${t.questionText}\nCandidate's actual answer: ${t.userAnswerText}`
          )
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
