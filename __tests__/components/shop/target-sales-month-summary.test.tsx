/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import {
  SUMMARY_BOXES,
  TargetSalesMonthSummary,
} from "@/components/shop/TargetSalesMonthSummary"

const summary = {
  lastMonthSales: "60000.00",
  grossSales: "75000.00",
  actualVat: "4907.00",
  actualNet: "70093.00",
  refunds: "5000.00",
  netSales: "70000.00",
  billCount: 2244,
}

describe("TargetSalesMonthSummary", () => {
  it("renders money with exactly two decimals and bill count without decimals", () => {
    const html = renderToStaticMarkup(
      <TargetSalesMonthSummary summary={summary} />
    )

    expect(SUMMARY_BOXES).toHaveLength(8)
    expect(html).toContain("Last Month")
    expect(html).toContain("This Month")
    expect(html).toContain("VAT")
    expect(html).toContain("Actual Net")
    expect(html).toContain("Net Sales")
    expect(html).toContain("Refund")
    expect(html).toContain("Gross")
    expect(html).toContain("No. of Bill")
    expect(html).toContain("60,000.00")
    expect(html).toContain("75,000.00")
    expect(html).toContain("4,907.00")
    expect(html).toContain("70,093.00")
    expect(html).toContain("5,000.00")
    expect(html).toContain("70,000.00")
    expect(html).toContain("2,244")
    expect(html).not.toContain("2,244.00")
  })

  it("renders zero money as 0.00 and keeps fractional money", () => {
    const html = renderToStaticMarkup(
      <TargetSalesMonthSummary
        summary={{
          lastMonthSales: "0",
          grossSales: "2271.04",
          actualVat: "0.00",
          actualNet: "2271.04",
          refunds: "0",
          netSales: "2271.04",
          billCount: 3,
        }}
      />
    )

    expect(html).toContain("0.00")
    expect(html).toContain("2,271.04")
    expect(html).toContain(">3<")
  })

  it("renders YEAR TO DATE toggle immediately after No. of Bill", () => {
    const html = renderToStaticMarkup(
      <TargetSalesMonthSummary
        summary={summary}
        yearToDate={false}
        onYearToDateChange={() => {}}
      />
    )

    const billIndex = html.indexOf('data-testid="dashboard-summary-bill-count"')
    const ytdIndex = html.indexOf('data-testid="dashboard-ytd-toggle"')
    expect(billIndex).toBeGreaterThan(-1)
    expect(ytdIndex).toBeGreaterThan(billIndex)
    expect(html).toContain("Year")
    expect(html).toContain("To")
    expect(html).toContain("Date")
  })
})
