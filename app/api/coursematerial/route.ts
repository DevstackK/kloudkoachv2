import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const putSchema = z.object({ text: z.string().min(1) });

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const material = await prisma.courseMaterial.findUnique({ where: { userId } });
  return NextResponse.json({ success: true, data: material });
}

export async function PUT(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  }

  const material = await prisma.courseMaterial.upsert({
    where: { userId },
    update: { text: parsed.data.text },
    create: { userId, text: parsed.data.text },
  });

  return NextResponse.json({ success: true, data: material });
}
