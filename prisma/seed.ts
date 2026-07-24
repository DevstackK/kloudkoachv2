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
  features: SeedFeature[];
};

const plans: SeedPlan[] = [
  {
    name: "Free",
    priceMonthly: 0,
    priority: 0,
    features: [
      { featureCode: "MOCK_INTERVIEW", displayName: "Mock interview sessions", limitValue: 2, unit: "sessions/mo", featureType: "CountBased" },
      { featureCode: "LIVE_INTERVIEW", displayName: "Live interview co-pilot", limitValue: 0, unit: "minutes/mo", featureType: "TimeBased" },
      { featureCode: "RESUME_BUILDER", displayName: "Resume builder", limitValue: 1, unit: "resumes", featureType: "CountBased" },
      { featureCode: "EXAM_PREP", displayName: "Exam preparation", limitValue: 1, unit: "sessions/mo", featureType: "CountBased" },
    ],
  },
  {
    name: "Pro",
    priceMonthly: 2900,
    priority: 2,
    features: [
      { featureCode: "MOCK_INTERVIEW", displayName: "Mock interview sessions", limitValue: -1, unit: "sessions/mo", featureType: "CountBased" },
      { featureCode: "LIVE_INTERVIEW", displayName: "Live interview co-pilot", limitValue: 300, unit: "minutes/mo", featureType: "TimeBased" },
      { featureCode: "RESUME_BUILDER", displayName: "Resume builder", limitValue: 10, unit: "resumes", featureType: "CountBased" },
      { featureCode: "EXAM_PREP", displayName: "Exam preparation", limitValue: -1, unit: "sessions/mo", featureType: "CountBased" },
    ],
  },
  {
    name: "Team",
    priceMonthly: 7900,
    priority: 1,
    features: [
      { featureCode: "MOCK_INTERVIEW", displayName: "Mock interview sessions", limitValue: -1, unit: "sessions/mo", featureType: "CountBased" },
      { featureCode: "LIVE_INTERVIEW", displayName: "Live interview co-pilot", limitValue: -1, unit: "minutes/mo", featureType: "TimeBased" },
      { featureCode: "RESUME_BUILDER", displayName: "Resume builder", limitValue: -1, unit: "resumes", featureType: "CountBased" },
      { featureCode: "EXAM_PREP", displayName: "Exam preparation", limitValue: -1, unit: "sessions/mo", featureType: "CountBased" },
    ],
  },
];

async function main() {
  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } });
    const planId = existing
      ? existing.id
      : (await prisma.plan.create({ data: { name: plan.name, priceMonthly: plan.priceMonthly, priority: plan.priority } })).id;

    if (existing) {
      await prisma.plan.update({
        where: { id: planId },
        data: { priceMonthly: plan.priceMonthly, priority: plan.priority, isActive: true },
      });
      await prisma.planFeature.deleteMany({ where: { planId } });
    }

    await prisma.planFeature.createMany({
      data: plan.features.map((f) => ({ ...f, planId })),
    });

    console.log(`Seeded plan: ${plan.name}`);
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
