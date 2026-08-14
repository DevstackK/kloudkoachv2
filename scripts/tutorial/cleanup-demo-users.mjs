// One-off cleanup: removes the throwaway accounts created while recording
// the tutorial video (register flow was exercised against the real DB).
// Run once, then delete this script's usefulness by re-running is a no-op
// since the emails won't match anything left.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const result = await prisma.user.deleteMany({
  where: {
    email: { contains: "tutorial.demo+" },
  },
});
const result2 = await prisma.user.deleteMany({
  where: {
    email: { contains: "tutorial.qa-check+" },
  },
});

console.log("Deleted tutorial.demo users:", result.count);
console.log("Deleted tutorial.qa-check users:", result2.count);

await prisma.$disconnect();
