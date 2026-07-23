import { Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"

export function calcActualQty(beginQty: number, inQty: number, usageQty: number): number {
  return beginQty + inQty - usageQty
}

export function calcEndingQty(countQty: number | null | undefined): number | null {
  if (countQty === null || countQty === undefined) return null
  return countQty
}

export function calcAdjQty(
  endingQty: number | null | undefined,
  actualQty: number
): number | null {
  if (endingQty === null || endingQty === undefined) return null
  return endingQty - actualQty
}

export function calcAdjAmount(
  adjQty: number | null | undefined,
  sellingPrice: Prisma.Decimal | number | string | null | undefined
): Prisma.Decimal | null {
  if (adjQty === null || adjQty === undefined) return null
  if (sellingPrice === null || sellingPrice === undefined) return null
  return toMoney(new Prisma.Decimal(adjQty).times(toMoney(sellingPrice)))
}

export type EndLineCalcInput = {
  beginQty: number
  inQty: number
  usageQty: number
  countQty: number | null
  sellingPrice: Prisma.Decimal | number | string | null
}

export type EndLineCalcResult = {
  actualQty: number
  endingQty: number | null
  adjQty: number | null
  adjAmount: Prisma.Decimal | null
}

export function calcEndLine(input: EndLineCalcInput): EndLineCalcResult {
  const actualQty = calcActualQty(input.beginQty, input.inQty, input.usageQty)
  const endingQty = calcEndingQty(input.countQty)
  const adjQty = calcAdjQty(endingQty, actualQty)
  const adjAmount = calcAdjAmount(adjQty, input.sellingPrice)
  return { actualQty, endingQty, adjQty, adjAmount }
}

export function sumAdjAmounts(
  amounts: ReadonlyArray<Prisma.Decimal | null | undefined>
): Prisma.Decimal {
  let total = ZERO
  for (const amount of amounts) {
    if (amount == null) continue
    total = addMoney(total, toMoney(amount))
  }
  return total
}

export function formulasReconcile(line: {
  beginQty: number
  inQty: number
  usageQty: number
  actualQty: number
  countQty: number | null
  endingQty: number | null
  adjQty: number | null
}): boolean {
  if (line.actualQty !== calcActualQty(line.beginQty, line.inQty, line.usageQty)) {
    return false
  }
  if (line.countQty == null) {
    return line.endingQty == null && line.adjQty == null
  }
  if (line.endingQty !== line.countQty) return false
  if (line.adjQty !== line.endingQty - line.actualQty) return false
  return true
}
