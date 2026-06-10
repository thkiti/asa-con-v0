import {
  POS_STOCK_COUNT_HREF,
  POS_STOCK_DOCUMENTS_HREF,
  stockCountEditorHref,
  stockDocumentNewHref,
} from "@/lib/pos-ui/pos-navigation"

describe("pos-ui/pos-navigation", () => {
  it("builds stock document new href with from=shop", () => {
    expect(stockDocumentNewHref("TRANSFER_OUT")).toBe(
      "/shop/stock-documents/new?type=TRANSFER_OUT&from=shop"
    )
  })

  it("builds stock count editor href with staff entry query", () => {
    expect(stockCountEditorHref("doc-adj-1")).toBe(
      "/shop/stock-documents/doc-adj-1?from=shop"
    )
  })

  it("keeps legacy list href constant", () => {
    expect(POS_STOCK_DOCUMENTS_HREF).toBe("/shop/stock-documents")
    expect(POS_STOCK_COUNT_HREF).toBe("/shop/stock-documents")
  })
})
