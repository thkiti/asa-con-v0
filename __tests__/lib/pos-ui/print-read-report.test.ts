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
    document.body.classList.remove("thermal-clone-print-active")
    document.querySelector("[data-thermal-print-clone]")?.remove()
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

  it("prints Z using thermal clone from on-screen slip source", () => {
    document.body.innerHTML = `
      <div data-thermal-print-source="read-z" class="thermal-print-area">
        <pre>read z slip</pre>
      </div>
    `
    const report = { ...baseReport, grandTotal: 999 }
    const result = printPosReadReport(report)
    expect(result).toBe(true)
    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(document.body.classList.contains("thermal-clone-print-active")).toBe(true)
  })

  it("routes COLLECT to collector ticket print source", () => {
    document.body.innerHTML = `
      <div data-thermal-print-source="collector" class="thermal-print-area">
        <pre>ticket</pre>
        <div data-testid="collector-ticket-signature-space" class="thermal-signature-space"></div>
      </div>
    `
    const result = printPosReadReport({ ...baseReport, mode: "COLLECT" })
    expect(result).toBe(true)
    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(document.body.classList.contains("thermal-clone-print-active")).toBe(true)
  })

  it("no-ops for READ X payload", () => {
    const result = printPosReadReport({ ...baseReport, mode: "X" })
    expect(result).toBe(false)
    expect(printSpy).not.toHaveBeenCalled()
  })
})
