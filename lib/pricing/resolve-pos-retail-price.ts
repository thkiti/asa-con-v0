import type { PrismaClient } from "@/generated/prisma/client"
import { getActiveSellingPrice } from "./selling-price"
import type { ResolvedRetailPrice } from "./types"

export type ResolvePosRetailPriceInput = {
  productId: string
  at?: Date
}

/**
 * POS cart/checkout entry — single resolver for retail unit price.
 *
 * Future priority (see docs/31_PRICING.md):
 * 1. Active Promotion Price (product/group, date) — not implemented
 * 2. Active Selling Price
 * 3. null → cannot sell
 */
export async function resolvePosRetailPrice(
  db: Pick<PrismaClient, "sellingPrice">,
  input: ResolvePosRetailPriceInput
): Promise<ResolvedRetailPrice | null> {
  void input.at

  const price = await getActiveSellingPrice(db, input.productId)
  if (price == null) {
    return null
  }

  return { price, source: "SELLING" }
}
