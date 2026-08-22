import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { verifyOtp } from "@/lib/otp";

const schema = z.object({ code: z.string().length(6) });

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  // The stored otpAttempts counter is the real, persistent guard - this is
  // just a light throttle on top, same pattern as the other auth routes.
  const limit = rateLimit(`verify-email:${userId}`, 10, 5 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Enter the 6-digit code." }, { status: 400 });
  }

  const result = await verifyOtp(userId, parsed.data.code);
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
