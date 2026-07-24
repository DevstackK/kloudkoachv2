import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const sessions = await prisma.coachingSession.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      type: true,
      jobRole: true,
      status: true,
      startedAt: true,
      durationMinutes: true,
      averageScore: true,
    },
  });

  return NextResponse.json({ success: true, data: sessions });
}
