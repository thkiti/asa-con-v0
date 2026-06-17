import {
  FINANCE_REPORT_TITLES,
  formatFinanceReportContextTitle,
  formatFinanceReportPeriodLabel,
} from "@/lib/finance-ui/finance-report-display"

describe("formatFinanceReportPeriodLabel", () => {
  it("formats period key as calendar month range", () => {
    expect(formatFinanceReportPeriodLabel({ periodKey: "2026-01" })).toBe(
      "01.01.2026 – 31.01.2026"
    )
  })

  it("formats explicit date range", () => {
    expect(
      formatFinanceReportPeriodLabel({ from: "2026-05-01", to: "2026-05-31" })
    ).toBe("01.05.2026 – 31.05.2026")
  })

  it("returns em dash when scope missing", () => {
    expect(formatFinanceReportPeriodLabel({})).toBe("—")
  })
})

describe("formatFinanceReportContextTitle", () => {
  it("joins entity and report title", () => {
    expect(formatFinanceReportContextTitle("ASAD", FINANCE_REPORT_TITLES.balanceSheet)).toBe(
      "ASAD • BALANCE SHEET"
    )
  })
})
