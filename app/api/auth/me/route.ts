import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyAccessToken,
  verifyRefreshToken,
  signAccessToken,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  accessCookieOptions,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  let payload = null;
  const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (accessToken) {
    payload = await verifyAccessToken(accessToken);
  }

  let reissuedAccessToken: string | null = null;
  if (!payload) {
    const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
    if (refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (refreshPayload) {
        payload = refreshPayload;
        reissuedAccessToken = await signAccessToken(refreshPayload);
      }
    }
  }

  if (!payload) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      subscriptions: {
        where: { status: { in: ["active", "incomplete"] } },
        include: { plan: { include: { features: true } }, scheduledPlan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
  }

  const subscription = user.subscriptions[0] ?? null;

  const res = NextResponse.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      planName: subscription?.plan.name ?? "Free",
      status: subscription?.status ?? "active",
      usage: {
        subscriptionStatus: subscription?.status ?? "active",
        planName: subscription?.plan.name ?? "Free",
        features:
          subscription?.plan.features.map((f) => ({
            featureCode: f.featureCode,
            displayName: f.displayName,
            limit: f.limitValue,
            remaining: f.limitValue, // usage tracking wired up in a later phase
            isActive: f.isActive,
          })) ?? [],
      },
    },
  });

  if (reissuedAccessToken) {
    res.cookies.set(ACCESS_COOKIE_NAME, reissuedAccessToken, accessCookieOptions);
  }

  return res;
}
