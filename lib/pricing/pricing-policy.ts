import type { PrismaClient } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { toPricingPolicyRow } from "./mappers"
import type { CreatePricingPolicyInput } from "./parse-mutations"
import type { PricingPolicyRow } from "./types"

export type PricingPolicyPrisma = Pick<
  PrismaClient,
  "pricingPolicy" | "$transaction"
>

export async function listPricingPolicies(
  db: PricingPolicyPrisma
): Promise<PricingPolicyRow[]> {
  const rows = await db.pricingPolicy.findMany({
    orderBy: [{ marketType: "asc" }, { pricingClass: "asc" }, { effectiveFrom: "desc" }],
  })
  return rows.map(toPricingPolicyRow)
}

export async function createPricingPolicy(
  db: PricingPolicyPrisma,
  input: CreatePricingPolicyInput
): Promise<PricingPolicyRow> {
  const now = new Date()

  const created = await db.$transaction(async (tx) => {
    await tx.pricingPolicy.updateMany({
      where: {
        marketType: input.marketType,
        pricingClass: input.pricingClass,
        effectiveTo: null,
      },
      data: { effectiveTo: now },
    })

    return tx.pricingPolicy.create({
      data: {
        marketType: input.marketType,
        pricingClass: input.pricingClass,
        markupPercent: new Prisma.Decimal(input.markupPercent),
        roundingMode: input.roundingMode,
        threshold:
          input.threshold != null ? new Prisma.Decimal(input.threshold) : null,
        effectiveFrom: now,
      },
    })
  })

  return toPricingPolicyRow(created)
}
