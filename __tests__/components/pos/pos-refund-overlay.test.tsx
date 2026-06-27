/**
 * @jest-environment jsdom
 */
import { act, type ComponentProps } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosRefundOverlay } from "@/components/pos/PosRefundOverlay"
import { REFUND_REASONS } from "@/lib/pos/refund-reasons"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const sampleReceipts = [
  {
    receiptNo: "REC-SH001-202606-0001",
    saleId: "sale-1",
    issuedAt: "2026-06-06T14:32:00.000Z",
    total: "250.00",
    alreadyRefunded: "0.00",
    remaining: "250.00",
    cashierDisplay: "103-Somsak",
  },
]

const samplePreview = {
  saleId: "sale-1",
  saleTotal: "250.00",
  refundedTotal: "0.00",
  remainingRefundable: "250.00",
  originalReceiptId: "rcpt-1",
  originalReceiptNo: "REC-SH001-202606-0001",
  items: [
    { name: "KEY BLANK A", qty: 1, lineTotal: "50.00" },
    { name: "CUTTING SERVICE", qty: 1, lineTotal: "30.00" },
    { name: "KEY RING", qty: 1, lineTotal: "20.00" },
  ],
}

function renderOverlay(props: Partial<ComponentProps<typeof PosRefundOverlay>> = {}) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root: Root = createRoot(container)

  const defaults: ComponentProps<typeof PosRefundOverlay> = {
    receiptNo: "",
    receipts: sampleReceipts,
    receiptsLoading: false,
    onReceiptSelect: () => {},
    amount: "",
    onAmountChange: () => {},
    reasonCode: "",
    onReasonCodeChange: () => {},
    preview: null,
    lookupPending: false,
    pending: false,
    error: null,
    onConfirm: () => {},
    onClose: () => {},
  }

  act(() => {
    root.render(<PosRefundOverlay {...defaults} {...props} />)
  })

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe("PosRefundOverlay", () => {
  it("renders Recent Sales dropdown with receipt number and issue date", () => {
    const { container, unmount } = renderOverlay()

    expect(container.textContent).toContain("Recent Sales")
    expect(container.innerHTML).toContain("REC-SH001-202606-0001 / 06.06.2026")
    expect(container.textContent).not.toContain("Sale 250.00")
    expect(container.textContent).not.toContain("Refundable")

    for (const row of REFUND_REASONS) {
      expect(container.innerHTML).toContain(row.label)
    }

    expect(container.textContent?.toLowerCase()).not.toContain("look up receipt")
    expect(container.querySelector('input[aria-label="Manual receipt number"]')).toBeNull()
    expect(container.textContent).not.toContain("GOODWILL")

    unmount()
  })

  it("shows empty receipt message when no eligible receipts", () => {
    const { container, unmount } = renderOverlay({ receipts: [] })

    expect(container.textContent).toContain("Receipt Preview")
    expect(container.textContent).toContain("ไม่พบใบเสร็จในช่วง 2 เดือนล่าสุด")
    expect(container.textContent).toContain("ไม่สามารถดำเนินการคืนเงินได้")

    unmount()
  })

  it("keeps Receipt Preview panel visible before a receipt is selected", () => {
    const { container, unmount } = renderOverlay()

    expect(container.textContent).toContain("Receipt Preview")
    expect(container.textContent).toContain("Select a receipt to preview sale items")
    expect(container.querySelector('[aria-label="Receipt preview"]')).not.toBeNull()

    unmount()
  })

  it("selecting receipt triggers preview callback", () => {
    const onReceiptSelect = jest.fn()
    const { container, unmount } = renderOverlay({ onReceiptSelect })

    const select = container.querySelector(
      'select[aria-label="Recent sales"]'
    ) as HTMLSelectElement
    expect(select).not.toBeNull()

    act(() => {
      select.value = "REC-SH001-202606-0001"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })

    expect(onReceiptSelect).toHaveBeenCalledWith("REC-SH001-202606-0001")

    unmount()
  })

  it("shows sale items and refund summary after preview loads", () => {
    const { container, unmount } = renderOverlay({
      receiptNo: "REC-SH001-202606-0001",
      preview: samplePreview,
    })

    expect(container.textContent).toContain("KEY BLANK A")
    expect(container.textContent).toContain("CUTTING SERVICE")
    expect(container.textContent).toContain("KEY RING")
    expect(container.textContent).toContain("Remaining: 250.00")

    unmount()
  })

  it("disables confirm until preview and reason are set", () => {
    const { container, unmount } = renderOverlay({
      receiptNo: "REC-SH001-202606-0001",
      amount: "250.00",
      preview: samplePreview,
    })

    const confirmButton = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Preview refund ticket")
    )
    expect(confirmButton?.disabled).toBe(true)

    unmount()

    const enabled = renderOverlay({
      receiptNo: "REC-SH001-202606-0001",
      amount: "250.00",
      reasonCode: "KEY_BLANK_MISTAKE",
      preview: samplePreview,
    })

    const enabledButton = Array.from(enabled.container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Preview refund ticket")
    )
    expect(enabledButton?.disabled).toBe(false)

    enabled.unmount()
  })
})
