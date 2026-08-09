import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import { synthesizeSpeech } from "@/lib/elevenlabs";
import { rateLimit } from "@/lib/rateLimit";
import { withCors, corsPreflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

const schema = z.object({ text: z.string().min(1).max(1000) });

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return withCors(req, NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 }));

  // TTS calls cost real money per character - cap generously above what a
  // real interview needs (one call per question, a handful of questions
  // per session) so a stuck client can't run up cost.
  const limit = rateLimit(`interviewer-speak:${userId}`, 20, 60_000);
  if (!limit.allowed) {
    return withCors(req, NextResponse.json({ success: false, message: "Too many requests, please wait a moment." }, { status: 429 }));
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return withCors(req, NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 }));

  try {
    const audio = await synthesizeSpeech(parsed.data.text);
    const res = new NextResponse(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
    return withCors(req, res);
  } catch (err) {
    console.error("ElevenLabs synthesis failed:", err);
    return withCors(req, NextResponse.json({ success: false, message: (err as Error).message }, { status: 503 }));
  }
}
