import type { Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import { splitPosVatIncludedTotal } from "@/lib/finance/pos-sale-vat"
import { DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS } from "@/lib/finance/tax-policy"

export type HistoricalPostingVatVerification = {
  gross: Prisma.Decimal
  calculatedNet: Prisma.Decimal
  calculatedVat: Prisma.Decimal
}

/** Gross × 7 / 107 split using finance posting rounding (2 dp). */
export function vatVerificationFromGross(
  gross: Prisma.Decimal | number | string
): HistoricalPostingVatVerification {
  const split = splitPosVatIncludedTotal(
    gross,
    DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS
  )
  return {
    gross: toMoney(split.gross),
    calculatedNet: toMoney(split.net),
    calculatedVat: toMoney(split.vat),
  }
}

export function addVatVerificationTotals(
  left: HistoricalPostingVatVerification,
  right: HistoricalPostingVatVerification
): HistoricalPostingVatVerification {
  return {
    gross: addMoney(left.gross, right.gross),
    calculatedNet: addMoney(left.calculatedNet, right.calculatedNet),
    calculatedVat: addMoney(left.calculatedVat, right.calculatedVat),
  }
}

export function emptyVatVerificationTotals(): HistoricalPostingVatVerification {
  return {
    gross: ZERO,
    calculatedNet: ZERO,
    calculatedVat: ZERO,
  }
}
