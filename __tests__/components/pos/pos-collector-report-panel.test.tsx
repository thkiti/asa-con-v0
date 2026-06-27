/**
 * @jest-environment jsdom
 */
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { PosCollectorReportPanel } from "@/components/pos/PosCollectorReportPanel"
import { printCollectorTicket } from "@/lib/pos-ui/print-collector-ticket"
import { printCollectorReportAndExit } from "@/lib/pos-ui/print-read-report"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

jest.mock("@/lib/pos-ui/read-report-client", () => ({
  fetchPosCollectReport: jest.fn(),
}))

import { fetchPosCollectReport } from "@/lib/pos-ui/read-report-client"

const mockedFetchCollect = fetchPosCollectReport as jest.MockedFunction<
  typeof fetchPosCollectReport
>

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const collectReport: ReadReportPayload = {
  mode: "COLLECT",
  bangkokDate: "2026-06-03 – 2026-06-05",
  bangkokDateFrom: "2026-06-03",
  bangkokDateTo: "2026-06-05",
  generatedAt: "2026-06-26T08:16:00.000Z",
  staffId: "001",
  staffName: "Kiti Thengtrirat",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [],
  paymentLines: [],
  dailyCashLines: [
    { salesDateYmd: "2026-06-03", cashAmount: 50, ticketCount: 1 },
  ],
  grandTotal: 50,
  saleCount: 1,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 50,
}

const collectorLayout = resolveThermalLayout("COLLECTOR", DEFAULT_THERMAL_LAYOUTS)

function renderPanel(
  props: Partial<ComponentProps<typeof PosCollectorReportPanel>> = {}
) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      <PosCollectorReportPanel
        report={collectReport}
        collectorLayout={collectorLayout}
        onPrintReport={() => {}}
        onClose={() => {}}
        {...props}
      />
    )
  })

  return {
    container,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

describe("PosCollectorReportPanel", () => {
  const printSpy = jest.spyOn(window, "print").mockImplementation(() => {})

  afterEach(() => {
    printSpy.mockClear()
    document.body.innerHTML = ""
    mockedFetchCollect.mockReset()
  })

  afterAll(() => {
    printSpy.mockRestore()
  })

  it("shows visible thermal slip using shared renderer", () => {
    const { container, unmount } = renderPanel()

    const preview = container.querySelector('[data-testid="pos-collector-report-preview"]')
    const printSource = container.querySelector('[data-thermal-print-source="collector"]')
    const paper = container.querySelector(".receipt-setup-preview-slip")
    const previewFrame = preview?.querySelector(".receipt-setup-preview")

    expect(preview).not.toBeNull()
    expect(previewFrame).not.toBeNull()
    expect(paper).not.toBeNull()
    expect(printSource).not.toBeNull()
    expect(paper?.textContent).toContain("03/06/2026")
    expect(paper?.textContent).toContain("TOTAL CASH")
    expect(preview?.querySelector('[data-testid="thermal-ticket-header"]')).not.toBeNull()
    expect(preview?.contains(paper)).toBe(true)
    expect(preview?.querySelector('[data-testid="receipt-lookup-copy-watermark"]')).toBeNull()

    unmount()
  })

  it("renders ticket on white paper frame, not directly on orange panel", () => {
    const { container, unmount } = renderPanel()

    const panel = container.querySelector('[data-testid="pos-collector-report-panel"]')
    const paper = panel?.querySelector(".receipt-setup-preview-slip")
    expect(paper).not.toBeNull()
    expect(paper?.classList.contains("thermal-ticket-slip")).toBe(true)

    const orangeChildren = Array.from(
      panel?.querySelector('[data-testid="pos-collector-report-preview"]')?.children ?? []
    )
    expect(orangeChildren.some((el) => el.classList.contains("receipt-setup-preview"))).toBe(
      true
    )
    expect(
      orangeChildren.some((el) => el.classList.contains("thermal-ticket-slip"))
    ).toBe(false)

    unmount()
  })

  it("prints the same on-screen ticket via thermal clone path", () => {
    const { container, unmount } = renderPanel()

    const ok = printCollectorTicket(collectReport)
    expect(ok).toBe(true)
    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(
      document.querySelector('[data-thermal-print-source="collector"]')?.textContent
    ).toContain("03/06/2026")

    unmount()
  })

  it("PRINT REPORT persists, prints, and exits via panel handler", async () => {
    const onExit = jest.fn()
    const onPrintReport = jest.fn(() => {
      void printCollectorReportAndExit(
        {
          staffId: "001",
          password: "secret",
          dateFrom: "2026-06-03",
          dateTo: "2026-06-05",
        },
        onExit
      )
    })

    mockedFetchCollect.mockResolvedValue({
      ok: true,
      report: { ...collectReport, collectNo: "COL-SH001-202606-0001" },
    })

    const { container, unmount } = renderPanel({ onPrintReport })

    const printBtn = container.querySelector(
      '[data-testid="pos-collector-print-report-button"]'
    ) as HTMLButtonElement

    act(() => {
      printBtn.click()
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(onPrintReport).toHaveBeenCalledTimes(1)
    expect(mockedFetchCollect).toHaveBeenCalledWith(
      expect.objectContaining({ persist: true })
    )
    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(1)

    unmount()
  })
})
