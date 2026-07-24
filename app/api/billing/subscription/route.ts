import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "incomplete", "past_due"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: subscription
      ? {
          planId: subscription.planId,
          planName: subscription.plan.name,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          currentPeriodEnd: subscription.currentPeriodEnd,
          hasStripeSubscription: !!subscription.stripeSubscriptionId,
        }
      : null,
  });
}
