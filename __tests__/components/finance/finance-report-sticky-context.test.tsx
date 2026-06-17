import { renderToStaticMarkup } from "react-dom/server"
import { FinanceReportStickyContext } from "@/components/finance/FinanceReportStickyContext"
import { FinanceReportView } from "@/components/finance/FinanceReportView"
import { FINANCE_REPORT_TITLES } from "@/lib/finance-ui/finance-report-display"
import {
  financeReportStickyContext,
  financeReportView,
} from "@/lib/finance-ui/finance-visual-classes"

describe("FinanceReportStickyContext", () => {
  it("renders entity, title, period, and balanced status", () => {
    const html = renderToStaticMarkup(
      <FinanceReportStickyContext
        entityLabel="ASAD"
        reportTitle={FINANCE_REPORT_TITLES.balanceSheet}
        periodLabel="01.01.2026 – 31.01.2026"
        status={{ kind: "balanced", label: "✓ Balanced" }}
      />
    )

    expect(html).toContain(financeReportStickyContext)
    expect(html).toContain("ASAD • BALANCE SHEET")
    expect(html).toContain("01.01.2026 – 31.01.2026")
    expect(html).toContain("✓ Balanced")
    expect(html).toContain("finance-diff-balanced")
  })

  it("renders optional detail line", () => {
    const html = renderToStaticMarkup(
      <FinanceReportStickyContext
        entityLabel="ASAS"
        reportTitle={FINANCE_REPORT_TITLES.profitLoss}
        periodLabel="01.05.2026 – 31.05.2026"
        detailLine="Branch SH001"
      />
    )

    expect(html).toContain("Branch SH001")
  })
})

describe("FinanceReportView", () => {
  it("wraps report body with finance-report-view class", () => {
    const html = renderToStaticMarkup(
      <FinanceReportView reportClassName="trial-balance-report">
        <table className="finance-table" />
      </FinanceReportView>
    )

    expect(html).toContain(financeReportView)
    expect(html).toContain("trial-balance-report")
    expect(html).toContain('data-testid="finance-report-view"')
  })
})
