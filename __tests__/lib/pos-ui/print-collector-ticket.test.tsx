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
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const collectReport: ReadReportPayload = {
  mode: "COLLECT",
  bangkokDate: "2026-06-01 – 2026-06-07",
  bangkokDateFrom: "2026-06-01",
  bangkokDateTo: "2026-06-07",
  generatedAt: "2026-06-07T10:00:00.000Z",
  staffId: "001",
  staffName: "Collector",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [
    {
      lineKey: "1",
      displayLeft: "0101001-Widget",
      qty: 1,
      amount: 50,
    },
  ],
  paymentLines: [{ key: "CASH", label: "CASH", amount: 50 }],
  grandTotal: 50,
  saleCount: 1,
}

describe("printCollectorTicket", () => {
  const printSpy = jest.spyOn(window, "print").mockImplementation(() => {})

  beforeEach(() => {
    cleanupCollectorTicketPrint()
    document.body.innerHTML = ""
    const mount = document.createElement("div")
    document.body.appendChild(mount)
    const root = createRoot(mount)
    act(() => {
      root.render(<PosCollectorTicketSlip report={collectReport} />)
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
    expect(document.body.classList.contains("printing-collector-ticket")).toBe(true)
    expect(document.querySelector("[data-collector-ticket-print-clone]")).not.toBeNull()
    expect(
      document
        .querySelector("[data-collector-ticket-print-source] pre")
        ?.textContent
    ).toContain("0101001-Widget")
  })

  it("includes signature space in print source", () => {
    expect(
      document.querySelector('[data-testid="collector-ticket-signature-space"]')
    ).not.toBeNull()
  })

  it("rejects non-COLLECT payloads", () => {
    expect(
      printCollectorTicket({ ...collectReport, mode: "Z" })
    ).toBe(false)
    expect(printSpy).not.toHaveBeenCalled()
  })
})
