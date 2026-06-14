import {
  buildLegacySalesControlReport,
  isLegacySalesControlIncludedRow,
  isLegacyRefundCandidate,
} from "@/lib/import/legacy-sales/control-report"
import type { LegacySalesControlRow } from "@/lib/import/legacy-sales/control-report"

function row(partial: Partial<LegacySalesControlRow> & Pick<LegacySalesControlRow, "legacyTransNo">): LegacySalesControlRow {
  return {
    status: "VALID",
    legacyBranchId: "006",
    legacyDate: "01/01/2026",
    qty: 1,
    amount: { toString: () => "100" },
    ...partial,
  }
}

describe("legacy sales control report", () => {
  it("includes only VALID positive sales and excludes refund/branch00/zero qty", () => {
    expect(isLegacyRefundCandidate({ legacyTransNo: "R000001", amount: { toString: () => "10" } })).toBe(true)
    expect(isLegacyRefundCandidate({ legacyTransNo: "000001", amount: { toString: () => "10" } })).toBe(false)

    expect(
      isLegacySalesControlIncludedRow(
        row({ legacyBranchId: "00", legacyTransNo: "000001", amount: { toString: () => "100" } })
      )
    ).toBe(false)
    expect(isLegacySalesControlIncludedRow(row({ qty: 0 }))).toBe(false)
    expect(isLegacySalesControlIncludedRow(row({ status: "INVALID" }))).toBe(false)
    expect(isLegacySalesControlIncludedRow(row({ legacyTransNo: "R000001" }))).toBe(false)
  })

  it("aggregates month/shop/shop-total/month-total/grand totals", () => {
    const report = buildLegacySalesControlReport("batch-1", [
      row({ legacyBranchId: "006", legacyTransNo: "T1", legacyDate: "01/01/2026", qty: 2, amount: { toString: () => "200" } }),
      row({ legacyBranchId: "006", legacyTransNo: "T1", legacyDate: "01/01/2026", qty: 1, amount: { toString: () => "100" } }),
      row({ legacyBranchId: "010", legacyTransNo: "T2", legacyDate: "01/02/2026", qty: 1, amount: { toString: () => "50" } }),
      row({ legacyBranchId: "00", legacyTransNo: "T3", legacyDate: "01/02/2026", qty: 1, amount: { toString: () => "999" } }),
      row({ legacyBranchId: "006", legacyTransNo: "R9", legacyDate: "01/02/2026", qty: 1, amount: { toString: () => "80" } }),
      row({ status: "INVALID", legacyBranchId: "006", legacyTransNo: "T4", qty: 1, amount: { toString: () => "10" } }),
    ])

    expect(report.includedLineCount).toBe(3)
    expect(report.excludedLineCount).toBe(3)
    expect(report.grandTotal).toEqual({
      transactionCount: 2,
      lineCount: 3,
      totalQty: 4,
      totalAmount: 350,
    })
    expect(report.byMonth).toEqual([
      {
        month: "2026-01",
        transactionCount: 1,
        lineCount: 2,
        totalQty: 3,
        totalAmount: 300,
      },
      {
        month: "2026-02",
        transactionCount: 1,
        lineCount: 1,
        totalQty: 1,
        totalAmount: 50,
      },
    ])
    expect(report.byShop.find((shop) => shop.legacyBranchId === "006")?.totalAmount).toBe(300)
  })
})
