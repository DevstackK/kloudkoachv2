import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { generateStructured } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rateLimit";

const uploadSchema = z.object({
  rawText: z.string().min(1).max(50_000),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
});

const RESUME_SCHEMA = {
  type: "object",
  properties: {
    personal: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        linkedin: { type: "string" },
        website: { type: "string" },
      },
    },
    summary: { type: "string" },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          position: { type: "string" },
          location: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          current: { type: "boolean" },
          achievements: { type: "array", items: { type: "string" } },
          technologies: { type: "array", items: { type: "string" } },
        },
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          degree: { type: "string" },
          fieldOfStudy: { type: "string" },
          location: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          gpa: { type: "string" },
        },
      },
    },
    skills: {
      type: "object",
      properties: {
        technicalSkills: { type: "array", items: { type: "string" } },
        softSkills: { type: "array", items: { type: "string" } },
        toolsAndTechnologies: { type: "array", items: { type: "string" } },
        languages: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, proficiency: { type: "string" } },
          },
        },
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          date: { type: "string" },
        },
      },
    },
  },
  required: ["personal", "summary", "experience", "education", "skills"],
};

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: resumes });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const limit = rateLimit(`resume-upload:${userId}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: "Too many uploads, please wait a moment." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  }
  const { rawText, fileName, fileType } = parsed.data;

  let structuredData: unknown;
  try {
    structuredData = await generateStructured({
      system:
        "You are a resume-parsing assistant. Extract structured resume data from raw resume text. " +
        "Be faithful to the source text - do not invent experience, dates, or skills that are not present. " +
        "Leave fields empty/omitted if not present in the source.",
      prompt: `Parse the following resume text into structured data:\n\n${rawText}`,
      toolName: "record_resume",
      toolDescription: "Records structured resume data extracted from raw text.",
      inputSchema: RESUME_SCHEMA,
      route: "resume.parse",
      userId,
    });
  } catch (err) {
    console.error("Resume parsing failed:", err);
    return NextResponse.json({ success: false, message: "Failed to parse resume." }, { status: 502 });
  }

  const resume = await prisma.$transaction(async (tx) => {
    await tx.resume.updateMany({ where: { userId }, data: { isActive: false } });
    return tx.resume.create({
      data: {
        userId,
        rawText,
        fileName,
        fileType,
        structuredData: structuredData as object,
        isActive: true,
      },
    });
  });

  return NextResponse.json({ success: true, data: resume });
}
