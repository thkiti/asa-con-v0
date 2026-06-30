import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentInquiryPrintSheet } from "@/components/stock/StockDocumentInquiryPrintSheet"
import type { StockDocumentInquiryDetail } from "@/lib/stock/inquiry/stock-document-inquiry-types"

const sampleDetail: StockDocumentInquiryDetail = {
  id: "doc-1",
  legalEntityCode: "AS",
  phaseCode: "ORD",
  phaseLabelTh: "ใบสั่งของ",
  documentNo: "ORD-SH001-202606-0001",
  date: "2026-06-15T00:00:00.000Z",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Shop 1",
  staffId: "ST001",
  staffName: "Staff One",
  status: "SUBMITTED",
  posted: false,
  pdfAvailable: null,
  printPath: "/finance/stock-documents/doc-1?autoprint=1",
  voucherId: null,
  journalEntryId: null,
  stockMovementPath: "/shop/stock-documents/doc-1",
  createdAt: "2026-06-14T10:00:00.000Z",
  submittedAt: "2026-06-14T11:00:00.000Z",
  confirmedAt: null,
  postedAt: null,
  totalQty: 5,
  totalAmount: "1500.00",
  lines: [
    {
      id: "line-1",
      productCode: "P001",
      description: "Widget",
      qty: 5,
      unitCost: "300.00",
      amount: "1500.00",
      note: null,
    },
  ],
}

describe("StockDocumentInquiryPrintSheet", () => {
  it("renders canonical inquiry header and line totals", () => {
    const html = renderToStaticMarkup(<StockDocumentInquiryPrintSheet detail={sampleDetail} />)
    expect(html).toContain('data-testid="stock-document-inquiry-print-sheet"')
    expect(html).toContain("ใบสั่งของ")
    expect(html).toContain("ORD-SH001-202606-0001")
    expect(html).toContain("SH001")
    expect(html).toContain("Shop 1")
    expect(html).toContain("ST001")
    expect(html).toContain("Staff One")
    expect(html).toContain("P001")
    expect(html).toContain("Widget")
    expect(html).toContain("1,500.00")
    expect(html).toContain("Submitted")
  })

  it("renders audit timestamps in print meta", () => {
    const html = renderToStaticMarkup(<StockDocumentInquiryPrintSheet detail={sampleDetail} />)
    expect(html).toContain('data-testid="stock-document-inquiry-print-meta"')
    expect(html).toContain("Created:")
    expect(html).toContain("Submitted:")
    expect(html).toContain("Confirmed:")
    expect(html).toContain("Posted:")
  })
})
