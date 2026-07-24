import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const deviceToken = randomBytes(24).toString("base64url");

  const device = await prisma.extensionDevice.create({
    data: { userId, deviceToken, label: "Chrome Extension" },
  });

  return NextResponse.json({ success: true, data: { deviceToken, deviceId: device.id } });
}

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const devices = await prisma.extensionDevice.findMany({
    where: { userId },
    select: { id: true, label: true, lastSeenAt: true, createdAt: true },
    orderBy: { lastSeenAt: "desc" },
  });

  return NextResponse.json({ success: true, data: devices });
}
