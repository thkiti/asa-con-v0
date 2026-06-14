/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import {
  SUMMARY_BOXES,
  TargetSalesMonthSummary,
} from "@/components/shop/TargetSalesMonthSummary"

describe("TargetSalesMonthSummary", () => {
  it("renders exactly the six dashboard summary labels", () => {
    const html = renderToStaticMarkup(
      <TargetSalesMonthSummary
        summary={{
          lastMonthSales: "60000.00",
          grossSales: "75000.00",
          refunds: "5000.00",
          netSales: "70000.00",
          billCount: 128,
        }}
      />
    )

    expect(SUMMARY_BOXES).toHaveLength(6)
    expect(html).toContain("Last Month")
    expect(html).toContain("This Month")
    expect(html).toContain("Net Sales")
    expect(html).toContain("Refund")
    expect(html).toContain("Gross")
    expect(html).toContain("No. of Bill")
    expect(html).toContain("60,000")
    expect(html).toContain("75,000")
    expect(html).toContain("128")
  })
})
