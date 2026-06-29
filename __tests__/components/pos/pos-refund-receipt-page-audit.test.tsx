/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosRefundReceiptPage } from "@/components/pos/PosRefundReceiptPage"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import * as autoprint from "@/lib/pos-ui/pos-thermal-ticket-autoprint"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const sampleRefund: RefundReceiptPrintContext = {
  refundId: "refund-1",
  refundNo: "REF-SH001-202606-0002",
  issuedAt: "2026-01-15T11:00:00.000Z",
  kind: "SALE_LINKED",
  amount: "25.00",
  reason: "Customer return",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Shop",
  branchAddress: null,
  branchPhone: null,
  companyDisplayName: "ASA SERVICES",
  companyTaxId: null,
  machineTaxId: null,
  cashierDisplay: "103-Somsak",
  saleId: "sale-1",
  originalReceiptId: "receipt-1",
  originalReceiptNo: "REC-SH001-202606-0001",
  originalReceiptTotal: "100.00",
  thermalLayouts: DEFAULT_THERMAL_LAYOUTS,
  thermalLayout: DEFAULT_THERMAL_LAYOUTS.REFUND,
}

describe("PosRefundReceiptPage finance audit reprint", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("wires thermal autoprint when autoPrint is true", () => {
    const setupSpy = jest
      .spyOn(autoprint, "setupThermalTicketAutoprint")
      .mockReturnValue(() => {})
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosRefundReceiptPage receipt={sampleRefund} autoPrint />)
    })
    expect(setupSpy).toHaveBeenCalledWith(
      expect.objectContaining({ autoPrint: true, onShowCloseHint: expect.any(Function) })
    )
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("renders refund audit fields without receipt-lookup COPY watermark", () => {
    jest.spyOn(autoprint, "setupThermalTicketAutoprint").mockReturnValue(() => {})
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosRefundReceiptPage receipt={sampleRefund} />)
    })
    expect(container.textContent).toContain("REF-SH001-202606-0002")
    expect(container.textContent).toContain("REC-SH001-202606-0001")
    expect(container.textContent).toContain("Customer return")
    expect(container.querySelector('[data-testid="receipt-lookup-copy-watermark"]')).toBeNull()
    expect(container.querySelector(".pos-receipt-print-screen")).not.toBeNull()
    expect(container.querySelector(".theme-btn-secondary")).not.toBeNull()
    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
