import { prisma } from "@/lib/prisma";
import { checkFeatureLimit } from "@/lib/planLimits";

// Applies to every session type that draws from the AI_MINUTES pool (see
// lib/planLimits.ts) - independent of plan, so one sitting can't monopolize
// a whole month's balance (or run forever unnoticed, since only *completed*
// sessions are ever charged - see the finalize-on-cutoff below).
export const HARD_SESSION_CAP_MINUTES = 60;

export type SessionCutoffCheck = { cutoff: boolean; message: string | null };

type CutoffSession = { id: string; userId: string; startedAt: Date; status: string };

/**
 * Call on every turn of a live/practice session. If the session has run
 * past the hard per-session cap, or has burned through the user's
 * remaining monthly AI_MINUTES balance, finalizes it the same way
 * /api/coach/session/[id]/stop does (status, endedAt, durationMinutes) and
 * reports back so the route can stop the turn. Without this, a session
 * that's never explicitly stopped never gets charged at all - checked here
 * rather than only at session start so a session can't out-run its own
 * budget mid-conversation.
 */
export async function enforceSessionCutoff(session: CutoffSession): Promise<SessionCutoffCheck> {
  // Already finalized - whether by a normal stop or a previous cutoff, no
  // further turns are allowed either way. Deliberately NOT "no cutoff":
  // returning that here would let a turn on an already-completed session
  // fall through to the caller's happy path and reach the Claude call.
  if (session.status !== "in_progress") return { cutoff: true, message: "This session has already ended." };

  const elapsedMinutes = (Date.now() - session.startedAt.getTime()) / 60_000;
  const hitHardCap = elapsedMinutes >= HARD_SESSION_CAP_MINUTES;

  let hitBalance = false;
  if (!hitHardCap) {
    const { remaining } = await checkFeatureLimit(session.userId, "AI_MINUTES");
    hitBalance = remaining !== -1 && remaining - elapsedMinutes <= 0;
  }

  if (!hitHardCap && !hitBalance) return { cutoff: false, message: null };

  await prisma.coachingSession.update({
    where: { id: session.id },
    data: { status: "completed", endedAt: new Date(), durationMinutes: Math.max(1, Math.round(elapsedMinutes)) },
  });

  return {
    cutoff: true,
    message: hitBalance
      ? "You've used up your plan's AI coaching minutes for this month. Upgrade to continue."
      : `This session reached its ${HARD_SESSION_CAP_MINUTES}-minute limit and has ended.`,
  };
}
