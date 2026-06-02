import { DocumentErrorCodes } from "@/lib/stock/document/document-errors"
import {
  buildSaveLines,
  periodMonthFromDate,
} from "@/lib/stock/document/document-validation"

describe("document-validation", () => {
  it("buildSaveLines drops zero qty", () => {
    const lines = buildSaveLines(
      [
        { productId: "p1", qty: 0 },
        { productId: "p2", qty: 4 },
      ],
      "PURCHASE"
    )
    expect(lines).toHaveLength(1)
    expect(lines[0].productId).toBe("p2")
  })

  it("allows negative qty for PERFORMANCE", () => {
    const lines = buildSaveLines(
      [{ productId: "p1", qty: -2 }],
      "PERFORMANCE"
    )
    expect(lines[0].qty).toBe(-2)
  })

  it("rejects negative qty for PURCHASE", () => {
    expect(() =>
      buildSaveLines([{ productId: "p1", qty: -1 }], "PURCHASE")
    ).toThrow(expect.objectContaining({ code: DocumentErrorCodes.INVALID_QUANTITY }))
  })

  it("derives periodMonth from date", () => {
    expect(periodMonthFromDate(new Date("2026-03-15T12:00:00"))).toBe("2026-03")
  })
})
