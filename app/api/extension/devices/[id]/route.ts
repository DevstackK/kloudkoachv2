import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const device = await prisma.extensionDevice.findUnique({ where: { id } });
  if (!device || device.userId !== userId) {
    return NextResponse.json({ success: false, message: "Device not found" }, { status: 404 });
  }

  await prisma.extensionDevice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
