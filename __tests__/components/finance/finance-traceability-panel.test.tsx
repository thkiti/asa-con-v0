import { renderToStaticMarkup } from "react-dom/server"
import { FinanceTraceabilityPanel } from "@/components/finance/FinanceTraceabilityPanel"
import { buildFinanceTrace } from "@/lib/finance-ui/traceability"
import type { ReconciliationIssueRow } from "@/lib/finance-ui/types"

const issue: ReconciliationIssueRow = {
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

describe("FinanceTraceabilityPanel", () => {
  it("renders ordered lineage steps read-only", () => {
    const trace = buildFinanceTrace(issue, { mode: "live" })
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
})
