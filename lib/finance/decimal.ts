import { Prisma } from "@/generated/prisma/client"

export const MONEY_SCALE = 2
export const ZERO = new Prisma.Decimal(0)

export function toMoney(
  n: number | string | Prisma.Decimal | null | undefined
): Prisma.Decimal {
  if (n === null || n === undefined) return ZERO
  if (n instanceof Prisma.Decimal) return roundMoney(n)
  const v = typeof n === "string" ? Number(n) : n
  if (!Number.isFinite(v)) return ZERO
  return roundMoney(new Prisma.Decimal(v.toString()))
}

export function roundMoney(d: Prisma.Decimal): Prisma.Decimal {
  return d.toDecimalPlaces(MONEY_SCALE, Prisma.Decimal.ROUND_HALF_UP)
}

export function addMoney(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return roundMoney(a.plus(b))
}