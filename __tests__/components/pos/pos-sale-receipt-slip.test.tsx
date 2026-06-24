/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosSaleReceiptSlip } from "@/components/pos/PosSaleReceiptSlip"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { RECEIPT_SLIP_PROPORTIONAL_CLASS } from "@/lib/thermal/receipt-slip-fonts"

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
  it("renders proportional header/footer and monospace body with Thai text", () => {
    const receipt: ReceiptPrintContext = {
      ...sampleReceipt,
      thermalLayout: {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        headerBlockText: "บริษัท เอเอสเอ เซอร์วิสเซส จำกัด",
        headerFontSize: 14,
        footerBlockText: "Thank you",
        footerFontSize: 10,
      },
    }
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosSaleReceiptSlip receipt={receipt} />)
    })
    expect(container.textContent).toContain("บริษัท เอเอสเอ เซอร์วิสเซส จำกัด")
    expect(container.textContent).toContain("ใบกำกับภาษีอย่างย่อ")
    expect(container.textContent).toContain("Thank you")
    expect(container.textContent).toContain("REC-SH001-202606-0001")

    const header = container.querySelector("[data-testid='thermal-ticket-header']") as HTMLElement
    expect(header?.classList.contains(RECEIPT_SLIP_PROPORTIONAL_CLASS)).toBe(true)
    expect(header?.style.fontSize).toBe("14px")

    const identity = container.querySelector("[data-testid='receipt-slip-identity']")
    expect(identity?.classList.contains(RECEIPT_SLIP_PROPORTIONAL_CLASS)).toBe(true)

    const mono = container.querySelector("[data-testid='thermal-ticket-body']")
    expect(mono).toBeTruthy()

    const refStaff = container.querySelector("[data-testid='receipt-slip-ref-staff']")
    expect(refStaff?.classList.contains(RECEIPT_SLIP_PROPORTIONAL_CLASS)).toBe(true)

    const footer = container.querySelector("[data-testid='thermal-ticket-footer']") as HTMLElement
    expect(footer?.style.fontSize).toBe("10px")
    act(() => root.unmount())
  })

  it("steps font size beyond legacy small/normal/large", () => {
    const receipt: ReceiptPrintContext = {
      ...sampleReceipt,
      thermalLayout: {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        headerBlockText: "ASA SERVICES",
        headerFontSize: 16,
        footerBlockText: "Thank you",
        footerFontSize: 11,
      },
    }
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosSaleReceiptSlip receipt={receipt} />)
    })
    const header = container.querySelector("[data-testid='thermal-ticket-header']") as HTMLElement
    expect(header?.style.fontSize).toBe("16px")
    const footer = container.querySelector("[data-testid='thermal-ticket-footer']") as HTMLElement
    expect(footer?.style.fontSize).toBe("11px")
    act(() => root.unmount())
  })

  it("omits empty header and footer blocks", () => {
    const receipt: ReceiptPrintContext = {
      ...sampleReceipt,
      thermalLayout: {
        ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
        headerBlockText: null,
        footerBlockText: null,
      },
    }
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosSaleReceiptSlip receipt={receipt} />)
    })
    expect(container.querySelector("[data-testid='thermal-ticket-header']")).toBeNull()
    expect(container.querySelector("[data-testid='thermal-ticket-footer']")).toBeNull()
    expect(container.textContent).toContain("REC-SH001-202606-0001")
    act(() => root.unmount())
  })

  it("renders ref/staff region and branch identity", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosSaleReceiptSlip receipt={sampleReceipt} />)
    })
    expect(container.textContent).toContain("Ref.")
    expect(container.textContent).toContain("REC-SH001-202606-0001")
    expect(container.textContent).toContain("Staff")
    expect(container.textContent).toContain("M/C No. M-1")
    expect(container.querySelector("[data-testid='receipt-slip-machine-line']")).toBeTruthy()
    expect(container.textContent).toContain("SH001 • Shop")
    expect(container.textContent).toContain("0.00")
    expect(container.textContent).toContain("VAT 7%")
    expect(container.textContent).toContain("ใบกำกับภาษีอย่างย่อ")
    expect(container.textContent).toContain("103-Somsak Kamnuch")
    const slip = container.querySelector(".thermal-ticket-slip") as HTMLElement
    expect(slip).toBeTruthy()
    act(() => root.unmount())
  })
})
