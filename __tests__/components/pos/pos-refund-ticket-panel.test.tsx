/**
 * @jest-environment jsdom
 */
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { PosRefundTicketPanel } from "@/components/pos/PosRefundTicketPanel"
import { POS_REFUND_RECEIPT_PRINT_SOURCE } from "@/lib/pos-ui/pos-thermal-ticket-print"
import { printRefundTicket } from "@/lib/pos-ui/print-refund-ticket"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const refundThermalLayout = resolveThermalLayout("REFUND", DEFAULT_THERMAL_LAYOUTS)
const receiptThermalLayout = resolveThermalLayout("RECEIPT", DEFAULT_THERMAL_LAYOUTS)

const sampleReceipt: RefundReceiptPrintContext = {
  refundId: "preview",
  refundNo: "PREVIEW",
  issuedAt: "2026-06-06T14:32:00.000Z",
  kind: "SALE_LINKED",
  amount: "50.00",
  reason: "ผิดแบบ (Key Blank mistake) ใส่ไม่เข้า",
  branchId: "b1",
  branchCode: "SH001",
  branchName: "Chidlom",
  branchAddress: null,
  branchPhone: null,
  companyDisplayName: receiptThermalLayout.headerLine1,
  companyTaxId: null,
  machineTaxId: null,
  cashierDisplay: "103-Somsak",
  saleId: "sale-1",
  originalReceiptId: "rcpt-1",
  originalReceiptNo: "REC-SH001-202606-0001",
  originalReceiptTotal: "100.00",
  thermalLayouts: {
    ...DEFAULT_THERMAL_LAYOUTS,
    RECEIPT: receiptThermalLayout,
    REFUND: refundThermalLayout,
  },
  thermalLayout: refundThermalLayout,
}

function renderPanel(props: Partial<ComponentProps<typeof PosRefundTicketPanel>> = {}) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)

  const defaults: ComponentProps<typeof PosRefundTicketPanel> = {
    receipt: sampleReceipt,
    pending: false,
    error: null,
    onPrintRefund: () => {},
    onClose: () => {},
  }

  act(() => {
    root.render(<PosRefundTicketPanel {...defaults} {...props} />)
  })

  return {
    container,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

describe("PosRefundTicketPanel", () => {
  const printSpy = jest.spyOn(window, "print").mockImplementation(() => {})

  afterEach(() => {
    printSpy.mockClear()
    document.body.innerHTML = ""
  })

  afterAll(() => {
    printSpy.mockRestore()
  })

  it("shows thermal slip with print source for clone print", () => {
    const { container, unmount } = renderPanel()

    expect(container.querySelector('[data-testid="pos-refund-ticket-panel"]')).not.toBeNull()
    expect(
      container.querySelector(
        `[data-thermal-print-source="${POS_REFUND_RECEIPT_PRINT_SOURCE}"]`
      )
    ).not.toBeNull()
    expect(container.textContent).toContain("REC-SH001-202606-0001")

    unmount()
  })

  it("calls onPrintRefund from PRINT REFUND button", () => {
    const onPrintRefund = jest.fn()
    const { container, unmount } = renderPanel({ onPrintRefund })

    const printBtn = container.querySelector(
      '[data-testid="pos-refund-print-button"]'
    ) as HTMLButtonElement
    act(() => {
      printBtn.click()
    })

    expect(onPrintRefund).toHaveBeenCalledTimes(1)
    unmount()
  })

  it("prints on-screen slip via thermal clone path", () => {
    const { unmount } = renderPanel()

    const ok = printRefundTicket()
    expect(ok).toBe(true)
    expect(printSpy).toHaveBeenCalledTimes(1)

    unmount()
  })

  it("shows error without closing panel", () => {
    const { container, unmount } = renderPanel({
      error: "Refund amount exceeds remaining refundable balance",
    })

    expect(container.textContent).toContain(
      "Refund amount exceeds remaining refundable balance"
    )
    expect(container.querySelector('[data-testid="pos-refund-ticket-panel"]')).not.toBeNull()

    unmount()
  })
})
