/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosRefundReceiptPage } from "@/components/pos/PosRefundReceiptPage"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { DEFAULT_RECEIPT_PRINT_SETTINGS } from "@/lib/receipt-settings/defaults"
import { RefundKind } from "@/generated/prisma/client"
import * as autoprint from "@/lib/pos-ui/pos-receipt-autoprint"

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
  settings: DEFAULT_RECEIPT_PRINT_SETTINGS,
}

describe("PosRefundReceiptPage", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("shows print button when autoPrint is false", () => {
    jest.spyOn(autoprint, "setupReceiptAutoprint").mockReturnValue(() => {})
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

  it("wires setupReceiptAutoprint when autoPrint is true", () => {
    const setupSpy = jest.spyOn(autoprint, "setupReceiptAutoprint").mockReturnValue(() => {})
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosRefundReceiptPage receipt={sampleReceipt} autoPrint />)
    })
    expect(setupSpy).toHaveBeenCalledWith(
      expect.objectContaining({ autoPrint: true, onShowCloseHint: expect.any(Function) })
    )
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("hides controls when autoPrint", () => {
    jest.spyOn(autoprint, "setupReceiptAutoprint").mockReturnValue(() => {})
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
