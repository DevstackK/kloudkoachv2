import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { issueOtp } from "@/lib/otpService";

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
    await issueOtp(user.id, user.email, "reset_password");
  }

  return NextResponse.json({ success: true, message: "If an account exists, a code has been sent." });
}
