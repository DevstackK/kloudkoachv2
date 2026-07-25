import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { verifyOtp } from "@/lib/otpService";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({ code: z.string().length(6) });

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const limit = rateLimit(`verify-email:${userId}`, 10, 15 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: "Enter the 6-digit code." }, { status: 400 });

  const result = await verifyOtp(userId, "verify_email", parsed.data.code);
  if (!result.ok) return NextResponse.json({ success: false, message: result.message }, { status: 400 });

  await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });

  return NextResponse.json({ success: true });
}
