import { renderToStaticMarkup } from "react-dom/server"
import { ReconciliationIssuesTable } from "@/components/finance/ReconciliationIssuesTable"
import type { ReconciliationIssueRow } from "@/lib/finance-ui/types"

const sampleIssue: ReconciliationIssueRow = {
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
}

describe("ReconciliationIssuesTable", () => {
  it("renders issue rows read-only", () => {
    const html = renderToStaticMarkup(
      <ReconciliationIssuesTable issues={[sampleIssue]} />
    )
    expect(html).toContain("s1")
    expect(html).toContain("MISSING VOUCHER")
    expect(html).toContain("MISSING GL")
    expect(html).toContain("POS sale")
    expect(html).toContain("Copy ID")
    expect(html).not.toContain("Fix")
    expect(html).not.toContain("Reconcile")
    expect(html).not.toContain("Post")
  })

  it("lazy-mounts lineage panel content only when expanded", () => {
    const html = renderToStaticMarkup(
      <ReconciliationIssuesTable issues={[sampleIssue]} />
    )

    expect(html).not.toContain("Finance lineage")
    expect(html).not.toContain("Live reconciliation evidence")
  })

  it("accepts frozen snapshot trace context without live fetch UI", () => {
    const html = renderToStaticMarkup(
      <ReconciliationIssuesTable
        issues={[sampleIssue]}
        snapshotTrace={{
          snapshotId: "snap-1",
          capturedAt: "2026-05-27T12:00:00.000Z",
        }}
      />
    )

    expect(html).toContain("POS sale")
    expect(html).not.toContain("Finance lineage")
    expect(html).not.toContain("Loading transaction issues")
  })

  it("shows loading state", () => {
    const html = renderToStaticMarkup(
      <ReconciliationIssuesTable issues={[]} loading />
    )
    expect(html).toContain("Loading transaction issues")
  })

  it("shows empty state", () => {
    const html = renderToStaticMarkup(<ReconciliationIssuesTable issues={[]} />)
    expect(html).toContain("No transaction-level issues")
  })

  it("shows error state", () => {
    const html = renderToStaticMarkup(
      <ReconciliationIssuesTable issues={[]} error="Failed to load issues" />
    )
    expect(html).toContain("Failed to load issues")
  })
})
