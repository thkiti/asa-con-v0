import type { PricingPolicy, SellingPrice } from "@/generated/prisma/client"
import type { PricingPolicyRow, SellingPriceRow } from "./types"

export function toPricingPolicyRow(row: PricingPolicy): PricingPolicyRow {
  return {
    id: row.id,
    marketType: row.marketType,
    pricingClass: row.pricingClass,
    markupPercent: row.markupPercent.toString(),
    roundingMode: row.roundingMode,
    threshold: row.threshold?.toString() ?? null,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export function toSellingPriceRow(row: SellingPrice): SellingPriceRow {
  return {
    id: row.id,
    productId: row.productId,
    price: row.price.toString(),
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}
