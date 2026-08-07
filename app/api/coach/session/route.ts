import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { withCors, corsPreflight } from "@/lib/cors";
import { checkFeatureLimit, type FeatureCode } from "@/lib/planLimits";

const featureCodeForType: Record<"live_interview" | "mock_interview", FeatureCode> = {
  live_interview: "LIVE_INTERVIEW",
  mock_interview: "MOCK_INTERVIEW",
};

const schema = z.object({
  type: z.enum(["live_interview", "mock_interview"]),
  jobRole: z.string().min(1),
  jobDescription: z.string().optional(),
  answerStyle: z.enum(["prose", "bullets"]).optional(),
});

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return withCors(req, NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 }));

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return withCors(req, NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 }));

  const featureCheck = await checkFeatureLimit(userId, featureCodeForType[parsed.data.type]);
  if (!featureCheck.allowed) {
    return withCors(req, NextResponse.json({ success: false, message: featureCheck.message }, { status: 403 }));
  }

  const session = await prisma.coachingSession.create({
    data: {
      userId,
      type: parsed.data.type,
      jobRole: parsed.data.jobRole,
      jobDescription: parsed.data.jobDescription,
      answerStyle: parsed.data.answerStyle ?? "prose",
      status: "in_progress",
    },
  });

  return withCors(req, NextResponse.json({ success: true, data: { sessionId: session.id } }));
}
