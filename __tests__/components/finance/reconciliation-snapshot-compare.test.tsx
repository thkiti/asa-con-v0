import { renderToStaticMarkup } from "react-dom/server"
import { ReconciliationSnapshotCompareView } from "@/components/finance/ReconciliationSnapshotCompareView"
import { RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION } from "@/lib/finance/reconciliation-snapshot-types"
import type { ReconciliationSnapshotDetail } from "@/lib/finance-ui/types"

const baseSnapshot: ReconciliationSnapshotDetail = {
  id: "snap-left",
  kind: "MANUAL",
  branchId: "branch-1",
  fromDate: "2026-05-01",
  toDate: "2026-05-31",
  periodKey: "2026-05",
  label: "Baseline",
  note: null,
  checkedSales: 1,
  checkedStockDocuments: 1,
  issueCount: 1,
  dashboardRowCount: 1,
  matchedCount: 0,
  varianceCount: 1,
  totalVarianceAmount: "10.00",
  payloadVersion: RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION,
  createdAt: "2026-05-27T10:00:00.000Z",
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
        raw: {
          domain: "inventory",
          label: "Inventory total",
          operationalAmount: "100",
          glAmount: "90",
          variance: "10",
        },
      },
    ],
    issuesPayload: {
      filter: { from: "2026-05-01", to: "2026-05-31" },
      checkedSales: 1,
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
  ...baseSnapshot,
  id: "snap-right",
  label: "Follow-up",
  createdAt: "2026-05-28T10:00:00.000Z",
  matchedCount: 1,
  varianceCount: 0,
  issueCount: 0,
  totalVarianceAmount: "0.00",
  payload: {
    ...baseSnapshot.payload,
    dashboardRows: [
      {
        ...baseSnapshot.payload.dashboardRows[0],
        actualAmount: "100",
        variance: "0",
        status: "MATCHED",
      },
    ],
    issuesPayload: {
      ...baseSnapshot.payload.issuesPayload,
      issueCount: 0,
      issues: [],
    },
  },
}

describe("ReconciliationSnapshotCompareView", () => {
  it("renders client-side diff without live fetch messaging", () => {
    const html = renderToStaticMarkup(
      <ReconciliationSnapshotCompareView left={baseSnapshot} right={laterSnapshot} />
    )
    expect(html).toContain("Client-side diff")
    expect(html).toContain("no live reconciliation fetch")
    expect(html).toContain("Header metric deltas")
    expect(html).toContain("Dashboard row changes")
    expect(html).toContain("Issue changes")
    expect(html).toContain("Export compare evidence")
    expect(html).toContain("Compare evidence export")
    expect(html).toContain("Print audit report")
    expect(html).toContain("Snapshot compare audit")
    expect(html).toContain("All dashboard row changes")
    expect(html).toContain("All issue changes")
    expect(html).toContain("Dashboard changes CSV")
    expect(html).not.toContain("Fix")
    expect(html).not.toContain("Reconcile")
  })
})
