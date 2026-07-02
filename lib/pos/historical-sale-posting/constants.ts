import { Prisma } from "@/generated/prisma/client"

export const HISTORICAL_POS_POSTING_CONFIRM_TOKEN =
  "HISTORICAL_POS_POSTING_CONFIRMED"

export const DEFAULT_HISTORICAL_FROM = "2026-01-01"
export const DEFAULT_HISTORICAL_BEFORE = "2026-06-01"

/** Money reconciliation tolerance for gross = net + VAT checks. */
export const HISTORICAL_POSTING_ROUNDING_TOLERANCE = new Prisma.Decimal("0.02")
