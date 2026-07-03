import { renderToStaticMarkup } from "react-dom/server"
import { PeriodTable } from "@/components/finance/PeriodTable"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"

const samplePeriods: AccountingPeriodRow[] = [
  {
    id: "period-1",
    periodKey: "2026-05",
    legalEntityCode: "AS",
    branchId: "branch-1",
    branchName: "Main Shop",
    status: "OPEN",
    openedAt: "2026-05-01T00:00:00.000Z",
    closedAt: null,
  },
  {
    id: "period-2",
    periodKey: "2026-04",
    legalEntityCode: "AS",
    branchId: "branch-1",
    branchName: "Main Shop",
    status: "HARD_CLOSED",
    openedAt: "2026-04-01T00:00:00.000Z",
    closedAt: "2026-05-01T00:00:00.000Z",
  },
]

describe("PeriodTable", () => {
  it("renders period rows with status badges", () => {
    const html = renderToStaticMarkup(<PeriodTable periods={samplePeriods} />)
    expect(html).toContain("2026-05")
    expect(html).not.toContain(">AS<")
    expect(html).toContain("Open")
    expect(html).toContain("Hard closed")
    expect(html).toContain("bg-green-100")
    expect(html).toContain("bg-red-100")
  })

  it("shows empty state when no periods", () => {
    const html = renderToStaticMarkup(<PeriodTable periods={[]} />)
    expect(html).toContain("No accounting periods")
  })

  it("links period key and action to the review page", () => {
    const html = renderToStaticMarkup(<PeriodTable periods={samplePeriods} />)
    expect(html).toContain("/finance/periods/period-1/review")
    expect(html).toContain("/finance/periods/period-2/review")
    expect(html).toContain("Review")
    expect(html).not.toContain("Close evidence")
    expect(html).not.toContain("Audit timeline")
    expect(html).not.toContain("SOFT CLOSE")
  })
})
