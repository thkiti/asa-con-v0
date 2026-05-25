import { Prisma } from "@/generated/prisma/client"

export const ZERO = new Prisma.Decimal(0)

export function toDec(
  n: number | string | Prisma.Decimal | null | undefined
): Prisma.Decimal {
  if (n === null || n === undefined) return ZERO
  if (n instanceof Prisma.Decimal) return n
  const v = typeof n === "string" ? Number(n) : n
  if (!Number.isFinite(v)) return ZERO
  return new Prisma.Decimal(v.toString())
}

/** Moving average after inbound qty at unitCost. */
export function inboundMovingAverage(
  beforeQty: number,
  beforeAvg: Prisma.Decimal,
  inboundQty: number,
  unitCost: Prisma.Decimal
): Prisma.Decimal {
  const beforeValue = beforeAvg.mul(new Prisma.Decimal(beforeQty))
  const afterQty = beforeQty + inboundQty
  if (afterQty === 0) return ZERO
  if (beforeQty <= 0) return unitCost
  return beforeValue
    .plus(unitCost.mul(new Prisma.Decimal(inboundQty)))
    .div(new Prisma.Decimal(afterQty))
}