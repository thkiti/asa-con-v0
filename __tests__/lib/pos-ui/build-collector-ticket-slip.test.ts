import {
  buildCollectorTicketSlipText,
  COLLECTOR_TICKET_SIGNATURE_LINES,
} from "@/lib/pos-ui/build-collector-ticket-slip"
import { RECEIPT_COLUMNS } from "@/lib/pos/receipt-slip-format"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

function collectReport(
  overrides: Partial<ReadReportPayload> = {}
): ReadReportPayload {
  return {
    mode: "COLLECT",
    bangkokDate: "2026-06-01 – 2026-06-07",
    bangkokDateFrom: "2026-06-01",
    bangkokDateTo: "2026-06-07",
    generatedAt: "2026-06-07T10:00:00.000Z",
    staffId: "001",
    staffName: "Collector One",
    branchCode: "SH001",
    branchName: "Chidlom Branch",
    groupLines: [],
    paymentLines: [
      { key: "CASH", label: "CASH", amount: 100 },
      { key: "CREDIT_CARD", label: "CREDIT CARD", amount: 0 },
      { key: "PROMPT_PAY", label: "PROMPT PAY", amount: 0 },
      { key: "QR_CODE", label: "QR CODE", amount: 0 },
      { key: "TRANSFER", label: "TRANSFER", amount: 0 },
    ],
    grandTotal: 100,
    saleCount: 3,
    ...overrides,
  }
}

describe("buildCollectorTicketSlipText", () => {
  it("uses 30-column thermal layout with header and collector info", () => {
    const text = buildCollectorTicketSlipText(collectReport())
    const lines = text.split("\n")

    expect(lines.some((l) => l.includes("ASA SERVICES"))).toBe(true)
    expect(lines.some((l) => l.includes("Chidlom Branch"))).toBe(true)
    expect(lines.some((l) => l.includes("Collector Report"))).toBe(true)
    expect(lines.some((l) => l.includes("Collector 001"))).toBe(true)
    expect(lines.some((l) => l.includes("Collector One"))).toBe(true)
    expect(lines.some((l) => l.includes("Tickets"))).toBe(true)
    expect(lines.every((l) => l.length <= RECEIPT_COLUMNS)).toBe(true)
  })

  it("renders one detail row", () => {
    const text = buildCollectorTicketSlipText(
      collectReport({
        groupLines: [
          {
            lineKey: "1",
            displayLeft: "0101001-Widget",
            qty: 2,
            amount: 100,
          },
        ],
      })
    )

    expect(text).toContain("0101001-Widget")
    expect(text).toContain("100.00")
    expect(text).toContain("CASH")
    expect(text).toContain("TOTAL")
  })

  it("renders many detail rows", () => {
    const groupLines = Array.from({ length: 35 }, (_, i) => ({
      lineKey: String(i),
      displayLeft: `01010${String(i).padStart(2, "0")}-Item ${i}`,
      qty: i + 1,
      amount: (i + 1) * 10,
    }))

    const text = buildCollectorTicketSlipText(collectReport({ groupLines }))
    expect(text.match(/01010\d{2}-Item/g)?.length).toBe(35)
  })

  it("includes signature block lines for print", () => {
    expect(COLLECTOR_TICKET_SIGNATURE_LINES.join("\n")).toContain(
      "Collector Signature"
    )
    expect(COLLECTOR_TICKET_SIGNATURE_LINES.join("\n")).toContain("Date ....../....../........")
  })
})
