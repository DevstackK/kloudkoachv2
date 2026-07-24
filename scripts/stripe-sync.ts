/**
 * Syncs local Plan rows to Stripe Products/Prices and stores the resulting
 * stripePriceId back on each Plan. Safe to re-run - skips plans that already
 * have a stripePriceId, and skips $0 plans entirely (no Stripe object needed
 * for a free tier since checkout is never invoked for it).
 *
 * Usage: npm run stripe:sync   (requires STRIPE_SECRET_KEY in .env)
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Stripe from "stripe";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("STRIPE_SECRET_KEY is not set in .env - nothing to sync.");
    process.exit(1);
  }
  const stripe = new Stripe(key);

  const plans = await prisma.plan.findMany({ where: { isActive: true } });

  for (const plan of plans) {
    if (plan.priceMonthly === 0) {
      console.log(`Skipping "${plan.name}" (free plan, no Stripe object needed).`);
      continue;
    }
    if (plan.stripePriceId) {
      console.log(`Skipping "${plan.name}" (already synced: ${plan.stripePriceId}).`);
      continue;
    }

    const product = await stripe.products.create({
      name: `Kloud Koach — ${plan.name}`,
      metadata: { planId: plan.id },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceMonthly,
      currency: "usd",
      recurring: { interval: "month" },
    });

    await prisma.plan.update({ where: { id: plan.id }, data: { stripePriceId: price.id } });
    console.log(`Synced "${plan.name}" -> ${price.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
