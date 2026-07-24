import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { requireStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  let stripe;
  try {
    stripe = requireStripe();
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 503 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId, cancelAtPeriodEnd: true },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription?.stripeSubscriptionId) {
    return NextResponse.json({ success: false, message: "No pending cancellation to reverse." }, { status: 400 });
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: false });
  await prisma.subscription.update({ where: { id: subscription.id }, data: { cancelAtPeriodEnd: false } });

  return NextResponse.json({ success: true });
}
