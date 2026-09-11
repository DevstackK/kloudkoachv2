import { NextRequest, NextResponse } from "next/server";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { verifyCompanionToken } from "@/lib/auth";

/**
 * v3 scaffold: mints a LiveKit participant token scoped to one interview
 * session's room. Reuses the existing companion-pairing token (same trust
 * boundary as app/api/companion/[token]/latest) so both the laptop and the
 * phone companion can join the same LiveKit room as separate participants.
 *
 * identity: "laptop" | "phone-<random>" — caller picks which track it publishes.
 */
export async function POST(req: NextRequest) {
  const { token, identity } = await req.json();

  if (!token || !identity) {
    return NextResponse.json({ success: false, message: "token and identity are required." }, { status: 400 });
  }

  const payload = await verifyCompanionToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, message: "This pairing link has expired." }, { status: 401 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) {
    return NextResponse.json(
      { success: false, message: "LIVEKIT_API_KEY, LIVEKIT_API_SECRET and LIVEKIT_URL must be set." },
      { status: 500 }
    );
  }

  const roomName = `interview-${payload.sessionId}`;

  // Stash the companion token as room metadata so the agent worker (which
  // never sees this HTTP request) can call back into /api/coach/respond
  // with the same Bearer token this browser used to pair. Best-effort:
  // the room may already exist from an earlier participant joining, in
  // which case this just re-affirms the same metadata.
  const roomService = new RoomServiceClient(url.replace(/^ws/, "http"), apiKey, apiSecret);
  try {
    await roomService.createRoom({ name: roomName, metadata: JSON.stringify({ companionToken: token }) });
  } catch {
    // Room already exists - fine, metadata was set by whoever created it first.
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: "10m",
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({
    success: true,
    data: { url, room: roomName, accessToken: await at.toJwt() },
  });
}
