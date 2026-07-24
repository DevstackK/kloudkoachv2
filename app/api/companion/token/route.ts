import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { signCompanionToken } from "@/lib/auth";
import { withCors, corsPreflight } from "@/lib/cors";

const schema = z.object({ sessionId: z.string().min(1) });

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return withCors(req, NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 }));

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return withCors(req, NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 }));

  const session = await prisma.coachingSession.findUnique({ where: { id: parsed.data.sessionId } });
  if (!session || session.userId !== userId) {
    return withCors(req, NextResponse.json({ success: false, message: "Session not found" }, { status: 404 }));
  }

  const token = await signCompanionToken(session.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return withCors(req, NextResponse.json({ success: true, data: { token, url: `${appUrl}/companion/${token}` } }));
}
