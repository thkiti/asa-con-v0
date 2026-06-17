import { renderToStaticMarkup } from "react-dom/server"
import { FINANCE_REPORT_MAX_WIDTH_PX, FinanceReportContainer } from "@/components/finance/FinanceReportContainer"

describe("FinanceReportContainer", () => {
  it("centers report content with finance report max width", () => {
    const html = renderToStaticMarkup(
      <FinanceReportContainer>
        <p>Report body</p>
      </FinanceReportContainer>
    )

    expect(html).toContain('data-testid="finance-report-container"')
    expect(html).toContain(`data-finance-report-max-width="${FINANCE_REPORT_MAX_WIDTH_PX}"`)
    expect(html).toContain("finance-report-container")
    expect(html).toContain("Report body")
  })
})
