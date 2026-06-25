import { renderToStaticMarkup } from "react-dom/server"
import { ReceiptLookupResult } from "@/components/pos/ReceiptLookupResult"
import type { ReceiptLookupRow } from "@/lib/pos/receipt-lookup-types"

const baseRow: ReceiptLookupRow = {
  receiptId: "receipt-1",
  receiptNo: "REC-SH001-202606-0001",
  issuedAt: "2026-06-06T10:00:00.000Z",
  branchCode: "SH001",
  branchName: "Shop One",
  staffDisplay: "103-Somsak",
  total: "250.00",
  paymentMethodLabel: "CASH",
  archiveStatus: "ready",
  archiveStatusLabel: "Ready",
  pdfUrl: "/api/pos/receipts/receipt-1/pdf?disposition=inline",
}

describe("ReceiptLookupResult", () => {
  it("shows View PDF and Print PDF for READY archive rows", () => {
    const html = renderToStaticMarkup(
      <ReceiptLookupResult receipt={baseRow} branchId="branch-1" />
    )
    expect(html).toContain('data-testid="receipt-lookup-view-pdf"')
    expect(html).toContain('data-testid="receipt-lookup-print-pdf"')
    expect(html).toContain('data-archive-status="ready"')
    expect(html).toContain("Receipt")
    expect(html).toContain("Archive Status")
  })

  it("hides PDF actions for PENDING archive rows", () => {
    const html = renderToStaticMarkup(
      <ReceiptLookupResult
        receipt={{
          ...baseRow,
          archiveStatus: "pending",
          archiveStatusLabel: "Preparing...",
          pdfUrl: null,
        }}
        branchId="branch-1"
      />
    )
    expect(html).toContain("Preparing...")
    expect(html).toContain('data-archive-status="pending"')
    expect(html).not.toContain('data-testid="receipt-lookup-view-pdf"')
    expect(html).not.toContain('data-testid="receipt-lookup-print-pdf"')
  })

  it("shows failed archive status", () => {
    const html = renderToStaticMarkup(
      <ReceiptLookupResult
        receipt={{
          ...baseRow,
          archiveStatus: "failed",
          archiveStatusLabel: "Archive failed",
          archiveError: "PDF render failed",
          pdfUrl: null,
        }}
        branchId="branch-1"
      />
    )
    expect(html).toContain("Archive failed")
    expect(html).toContain('data-archive-status="failed"')
  })

  it("reserves future action placeholders", () => {
    const html = renderToStaticMarkup(
      <ReceiptLookupResult receipt={baseRow} branchId="branch-1" />
    )
    expect(html).toContain('data-testid="receipt-lookup-future-actions"')
    expect(html).toContain("Email")
    expect(html).toContain("Audit History")
  })

  it("shows not found message with running number", () => {
    const html = renderToStaticMarkup(
      <ReceiptLookupResult
        receipt={null}
        branchId="branch-1"
        notFound
        notFoundRunningNo="0112"
        variant="panel"
      />
    )
    expect(html).toContain("Receipt not found: 0112")
  })
})
