import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { generateStructured, CLAUDE_MODEL_SMART } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rateLimit";
import { checkFeatureLimit } from "@/lib/planLimits";
import { withCors, corsPreflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

const schema = z.object({
  // Present when the student uploaded/pasted their own case script - it's
  // stored and used to drive the roleplay, but NEVER echoed back to the
  // client, since it contains the answer key.
  caseText: z.string().min(1).max(8000).optional(),
  caseLabel: z.string().max(120).optional(),
  specialty: z.string().max(100).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return withCors(req, NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 }));

  const limit = rateLimit(`virtual-patient-session:${userId}`, 10, 60_000);
  if (!limit.allowed) {
    return withCors(req, NextResponse.json({ success: false, message: "Too many requests, please wait a moment." }, { status: 429 }));
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return withCors(req, NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 }));
  const { caseText, caseLabel, specialty, difficulty } = parsed.data;

  const featureCheck = await checkFeatureLimit(userId, "MOCK_INTERVIEW");
  if (!featureCheck.allowed) {
    return withCors(req, NextResponse.json({ success: false, message: featureCheck.message }, { status: 403 }));
  }

  let finalCaseText = caseText;
  let finalTitle = caseLabel || "Virtual Patient Case";

  if (!finalCaseText) {
    try {
      const result = await generateStructured<{ caseTitle: string; caseText: string }>({
        system:
          "You write realistic clinical case scripts for a 3rd-year medical student's standardized-patient " +
          "diagnostic-interview practice. The case must include patient demographics, chief complaint, history of " +
          "present illness, relevant past medical/family/social history, and vital signs/exam findings if relevant. " +
          "End the case text with a clearly labeled line 'DIAGNOSIS: <the correct diagnosis>' - this is the answer " +
          "key and will never be shown to the student directly.",
        prompt:
          `Write one clinical case${specialty ? ` in the specialty: ${specialty}` : " (any common specialty)"}, ` +
          `difficulty: ${difficulty}. Also give a short caseTitle safe to show the student before they start - ` +
          "the chief complaint and basic demographics only (e.g. \"52-year-old with shortness of breath\") - it " +
          "must NOT reveal or hint at the diagnosis.",
        toolName: "write_case",
        toolDescription: "Records the generated case.",
        inputSchema: {
          type: "object",
          properties: { caseTitle: { type: "string" }, caseText: { type: "string" } },
          required: ["caseTitle", "caseText"],
        },
        model: CLAUDE_MODEL_SMART,
        maxTokens: 800,
        route: "virtual-patient.generate-case",
        userId,
      });
      finalCaseText = result.caseText;
      finalTitle = result.caseTitle;
    } catch {
      return withCors(req, NextResponse.json({ success: false, message: "Could not generate a case." }, { status: 502 }));
    }
  }

  const session = await prisma.coachingSession.create({
    data: { userId, type: "virtual_patient", jobRole: finalTitle, jobDescription: finalCaseText, status: "in_progress" },
  });

  return withCors(req, NextResponse.json({ success: true, data: { sessionId: session.id, caseTitle: finalTitle } }));
}
