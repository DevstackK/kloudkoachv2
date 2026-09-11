import { NextRequest } from "next/server";
import { verifyAccessToken, verifyCompanionToken, ACCESS_COOKIE_NAME } from "@/lib/auth";

/**
 * Resolves the current user from the httpOnly session cookie (web app).
 */
export async function getCurrentUserId(req: NextRequest): Promise<string | null> {
  const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload?.sub) return payload.sub;
  }

  return null;
}

/**
 * Resolves a companion-token bearer (the short-lived, single-session link
 * opened on a phone via "Continue on Mobile") to the CoachingSession it's
 * scoped to. This token grants no account access, only read/write on the
 * one session it was minted for.
 */
export async function getCompanionSessionId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const payload = await verifyCompanionToken(token);
  return payload?.sessionId ?? null;
}
