import { NextRequest } from "next/server";
import { verifyAccessToken, verifyCompanionToken, ACCESS_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Resolves the current user from either an httpOnly session cookie (web app)
 * or an `Authorization: Bearer <deviceToken>` header (Chrome extension /
 * phone companion - contexts that can't rely on our cookies since they're a
 * different origin).
 */
export async function getCurrentUserId(req: NextRequest): Promise<string | null> {
  const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload?.sub) return payload.sub;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const deviceToken = authHeader.slice("Bearer ".length).trim();
    if (!deviceToken) return null;

    const device = await prisma.extensionDevice.findUnique({ where: { deviceToken } });
    if (!device) return null;

    prisma.extensionDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
    return device.userId;
  }

  return null;
}

/**
 * Resolves a companion-token bearer (the short-lived, single-session link
 * opened on a phone via "Continue on Mobile") to the CoachingSession it's
 * scoped to. Distinct from getCurrentUserId's device-token Bearer path -
 * this token grants no account access, only read/write on the one session
 * it was minted for.
 */
export async function getCompanionSessionId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const payload = await verifyCompanionToken(token);
  return payload?.sessionId ?? null;
}
