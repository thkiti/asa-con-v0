/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosSaleReceiptSlip } from "@/components/pos/PosSaleReceiptSlip"
import type { SaleReceiptView } from "@/lib/pos/load-sale-receipt"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const sampleReceipt: SaleReceiptView = {
  saleId: "sale-1",
  receiptNo: "R-test-0001",
  issuedAt: "2026-01-15T10:00:00.000Z",
  branchCode: "SH01",
  branchName: "Shop",
  cashierStaffId: "S001",
  lines: [
    {
      code: "0101001",
      name: "Widget",
      qty: 1,
      unitPrice: "25.00",
      lineTotal: "25.00",
    },
  ],
  total: "25.00",
  paymentMethod: "CASH",
  cashAmount: "25.00",
  change: "0.00",
}

describe("PosSaleReceiptSlip", () => {
  it("renders monospace slip text", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosSaleReceiptSlip receipt={sampleReceipt} />)
    })
    expect(container.textContent).toContain("R-test-0001")
    expect(container.textContent).toContain("CASH")
    expect(container.querySelector(".pos-receipt-slip")).toBeTruthy()
    act(() => root.unmount())
  })
})
