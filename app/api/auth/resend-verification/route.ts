import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { issueOtp } from "@/lib/otpService";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const limit = rateLimit(`resend-verification:${userId}`, 3, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: "Please wait before requesting another code." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
  if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ success: false, message: "Email already verified." }, { status: 400 });

  await issueOtp(userId, user.email, "verify_email");
  return NextResponse.json({ success: true, message: "Verification code sent." });
}
