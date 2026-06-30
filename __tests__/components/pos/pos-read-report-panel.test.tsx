/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosReadReportPanel } from "@/components/pos/PosReadReportPanel"
import { ReadZTodayWorkspace } from "@/components/pos/ReadZTodayWorkspace"
import {
  READ_REPORT_PAYMENT_LABEL,
  READ_REPORT_PAYMENT_ORDER,
} from "@/lib/pos/readReportPayment"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import {
  POLICY_SUMMARY_HEADERS,
  resolveReadReportDisplayCatalog,
} from "@/lib/product-groups/management-product-group"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const displayCatalog = resolveReadReportDisplayCatalog(POLICY_SUMMARY_HEADERS, [])
const policyGroupLines = displayCatalog.map((headerCode) => ({
  lineKey: headerCode,
  displayLeft: `${headerCode}-${headerCode}`,
  qty: 0,
  amount: 0,
}))

const baseReport: ReadReportPayload = {
  mode: "X",
  bangkokDate: "2026-06-07",
  generatedAt: "2026-06-07T10:00:00.000Z",
  staffId: "001",
  staffName: "Test",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: policyGroupLines,
  paymentLines: READ_REPORT_PAYMENT_ORDER.map((key) => ({
    key,
    label: READ_REPORT_PAYMENT_LABEL[key],
    amount: 0,
  })),
  grandTotal: 0,
  saleCount: 0,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 0,
}

describe("PosReadReportPanel", () => {
  it("READ X shows close only and all policy group rows", () => {
    const onClose = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosReadReportPanel
          report={baseReport}
          onClose={onClose}
          readZLayout={DEFAULT_THERMAL_LAYOUTS.READ_Z}
        />
      )
    })

    expect(container.textContent).toContain("READ X")
    expect(container.querySelector('[data-testid="pos-read-x-panel"]')).not.toBeNull()
    expect(container.querySelector(".pos-read-x-title-badge")).not.toBeNull()
    expect(container.textContent).toContain("ณ เวลานี้")
    expect(container.textContent).not.toContain("Print Report and Exit")
    expect(container.querySelector('[aria-label="ปิดรายงาน"]')).not.toBeNull()
    expect(container.textContent).toContain("0100900")
    expect(container.textContent).toContain("8001900")

    act(() => {
      container.querySelector<HTMLButtonElement>('[aria-label="ปิดรายงาน"]')?.click()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("READ X payment summary shows CASH, CREDIT CARD, BANK TRANSFER, and TOTAL only", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosReadReportPanel
          report={{
            ...baseReport,
            paymentLines: [
              { key: "CASH", label: "CASH", amount: 100 },
              { key: "CREDIT_CARD", label: "CREDIT CARD", amount: 50 },
              { key: "BANK_TRANSFER", label: "BANK TRANSFER", amount: 25 },
            ],
            grandTotal: 175,
          }}
          onClose={() => {}}
          readZLayout={DEFAULT_THERMAL_LAYOUTS.READ_Z}
        />
      )
    })

    expect(container.textContent).toContain("CASH")
    expect(container.textContent).toContain("CREDIT CARD")
    expect(container.textContent).toContain("BANK TRANSFER")
    expect(container.textContent).toContain("TOTAL")
    expect(container.textContent).not.toContain("PROMPT PAY")
    expect(container.textContent).not.toContain("QR CODE")

    act(() => root.unmount())
  })

  it("READ Z Today workspace shows thermal preview without HO controls", () => {
    const onClose = jest.fn()
    const onPrintReport = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <ReadZTodayWorkspace
          report={{
            ...baseReport,
            mode: "Z",
            paymentLines: [
              { key: "CASH", label: "CASH", amount: 80 },
              { key: "CREDIT_CARD", label: "CREDIT CARD", amount: 0 },
              { key: "BANK_TRANSFER", label: "BANK TRANSFER", amount: 20 },
            ],
            grandTotal: 100,
            netTotal: 90,
            refundTotal: 10,
            refundCount: 1,
          }}
          onClose={onClose}
          onPrintReport={onPrintReport}
          readZLayout={DEFAULT_THERMAL_LAYOUTS.READ_Z}
        />
      )
    })

    expect(container.textContent).toContain("READ Z")
    expect(container.querySelector(".pos-read-z-title-badge")).not.toBeNull()
    expect(container.querySelector(".readZReportColumn")).not.toBeNull()
    expect(container.querySelector(".readZHoControlRow")).toBeNull()
    expect(container.querySelector(".readZTicketCard")).not.toBeNull()
    expect(container.querySelector('[data-testid="pos-read-z-preview"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="pos-read-z-print-preview"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-copy-watermark"]')).toBeNull()
    expect(container.querySelector('[data-testid="pos-read-z-print-report-button"]')).not.toBeNull()
    expect(container.textContent).toContain("PRINT REPORT AND EXIT")
    expect(container.querySelector('[aria-label="ปิดรายงาน"]')).toBeNull()

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="pos-read-z-print-report-button"]')
        ?.click()
    })
    expect(onPrintReport).toHaveBeenCalledTimes(1)

    act(() => {
      container.querySelector<HTMLButtonElement>('[aria-label="Emergency close"]')?.click()
    })
    expect(onClose).toHaveBeenCalledTimes(1)

    act(() => root.unmount())
  })
})
