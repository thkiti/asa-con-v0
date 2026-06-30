import {
  buildStockDocumentInquiryPath,
  buildStockDocumentInquiryPrintPath,
} from "@/lib/stock/inquiry/stock-document-inquiry-links"

describe("stock document inquiry links", () => {
  it("builds finance inquiry detail path", () => {
    expect(buildStockDocumentInquiryPath("doc-1")).toBe(
      "/finance/stock-documents/doc-1"
    )
  })

  it("builds autoprint print path for inquiry detail", () => {
    expect(buildStockDocumentInquiryPrintPath("doc-1")).toBe(
      "/finance/stock-documents/doc-1?autoprint=1"
    )
    expect(buildStockDocumentInquiryPrintPath("")).toBeNull()
    expect(buildStockDocumentInquiryPrintPath("  ")).toBeNull()
  })
})
