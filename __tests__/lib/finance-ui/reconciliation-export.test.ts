import { RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION } from "@/lib/finance/reconciliation-snapshot-types"
import {
  buildCompareDashboardRowDiffCsv,
  buildCompareEvidenceCsvFiles,
  buildSnapshotDashboardCsv,
  buildSnapshotEvidenceCsvFiles,
  buildSnapshotIssuesCsv,
  buildSnapshotMetadataCsv,
} from "@/lib/finance-ui/reconciliation-export"
import {
  computeSnapshotCompareResult,
  snapshotIssuesToUiRows,
  snapshotRowsToDashboardRows,
} from "@/lib/finance-ui/reconciliation-snapshots"
import type { ReconciliationSnapshotDetail } from "@/lib/finance-ui/types"

const exportedAt = "2026-05-28T12:00:00.000Z"

const snapshot: ReconciliationSnapshotDetail = {
  id: "snap-1",
  kind: "MANUAL",
  branchId: "branch-1",
  fromDate: "2026-05-01",
  toDate: "2026-05-31",
  periodKey: "2026-05",
  label: "Month-end",
  note: "Audit note",
  checkedSales: 2,
  checkedStockDocuments: 1,
  issueCount: 1,
  dashboardRowCount: 2,
  matchedCount: 0,
  varianceCount: 2,
  totalVarianceAmount: "10.00",
  payloadVersion: RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION,
  createdAt: "2026-05-27T12:00:00.000Z",
  createdByStaffId: "staff-1",
  payload: {
    inventoryResult: {
      filter: {},
      operationalTotalValue: "100",
      glInventoryBalance: "90",
      variances: [],
    },
    salesResult: {
      filter: {},
      operationalRevenue: "500",
      glRevenueBalance: "500",
      paymentBreakdown: [],
      variances: [],
    },
    dashboardRows: [
      {
        id: "revenue:POS",
        sourceType: "Revenue",
        reference: "POS revenue",
        branchId: "branch-1",
        periodLabel: "2026-05",
        expectedAmount: "500",
        actualAmount: "500",
        variance: "0",
        status: "MATCHED",
        domain: "revenue",
        raw: {} as never,
      },
      {
        id: "inventory:Inventory total",
        sourceType: "Inventory",
        reference: "Inventory total",
        branchId: "branch-1",
        periodLabel: "2026-05",
        expectedAmount: "100",
        actualAmount: "90",
        variance: "10",
        status: "VARIANCE",
        domain: "inventory",
        raw: {} as never,
      },
    ],
    issuesPayload: {
      filter: { from: "2026-05-01", to: "2026-05-31" },
      checkedSales: 2,
      checkedStockDocuments: 1,
      issueCount: 1,
      issues: [
        {
          id: "STOCK_DOCUMENT:doc-1:INVENTORY_VALUE_MISMATCH",
          sourceType: "STOCK_DOCUMENT",
          sourceId: "doc-1",
          documentRef: "doc-1",
          issueType: "INVENTORY_VALUE_MISMATCH",
          severity: "ERROR",
          status: "VARIANCE",
          message: "Inventory value mismatch",
          expectedAmount: 100,
          actualAmount: 90,
          difference: 10,
          vouchers: [],
          journalEntries: [],
          sourceCreatedAt: null,
          sourcePostedAt: null,
        },
      ],
    },
  },
}

const laterSnapshot: ReconciliationSnapshotDetail = {
  ...snapshot,
  id: "snap-2",
  label: "Follow-up",
  createdAt: "2026-05-28T10:00:00.000Z",
  matchedCount: 2,
  varianceCount: 0,
  issueCount: 0,
  totalVarianceAmount: "0.00",
  payload: {
    ...snapshot.payload,
    dashboardRows: snapshot.payload.dashboardRows.map((row) =>
      row.id === "inventory:Inventory total"
        ? {
            ...row,
            actualAmount: "100",
            variance: "0",
            status: "MATCHED" as const,
          }
        : row
    ),
    issuesPayload: {
      ...snapshot.payload.issuesPayload,
      issueCount: 0,
      issues: [],
    },
  },
}

describe("buildSnapshotMetadataCsv", () => {
  it("includes audit metadata fields", () => {
    const csv = buildSnapshotMetadataCsv(snapshot, exportedAt)
    expect(csv).toContain('"snapshotId","snap-1"')
    expect(csv).toContain('"title","Month-end"')
    expect(csv).toContain('"exportedAt","2026-05-28T12:00:00.000Z"')
  })
})

describe("buildSnapshotDashboardCsv", () => {
  it("sorts rows deterministically by row id", () => {
    const rows = snapshotRowsToDashboardRows(snapshot.payload.dashboardRows)
    const csv = buildSnapshotDashboardCsv(rows)
    const inventoryIndex = csv.indexOf("inventory:Inventory total")
    const revenueIndex = csv.indexOf("revenue:POS")
    expect(inventoryIndex).toBeGreaterThan(-1)
    expect(revenueIndex).toBeGreaterThan(inventoryIndex)
  })
})

describe("buildSnapshotIssuesCsv", () => {
  it("includes issue id and severity columns", () => {
    const issues = snapshotIssuesToUiRows(snapshot.payload.issuesPayload.issues)
    const csv = buildSnapshotIssuesCsv(issues)
    expect(csv).toContain('"issueId"')
    expect(csv).toContain("STOCK_DOCUMENT:doc-1:INVENTORY_VALUE_MISMATCH")
    expect(csv).toContain('"severity"')
    expect(csv.split("\n")[1]).toContain('"ERROR"')
  })
})

describe("buildCompareDashboardRowDiffCsv", () => {
  it("exports changed rows only by default", () => {
    const compare = computeSnapshotCompareResult(snapshot, laterSnapshot)
    const csv = buildCompareDashboardRowDiffCsv(compare.rowDiffs)
    expect(csv).toContain('"changeKind","rowId"')
    expect(csv).toContain("inventory:Inventory total")
    expect(csv).not.toContain('"changed","revenue:POS"')
  })
})

describe("evidence file builders", () => {
  it("builds four snapshot evidence files with stable filenames", () => {
    const files = buildSnapshotEvidenceCsvFiles({
      snapshot,
      dashboardRows: snapshotRowsToDashboardRows(snapshot.payload.dashboardRows),
      issues: snapshotIssuesToUiRows(snapshot.payload.issuesPayload.issues),
      exportedAt,
    })
    expect(files).toHaveLength(4)
    expect(files.map((file) => file.filename)).toEqual([
      "month-end-metadata.csv",
      "month-end-summary.csv",
      "month-end-dashboard.csv",
      "month-end-issues.csv",
    ])
  })

  it("builds four compare evidence files", () => {
    const compare = computeSnapshotCompareResult(snapshot, laterSnapshot)
    const files = buildCompareEvidenceCsvFiles({
      left: snapshot,
      right: laterSnapshot,
      compare,
      exportedAt,
    })
    expect(files).toHaveLength(4)
    expect(files[0]?.filename).toContain("-metadata.csv")
    expect(files[2]?.filename).toContain("-dashboard-changes.csv")
  })
})
