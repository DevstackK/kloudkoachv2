import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, accessCookieOptions, refreshCookieOptions } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rateLimit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // Brute-force protection: cap attempts per email, regardless of source IP.
  const limit = rateLimit(`login:${email.toLowerCase()}`, 10, 5 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ success: false, message: "Invalid email or password." }, { status: 401 });
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
