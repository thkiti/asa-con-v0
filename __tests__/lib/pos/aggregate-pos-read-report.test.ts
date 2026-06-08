import { PaymentMethod } from "@/generated/prisma/client"
import {
  aggregatePosReadReportFromSales,
  computeReadReportNetTotal,
  summarizeRefundsForReadReport,
} from "@/lib/pos/aggregatePosReadReport"

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
