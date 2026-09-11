import { prisma } from "@/lib/prisma";
import { CREDIT_UNIT_MINUTES, getCreditBalanceUnits } from "@/lib/credits";

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // rolling 30-day window, matches the "/mo" unit shown in plan features

export type FeatureCode = "AI_MINUTES" | "RESUME_BUILDER" | "EXAM_PREP";

// Every spoken/live coaching feature shares one minute pool - they're all
// the same "AI listens and responds in real time" shape, just wearing
// different UI. Exam Prep is a single generation call (no live duration),
// so it stays its own count-based quota rather than joining this pool.
export const AI_MINUTE_SESSION_TYPES = [
  "live_interview",
  "mock_interview",
  "ai_interview",
  "pronunciation_practice",
  "virtual_patient",
  "meeting_helper",
] as const;

export type FeatureLimitCheck = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  message: string | null;
};

async function getUsed(userId: string, featureCode: FeatureCode, periodStart: Date): Promise<number> {
  if (featureCode === "AI_MINUTES") {
    const agg = await prisma.coachingSession.aggregate({
      where: { userId, type: { in: [...AI_MINUTE_SESSION_TYPES] }, status: "completed", startedAt: { gte: periodStart } },
      _sum: { durationMinutes: true },
    });
    return agg._sum.durationMinutes ?? 0;
  }

  if (featureCode === "EXAM_PREP") {
    return prisma.coachingSession.count({ where: { userId, type: "exam_prep", startedAt: { gte: periodStart } } });
  }

  // RESUME_BUILDER - resumes are stored, not consumed monthly, so this is a
  // running total rather than a rolling-window count (periodStart unused).
  return prisma.resume.count({ where: { userId } });
}

/**
 * Checks a user's current plan limit for a metered feature.
 * Free-tier users get an active Subscription at registration, so a missing
 * subscription/feature row means the feature isn't on any plan they've ever
 * had - treated as not allowed rather than unlimited.
 */
export async function checkFeatureLimit(userId: string, featureCode: FeatureCode): Promise<FeatureLimitCheck> {
  // AI_MINUTES also draws on the user's purchased credit balance once the
  // plan's rolling monthly pool runs out - see getAIMinutesBreakdown.
  if (featureCode === "AI_MINUTES") {
    const breakdown = await getAIMinutesBreakdown(userId);
    return {
      allowed: breakdown.totalRemaining === -1 || breakdown.totalRemaining > 0,
      limit: breakdown.limit,
      used: breakdown.used,
      remaining: breakdown.totalRemaining,
      message:
        breakdown.totalRemaining === -1 || breakdown.totalRemaining > 0
          ? null
          : "You've used up your plan's AI coaching minutes and credit balance. Buy credits or upgrade to continue.",
    };
  }

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

export type AIMinutesBreakdown = {
  limit: number; // plan's monthly minute limit, -1 = unlimited
  used: number; // minutes used this rolling period, against `limit` only
  planRemaining: number; // plan minutes left this period, -1 = unlimited (ignores credits)
  creditUnits: number; // purchased credit balance, in 30-min units
  creditMinutes: number;
  totalRemaining: number; // planRemaining + creditMinutes, -1 = unlimited
};

/**
 * Breaks down a user's AI_MINUTES headroom into plan allowance vs. purchased
 * credit balance, so session-start gating and end-of-session credit
 * settlement (lib/credits.ts) can both see plan and credit minutes
 * separately instead of one merged number.
 */
export async function getAIMinutesBreakdown(userId: string): Promise<AIMinutesBreakdown> {
  const creditUnits = await getCreditBalanceUnits(userId);
  const creditMinutes = creditUnits * CREDIT_UNIT_MINUTES;

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "incomplete"] } },
    include: { plan: { include: { features: true } } },
    orderBy: { createdAt: "desc" },
  });
  const feature = subscription?.plan.features.find((f) => f.featureCode === "AI_MINUTES");

  if (!feature || !feature.isActive) {
    return { limit: 0, used: 0, planRemaining: 0, creditUnits, creditMinutes, totalRemaining: creditMinutes };
  }

  if (feature.limitValue === -1) {
    return { limit: -1, used: 0, planRemaining: -1, creditUnits, creditMinutes: 0, totalRemaining: -1 };
  }

  const periodStart = new Date(Date.now() - PERIOD_MS);
  const used = await getUsed(userId, "AI_MINUTES", periodStart);
  const planRemaining = Math.max(feature.limitValue - used, 0);

  return {
    limit: feature.limitValue,
    used,
    planRemaining,
    creditUnits,
    creditMinutes,
    totalRemaining: planRemaining + creditMinutes,
  };
}
