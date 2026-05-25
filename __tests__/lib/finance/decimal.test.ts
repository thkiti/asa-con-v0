import { Prisma } from "@/generated/prisma/client"
import { addMoney, roundMoney, toMoney, ZERO } from "@/lib/finance/decimal"

describe("finance decimal", () => {
  it("rounds to money scale", () => {
    expect(roundMoney(new Prisma.Decimal("1.005")).toString()).toBe("1.01")
  })

  it("addMoney sums rounded values", () => {
    const sum = addMoney(toMoney("10.10"), toMoney("0.05"))
    expect(sum.toString()).toBe("10.15")
  })

  it("toMoney treats null as zero", () => {
    expect(toMoney(null).equals(ZERO)).toBe(true)
  })
})