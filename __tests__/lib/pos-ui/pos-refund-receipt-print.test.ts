import {
  navigatePosRefundReceiptPrintTab,
  openPosRefundReceiptPrint,
  openPosRefundReceiptPrintTab,
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

  it("opens blank tab synchronously for popup-safe refund print", () => {
    const openFn = jest.fn().mockReturnValue({ closed: false, location: { href: "" } })
    openPosRefundReceiptPrintTab(openFn)
    expect(openFn).toHaveBeenCalledWith("about:blank", "_blank")
  })

  it("navigates pre-opened tab after refund succeeds", () => {
    const printTab = { closed: false, location: { href: "" }, close: jest.fn() }
    navigatePosRefundReceiptPrintTab("refund-1", printTab as unknown as Window)
    expect(printTab.location.href).toBe("/shop/refund-receipt/refund-1?autoprint=1")
  })

  it("falls back to direct print when pre-opened tab is unavailable", () => {
    const openFn = jest.fn()
    navigatePosRefundReceiptPrintTab("refund-1", null, openFn)
    expect(openFn).toHaveBeenCalledWith(
      "/shop/refund-receipt/refund-1?autoprint=1",
      "_blank"
    )
  })
})
