import { PaymentMethod } from "@/generated/prisma/client"
import {
  aggregatePosDailyReadReportFromSales,
  aggregatePosReadReportFromSales,
  computeReadReportNetTotal,
  summarizeRefundsForReadReport,
} from "@/lib/pos/aggregatePosReadReport"
import {
  POLICY_SUMMARY_HEADERS,
  resolveReadReportDisplayCatalog,
  type SummaryHeaderLabel,
} from "@/lib/product-groups/management-product-group"

describe("aggregatePosReadReportFromSales", () => {
  it("aggregates v0 sale rows by group and payment method", () => {
    const result = aggregatePosReadReportFromSales(
      [
        {
          total: 150,
          payment: { method: PaymentMethod.CASH },
          items: [
            { productId: "p1", qty: 2, lineTotal: 100 },
            { productId: "p2", qty: 1, lineTotal: 50 },
          ],
        },
        {
          total: 200,
          payment: { method: PaymentMethod.CARD },
          items: [{ productId: "p1", qty: 1, lineTotal: 200 }],
        },
      ],
      [
        {
          id: "p1",
          name: "Alpha Product",
          groupCode: 10,
          typeCode: 1,
          runningCode: 5,
          code: "1001005",
        },
        {
          id: "p2",
          name: "Beta",
          groupCode: 20,
          typeCode: 2,
          runningCode: 1,
          code: "2002001",
        },
      ]
    )

    expect(result.saleCount).toBe(2)
    expect(result.grandTotal).toBe(350)
    expect(result.groupLines).toHaveLength(2)
    expect(result.paymentLines.find((p) => p.key === "CASH")?.amount).toBe(150)
    expect(result.paymentLines.find((p) => p.key === "CREDIT_CARD")?.amount).toBe(200)
  })

  it("daily READ X/Z uses dynamic display catalog with zero-fill", () => {
    const displayCatalog = resolveReadReportDisplayCatalog(POLICY_SUMMARY_HEADERS, [])
    const labels = new Map<string, SummaryHeaderLabel>(
      displayCatalog.map((headerCode) => [
        headerCode,
        { headerCode, name: `Group ${headerCode}`, labelStatus: "ok" as const },
      ])
    )

    const empty = aggregatePosDailyReadReportFromSales(
      [],
      [],
      labels,
      displayCatalog
    )
    expect(empty.groupLines.map((r) => r.lineKey)).toEqual(displayCatalog)
    expect(empty.groupLines.every((r) => r.qty === 0 && r.amount === 0)).toBe(true)

    const withSale = aggregatePosDailyReadReportFromSales(
      [
        {
          total: 60,
          payment: { method: PaymentMethod.CASH },
          items: [{ productId: "p1", qty: 2, lineTotal: 60 }],
        },
      ],
      [
        {
          id: "p1",
          name: "Alpha Product",
          groupCode: 41,
          typeCode: 0,
          runningCode: 900,
          code: "4100900",
        },
      ],
      labels,
      displayCatalog
    )
    expect(withSale.groupLines.map((r) => r.lineKey)).toEqual(displayCatalog)
    const hit = withSale.groupLines.find((r) => r.lineKey === "4100900")
    expect(hit?.qty).toBe(2)
    expect(hit?.amount).toBe(60)
    expect(hit?.displayLeft).toContain("4100900")
  })

  it("daily READ X/Z hides 900 parent when 901/902 children are configured", () => {
    const displayCatalog = resolveReadReportDisplayCatalog(POLICY_SUMMARY_HEADERS, [
      "0101901",
      "0101902",
    ])
    const labels = new Map<string, SummaryHeaderLabel>(
      displayCatalog.map((headerCode) => [
        headerCode,
        { headerCode, name: `Group ${headerCode}`, labelStatus: "ok" as const },
      ])
    )
    const refByProductId = new Map([
      ["p1", [{ productGroup: "0101901" }]],
      ["p2", [{ productGroup: "0101902" }]],
    ])

    const result = aggregatePosDailyReadReportFromSales(
      [
        {
          total: 30,
          payment: { method: PaymentMethod.CASH },
          items: [{ productId: "p1", qty: 1, lineTotal: 30 }],
        },
        {
          total: 40,
          payment: { method: PaymentMethod.CASH },
          items: [{ productId: "p2", qty: 2, lineTotal: 40 }],
        },
      ],
      [
        {
          id: "p1",
          name: "Small Key",
          groupCode: 10,
          typeCode: 10,
          runningCode: 15,
          code: "1010015",
        },
        {
          id: "p2",
          name: "Large Key",
          groupCode: 10,
          typeCode: 10,
          runningCode: 22,
          code: "1010022",
        },
      ],
      labels,
      displayCatalog,
      refByProductId
    )

    expect(result.groupLines.map((r) => r.lineKey)).toEqual(displayCatalog)
    expect(result.groupLines.find((r) => r.lineKey === "0100900")).toBeUndefined()
    expect(result.groupLines.find((r) => r.lineKey === "0101901")).toMatchObject({
      qty: 1,
      amount: 30,
    })
    expect(result.groupLines.find((r) => r.lineKey === "0101902")).toMatchObject({
      qty: 2,
      amount: 40,
    })
  })

  it("summarizes refunds and net total for daily read report", () => {
    const summary = summarizeRefundsForReadReport([
      { amount: 25.5 },
      { amount: 10 },
    ])
    expect(summary.refundCount).toBe(2)
    expect(summary.refundTotal).toBe(35.5)
    expect(computeReadReportNetTotal(350, 35.5)).toBe(314.5)
  })
})
