import { PrismaClient, FeatureType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type SeedFeature = {
  featureCode: string;
  displayName: string;
  limitValue: number;
  unit: string;
  featureType: FeatureType;
};

type SeedPlan = {
  name: string;
  priceMonthly: number;
  priority: number;
  description: string;
  features: SeedFeature[];
};

// AI_MINUTES is one shared pool across every spoken/live coaching feature
// (Live Interview Co-Pilot, Mock Interview, AI Interviewer, Pronunciation
// Practice, Virtual Patient, Meeting Helper) - see lib/planLimits.ts.
const plans: SeedPlan[] = [
  {
    name: "Free",
    priceMonthly: 0,
    priority: 0,
    description: "Try Live Interview and every other feature before you commit.",
    features: [
      { featureCode: "AI_MINUTES", displayName: "AI coaching minutes", limitValue: 15, unit: "minutes/mo", featureType: "TimeBased" },
      { featureCode: "RESUME_BUILDER", displayName: "Resume builder", limitValue: 1, unit: "resumes", featureType: "CountBased" },
      { featureCode: "EXAM_PREP", displayName: "Exam preparation", limitValue: 1, unit: "sessions/mo", featureType: "CountBased" },
    ],
  },
  {
    name: "Starter",
    priceMonthly: 900,
    priority: 1,
    description: "One Live Interview loop, start to offer.",
    features: [
      { featureCode: "AI_MINUTES", displayName: "AI coaching minutes", limitValue: 60, unit: "minutes/mo", featureType: "TimeBased" },
      { featureCode: "RESUME_BUILDER", displayName: "Resume builder", limitValue: 2, unit: "resumes", featureType: "CountBased" },
      { featureCode: "EXAM_PREP", displayName: "Exam preparation", limitValue: 3, unit: "sessions/mo", featureType: "CountBased" },
    ],
  },
  {
    name: "Pro",
    priceMonthly: 2900,
    priority: 3,
    description: "Live Interview coaching for an active search across multiple roles.",
    features: [
      { featureCode: "AI_MINUTES", displayName: "AI coaching minutes", limitValue: 300, unit: "minutes/mo", featureType: "TimeBased" },
      { featureCode: "RESUME_BUILDER", displayName: "Resume builder", limitValue: 10, unit: "resumes", featureType: "CountBased" },
      { featureCode: "EXAM_PREP", displayName: "Exam preparation", limitValue: -1, unit: "sessions/mo", featureType: "CountBased" },
    ],
  },
  {
    name: "Pro+",
    priceMonthly: 7900,
    priority: 2,
    description: "Heavy Live Interview repeat use, coaches, and career switchers.",
    features: [
      { featureCode: "AI_MINUTES", displayName: "AI coaching minutes", limitValue: 1000, unit: "minutes/mo", featureType: "TimeBased" },
      { featureCode: "RESUME_BUILDER", displayName: "Resume builder", limitValue: -1, unit: "resumes", featureType: "CountBased" },
      { featureCode: "EXAM_PREP", displayName: "Exam preparation", limitValue: -1, unit: "sessions/mo", featureType: "CountBased" },
    ],
  },
];

type SeedCreditPack = {
  name: string;
  credits: number;
  priceCents: number;
  priority: number;
};

// 1 credit = 60 min of AI coaching, spent in 30-min blocks - see
// lib/credits.ts. Non-recurring, non-expiring top-up for the AI_MINUTES
// pool once a user's plan minutes for the period run out.
const creditPacks: SeedCreditPack[] = [
  { name: "Basic Pack", credits: 3, priceCents: 2900, priority: 0 },
  { name: "Plus Pack", credits: 8, priceCents: 5900, priority: 1 },
  { name: "Advanced Pack", credits: 15, priceCents: 8900, priority: 2 },
];

async function main() {
  const currentNames = new Set(plans.map((p) => p.name));

  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } });
    const planId = existing
      ? existing.id
      : (
          await prisma.plan.create({
            data: { name: plan.name, description: plan.description, priceMonthly: plan.priceMonthly, priority: plan.priority },
          })
        ).id;

    if (existing) {
      await prisma.plan.update({
        where: { id: planId },
        data: { description: plan.description, priceMonthly: plan.priceMonthly, priority: plan.priority, isActive: true },
      });
      await prisma.planFeature.deleteMany({ where: { planId } });
    }

    await prisma.planFeature.createMany({
      data: plan.features.map((f) => ({ ...f, planId })),
    });

    console.log(`Seeded plan: ${plan.name}`);
  }

  // Deactivate any previously-seeded plan (e.g. the old "Team" tier) that
  // this pricing structure no longer defines, rather than deleting it -
  // existing subscriptions still reference it by id.
  const retired = await prisma.plan.updateMany({
    where: { name: { notIn: [...currentNames] }, isActive: true },
    data: { isActive: false },
  });
  if (retired.count > 0) {
    console.log(`Deactivated ${retired.count} retired plan(s)`);
  }

  const currentPackNames = new Set(creditPacks.map((p) => p.name));

  for (const pack of creditPacks) {
    const existing = await prisma.creditPack.findFirst({ where: { name: pack.name } });
    if (existing) {
      await prisma.creditPack.update({
        where: { id: existing.id },
        data: { credits: pack.credits, priceCents: pack.priceCents, priority: pack.priority, isActive: true },
      });
    } else {
      await prisma.creditPack.create({
        data: { name: pack.name, credits: pack.credits, priceCents: pack.priceCents, priority: pack.priority },
      });
    }
    console.log(`Seeded credit pack: ${pack.name}`);
  }

  const retiredPacks = await prisma.creditPack.updateMany({
    where: { name: { notIn: [...currentPackNames] }, isActive: true },
    data: { isActive: false },
  });
  if (retiredPacks.count > 0) {
    console.log(`Deactivated ${retiredPacks.count} retired credit pack(s)`);
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
