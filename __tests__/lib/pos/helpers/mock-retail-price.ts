import { Prisma } from "@/generated/prisma/client"

export function mockResolvedRetailPrice(amount: number | string) {
  return {
    price: new Prisma.Decimal(amount),
    source: "SELLING" as const,
  }
}
