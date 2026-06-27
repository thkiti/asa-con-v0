/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosRefundReceiptPage } from "@/components/pos/PosRefundReceiptPage"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { RefundKind } from "@/generated/prisma/client"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import * as autoprint from "@/lib/pos-ui/pos-thermal-ticket-autoprint"
import { printThermalSlipClone } from "@/lib/thermal/print-dom"
import { POS_REFUND_RECEIPT_PRINT_SOURCE } from "@/lib/pos-ui/pos-thermal-ticket-print"

jest.mock("@/lib/thermal/print-dom", () => ({
  printThermalSlipClone: jest.fn(() => true),
  thermalPrintSourceSelector: jest.fn(
    (kind: string) => `[data-thermal-print-source="${kind}"]`
  ),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const sampleReceipt: RefundReceiptPrintContext = {
  refundId: "refund-1",
  refundNo: "REF-SH001-202606-0001",
  issuedAt: "2026-06-04T12:00:00.000Z",
  kind: RefundKind.SALE_LINKED,
  amount: "50.00",
  reason: null,
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
  originalReceiptId: "rcpt-1",
  originalReceiptNo: "REC-SH001-202606-0001",
  originalReceiptTotal: "860.00",
  thermalLayouts: DEFAULT_THERMAL_LAYOUTS,
  thermalLayout: resolveThermalLayout("REFUND", DEFAULT_THERMAL_LAYOUTS),
}

describe("PosRefundReceiptPage", () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it("shows print button when autoPrint is false", () => {
    jest.spyOn(autoprint, "setupThermalTicketAutoprint").mockReturnValue(() => {})
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosRefundReceiptPage receipt={sampleReceipt} />)
    })
    expect(container.textContent).toContain("Print refund receipt")
    expect(container.textContent).toContain("Back to POS")
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("uses thermal print source and framed slip for clone print path", () => {
    jest.spyOn(autoprint, "setupThermalTicketAutoprint").mockReturnValue(() => {})
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosRefundReceiptPage receipt={sampleReceipt} />)
    })
    expect(
      container.querySelector(
        `[data-thermal-print-source="${POS_REFUND_RECEIPT_PRINT_SOURCE}"]`
      )
    ).not.toBeNull()
    expect(container.querySelector(".receipt-setup-preview-slip")).not.toBeNull()
    const injectedStyle = Array.from(document.querySelectorAll("style")).find((style) =>
      style.textContent?.includes("thermal-clone-print-active")
    )
    expect(injectedStyle).toBeTruthy()
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("wires setupThermalTicketAutoprint when autoPrint is true", () => {
    const setupSpy = jest
      .spyOn(autoprint, "setupThermalTicketAutoprint")
      .mockReturnValue(() => {})
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosRefundReceiptPage receipt={sampleReceipt} autoPrint />)
    })
    expect(setupSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        autoPrint: true,
        printSourceKind: POS_REFUND_RECEIPT_PRINT_SOURCE,
        onShowCloseHint: expect.any(Function),
      })
    )
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("prints via thermal clone when print button is clicked", () => {
    jest.spyOn(autoprint, "setupThermalTicketAutoprint").mockReturnValue(() => {})
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosRefundReceiptPage receipt={sampleReceipt} />)
    })
    const printBtn = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Print refund receipt")
    )
    act(() => {
      printBtn!.click()
    })
    expect(printThermalSlipClone).toHaveBeenCalledWith(
      `[data-thermal-print-source="${POS_REFUND_RECEIPT_PRINT_SOURCE}"]`
    )
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("hides controls when autoPrint", () => {
    jest.spyOn(autoprint, "setupThermalTicketAutoprint").mockReturnValue(() => {})
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosRefundReceiptPage receipt={sampleReceipt} autoPrint />)
    })
    expect(container.textContent).not.toContain("Back to POS")
    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
