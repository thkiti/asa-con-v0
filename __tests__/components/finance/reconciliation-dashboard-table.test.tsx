import { renderToStaticMarkup } from "react-dom/server"
import { ReconciliationDashboardTable } from "@/components/finance/ReconciliationDashboardTable"
import { toDashboardRows } from "@/lib/finance-ui/reconciliation"

const rows = toDashboardRows({
  rows: [
    {
      domain: "inventory",
      label: "Stock valuation vs inventory GL",
      operationalAmount: "1000",
      glAmount: "995",
      variance: "5",
    },
    {
      domain: "revenue",
      label: "POS revenue vs revenue GL",
      operationalAmount: "500",
      glAmount: "500",
      variance: "0",
    },
  ],
  branchId: "branch-1",
  periodLabel: "2026-05",
})

describe("ReconciliationDashboardTable", () => {
  it("renders rows with status badges", () => {
    const html = renderToStaticMarkup(
      <ReconciliationDashboardTable rows={rows} />
    )
    expect(html).toContain("Inventory")
    expect(html).toContain("Revenue")
    expect(html).toContain("MATCHED")
    expect(html).toContain("VARIANCE")
    expect(html).toContain("bg-green-100")
    expect(html).toContain("bg-amber-100")
  })

  it("shows empty state when no rows", () => {
    const html = renderToStaticMarkup(
      <ReconciliationDashboardTable rows={[]} />
    )
    expect(html).toContain("No reconciliation rows match")
  })
})
