import { buildFiscalPeriodOptions, formatFiscalPeriodLabel } from "@/lib/stock-ui/fiscal-period-options"
import { isHoStockDocumentViewer } from "@/lib/stock-ui/stock-document-viewer"

describe("buildFiscalPeriodOptions", () => {
  it("builds 12 fiscal months for a year", () => {
    const options = buildFiscalPeriodOptions(2026)
    expect(options).toHaveLength(12)
    expect(options[0]).toEqual({ value: "2026-01", label: "2026 • 01" })
    expect(options[11]).toEqual({ value: "2026-12", label: "2026 • 12" })
  })
})

describe("formatFiscalPeriodLabel", () => {
  it("formats YYYY-MM as YYYY • MM", () => {
    expect(formatFiscalPeriodLabel("2026-03")).toBe("2026 • 03")
  })
})

describe("isHoStockDocumentViewer", () => {
  it("identifies HO roles", () => {
    expect(isHoStockDocumentViewer("HO_ADMIN")).toBe(true)
    expect(isHoStockDocumentViewer("HO_FINANCE")).toBe(true)
    expect(isHoStockDocumentViewer("SH_STAFF")).toBe(false)
  })
})
