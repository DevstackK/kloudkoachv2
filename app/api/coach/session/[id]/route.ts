import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const session = await prisma.coachingSession.findUnique({
    where: { id },
    include: { interactions: { orderBy: { createdAt: "asc" } } },
  });

  if (!session || session.userId !== userId) {
    return NextResponse.json({ success: false, message: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: session.id,
      type: session.type,
      jobRole: session.jobRole,
      status: session.status,
      startedAt: session.startedAt,
      durationMinutes: session.durationMinutes,
      averageScore: session.averageScore,
      interactions: session.interactions.map((i) => ({
        id: i.id,
        questionText: i.questionText,
        suggestedAnswer: i.suggestedAnswer,
        rating: i.rating,
        feedback: i.feedback,
      })),
    },
  });
}
