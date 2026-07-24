import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { generateStructured } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rateLimit";

const setupSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  courseMaterial: z.string().max(50_000).optional(),
});

const EXAM_SCHEMA = {
  type: "object",
  properties: {
    examTitle: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          type: { type: "string", enum: ["multiple_choice", "open_ended"] },
          options: { type: "array", items: { type: "string" } },
          correctAnswer: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["question", "type"],
      },
    },
  },
  required: ["examTitle", "questions"],
};

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const limit = rateLimit(`exam-prep:${userId}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: "Too many requests, please wait a moment." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  }
  const { subject, description, courseMaterial } = parsed.data;

  let examData: { examTitle: string; questions: unknown[] };
  try {
    examData = await generateStructured({
      system:
        "You are an exam-preparation assistant. Generate a focused practice exam (8-12 questions) " +
        "mixing multiple-choice and open-ended questions, calibrated to the subject and description given. " +
        "If course material is provided, ground questions in it.",
      prompt: [
        `Subject: ${subject}`,
        `Description: ${description}`,
        courseMaterial ? `Course material:\n${courseMaterial}` : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      toolName: "record_exam",
      toolDescription: "Records a generated practice exam with title and questions.",
      inputSchema: EXAM_SCHEMA,
      route: "exam-prep.generate",
      userId,
    });
  } catch (err) {
    console.error("Exam generation failed:", err);
    return NextResponse.json({ success: false, message: "Failed to generate exam." }, { status: 502 });
  }

  const session = await prisma.coachingSession.create({
    data: {
      userId,
      type: "exam_prep",
      jobRole: subject,
      jobDescription: description,
      status: "in_progress",
    },
  });

  return NextResponse.json({ success: true, data: { sessionId: session.id, ...examData } });
}
