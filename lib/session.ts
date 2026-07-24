import { NextRequest } from "next/server";
import { verifyAccessToken, ACCESS_COOKIE_NAME } from "@/lib/auth";
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
