import {
  resolveIssueFinanceTrace,
  resolveSnapshotDiffIssueTrace,
  type IssueTraceSnapshotContext,
} from "@/lib/finance-ui/traceability"
import type { ReconciliationIssueRow } from "@/lib/finance-ui/types"

const liveIssue: ReconciliationIssueRow = {
  id: "SALE:s1:MISSING_VOUCHER",
  sourceType: "SALE",
  sourceId: "s1",
  documentRef: "s1",
  issueType: "MISSING_VOUCHER",
  severity: "ERROR",
  status: "MISSING_GL",
  message: "Missing voucher",
  expectedAmount: null,
  actualAmount: null,
  difference: null,
  vouchers: [],
  journalEntries: [],
  sourceCreatedAt: "2026-05-01T00:00:00.000Z",
  sourcePostedAt: null,
}

describe("traceability resolvers", () => {
  it("resolves live issue traces", () => {
    const trace = resolveIssueFinanceTrace(liveIssue)
    expect(trace.issueId).toBe(liveIssue.id)
    expect(trace.steps.some((step) => step.kind === "evidence")).toBe(true)
    expect(trace.steps.at(-1)?.label).toBe("Live reconciliation evidence")
  })

  it("resolves snapshot issue traces", () => {
    const snapshot: IssueTraceSnapshotContext = {
      snapshotId: "snap-1",
      capturedAt: "2026-05-27T12:00:00.000Z",
    }
    const trace = resolveIssueFinanceTrace(liveIssue, snapshot)
    expect(trace.steps.at(-1)?.refId).toBe("snap-1")
  })

  it("resolves compare diff traces from the available side", () => {
    const trace = resolveSnapshotDiffIssueTrace(
      { left: liveIssue, right: null },
      {
        left: { snapshotId: "snap-left" },
        right: { snapshotId: "snap-right" },
      }
    )
    expect(trace?.steps.at(-1)?.refId).toBe("snap-left")
  })
})
