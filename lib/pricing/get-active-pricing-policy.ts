import type { MarketType, PrismaClient, PricingClass } from "@/generated/prisma/client"
import { toPricingPolicyRow } from "./mappers"
import type { PricingPolicyRow } from "./types"

export type PricingPolicyLookupPrisma = Pick<PrismaClient, "pricingPolicy">

export async function getActivePricingPolicy(
  db: PricingPolicyLookupPrisma,
  input: { marketType: MarketType; pricingClass: PricingClass }
): Promise<PricingPolicyRow | null> {
  const row = await db.pricingPolicy.findFirst({
    where: {
      marketType: input.marketType,
      pricingClass: input.pricingClass,
      effectiveTo: null,
    },
    orderBy: { effectiveFrom: "desc" },
  })

  return row ? toPricingPolicyRow(row) : null
}
