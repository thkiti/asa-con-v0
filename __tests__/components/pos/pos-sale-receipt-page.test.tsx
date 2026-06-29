/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosSaleReceiptPage } from "@/components/pos/PosSaleReceiptPage"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import * as autoprint from "@/lib/pos-ui/pos-receipt-autoprint"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const sampleReceipt: ReceiptPrintContext = {
  saleId: "sale-1",
  receiptNo: "REC-SH001-202606-0001",
  issuedAt: "2026-01-15T10:00:00.000Z",
  branchCode: "SH001",
  branchName: "Shop",
  branchAddress: null,
  branchPhone: null,
  companyDisplayName: "ASA SERVICES",
  companyTaxId: null,
  machineTaxId: null,
  cashierDisplay: "103-Somsak",
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
  thermalLayouts: DEFAULT_THERMAL_LAYOUTS,
  thermalLayout: DEFAULT_THERMAL_LAYOUTS.RECEIPT,
}

describe("PosSaleReceiptPage", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("wires setupReceiptAutoprint when autoPrint is true", () => {
    const setupSpy = jest.spyOn(autoprint, "setupReceiptAutoprint").mockReturnValue(() => {})
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosSaleReceiptPage receipt={sampleReceipt} autoPrint />)
    })
    expect(setupSpy).toHaveBeenCalledWith(
      expect.objectContaining({ autoPrint: true, onShowCloseHint: expect.any(Function) })
    )
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("hides back to POS controls when autoPrint", () => {
    jest.spyOn(autoprint, "setupReceiptAutoprint").mockReturnValue(() => {})
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosSaleReceiptPage receipt={sampleReceipt} autoPrint />)
    })
    expect(container.textContent).not.toContain("Back to POS")
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("shows close hint when autoprint setup requests it", () => {
    jest.spyOn(autoprint, "setupReceiptAutoprint").mockImplementation((opts) => {
      opts.onShowCloseHint?.()
      return () => {}
    })
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosSaleReceiptPage receipt={sampleReceipt} autoPrint />)
    })
    expect(container.textContent).toContain("You may close this tab")
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("renders receipt audit fields without receipt-lookup COPY watermark", () => {
    jest.spyOn(autoprint, "setupReceiptAutoprint").mockReturnValue(() => {})
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosSaleReceiptPage receipt={sampleReceipt} />)
    })
    expect(container.textContent).toContain("REC-SH001-202606-0001")
    expect(container.textContent).toContain("103-Somsak")
    expect(container.textContent).toContain("Widget")
    expect(container.querySelector('[data-testid="receipt-lookup-copy-watermark"]')).toBeNull()
    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
