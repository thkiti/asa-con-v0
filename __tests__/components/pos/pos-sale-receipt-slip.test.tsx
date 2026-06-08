/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosSaleReceiptSlip } from "@/components/pos/PosSaleReceiptSlip"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import { RECEIPT_COLUMNS } from "@/lib/pos/receipt-slip-format"
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
  companyTaxId: "TAX-1",
  machineTaxId: "M-1",
  cashierDisplay: "103-Somsak Kamnuch",
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
  thermalLayouts: {
    ...DEFAULT_THERMAL_LAYOUTS,
    RECEIPT: {
      ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
      headerLine1: "ASA SERVICES",
    },
  },
  thermalLayout: {
    ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
    headerLine1: "ASA SERVICES",
  },
}

describe("PosSaleReceiptSlip", () => {
  it("renders monospace slip text", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosSaleReceiptSlip receipt={sampleReceipt} />)
    })
    expect(container.textContent).toContain("REC-SH001-202606-0001")
    expect(container.textContent).toContain("Machine ID")
    expect(container.textContent).toContain("Receipt")
    expect(container.textContent).toContain("0.00")
    expect(container.textContent).toContain("VAT 7%")
    expect(container.textContent).toContain("ใบกำกับภาษีอย่างย่อ")
    expect(container.textContent).toContain("103-Somsak Kamnuch")
    const slip = container.querySelector(".pos-receipt-slip") as HTMLPreElement
    expect(slip).toBeTruthy()
    expect(slip.style.width).toBe(`${RECEIPT_COLUMNS}ch`)
    expect(slip.style.maxWidth).toBe(`${RECEIPT_COLUMNS}ch`)
    act(() => root.unmount())
  })
})
