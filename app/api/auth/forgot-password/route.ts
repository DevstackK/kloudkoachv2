import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

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

    // TODO(phase 2+): send this via a transactional email provider (e.g. Resend).
    // Logged for local development until an email provider is wired up.
    console.log(`[dev] Password reset link for ${user.email}: /reset-password?token=${resetToken}`);
  }

  return NextResponse.json({ success: true, message: "If an account exists, a reset link has been sent." });
}
