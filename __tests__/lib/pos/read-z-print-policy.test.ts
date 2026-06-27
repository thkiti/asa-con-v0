import { isReadZReportPrintAllowed } from "@/lib/pos/read-z-print-policy"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

const baseReport: ReadReportPayload = {
  mode: "Z",
  bangkokDate: "2026-06-27",
  readZScope: "daily",
  readZViewDate: "2026-06-27",
  generatedAt: "2026-06-27T10:00:00.000Z",
  staffId: "103",
  staffName: "Staff",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [],
  paymentLines: [],
  grandTotal: 0,
  saleCount: 0,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 0,
}

describe("read-z-print-policy", () => {
  it("allows print for any READ Z preview mode", () => {
    expect(isReadZReportPrintAllowed(baseReport)).toBe(true)
    expect(
      isReadZReportPrintAllowed({ ...baseReport, readZViewDate: "2026-06-26" })
    ).toBe(true)
    expect(
      isReadZReportPrintAllowed({
        ...baseReport,
        readZScope: "cumulative-to-date",
        bangkokDate: "2026-06-01 – 2026-06-27",
      })
    ).toBe(true)
    expect(isReadZReportPrintAllowed({ ...baseReport, mode: "X" })).toBe(false)
  })
})
