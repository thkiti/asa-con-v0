import { buildCollectorTicketSlipText } from "@/lib/pos-ui/build-collector-ticket-slip"
import { RECEIPT_COLUMNS } from "@/lib/pos/receipt-slip-format"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { resolveThermalLayout } from "@/lib/thermal/layout"

function collectReport(
  overrides: Partial<ReadReportPayload> = {}
): ReadReportPayload {
  return {
    mode: "COLLECT",
    bangkokDate: "2026-06-03 – 2026-06-05",
    bangkokDateFrom: "2026-06-03",
    bangkokDateTo: "2026-06-05",
    generatedAt: "2026-06-26T08:16:00.000Z",
    staffId: "001",
    staffName: "Kiti Thengtrirat",
    branchCode: "SH001",
    branchName: "Chidlom",
    groupLines: [],
    paymentLines: [],
    dailyCashLines: [
      { salesDateYmd: "2026-06-03", cashAmount: 12000, ticketCount: 20 },
      { salesDateYmd: "2026-06-04", cashAmount: 18240, ticketCount: 18 },
      { salesDateYmd: "2026-06-05", cashAmount: 14000, ticketCount: 15 },
    ],
    grandTotal: 44240,
    saleCount: 53,
    refundCount: 0,
    refundTotal: 0,
    netTotal: 57740,
    paymentLines: [
      { key: "CASH", label: "CASH", amount: 44240 },
      { key: "CREDIT_CARD", label: "CREDIT CARD", amount: 8000 },
      { key: "BANK_TRANSFER", label: "BANK TRANSFER", amount: 5500 },
    ],
    ...overrides,
  }
}

const collectorLayout = resolveThermalLayout("COLLECTOR", DEFAULT_THERMAL_LAYOUTS)

describe("buildCollectorTicketSlipText", () => {
  it("uses collector layout blocks and identity fields", () => {
    const text = buildCollectorTicketSlipText(collectReport())
    const lines = text.split("\n")

    expect(lines.some((l) => l.includes("ASA SERVICES"))).toBe(true)
    expect(lines.some((l) => l.includes("Collector Report"))).toBe(true)
    expect(text).toContain("SH001")
    expect(text).toContain("Chidlom")
    expect(text).toContain("001")
    expect(text).toContain("Kiti Thengtrirat")
    expect(text).toContain("03/06/2026 - 05/06/2026")
    expect(text).not.toContain("2026-06-03 - 2026-06-05")
    expect(lines.every((l) => l.length <= RECEIPT_COLUMNS)).toBe(true)
  })

  it("renders daily cash rows and total cash table", () => {
    const text = buildCollectorTicketSlipText(collectReport())

    expect(text).toContain("Date")
    expect(text).toContain("Cash Sales")
    expect(text).toContain("03/06/2026")
    expect(text).toContain("04/06/2026")
    expect(text).toContain("05/06/2026")
    expect(text).toContain("12,000.00")
    expect(text).toContain("18,240.00")
    expect(text).toContain("14,000.00")
    expect(text).toContain("TOTAL CASH")
    expect(text).toContain("44,240.00")
    expect(text).not.toContain("Group Code")
  })

  it("renders payment summary with all payment types and total sales", () => {
    const text = buildCollectorTicketSlipText(collectReport())

    expect(text).toContain("PAYMENT SUMMARY")
    expect(text).toContain("CASH")
    expect(text).toContain("CREDIT CARD")
    expect(text).toContain("BANK TRANSFER")
    expect(text).toContain("TOTAL SALES")
    expect(text).toContain("57,740.00")
    expect(text).toContain("44,240.00")
  })

  it("keeps daily table cash-only while payment summary shows card and transfer", () => {
    const text = buildCollectorTicketSlipText(collectReport())
    const paymentSummaryIndex = text.indexOf("PAYMENT SUMMARY")
    const dailySection = text.slice(0, paymentSummaryIndex)

    expect(dailySection).toContain("03/06/2026")
    expect(dailySection).toContain("Cash Sales")
    expect(dailySection).not.toContain("CREDIT CARD")
    expect(dailySection).not.toContain("BANK TRANSFER")
  })

  it("matches payment summary cash to total cash", () => {
    const report = collectReport()
    const cashLine = report.paymentLines?.find((row) => row.key === "CASH")
    expect(cashLine?.amount).toBe(report.grandTotal)
  })

  it("renders ticket summary after daily table", () => {
    const layout = buildTicketLayout({
      documentType: "COLLECTOR",
      report: collectReport(),
      layout: collectorLayout,
    })

    expect(layout.summaryAfterBody).toBe(true)
    expect(layout.summaryRows).toEqual([{ label: "Receipt Count", value: "53" }])

    const text = buildCollectorTicketSlipText(collectReport())
    expect(text).toContain("Receipt Count")
    expect(text).toContain("53")
    expect(text).not.toContain("Branch:")
  })

  it("includes Phone No / Sign acknowledgement like refund", () => {
    const text = buildCollectorTicketSlipText(collectReport())
    expect(text).toContain("Phone No")
    expect(text).toContain("Sign")
  })

  it("total cash equals sum of daily cash rows in payload", () => {
    const report = collectReport()
    const sum = (report.dailyCashLines ?? []).reduce(
      (total, row) => total + row.cashAmount,
      0
    )
    expect(report.grandTotal).toBe(sum)
  })
})
