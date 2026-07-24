import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { requireStripe } from "@/lib/stripe";

const schema = z.object({ planId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });

  let stripe;
  try {
    stripe = requireStripe();
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 503 });
  }

  const [targetPlan, currentSubscription] = await Promise.all([
    prisma.plan.findUnique({ where: { id: parsed.data.planId } }),
    prisma.subscription.findFirst({
      where: { userId, status: { in: ["active", "past_due"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!targetPlan?.stripePriceId) {
    return NextResponse.json({ success: false, message: "Target plan is not synced to Stripe yet." }, { status: 503 });
  }

  if (!currentSubscription?.stripeSubscriptionId) {
    return NextResponse.json(
      { success: false, message: "No active paid subscription to change. Use checkout to start one." },
      { status: 400 }
    );
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripeSubscriptionId);
  const itemId = stripeSubscription.items.data[0]?.id;
  if (!itemId) {
    return NextResponse.json({ success: false, message: "Could not find subscription item to update." }, { status: 500 });
  }

  const updated = await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
    items: [{ id: itemId, price: targetPlan.stripePriceId }],
    proration_behavior: "create_prorations",
  });

  await prisma.subscription.update({
    where: { id: currentSubscription.id },
    data: {
      planId: targetPlan.id,
      status: updated.status === "active" ? "active" : "incomplete",
    },
  });

  return NextResponse.json({ success: true, data: { planId: targetPlan.id } });
}
