/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { CheckReceiptReceiptTable } from "@/components/operations/check-receipt/CheckReceiptReceiptTable"

describe("CheckReceiptReceiptTable", () => {
  it("shows empty state when there are no receipts", () => {
    const html = renderToStaticMarkup(<CheckReceiptReceiptTable receipts={[]} />)
    expect(html).toContain('data-testid="check-receipt-empty"')
    expect(html).toContain("No receipts for this shop and month.")
  })

  it("renders receipt rows with payment method labels", () => {
    const html = renderToStaticMarkup(
      <CheckReceiptReceiptTable
        receipts={[
          {
            saleId: "sale-1",
            receiptNo: "REC-001",
            issuedAt: "2026-06-05T03:00:00.000Z",
            staff: "101-Ann",
            total: "100.00",
            paymentMethod: "CASH",
            slipImageUrl: null,
          },
          {
            saleId: "sale-2",
            receiptNo: "REC-002",
            issuedAt: "2026-06-05T04:00:00.000Z",
            staff: "102-Bob",
            total: "250.00",
            paymentMethod: "BANK TRANSFER",
            slipImageUrl: "https://blob.example/slip.jpg",
          },
        ]}
      />
    )

    expect(html).toContain('data-testid="check-receipt-table"')
    expect(html).toContain("REC-001")
    expect(html).toContain("REC-002")
    expect(html).toContain("CASH")
    expect(html).toContain("BANK TRANSFER")
    expect(html).toContain('data-testid="check-receipt-slip-trigger"')
    expect(html).not.toContain('data-testid="check-receipt-slip-preview"')
  })
})
