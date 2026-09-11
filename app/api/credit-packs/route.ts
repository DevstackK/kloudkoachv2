import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const packs = await prisma.creditPack.findMany({
    where: { isActive: true },
    orderBy: { priceCents: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: packs.map((pack) => ({
      creditPackId: pack.id,
      name: pack.name,
      credits: pack.credits,
      price: pack.priceCents / 100,
      pricePerCredit: pack.priceCents / 100 / pack.credits,
    })),
  });
}
