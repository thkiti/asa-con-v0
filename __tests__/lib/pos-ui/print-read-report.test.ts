/**
 * @jest-environment jsdom
 */
import {
  canPrintPosReadReport,
  printPosReadReport,
} from "@/lib/pos-ui/print-read-report"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

const baseReport: ReadReportPayload = {
  mode: "Z",
  bangkokDate: "2026-06-07",
  generatedAt: "2026-06-07T10:00:00.000Z",
  staffId: "001",
  staffName: "Test",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [],
  paymentLines: [],
  grandTotal: 0,
  saleCount: 0,
}

describe("printPosReadReport", () => {
  const printSpy = jest.spyOn(window, "print").mockImplementation(() => {})

  afterEach(() => {
    document.body.classList.remove("pos-read-z-print-active")
    printSpy.mockClear()
  })

  afterAll(() => {
    printSpy.mockRestore()
  })

  it("allows print for Z and COLLECT only", () => {
    expect(canPrintPosReadReport({ ...baseReport, mode: "Z" })).toBe(true)
    expect(canPrintPosReadReport({ ...baseReport, mode: "COLLECT" })).toBe(true)
    expect(canPrintPosReadReport({ ...baseReport, mode: "X" })).toBe(false)
    expect(canPrintPosReadReport(null)).toBe(false)
  })

  it("prints Z using the passed payload without fetching", () => {
    const report = { ...baseReport, grandTotal: 999 }
    const result = printPosReadReport(report)
    expect(result).toBe(true)
    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(document.body.classList.contains("pos-read-z-print-active")).toBe(true)
  })

  it("routes COLLECT to collector ticket print source", () => {
    document.body.innerHTML = `
      <div data-collector-ticket-print-source class="collector-ticket-print-area">
        <pre>ticket</pre>
        <div data-testid="collector-ticket-signature-space" class="collector-ticket-signature-space"></div>
      </div>
    `
    const result = printPosReadReport({ ...baseReport, mode: "COLLECT" })
    expect(result).toBe(true)
    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(document.body.classList.contains("printing-collector-ticket")).toBe(true)
    document.body.classList.remove("printing-collector-ticket")
    document.querySelector("[data-collector-ticket-print-clone]")?.remove()
  })

  it("no-ops for READ X payload", () => {
    const result = printPosReadReport({ ...baseReport, mode: "X" })
    expect(result).toBe(false)
    expect(printSpy).not.toHaveBeenCalled()
  })
})
