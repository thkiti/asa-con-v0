import { renderToStaticMarkup } from "react-dom/server"
import { VarianceDetailPanel } from "@/components/finance/VarianceDetailPanel"
import type { ReconciliationDashboardRow } from "@/lib/finance-ui/reconciliation"

const row: ReconciliationDashboardRow = {
  id: "revenue:POS revenue vs revenue GL",
  sourceType: "Revenue",
  reference: "POS revenue vs revenue GL",
  branchId: "branch-1",
  periodLabel: "2026-05",
  expectedAmount: "500",
  actualAmount: "490",
  variance: "10",
  status: "VARIANCE",
  domain: "revenue",
  raw: {
    domain: "revenue",
    label: "POS revenue vs revenue GL",
    operationalAmount: "500",
    glAmount: "490",
    variance: "10",
  },
}

describe("VarianceDetailPanel drill-down", () => {
  it("renders transaction issues section read-only", () => {
    const html = renderToStaticMarkup(
      <VarianceDetailPanel
        row={row}
        issues={[
          {
            id: "SALE:s1:MISSING_VOUCHER",
            sourceType: "SALE",
            sourceId: "s1",
            documentRef: "s1",
            issueType: "MISSING_VOUCHER",
            severity: "ERROR",
            status: "MISSING_GL",
            message: "Completed sale has no posted finance voucher",
            expectedAmount: null,
            actualAmount: null,
            difference: null,
            vouchers: [],
            journalEntries: [],
            sourceCreatedAt: "2026-05-01T00:00:00.000Z",
            sourcePostedAt: null,
          },
        ]}
        onClose={() => undefined}
      />
    )

    expect(html).toContain("Transaction issues")
    expect(html).toContain("MISSING VOUCHER")
    expect(html).toContain("does not mutate accounting state")
    expect(html).toContain("Export issues CSV")
    expect(html).not.toContain("Fix")
    expect(html).not.toContain("Reconcile")
  })

  it("shows loading and empty issue states", () => {
    const loadingHtml = renderToStaticMarkup(
      <VarianceDetailPanel
        row={row}
        issues={[]}
        issuesLoading
        onClose={() => undefined}
      />
    )
    expect(loadingHtml).toContain("Loading transaction issues")

    const emptyHtml = renderToStaticMarkup(
      <VarianceDetailPanel row={row} issues={[]} onClose={() => undefined} />
    )
    expect(emptyHtml).toContain("No transaction-level issues")
  })

  it("returns null when row is not selected", () => {
    const html = renderToStaticMarkup(
      <VarianceDetailPanel row={null} issues={[]} onClose={() => undefined} />
    )
    expect(html).toBe("")
  })
})
