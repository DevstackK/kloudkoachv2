import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { generateText, CLAUDE_MODEL_SMART } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  jobDescription: z.string().min(1).max(5000),
  jobRole: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const limit = rateLimit(`resume-tailor:${userId}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: "Too many requests, please wait a moment." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });

  const baseResume = await prisma.resume.findFirst({ where: { userId, isActive: true } });
  if (!baseResume) {
    return NextResponse.json(
      { success: false, message: "Upload a resume first, then tailor it to a specific job." },
      { status: 400 }
    );
  }

  let tailoredText: string;
  try {
    tailoredText = await generateText({
      system:
        "You are an expert resume writer. Rewrite the candidate's resume to align with the target job description - " +
        "reorder and reframe existing experience to emphasize what's most relevant, weave in the job description's " +
        "language and keywords naturally, and tighten the summary to speak directly to this role. " +
        "STRICT RULE: never invent experience, employers, dates, titles, or skills that aren't in the original resume - " +
        "only reframe and re-emphasize what's actually there. Output the full rewritten resume as plain text, " +
        "in the same overall structure (contact info, summary, experience, education, skills), ready to use as-is.",
      prompt: `Job description to tailor for:\n${parsed.data.jobDescription}\n\nOriginal resume:\n${baseResume.rawText.slice(0, 8000)}`,
      model: CLAUDE_MODEL_SMART,
      maxTokens: 3000,
      route: "resume.tailor",
      userId,
    });
  } catch (err) {
    console.error("Resume tailoring failed:", err);
    return NextResponse.json({ success: false, message: "Failed to tailor resume." }, { status: 502 });
  }

  if (!tailoredText.trim()) {
    return NextResponse.json({ success: false, message: "Failed to tailor resume." }, { status: 502 });
  }

  const label = parsed.data.jobRole?.trim() || parsed.data.jobDescription.slice(0, 40).trim();
  const resume = await prisma.$transaction(async (tx) => {
    await tx.resume.updateMany({ where: { userId }, data: { isActive: false } });
    return tx.resume.create({
      data: {
        userId,
        rawText: tailoredText,
        fileName: `Tailored - ${label}`,
        fileType: "text/tailored",
        jobDescription: parsed.data.jobDescription,
        isActive: true,
      },
    });
  });

  return NextResponse.json({ success: true, data: resume });
}
