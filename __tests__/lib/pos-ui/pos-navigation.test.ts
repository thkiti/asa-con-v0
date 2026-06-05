import {
  POS_STOCK_COUNT_HREF,
  POS_STOCK_DOCUMENTS_HREF,
  stockDocumentNewHref,
} from "@/lib/pos-ui/pos-navigation"

describe("pos-ui/pos-navigation", () => {
  it("builds stock document new href with from=shop", () => {
    expect(stockDocumentNewHref("TRANSFER_OUT")).toBe(
      "/shop/stock-documents/new?type=TRANSFER_OUT&from=shop"
    )
  })

  it("routes STOCK COUNT to stock documents list", () => {
    expect(POS_STOCK_DOCUMENTS_HREF).toBe("/shop/stock-documents")
    expect(POS_STOCK_COUNT_HREF).toBe("/shop/stock-documents")
  })
})
