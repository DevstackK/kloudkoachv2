import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { getDeepgramClientKey } from "@/lib/deepgram";
import { rateLimit } from "@/lib/rateLimit";
import { withCors, corsPreflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return withCors(req, NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 }));

  const limit = rateLimit(`deepgram-token:${userId}`, 10, 60_000);
  if (!limit.allowed) {
    return withCors(req, NextResponse.json({ success: false, message: "Too many requests, please wait a moment." }, { status: 429 }));
  }

  try {
    const { key, expiresInSeconds } = await getDeepgramClientKey();
    return withCors(req, NextResponse.json({ success: true, data: { key, expiresInSeconds } }));
  } catch (err) {
    console.error("Deepgram token mint failed:", err);
    return withCors(req, NextResponse.json({ success: false, message: (err as Error).message }, { status: 503 }));
  }
}
