import { saleReadReportSelect } from "@/lib/pos/sale-read-report-select"

describe("saleReadReportSelect", () => {
  it("selects read-report fields only and omits VAT snapshot columns", () => {
    expect(saleReadReportSelect).toEqual({
      id: true,
      total: true,
      createdAt: true,
      staffId: true,
      items: true,
      payment: true,
    })
    expect(saleReadReportSelect).not.toHaveProperty("netAmount")
    expect(saleReadReportSelect).not.toHaveProperty("vatAmount")
    expect(saleReadReportSelect).not.toHaveProperty("vatRateBps")
    expect(saleReadReportSelect).not.toHaveProperty("taxCode")
    expect(saleReadReportSelect).not.toHaveProperty("outputVatAccountCode")
  })
})
