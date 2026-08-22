import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { issueOtp } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const limit = rateLimit(`resend-otp:${userId}`, 3, 5 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: "Please wait a bit before requesting another code." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ success: false, message: "Account not found." }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ success: true });

  try {
    await issueOtp(user.id, user.email, user.name);
  } catch (err) {
    console.error("Failed to resend verification email:", err);
    return NextResponse.json({ success: false, message: "Could not send the email. Please try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
