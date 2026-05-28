import { renderToStaticMarkup } from "react-dom/server"
import { ReconciliationSnapshotDetailView } from "@/components/finance/ReconciliationSnapshotDetailView"
import { RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION } from "@/lib/finance/reconciliation-snapshot-types"
import type { ReconciliationSnapshotDetail } from "@/lib/finance-ui/types"

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
  dashboardRowCount: 1,
  matchedCount: 0,
  varianceCount: 1,
  totalVarianceAmount: "10.00",
  payloadVersion: RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION,
  createdAt: "2026-05-27T12:00:00.000Z",
  createdByStaffId: "staff-1",
  payload: {
    inventoryResult: {
      filter: {},
      operationalTotalValue: "100",
      glInventoryBalance: "90",
      variances: [
        {
          domain: "inventory",
          label: "Inventory total",
          operationalAmount: "100",
          glAmount: "90",
          variance: "10",
        },
      ],
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

describe("ReconciliationSnapshotDetailView", () => {
  it("renders frozen payload without live fetch messaging", () => {
    const html = renderToStaticMarkup(
      <ReconciliationSnapshotDetailView snapshot={snapshot} />
    )
    expect(html).toContain("Frozen snapshot")
    expect(html).toContain("no live reconciliation fetch")
    expect(html).toContain("Reconciliation snapshot audit")
    expect(html).toContain("Print audit report")
    expect(html).toContain("Full frozen dashboard")
    expect(html).toContain("Full frozen issues")
    expect(html).toContain("Month-end")
    expect(html).toContain("Inventory total")
    expect(html).toContain("doc-1")
    expect(html).toContain("Audit note")
    expect(html).toContain("Aggregate totals at capture")
    expect(html).toContain("Dashboard rows")
    expect(html).toContain("Category")
    expect(html).toContain("Export evidence pack")
    expect(html).toContain("Metadata CSV")
    expect(html).toContain("Frozen payload only")
    expect(html).toContain("frozen finance lineage")
    expect(html).not.toContain("Fix")
    expect(html).not.toContain("Reconcile")
    expect(html).not.toContain("Loading transaction issues")
  })
})
