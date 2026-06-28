import { Prisma } from "@/generated/prisma/client"
import { roundMoney, toMoney } from "./decimal"
import type { ResolvedTaxPolicy } from "./tax-policy/types"

export type PosVatIncludedSplit = {
  gross: Prisma.Decimal
  net: Prisma.Decimal
  vat: Prisma.Decimal
}

export type PosVatEconomics = PosVatIncludedSplit & {
  taxCode: string
  rateBps: number
  inclusive: boolean
  outputVatAccountCode: string
}

export function rateDecimalFromBps(rateBps: number): Prisma.Decimal {
  return toMoney(rateBps).div(10000)
}

export function splitPosVatIncludedTotal(
  grossAmount: Parameters<typeof toMoney>[0],
  rateBps: number
): PosVatIncludedSplit {
  const gross = toMoney(grossAmount)
  const rate = rateDecimalFromBps(rateBps)
  const divisor = toMoney(1).plus(rate)
  const net = roundMoney(gross.div(divisor))
  const vat = roundMoney(gross.minus(net))
  return { gross, net, vat }
}

export function buildPosVatEconomics(
  grossAmount: Parameters<typeof toMoney>[0],
  policy: Pick<
    ResolvedTaxPolicy,
    "taxCode" | "rateBps" | "inclusive" | "outputVatAccountCode"
  >
): PosVatEconomics {
  if (!policy.inclusive) {
    throw new Error("Only VAT-inclusive POS totals are supported in this phase")
  }

  const split = splitPosVatIncludedTotal(grossAmount, policy.rateBps)
  return {
    ...split,
    taxCode: policy.taxCode,
    rateBps: policy.rateBps,
    inclusive: policy.inclusive,
    outputVatAccountCode: policy.outputVatAccountCode,
  }
}

export function posVatEconomicsFromSaleSnapshot(input: {
  total: Parameters<typeof toMoney>[0]
  netAmount: Parameters<typeof toMoney>[0]
  vatAmount: Parameters<typeof toMoney>[0]
  vatRateBps: number
  taxCode: string
  outputVatAccountCode: string
}): PosVatEconomics {
  return {
    gross: toMoney(input.total),
    net: toMoney(input.netAmount),
    vat: toMoney(input.vatAmount),
    rateBps: input.vatRateBps,
    taxCode: input.taxCode,
    inclusive: true,
    outputVatAccountCode: input.outputVatAccountCode,
  }
}
