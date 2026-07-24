import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    include: { features: { where: { isActive: true } } },
    orderBy: { priceMonthly: "asc" },
  });

  const topPriority = Math.max(0, ...plans.map((p) => p.priority));

  return NextResponse.json({
    success: true,
    data: plans.map((plan) => ({
      subscriptionPlanId: plan.id,
      name: plan.name,
      price: plan.priceMonthly / 100,
      billingCycle: "monthly",
      description: `${plan.name} plan`,
      priority: plan.priority,
      isPopular: plan.priority === topPriority && topPriority > 0,
      isActive: plan.isActive,
      features: plan.features.map((f) => ({
        displayName: f.displayName,
        isActive: f.isActive,
        limitValue: f.limitValue,
        unit: f.unit,
        featureType: f.featureType,
      })),
    })),
  });
}
