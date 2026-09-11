import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { requireStripe } from "@/lib/stripe";

const schema = z.object({ creditPackId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  }

  let stripe;
  try {
    stripe = requireStripe();
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 503 });
  }

  const [user, pack] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.creditPack.findUnique({ where: { id: parsed.data.creditPackId } }),
  ]);

  if (!user || !pack || !pack.isActive) {
    return NextResponse.json({ success: false, message: "User or credit pack not found" }, { status: 404 });
  }
  if (!pack.stripePriceId) {
    return NextResponse.json(
      { success: false, message: "This credit pack is not yet synced to Stripe. Run the stripe:sync script first." },
      { status: 503 }
    );
  }

  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
    stripeCustomerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    line_items: [{ price: pack.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/upgrade?credits=success`,
    cancel_url: `${appUrl}/dashboard/upgrade?credits=cancelled`,
    metadata: { userId: user.id, creditPackId: pack.id, type: "credit_pack" },
  });

  return NextResponse.json({ success: true, data: { url: session.url } });
}
