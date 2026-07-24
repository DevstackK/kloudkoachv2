import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCompanionToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await verifyCompanionToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, message: "This pairing link has expired." }, { status: 401 });
  }

  const [session, latest] = await Promise.all([
    prisma.coachingSession.findUnique({ where: { id: payload.sessionId }, select: { status: true, jobRole: true } }),
    prisma.interactionRecord.findFirst({
      where: { sessionId: payload.sessionId },
      orderBy: { createdAt: "desc" },
      select: { questionText: true, suggestedAnswer: true, createdAt: true },
    }),
  ]);

  if (!session) {
    return NextResponse.json({ success: false, message: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      sessionStatus: session.status,
      jobRole: session.jobRole,
      latest: latest
        ? { question: latest.questionText, answer: latest.suggestedAnswer, at: latest.createdAt }
        : null,
    },
  });
}
