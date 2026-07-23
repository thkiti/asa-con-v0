import { Prisma } from "@/generated/prisma/client"
import {
  calcActualQty,
  calcAdjAmount,
  calcAdjQty,
  calcEndingQty,
  calcEndLine,
  formulasReconcile,
  sumAdjAmounts,
} from "@/lib/stock/end/end-calc"

describe("end-calc", () => {
  it("computes ACTUAL = BEGIN + IN - USAGE", () => {
    expect(calcActualQty(10, 3, 4)).toBe(9)
    expect(calcActualQty(0, 0, 0)).toBe(0)
    expect(calcActualQty(5, 0, 7)).toBe(-2)
  })

  it("maps ENDING from COUNT and ADJ from ENDING - ACTUAL", () => {
    expect(calcEndingQty(null)).toBeNull()
    expect(calcEndingQty(12)).toBe(12)
    expect(calcAdjQty(null, 10)).toBeNull()
    expect(calcAdjQty(12, 10)).toBe(2)
    expect(calcAdjQty(8, 10)).toBe(-2)
  })

  it("computes ADJ Amount with money rounding", () => {
    // selling price is money-rounded first (12.345 → 12.35), then × qty
    const amount = calcAdjAmount(3, "12.345")
    expect(amount?.toFixed(2)).toBe("37.05")
    expect(calcAdjAmount(null, 10)).toBeNull()
    expect(calcAdjAmount(2, null)).toBeNull()
  })

  it("calcEndLine returns full derived set", () => {
    const line = calcEndLine({
      beginQty: 10,
      inQty: 2,
      usageQty: 3,
      countQty: 8,
      sellingPrice: new Prisma.Decimal("25.50"),
    })
    expect(line.actualQty).toBe(9)
    expect(line.endingQty).toBe(8)
    expect(line.adjQty).toBe(-1)
    expect(line.adjAmount?.toFixed(2)).toBe("-25.50")
  })

  it("sums adj amounts skipping nulls", () => {
    const total = sumAdjAmounts([
      new Prisma.Decimal("10.10"),
      null,
      new Prisma.Decimal("-2.05"),
      undefined,
    ])
    expect(total.toFixed(2)).toBe("8.05")
  })

  it("formulasReconcile validates derived quantities", () => {
    expect(
      formulasReconcile({
        beginQty: 10,
        inQty: 2,
        usageQty: 3,
        actualQty: 9,
        countQty: 8,
        endingQty: 8,
        adjQty: -1,
      })
    ).toBe(true)

    expect(
      formulasReconcile({
        beginQty: 10,
        inQty: 2,
        usageQty: 3,
        actualQty: 9,
        countQty: null,
        endingQty: null,
        adjQty: null,
      })
    ).toBe(true)

    expect(
      formulasReconcile({
        beginQty: 10,
        inQty: 2,
        usageQty: 3,
        actualQty: 8,
        countQty: 8,
        endingQty: 8,
        adjQty: 0,
      })
    ).toBe(false)
  })
})
