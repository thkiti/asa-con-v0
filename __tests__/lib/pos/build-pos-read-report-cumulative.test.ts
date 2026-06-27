import {
  buildPosReadZCumulativeToDateReport,
  readZMonthStartYmd,
} from "@/lib/pos/build-pos-read-report"
import {
  utcRangeForBangkokCalendarDay,
  utcRangeForBangkokInclusiveYmdRange,
} from "@/lib/pos/bangkokDayBounds"

jest.mock("@/lib/product-groups/management-product-group", () => ({
  loadConfiguredManagementHeaderCodes: jest.fn().mockResolvedValue([]),
  loadSummaryHeaderLabels: jest.fn().mockResolvedValue(new Map()),
  POLICY_SUMMARY_HEADERS: ["900"],
  resolveReadReportDisplayCatalog: jest.fn(() => ["900"]),
  mergeManagementGroupSummary: jest.fn(() => []),
  resolveConfiguredProductGroup: jest.fn(() => null),
  resolveReadReportAggregateKey: jest.fn(() => null),
}))

describe("buildPosReadZCumulativeToDateReport", () => {
  const saleFindMany = jest.fn().mockResolvedValue([])
  const refundFindMany = jest.fn().mockResolvedValue([])
  const productFindMany = jest.fn().mockResolvedValue([])
  const referenceStockFindMany = jest.fn().mockResolvedValue([])

  const prisma = {
    sale: { findMany: saleFindMany },
    refund: { findMany: refundFindMany },
    product: { findMany: productFindMany },
    referenceStock: { findMany: referenceStockFindMany },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("derives month start from selected end date", () => {
    expect(readZMonthStartYmd("2026-06-27")).toBe("2026-06-01")
  })

  it("queries sales/refunds from month start through selected end date inclusive", async () => {
    const report = await buildPosReadZCumulativeToDateReport(prisma, {
      branchId: "b1",
      branchCode: "SH001",
      branchName: "Chidlom",
      staffId: "103",
      staffName: "Staff",
      endYmd: "2026-06-27",
    })

    const { start, endExclusive } = utcRangeForBangkokInclusiveYmdRange(
      "2026-06-01",
      "2026-06-27"
    )

    expect(saleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: "b1",
          createdAt: { gte: start, lt: endExclusive },
        }),
      })
    )
    expect(refundFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: "b1",
          createdAt: { gte: start, lt: endExclusive },
        }),
      })
    )

    expect(report.readZScope).toBe("cumulative-to-date")
    expect(report.readZViewDate).toBe("2026-06-27")
    expect(report.bangkokDateFrom).toBe("2026-06-01")
    expect(report.bangkokDateTo).toBe("2026-06-27")
    expect(report.bangkokDate).toBe("2026-06-01 – 2026-06-27")
  })

  it("includes the full selected end day in the UTC range", () => {
    const { endExclusive } = utcRangeForBangkokCalendarDay("2026-06-27")
    const { start } = utcRangeForBangkokCalendarDay("2026-06-01")
    expect(endExclusive.getTime()).toBeGreaterThan(start.getTime())
    expect(
      Math.round((endExclusive.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    ).toBe(27)
  })
})
