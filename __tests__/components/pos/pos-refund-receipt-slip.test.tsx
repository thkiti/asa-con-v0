/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosRefundReceiptSlip } from "@/components/pos/PosRefundReceiptSlip"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { RefundKind } from "@/generated/prisma/client"
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
  originalReceiptTotal: "860.00",
  thermalLayouts: {
    ...DEFAULT_THERMAL_LAYOUTS,
    REFUND: {
      ...DEFAULT_THERMAL_LAYOUTS.REFUND,
      headerBlockText: "Refund Header",
      subHeaderBlockText: "Refund Sub Header",
      footerBlockText: "Refund Footer",
    },
  },
  thermalLayout: {
    ...resolveThermalLayout("REFUND", DEFAULT_THERMAL_LAYOUTS),
    headerBlockText: "Refund Header",
    subHeaderBlockText: "Refund Sub Header",
    footerBlockText: "Refund Footer",
  },
}

describe("PosRefundReceiptSlip", () => {
  it("renders unified thermal ticket slip", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosRefundReceiptSlip receipt={sampleReceipt} />)
    })
    expect(container.textContent).not.toContain("REFUND RECEIPT")
    expect(container.textContent).toContain("Ref. No.")
    expect(container.textContent).toContain("Original Receipt No.")
    expect(container.querySelector('[data-testid="receipt-slip-structured-info-block"]')).not.toBeNull()
    expect(container.textContent).toContain("REASON:")
    expect(container.querySelector('[data-testid="refund-ticket-reason"]')).not.toBeNull()
    expect(container.textContent).toContain("REFUND AMOUNT")
    expect(container.textContent).not.toContain("REFUND AMOUNT :")
    expect(container.textContent).toContain("Refund Header")
    expect(container.textContent).toContain("Refund Sub Header")
    expect(container.textContent).toContain("Refund Footer")
    expect(container.textContent).toContain("REF-SH001-202606-0001")
    expect(container.textContent).toContain("REC-SH001-202606-0001")
    expect(container.textContent).toContain("50.00")
    expect(container.textContent).toContain("Phone No.")
    expect(container.textContent).toContain("Sign")
    expect(container.textContent).toContain("TOTAL AMOUNT")
    expect(container.textContent).toContain("860.00")
    expect(
      container.querySelector('[data-testid="ticket-setup-phone-field-inline-guide"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="ticket-setup-sign-field-inline-guide"]')
    ).not.toBeNull()
    expect(container.querySelector('[data-testid="ticket-setup-ack-cut-separator"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="ticket-setup-ack-leading-blank"]')).not.toBeNull()
    expect(
      container.querySelector('[data-testid="ticket-setup-phone-field"] .receipt-setup-ack-blank-line')
    ).not.toBeNull()
    const slip = container.querySelector(".thermal-ticket-slip") as HTMLElement
    expect(slip).toBeTruthy()
    expect(container.querySelector("[data-testid='thermal-ticket-header']")).toBeTruthy()
    expect(container.querySelector("[data-testid='thermal-ticket-subheader']")).toBeTruthy()
    expect(container.querySelector("[data-testid='thermal-ticket-footer']")).toBeTruthy()
    expect(container.querySelector("[data-testid='receipt-slip-info-block']")).toBeTruthy()
    expect(container.querySelector(".receipt-setup-ack-body-indent")).not.toBeNull()
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("uses 80mm framed slip when framed is true", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosRefundReceiptSlip receipt={sampleReceipt} framed />)
    })
    expect(container.querySelector(".receipt-setup-preview-slip")).not.toBeNull()
    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
