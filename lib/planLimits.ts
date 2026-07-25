import { prisma } from "@/lib/prisma";

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // rolling 30-day window, matches the "/mo" unit shown in plan features

export type FeatureCode = "MOCK_INTERVIEW" | "LIVE_INTERVIEW";

export type FeatureLimitCheck = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  message: string | null;
};

async function getUsed(userId: string, featureCode: FeatureCode, periodStart: Date): Promise<number> {
  if (featureCode === "LIVE_INTERVIEW") {
    // TimeBased - measured in minutes actually spent in completed live sessions.
    const agg = await prisma.coachingSession.aggregate({
      where: { userId, type: "live_interview", status: "completed", startedAt: { gte: periodStart } },
      _sum: { durationMinutes: true },
    });
    return agg._sum.durationMinutes ?? 0;
  }

  // MOCK_INTERVIEW - CountBased, one unit per session started (matches the
  // "sessions/mo" unit regardless of whether the user finished it).
  return prisma.coachingSession.count({
    where: { userId, type: "mock_interview", startedAt: { gte: periodStart } },
  });
}

/**
 * Checks a user's current plan limit for a coaching-session feature.
 * Free-tier users get an active Subscription at registration, so a missing
 * subscription/feature row means the feature isn't on any plan they've ever
 * had - treated as not allowed rather than unlimited.
 */
export async function checkFeatureLimit(userId: string, featureCode: FeatureCode): Promise<FeatureLimitCheck> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "incomplete"] } },
    include: { plan: { include: { features: true } } },
    orderBy: { createdAt: "desc" },
  });

  const feature = subscription?.plan.features.find((f) => f.featureCode === featureCode);

  if (!feature || !feature.isActive) {
    return { allowed: false, limit: 0, used: 0, remaining: 0, message: "This feature isn't included in your current plan." };
  }

  if (feature.limitValue === -1) {
    return { allowed: true, limit: -1, used: 0, remaining: -1, message: null };
  }

  const periodStart = new Date(Date.now() - PERIOD_MS);
  const used = await getUsed(userId, featureCode, periodStart);
  const remaining = Math.max(feature.limitValue - used, 0);

  return {
    allowed: remaining > 0,
    limit: feature.limitValue,
    used,
    remaining,
    message: remaining > 0 ? null : "You've reached your plan's limit for this feature. Upgrade to continue.",
  };
}
