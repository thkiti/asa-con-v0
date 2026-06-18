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
    expect(html).toContain("AS")
    expect(html).toContain("Open")
    expect(html).toContain("Hard closed")
    expect(html).toContain("bg-green-100")
    expect(html).toContain("bg-red-100")
  })

  it("shows empty state when no periods", () => {
    const html = renderToStaticMarkup(<PeriodTable periods={[]} />)
    expect(html).toContain("No accounting periods")
  })

  it("shows Close evidence and history links for HARD_CLOSED periods", () => {
    const html = renderToStaticMarkup(<PeriodTable periods={samplePeriods} />)
    expect(html).toContain("Review")
    expect(html).toContain("Close evidence")
    expect(html).toContain("Close history")
    expect(html).toContain("Reopen history")
    expect(html).toContain("/finance/periods/period-2/close-evidence")
    expect(html).toContain("/finance/periods/period-2/close-evidence/history")
    expect(html).toContain("/finance/periods/period-2/reopen-evidence")
    expect(html).toContain("/finance/periods/period-2/reopen-requests")
    expect(html).toContain("/finance/periods/period-1/timeline")
    expect(html).toContain("/finance/periods/period-2/timeline")
    expect(html).toContain("Audit timeline")
    expect(html).not.toContain("/finance/periods/period-1/close-evidence")
  })

  it("shows REQUEST REOPEN for hard-closed rows when controls enabled", () => {
    const html = renderToStaticMarkup(
      <PeriodTable periods={samplePeriods} showControls sessionRole="HO_ADMIN" />
    )
    expect(html).toContain("REQUEST REOPEN")
    expect(html).toContain("SOFT CLOSE")
    expect(html).not.toContain("Update status")
  })
})
