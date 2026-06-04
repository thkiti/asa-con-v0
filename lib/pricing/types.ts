import type {
  MarketType,
  PricingClass,
  Prisma,
  RoundingMode,
} from "@/generated/prisma/client"

export type PricingPolicyRow = {
  id: string
  marketType: MarketType
  pricingClass: PricingClass
  markupPercent: string
  roundingMode: RoundingMode
  threshold: string | null
  effectiveFrom: string
  effectiveTo: string | null
  createdAt: string
}

export type SellingPriceRow = {
  id: string
  productId: string
  price: string
  effectiveFrom: string
  effectiveTo: string | null
  createdAt: string
}

export type ProductWithActiveSellingPrice = {
  id: string
  code: string
  name: string
  productType: string
  activePrice: string | null
  activePriceSince: string | null
}

/** POS retail resolution — promotion step added in a future slice. */
export type RetailPriceSource = "SELLING" | "PROMOTION"

export type ResolvedRetailPrice = {
  price: Prisma.Decimal
  source: RetailPriceSource
}
