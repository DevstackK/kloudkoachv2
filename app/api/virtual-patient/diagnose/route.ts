import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { generateStructured, CLAUDE_MODEL_SMART } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rateLimit";
import { withCors, corsPreflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

const schema = z.object({
  sessionId: z.string().min(1),
  diagnosis: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return withCors(req, NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 }));

  const limit = rateLimit(`virtual-patient-diagnose:${userId}`, 10, 60_000);
  if (!limit.allowed) {
    return withCors(req, NextResponse.json({ success: false, message: "Too many requests, please wait a moment." }, { status: 429 }));
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return withCors(req, NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 }));
  const { sessionId, diagnosis } = parsed.data;

  const [session, priorTurns] = await Promise.all([
    prisma.coachingSession.findUnique({ where: { id: sessionId } }),
    prisma.interactionRecord.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!session || session.userId !== userId || session.type !== "virtual_patient") {
    return withCors(req, NextResponse.json({ success: false, message: "Session not found" }, { status: 404 }));
  }

  const transcript = priorTurns
    .map((t) => `Student asked: ${t.questionText}\nPatient said: ${t.suggestedAnswer ?? ""}`)
    .join("\n\n");

  let result;
  try {
    result = await generateStructured<{ correct: boolean; score: number; feedback: string; revealedDiagnosis: string }>({
      system:
        "You are grading a 3rd-year medical student's diagnostic conclusion in a standardized-patient training " +
        "exercise. Judge whether their proposed diagnosis matches the case's actual diagnosis (accept reasonable " +
        "clinical synonyms/phrasing as correct, not just exact wording). Give a 0-10 score reflecting both " +
        "diagnostic accuracy and how well their questioning during the interview covered the key clues in the " +
        "case. Address the student directly, second person. Always reveal the correct diagnosis clearly at the " +
        "end of your feedback, regardless of whether they got it right.",
      prompt:
        `Case file (with the real diagnosis):\n${session.jobDescription?.slice(0, 4000)}\n\n` +
        `Interview transcript:\n${transcript.slice(0, 4000) || "(the student asked no questions before diagnosing)"}\n\n` +
        `The student's proposed diagnosis: "${diagnosis}"`,
      toolName: "grade_diagnosis",
      toolDescription: "Records the diagnosis assessment.",
      inputSchema: {
        type: "object",
        properties: {
          correct: { type: "boolean" },
          score: { type: "number" },
          feedback: { type: "string" },
          revealedDiagnosis: { type: "string" },
        },
        required: ["correct", "score", "feedback", "revealedDiagnosis"],
      },
      model: CLAUDE_MODEL_SMART,
      maxTokens: 500,
      route: "virtual-patient.diagnose",
      userId,
    });
  } catch {
    return withCors(req, NextResponse.json({ success: false, message: "Could not grade that diagnosis. Please try again." }, { status: 502 }));
  }

  await prisma.interactionRecord.create({
    data: {
      sessionId,
      questionText: "Final diagnosis",
      userAnswerText: diagnosis,
      rating: Math.round(Math.max(0, Math.min(10, result.score))),
      feedback: `${result.feedback}\n\nCorrect diagnosis: ${result.revealedDiagnosis}`,
    },
  });

  return withCors(req, NextResponse.json({ success: true, data: result }));
}
