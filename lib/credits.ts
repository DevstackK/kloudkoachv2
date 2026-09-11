import { prisma } from "@/lib/prisma";

// 1 unit = 0.5 credit = 30 minutes of AI coaching, matching the 30-min
// billing increments credit packs advertise (0.5 credit for 1-30 min, 1.0
// credit for 30-60 min, +0.5 credit per 30 min chunk beyond that).
export const CREDIT_UNIT_MINUTES = 30;

export function unitsToCredits(units: number): number {
  return units / 2;
}

export function creditsToUnits(credits: number): number {
  return Math.round(credits * 2);
}

export async function getCreditBalanceUnits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { creditBalanceUnits: true } });
  return user?.creditBalanceUnits ?? 0;
}

/**
 * Deducts credits for the portion of a just-finished AI_MINUTES session
 * that exceeded the user's plan allowance, rounding up to the nearest
 * 30-min block. `planRemainingMinutes` must be the plan's remaining
 * balance measured BEFORE this session's own duration was recorded (-1
 * means an unlimited plan, which never draws on credits). Never deducts
 * more than the user's actual balance - gating in lib/planLimits.ts is
 * meant to prevent that, but this stays safe either way.
 */
export async function settleSessionCredits(
  userId: string,
  sessionId: string,
  durationMinutes: number,
  planRemainingMinutes: number
): Promise<void> {
  if (planRemainingMinutes === -1) return;

  const overageMinutes = Math.max(0, durationMinutes - Math.max(0, planRemainingMinutes));
  if (overageMinutes <= 0) return;

  const unitsNeeded = Math.ceil(overageMinutes / CREDIT_UNIT_MINUTES);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { creditBalanceUnits: true } });
    const unitsToDeduct = Math.min(unitsNeeded, user?.creditBalanceUnits ?? 0);
    if (unitsToDeduct <= 0) return;

    await tx.user.update({ where: { id: userId }, data: { creditBalanceUnits: { decrement: unitsToDeduct } } });
    await tx.creditTransaction.create({
      data: { userId, units: -unitsToDeduct, reason: "session_usage", coachingSessionId: sessionId },
    });
  });
}

/**
 * Grants credits from a completed one-time Stripe Checkout purchase.
 * Idempotent via the unique stripeCheckoutSessionId constraint on
 * CreditTransaction - a redelivered webhook event is a harmless no-op.
 */
export async function grantCreditsFromPurchase(params: {
  userId: string;
  units: number;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
}): Promise<void> {
  const { userId, units, stripeCheckoutSessionId, stripePaymentIntentId } = params;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.creditTransaction.findUnique({ where: { stripeCheckoutSessionId } });
    if (existing) return;

    await tx.user.update({ where: { id: userId }, data: { creditBalanceUnits: { increment: units } } });
    await tx.creditTransaction.create({
      data: {
        userId,
        units,
        reason: "purchase",
        stripeCheckoutSessionId,
        stripePaymentIntentId: stripePaymentIntentId ?? null,
      },
    });
  });
}
