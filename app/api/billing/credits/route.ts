import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { getAIMinutesBreakdown } from "@/lib/planLimits";
import { unitsToCredits } from "@/lib/credits";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const breakdown = await getAIMinutesBreakdown(userId);

  return NextResponse.json({
    success: true,
    data: {
      credits: unitsToCredits(breakdown.creditUnits),
      creditMinutes: breakdown.creditMinutes,
    },
  });
}
