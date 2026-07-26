import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, accessCookieOptions, refreshCookieOptions } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  const limit = rateLimit(`register:${getClientIp(req)}`, 10, 60 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: "Too many signups from this network. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ success: false, message: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });

  const freePlan = await prisma.plan.findFirst({ where: { name: "Free" } });
  if (freePlan) {
    await prisma.subscription.create({
      data: { userId: user.id, planId: freePlan.id, status: "active" },
    });
  }

  const accessToken = await signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = await signRefreshToken({ sub: user.id, email: user.email });

  const res = NextResponse.json({
    success: true,
    data: { id: user.id, name: user.name, email: user.email },
  });
  res.cookies.set(ACCESS_COOKIE_NAME, accessToken, accessCookieOptions);
  res.cookies.set(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return res;
}
