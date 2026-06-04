import { Prisma } from "@/generated/prisma/client"
import type { RoundingMode } from "@/generated/prisma/client"
import { toDec } from "@/lib/stock/decimal"

export type ApplyMarkupRoundingInput = {
  baseCost: Prisma.Decimal | number | string
  markupPercent: Prisma.Decimal | number | string
  roundingMode: RoundingMode
  /** Reserved — not used by current rounding modes. */
  threshold?: Prisma.Decimal | number | string | null
}

const ROUND_HALF_UP = Prisma.Decimal.ROUND_HALF_UP

/** Round `value` to nearest multiple of `step` (half-up). */
export function roundToStep(
  value: Prisma.Decimal,
  step: number | string
): Prisma.Decimal {
  const stepDec = toDec(step)
  if (stepDec.lte(0)) {
    return value
  }
  return value
    .div(stepDec)
    .toDecimalPlaces(0, ROUND_HALF_UP)
    .mul(stepDec)
}

/** Markup first, then rounding (HO → SHOP transfer price). */
export function applyMarkupThenRound(input: ApplyMarkupRoundingInput): Prisma.Decimal {
  const base = toDec(input.baseCost)
  const markup = toDec(input.markupPercent)
  const raw = base.mul(markup.plus(1))

  switch (input.roundingMode) {
    case "NONE":
      return raw
    case "CENT_01":
      return roundToStep(raw, "0.01")
    case "CENT_05":
      return roundToStep(raw, "0.05")
    case "BAHT_1":
      return roundToStep(raw, 1)
    case "BAHT_10":
      return roundToStep(raw, 10)
    case "BAHT_100":
      return roundToStep(raw, 100)
    default:
      return roundToStep(raw, "0.05")
  }
}
