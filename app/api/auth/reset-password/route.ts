import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { verifyOtp } from "@/lib/otpService";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  const limit = rateLimit(`reset-password:${getClientIp(req)}`, 10, 15 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  }

  const { email, code, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Same generic message as an invalid code - don't leak account existence.
    return NextResponse.json({ success: false, message: "Invalid or expired code." }, { status: 400 });
  }

  const result = await verifyOtp(user.id, "reset_password", code);
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.message }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return NextResponse.json({ success: true, message: "Password updated. You can now log in." });
}
