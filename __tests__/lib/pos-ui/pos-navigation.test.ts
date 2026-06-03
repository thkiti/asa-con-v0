import {
  POS_ORDER_HREF,
  POS_STOCK_COUNT_HREF,
  stockDocumentNewHref,
} from "@/lib/pos-ui/pos-navigation"

describe("pos-ui/pos-navigation", () => {
  it("builds ORDER href with from=shop", () => {
    expect(POS_ORDER_HREF).toBe(
      "/shop/stock-documents/new?type=TRANSFER_OUT&from=shop"
    )
    expect(stockDocumentNewHref("TRANSFER_OUT")).toBe(POS_ORDER_HREF)
  })

  it("builds STOCK COUNT href with from=shop", () => {
    expect(POS_STOCK_COUNT_HREF).toBe(
      "/shop/stock-documents/new?type=ADJUSTMENT&from=shop"
    )
  })
})
