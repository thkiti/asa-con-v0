/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosReadReportPanel } from "@/components/pos/PosReadReportPanel"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const baseReport: ReadReportPayload = {
  mode: "X",
  bangkokDate: "2026-06-07",
  generatedAt: "2026-06-07T10:00:00.000Z",
  staffId: "001",
  staffName: "Test",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [],
  paymentLines: [{ key: "CASH", label: "Cash", amount: 0 }],
  grandTotal: 0,
  saleCount: 0,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 0,
}

describe("PosReadReportPanel", () => {
  it("READ X shows close only and no print-and-exit", () => {
    const onClose = jest.fn()
    const onPrintAndExit = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosReadReportPanel
          report={baseReport}
          onClose={onClose}
          onPrintAndExit={onPrintAndExit}
          collectorLayout={DEFAULT_THERMAL_LAYOUTS.COLLECTOR}
          readZLayout={DEFAULT_THERMAL_LAYOUTS.READ_Z}
        />
      )
    })

    expect(container.textContent).toContain("READ X")
    expect(container.textContent).toContain("ณ เวลานี้")
    expect(container.textContent).not.toContain("Print Report and Exit")
    expect(container.querySelector('[aria-label="ปิดรายงาน"]')).not.toBeNull()

    act(() => {
      container.querySelector<HTMLButtonElement>('[aria-label="ปิดรายงาน"]')?.click()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onPrintAndExit).not.toHaveBeenCalled()
  })

  it("READ Z shows Print Report and Exit without close button", () => {
    const onClose = jest.fn()
    const onPrintAndExit = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosReadReportPanel
          report={{ ...baseReport, mode: "Z" }}
          onClose={onClose}
          onPrintAndExit={onPrintAndExit}
          collectorLayout={DEFAULT_THERMAL_LAYOUTS.COLLECTOR}
          readZLayout={DEFAULT_THERMAL_LAYOUTS.READ_Z}
        />
      )
    })

    expect(container.textContent).toContain("READ Z")
    expect(container.textContent).not.toContain("ณ เวลานี้")
    expect(container.querySelector('[aria-label="ปิดรายงาน"]')).toBeNull()
    expect(container.textContent).toContain("Print Report and Exit")

    act(() => {
      ;[...container.querySelectorAll("button")]
        .find((btn) => btn.textContent?.includes("Print Report and Exit"))
        ?.click()
    })
    expect(onPrintAndExit).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })
})
