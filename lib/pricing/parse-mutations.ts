import {
  MarketType,
  PricingClass,
  RoundingMode,
} from "@/generated/prisma/client"
import { PricingDomainError } from "./pricing-errors"

const MARKET_TYPES = new Set<string>(Object.values(MarketType))
const PRICING_CLASSES = new Set<string>(Object.values(PricingClass))
const ROUNDING_MODES = new Set<string>(Object.values(RoundingMode))

export type CreatePricingPolicyInput = {
  marketType: MarketType
  pricingClass: PricingClass
  markupPercent: number
  roundingMode: RoundingMode
  threshold: number | null
}

export function parseCreatePricingPolicyBody(
  body: unknown
): CreatePricingPolicyInput {
  const raw = body as Record<string, unknown>
  const marketType = String(raw.marketType ?? "").trim().toUpperCase()
  const pricingClass = String(raw.pricingClass ?? "").trim().toUpperCase()

  if (!MARKET_TYPES.has(marketType)) {
    throw new PricingDomainError("Invalid marketType", "INVALID_MARKET_TYPE", 400)
  }
  if (!PRICING_CLASSES.has(pricingClass)) {
    throw new PricingDomainError("Invalid pricingClass", "INVALID_PRICING_CLASS", 400)
  }

  const markupRaw = Number(raw.markupPercent)
  if (!Number.isFinite(markupRaw) || markupRaw < 0) {
    throw new PricingDomainError("Invalid markup percent", "INVALID_MARKUP", 400)
  }
  const markupPercent = markupRaw > 1 ? markupRaw / 100 : markupRaw

  const roundingMode = String(raw.roundingMode ?? "").trim().toUpperCase()
  if (!ROUNDING_MODES.has(roundingMode)) {
    throw new PricingDomainError("Invalid roundingMode", "INVALID_ROUNDING", 400)
  }

  const thresholdRaw = raw.threshold
  let threshold: number | null = null
  if (thresholdRaw != null && thresholdRaw !== "") {
    const t = Number(thresholdRaw)
    if (!Number.isFinite(t) || t < 0) {
      throw new PricingDomainError("Invalid threshold", "INVALID_THRESHOLD", 400)
    }
    threshold = t
  }

  return {
    marketType: marketType as MarketType,
    pricingClass: pricingClass as PricingClass,
    markupPercent,
    roundingMode: roundingMode as RoundingMode,
    threshold,
  }
}

export function parseSetSellingPriceBody(body: unknown): {
  productId: string
  price: number
} {
  const raw = body as Record<string, unknown>
  const productId = String(raw.productId ?? "").trim()
  const price = Number(raw.price)

  if (!productId) {
    throw new PricingDomainError("productId is required", "MISSING_PRODUCT_ID", 400)
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new PricingDomainError("price must be greater than 0", "INVALID_PRICE", 400)
  }

  return { productId, price }
}

export function parsePolicyLookupQuery(searchParams: URLSearchParams): {
  marketType: MarketType
  pricingClass: PricingClass
} {
  const marketType = String(searchParams.get("marketType") ?? "").trim().toUpperCase()
  const pricingClass = String(searchParams.get("pricingClass") ?? "").trim().toUpperCase()

  if (!MARKET_TYPES.has(marketType)) {
    throw new PricingDomainError("Invalid marketType", "INVALID_MARKET_TYPE", 400)
  }
  if (!PRICING_CLASSES.has(pricingClass)) {
    throw new PricingDomainError("Invalid pricingClass", "INVALID_PRICING_CLASS", 400)
  }

  return {
    marketType: marketType as MarketType,
    pricingClass: pricingClass as PricingClass,
  }
}
