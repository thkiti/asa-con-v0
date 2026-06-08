/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosRefundReceiptSlip } from "@/components/pos/PosRefundReceiptSlip"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { RefundKind } from "@/generated/prisma/client"
import { RECEIPT_COLUMNS } from "@/lib/pos/receipt-slip-format"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const sampleReceipt: RefundReceiptPrintContext = {
  refundId: "refund-1",
  refundNo: "REF-SH001-202606-0001",
  issuedAt: "2026-06-04T12:00:00.000Z",
  kind: RefundKind.SALE_LINKED,
  amount: "50.00",
  reason: "Defective item",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Shop",
  branchAddress: null,
  branchPhone: null,
  companyDisplayName: "ASA SERVICES",
  companyTaxId: "TAX-1",
  machineTaxId: "M-1",
  cashierDisplay: "103-Somsak Kamnuch",
  saleId: "sale-1",
  originalReceiptId: "rcpt-1",
  originalReceiptNo: "REC-SH001-202606-0001",
  thermalLayouts: DEFAULT_THERMAL_LAYOUTS,
  thermalLayout: resolveThermalLayout("REFUND", DEFAULT_THERMAL_LAYOUTS),
}

describe("PosRefundReceiptSlip", () => {
  it("renders monospace slip text in pre", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosRefundReceiptSlip receipt={sampleReceipt} />)
    })
    expect(container.textContent).toContain("REFUND RECEIPT")
    expect(container.textContent).toContain("REF-SH001-202606-0001")
    expect(container.textContent).toContain("REC-SH001-202606-0001")
    expect(container.textContent).toContain("50.00")
    const slip = container.querySelector(".pos-receipt-slip") as HTMLPreElement
    expect(slip).toBeTruthy()
    expect(slip.style.width).toBe(`${RECEIPT_COLUMNS}ch`)
    expect(slip.style.maxWidth).toBe(`${RECEIPT_COLUMNS}ch`)
    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
