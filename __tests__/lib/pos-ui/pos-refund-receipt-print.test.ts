import {
  openPosRefundReceiptPrint,
  posRefundReceiptPrintUrl,
} from "@/lib/pos-ui/pos-refund-receipt-print"

describe("pos-refund-receipt-print", () => {
  it("builds autoprint refund receipt URL", () => {
    expect(posRefundReceiptPrintUrl("refund-abc")).toBe(
      "/shop/refund-receipt/refund-abc?autoprint=1"
    )
  })

  it("encodes refund id in URL", () => {
    expect(posRefundReceiptPrintUrl("refund/special")).toBe(
      "/shop/refund-receipt/refund%2Fspecial?autoprint=1"
    )
  })

  it("opens refund receipt in new window", () => {
    const openFn = jest.fn()
    openPosRefundReceiptPrint("refund-1", openFn)
    expect(openFn).toHaveBeenCalledWith(
      "/shop/refund-receipt/refund-1?autoprint=1",
      "_blank"
    )
  })
})
