/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot } from "react-dom/client"
import { PosCollectorTicketSlip } from "@/components/pos/PosCollectorTicketSlip"
import {
  cleanupCollectorTicketPrint,
  printCollectorTicket,
} from "@/lib/pos-ui/print-collector-ticket"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

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

describe("printCollectorTicket", () => {
  const printSpy = jest.spyOn(window, "print").mockImplementation(() => {})

  beforeEach(() => {
    cleanupCollectorTicketPrint()
    document.body.innerHTML = ""
    const mount = document.createElement("div")
    document.body.appendChild(mount)
    const root = createRoot(mount)
    act(() => {
      root.render(
        <PosCollectorTicketSlip report={collectReport} layout={collectorLayout} />
      )
    })
  })

  afterEach(() => {
    cleanupCollectorTicketPrint()
    printSpy.mockClear()
  })

  afterAll(() => {
    printSpy.mockRestore()
  })

  it("clones on-screen ticket and prints using existing DOM payload", () => {
    const ok = printCollectorTicket(collectReport)
    expect(ok).toBe(true)
    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(document.body.classList.contains("thermal-clone-print-active")).toBe(true)
    expect(document.querySelector("[data-thermal-print-clone]")).not.toBeNull()
    expect(
      document.querySelector('[data-thermal-print-source="collector"]')?.textContent
    ).toContain("03/06/2026")
  })

  it("includes Phone No / Sign acknowledgement in print source", () => {
    const text =
      document.querySelector('[data-thermal-print-source="collector"]')?.textContent ?? ""
    expect(text).toContain("Phone No")
    expect(text).toContain("Sign")
  })

  it("rejects non-COLLECT payloads", () => {
    expect(printCollectorTicket({ ...collectReport, mode: "Z" })).toBe(false)
    expect(printSpy).not.toHaveBeenCalled()
  })
})
