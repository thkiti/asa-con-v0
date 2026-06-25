import {
  navigatePosReceiptPrintTab,
  openPosReceiptPrint,
  openPosReceiptPrintTab,
  posReceiptPrintUrl,
} from "@/lib/pos-ui/pos-receipt-print"

describe("pos-receipt-print", () => {
  it("builds autoprint receipt URL", () => {
    expect(posReceiptPrintUrl("sale-abc")).toBe("/shop/receipt/sale-abc?autoprint=1")
  })

  it("opens receipt in new window", () => {
    const openFn = jest.fn()
    openPosReceiptPrint("sale-1", openFn)
    expect(openFn).toHaveBeenCalledWith("/shop/receipt/sale-1?autoprint=1", "_blank")
  })

  it("opens blank tab synchronously for popup-safe checkout print", () => {
    const openFn = jest.fn().mockReturnValue({ closed: false, location: { href: "" } })
    openPosReceiptPrintTab(openFn)
    expect(openFn).toHaveBeenCalledWith("about:blank", "_blank")
  })

  it("navigates pre-opened tab after checkout succeeds", () => {
    const printTab = { closed: false, location: { href: "" }, close: jest.fn() }
    navigatePosReceiptPrintTab("sale-1", printTab as unknown as Window)
    expect(printTab.location.href).toBe("/shop/receipt/sale-1?autoprint=1")
  })

  it("falls back to direct print when pre-opened tab is unavailable", () => {
    const openFn = jest.fn()
    navigatePosReceiptPrintTab("sale-1", null, openFn)
    expect(openFn).toHaveBeenCalledWith("/shop/receipt/sale-1?autoprint=1", "_blank")
  })
})
