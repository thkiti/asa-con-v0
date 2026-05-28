import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  buildFinanceTrace,
  buildJournalTrace,
  buildOperationalTrace,
  buildSnapshotIssueTrace,
  buildTraceKey,
  buildVoucherTrace,
  formatFinanceRefType,
  formatTraceLabel,
  resolveIssueFinanceTrace,
  resolveSnapshotDiffIssueTrace,
  sortTraceSteps,
  toTraceableIssueRow,
  type TraceStep,
  type TraceableIssueRow,
} from "@/lib/finance-ui/traceability"
import type { ReconciliationIssueRow } from "@/lib/finance-ui/types"

function baseIssue(
  overrides: Partial<TraceableIssueRow> = {}
): TraceableIssueRow {
  return {
    id: "SALE:s1:MISSING_VOUCHER",
    sourceType: "SALE",
    sourceId: "s1",
    documentRef: "s1",
    issueType: "MISSING_VOUCHER",
    message: "Missing voucher",
    vouchers: [],
    journalEntries: [],
    sourceCreatedAt: "2026-05-01T00:00:00.000Z",
    sourcePostedAt: null,
    ...overrides,
  }
}

describe("traceability helpers", () => {
  it("builds stable trace keys and finance ref labels", () => {
    expect(buildTraceKey("voucher", "V-1")).toBe("voucher:V-1")
    expect(formatFinanceRefType(FINANCE_REF_TYPES.POS_SALE)).toBe("POS sale")
    expect(formatFinanceRefType(FINANCE_REF_TYPES.STOCK_DOC_POST)).toBe(
      "Stock document post"
    )
  })

  it("formats trace labels for voucher and journal steps", () => {
    expect(
      formatTraceLabel({
        kind: "voucher",
        id: "v1",
        label: "",
        sortKey: "",
        voucherNo: "V-100",
      })
    ).toBe("Voucher V-100")
    expect(
      formatTraceLabel({
        kind: "journal",
        id: "j1",
        label: "",
        sortKey: "",
        voucherNo: "V-100",
      })
    ).toBe("Journal · V-100")
  })

  it("sorts trace steps deterministically by kind then sortKey", () => {
    const shuffled: TraceStep[] = [
      {
        kind: "issue",
        id: "issue-1",
        label: "issue",
        sortKey: "issue:issue-1",
      },
      {
        kind: "operational",
        id: "s1",
        label: "op",
        sortKey: "operational:s1",
      },
      {
        kind: "voucher",
        id: "v2",
        label: "v2",
        sortKey: "voucher:V-002",
        voucherNo: "V-002",
      },
      {
        kind: "voucher",
        id: "v1",
        label: "v1",
        sortKey: "voucher:V-001",
        voucherNo: "V-001",
      },
    ]

    expect(sortTraceSteps(shuffled).map((step) => step.kind)).toEqual([
      "operational",
      "voucher",
      "voucher",
      "issue",
    ])
    expect(
      sortTraceSteps(shuffled)
        .filter((step) => step.kind === "voucher")
        .map((step) => step.voucherNo)
    ).toEqual(["V-001", "V-002"])
  })

  it("builds operational labels for sale and stock document sources", () => {
    expect(buildOperationalTrace(baseIssue()).label).toBe("POS sale · s1")
    expect(
      buildOperationalTrace(
        baseIssue({
          sourceType: "STOCK_DOCUMENT",
          sourceId: "doc-1",
          documentRef: "DOC-001",
        })
      ).label
    ).toBe("Stock document · DOC-001")
  })

  it("builds finance traces without mutating input rows", () => {
    const row = baseIssue({
      vouchers: [
        {
          id: "voucher-b",
          voucherNo: "V-002",
          refType: FINANCE_REF_TYPES.POS_SALE,
          refId: "s1",
          postedAt: "2026-05-01T12:00:00.000Z",
        },
        {
          id: "voucher-a",
          voucherNo: "V-001",
          refType: FINANCE_REF_TYPES.POS_SALE,
          refId: "s1",
          postedAt: "2026-05-01T11:00:00.000Z",
        },
      ],
      journalEntries: [
        {
          id: "journal-b",
          voucherId: "voucher-b",
          postedAt: "2026-05-01T12:00:00.000Z",
        },
        {
          id: "journal-a",
          voucherId: "voucher-a",
          postedAt: "2026-05-01T11:00:00.000Z",
        },
      ],
    })
    const vouchersBefore = row.vouchers.map((voucher) => voucher.id)

    const trace = buildFinanceTrace(row, { mode: "live" })

    expect(row.vouchers.map((voucher) => voucher.id)).toEqual(vouchersBefore)
    expect(trace.steps.map((step) => step.kind)).toEqual([
      "operational",
      "voucher",
      "voucher",
      "journal",
      "journal",
      "issue",
      "evidence",
    ])
    expect(
      trace.steps
        .filter((step) => step.kind === "voucher")
        .map((step) => step.voucherNo)
    ).toEqual(["V-001", "V-002"])
    expect(buildJournalTrace(row.journalEntries[1], "V-001").label).toBe(
      "Journal · V-001"
    )
    expect(buildVoucherTrace(row.vouchers[0]).voucherNo).toBe("V-002")
  })

  it("handles missing voucher and journal refs without inference", () => {
    const trace = buildFinanceTrace(baseIssue(), { mode: "live" })

    expect(trace.steps.map((step) => step.kind)).toEqual([
      "operational",
      "issue",
      "evidence",
    ])
    expect(trace.steps.some((step) => step.kind === "voucher")).toBe(false)
    expect(trace.steps.some((step) => step.kind === "journal")).toBe(false)
  })

  it("omits evidence when no context is provided", () => {
    const trace = buildFinanceTrace(baseIssue())
    expect(trace.steps.map((step) => step.kind)).toEqual(["operational", "issue"])
  })

  it("builds snapshot traces from frozen context only", () => {
    const trace = buildSnapshotIssueTrace(baseIssue(), {
      snapshotId: "snap-1",
      capturedAt: "2026-05-27T12:00:00.000Z",
    })

    expect(trace.steps.at(-1)).toMatchObject({
      kind: "evidence",
      refType: "SNAPSHOT",
      refId: "snap-1",
      postedAt: "2026-05-27T12:00:00.000Z",
    })
  })

  it("passes through traceable issue rows unchanged", () => {
    const row = baseIssue() as ReconciliationIssueRow
    expect(toTraceableIssueRow(row)).toBe(row)
  })
})

describe("traceability resolvers", () => {
  const liveIssue = baseIssue()

  it("resolves live issue traces", () => {
    const trace = resolveIssueFinanceTrace(liveIssue)
    expect(trace.steps.at(-1)?.label).toBe("Live reconciliation evidence")
  })

  it("resolves snapshot issue traces", () => {
    const trace = resolveIssueFinanceTrace(liveIssue, {
      snapshotId: "snap-1",
      capturedAt: "2026-05-27T12:00:00.000Z",
    })
    expect(trace.steps.at(-1)?.refId).toBe("snap-1")
  })

  it("returns null when compare diff has no issue on either side", () => {
    expect(
      resolveSnapshotDiffIssueTrace(
        { left: null, right: null },
        {
          left: { snapshotId: "snap-left" },
          right: { snapshotId: "snap-right" },
        }
      )
    ).toBeNull()
  })

  it("prefers right-side snapshot context for compare diffs", () => {
    const trace = resolveSnapshotDiffIssueTrace(
      { left: liveIssue, right: liveIssue },
      {
        left: { snapshotId: "snap-left" },
        right: { snapshotId: "snap-right" },
      }
    )

    expect(trace?.steps.at(-1)?.refId).toBe("snap-right")
  })
})
