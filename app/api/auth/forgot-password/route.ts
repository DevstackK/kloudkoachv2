import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const limit = rateLimit(`forgot-password:${getClientIp(req)}`, 10, 15 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always return success (don't leak whether an account exists).
  if (user) {
    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Kloud Koach password",
        text: `Hi ${user.name},\n\nSomeone requested a password reset for your account. Reset it here (expires in 30 minutes):\n${resetUrl}\n\nIf this wasn't you, you can ignore this email - your password won't change.`,
        html: `<p>Hi ${user.name},</p><p>Someone requested a password reset for your account. Reset it here (expires in 30 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If this wasn't you, you can ignore this email - your password won't change.</p>`,
      });
    } catch (err) {
      // Same reasoning as registration's OTP send: don't let a flaky email
      // provider turn into a 500 here, since the response is always the
      // same generic message regardless of outcome (see below).
      console.error("Failed to send password reset email:", err);
    }
  }

  return NextResponse.json({ success: true, message: "If an account exists, a reset link has been sent." });
}
