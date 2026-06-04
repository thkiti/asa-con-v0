import {
  buildReceiptNo,
  formatReceiptYearMonth,
  receiptMonthBounds,
} from "@/lib/pos/receipt"

describe("receipt numbering", () => {
  const at = new Date("2026-06-04T14:30:00.000Z")

  it("builds REC-{BranchCode}-{YYYYMM}-{Seq4}", () => {
    expect(buildReceiptNo("SH001", at, 1)).toBe("REC-SH001-202606-0001")
    expect(buildReceiptNo("SH001", at, 42)).toBe("REC-SH001-202606-0042")
  })

  it("uses calendar month bounds", () => {
    const { start, endExclusive } = receiptMonthBounds(at)
    expect(start).toEqual(new Date(2026, 5, 1))
    expect(endExclusive).toEqual(new Date(2026, 6, 1))
    expect(formatReceiptYearMonth(at)).toBe("202606")
  })
})
