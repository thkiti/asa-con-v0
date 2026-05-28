import { renderToStaticMarkup } from "react-dom/server"
import { FinanceTraceabilityPanel } from "@/components/finance/FinanceTraceabilityPanel"
import { buildFinanceTrace, buildSnapshotIssueTrace } from "@/lib/finance-ui/traceability"
import type { ReconciliationIssueRow } from "@/lib/finance-ui/types"

const liveIssue: ReconciliationIssueRow = {
  id: "SALE:s2:DUPLICATE_VOUCHER",
  sourceType: "SALE",
  sourceId: "s2",
  documentRef: "s2",
  issueType: "DUPLICATE_VOUCHER",
  severity: "ERROR",
  status: "VARIANCE",
  message: "Sale has multiple finance vouchers",
  expectedAmount: null,
  actualAmount: null,
  difference: null,
  vouchers: [
    {
      id: "voucher-1",
      voucherNo: "V-2026-0001",
      refType: "POS_SALE",
      refId: "s2",
      postedAt: "2026-05-01T12:00:00.000Z",
    },
  ],
  journalEntries: [
    {
      id: "journal-1",
      voucherId: "voucher-1",
      postedAt: "2026-05-01T12:00:00.000Z",
    },
  ],
  sourceCreatedAt: "2026-05-01T00:00:00.000Z",
  sourcePostedAt: null,
}

const missingRefsIssue: ReconciliationIssueRow = {
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

const snapshotIssue: ReconciliationIssueRow = {
  id: "STOCK_DOCUMENT:doc-1:INVENTORY_VALUE_MISMATCH",
  sourceType: "STOCK_DOCUMENT",
  sourceId: "doc-1",
  documentRef: "DOC-001",
  issueType: "INVENTORY_VALUE_MISMATCH",
  severity: "ERROR",
  status: "VARIANCE",
  message: "Inventory value mismatch",
  expectedAmount: 100,
  actualAmount: 90,
  difference: 10,
  vouchers: [
    {
      id: "voucher-1",
      voucherNo: "V-2026-0002",
      refType: "STOCK_DOC_POST",
      refId: "doc-1",
      postedAt: "2026-05-01T12:00:00.000Z",
    },
  ],
  journalEntries: [
    {
      id: "journal-1",
      voucherId: "voucher-1",
      postedAt: "2026-05-01T12:00:00.000Z",
    },
  ],
  sourceCreatedAt: null,
  sourcePostedAt: "2026-05-01T10:00:00.000Z",
}

describe("FinanceTraceabilityPanel", () => {
  it("renders ordered lineage steps read-only", () => {
    const trace = buildFinanceTrace(liveIssue, { mode: "live" })
    const html = renderToStaticMarkup(<FinanceTraceabilityPanel trace={trace} />)

    expect(html).toContain("Finance lineage")
    expect(html).toContain("Operational")
    expect(html).toContain("Voucher")
    expect(html).toContain("Journal")
    expect(html).toContain("Issue")
    expect(html).toContain("Live reconciliation evidence")
    expect(html).toContain('href="/finance/vouchers/voucher-1"')
    expect(html).toContain("Read-only trace")
    expect(html).not.toContain("Post")
    expect(html).not.toContain("Reconcile")
  })

  it("renders MISSING VOUCHER and journal refs without posting actions", () => {
    const trace = buildFinanceTrace(missingRefsIssue, { mode: "live" })
    const html = renderToStaticMarkup(<FinanceTraceabilityPanel trace={trace} />)

    expect(html).toContain("POS sale · s1")
    expect(html).toContain("MISSING VOUCHER")
    expect(html).not.toContain('href="/finance/vouchers/')
    expect(html).not.toContain("Post")
    expect(html).not.toContain("Reconcile")
  })

  it("shows frozen disclaimer and snapshot evidence step", () => {
    const trace = buildSnapshotIssueTrace(snapshotIssue, {
      snapshotId: "snap-1",
      capturedAt: "2026-05-27T12:00:00.000Z",
    })
    const html = renderToStaticMarkup(
      <FinanceTraceabilityPanel trace={trace} frozen />
    )

    expect(html).toContain("Frozen trace")
    expect(html).toContain("Snapshot evidence")
    expect(html).toContain('href="/finance/reconciliation/snapshots/snap-1"')
    expect(html).not.toContain("Live reconciliation evidence")
  })
})
