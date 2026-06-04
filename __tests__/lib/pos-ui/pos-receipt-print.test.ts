import { openPosReceiptPrint, posReceiptPrintUrl } from "@/lib/pos-ui/pos-receipt-print"

describe("pos-receipt-print", () => {
  it("builds autoprint receipt URL", () => {
    expect(posReceiptPrintUrl("sale-abc")).toBe("/shop/receipt/sale-abc?autoprint=1")
  })

  it("opens receipt in new window", () => {
    const openFn = jest.fn()
    openPosReceiptPrint("sale-1", openFn)
    expect(openFn).toHaveBeenCalledWith("/shop/receipt/sale-1?autoprint=1", "_blank")
  })
})
