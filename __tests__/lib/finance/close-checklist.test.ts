import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { CloseChecklistInput } from "@/lib/finance/close-checklist-types"
import type {
  ReconciliationSnapshotHeader,
  SnapshotDashboardRow,
  SnapshotIssueRow,
} from "@/lib/finance/reconciliation-snapshot-types"
import {
  buildCloseChecklist,
  countChecklistSeverities,
  detectSnapshotHeaderDrift,
  hasDashboardDomain,
  resolveCloseReadinessStatus,
  sortCloseChecklistItems,
  summarizeSnapshotIssues,
} from "@/lib/finance/close-checklist"

function inventoryRow(): SnapshotDashboardRow {
  return {
    id: "inv",
    sourceType: "inventory",
    reference: "Inventory",
    branchId: "branch-1",
    periodLabel: "2026-05",
    expectedAmount: "100",
    actualAmount: "100",
    variance: "0",
    status: "MATCHED",
    domain: "inventory",
    raw: {
      domain: "inventory",
      label: "Inventory",
      operationalAmount: "100",
      glAmount: "100",
      variance: "0",
    },
  }
}

function revenueRow(): SnapshotDashboardRow {
  return {
    id: "rev",
    sourceType: "revenue",
    reference: "Revenue",
    branchId: "branch-1",
    periodLabel: "2026-05",
    expectedAmount: "500",
    actualAmount: "500",
    variance: "0",
    status: "MATCHED",
    domain: "revenue",
    raw: {
      domain: "revenue",
      label: "Revenue",
      operationalAmount: "500",
      glAmount: "500",
      variance: "0",
    },
  }
}

function snapshotHeader(
  overrides: Partial<ReconciliationSnapshotHeader> = {}
): ReconciliationSnapshotHeader {
  return {
    id: "snap-1",
    kind: "MANUAL",
    branchId: "branch-1",
    fromDate: "2026-05-01",
    toDate: "2026-05-31",
    periodKey: "2026-05",
    label: "Month-end",
    checkedSales: 1,
    checkedStockDocuments: 0,
    issueCount: 0,
    dashboardRowCount: 2,
    matchedCount: 2,
    varianceCount: 0,
    totalVarianceAmount: "0.00",
    payloadVersion: 1,
    createdAt: "2026-05-27T12:00:00.000Z",
    createdByStaffId: "staff-1",
    ...overrides,
  }
}

function baseInput(
  overrides: Partial<CloseChecklistInput> = {}
): CloseChecklistInput {
  return {
    period: {
      id: "period-1",
      branchId: "branch-1",
      periodKey: "2026-05",
      status: AccountingPeriodStatus.OPEN,
      closedAt: null,
    },
    latestSnapshot: snapshotHeader(),
    priorSnapshot: null,
    snapshotPayload: {
      inventoryResult: {
        filter: {},
        operationalTotalValue: "100",
        glInventoryBalance: "100",
        variances: [],
      },
      salesResult: {
        filter: {},
        operationalRevenue: "500",
        glRevenueBalance: "500",
        paymentBreakdown: [],
        variances: [],
      },
      dashboardRows: [inventoryRow(), revenueRow()],
      issuesPayload: {
        filter: { branchId: "branch-1" },
        checkedSales: 1,
        checkedStockDocuments: 0,
        issueCount: 0,
        issues: [],
      },
    },
    now: "2026-05-28T00:00:00.000Z",
    ...overrides,
  }
}

describe("close-checklist helpers", () => {
  it("summarizeSnapshotIssues counts statuses", () => {
    const issues: SnapshotIssueRow[] = [
      {
        id: "1",
        sourceType: "SALE",
        sourceId: "s1",
        documentRef: "s1",
        issueType: "MISSING_VOUCHER",
        severity: "ERROR",
        status: "MISSING_GL",
        message: "missing gl",
        expectedAmount: null,
        actualAmount: null,
        difference: null,
        vouchers: [],
        journalEntries: [],
        sourceCreatedAt: null,
        sourcePostedAt: null,
      },
      {
        id: "2",
        sourceType: "SALE",
        sourceId: "s2",
        documentRef: "s2",
        issueType: "TOTAL_MISMATCH",
        severity: "ERROR",
        status: "VARIANCE",
        message: "variance",
        expectedAmount: 1,
        actualAmount: 2,
        difference: 1,
        vouchers: [],
        journalEntries: [],
        sourceCreatedAt: null,
        sourcePostedAt: null,
      },
    ]

    expect(summarizeSnapshotIssues(issues)).toEqual({
      totalCount: 2,
      missingGlCount: 1,
      missingSourceCount: 0,
      varianceStatusCount: 1,
      errorSeverityCount: 2,
    })
  })

  it("sorts checklist items by severity then group", () => {
    const sorted = sortCloseChecklistItems([
      {
        id: "pass",
        group: "audit_evidence",
        severity: "PASS",
        title: "pass",
        detail: "pass",
      },
      {
        id: "blocked",
        group: "reconciliation",
        severity: "BLOCKED",
        title: "blocked",
        detail: "blocked",
      },
      {
        id: "warn",
        group: "snapshot_evidence",
        severity: "WARNING",
        title: "warn",
        detail: "warn",
      },
    ])

    expect(sorted.map((item) => item.severity)).toEqual([
      "BLOCKED",
      "WARNING",
      "PASS",
    ])
  })

  it("detects dashboard domain presence", () => {
    expect(hasDashboardDomain([inventoryRow()], "inventory")).toBe(true)
    expect(hasDashboardDomain([inventoryRow()], "revenue")).toBe(false)
  })

  it("detects snapshot header drift", () => {
    const prior = snapshotHeader({ issueCount: 0, varianceCount: 0 })
    const latest = snapshotHeader({ issueCount: 1, varianceCount: 1 })
    expect(detectSnapshotHeaderDrift(prior, latest)).toBe(true)
    expect(detectSnapshotHeaderDrift(prior, prior)).toBe(false)
  })
})

describe("buildCloseChecklist", () => {
  it("returns BLOCKED when snapshot is missing", () => {
    const result = buildCloseChecklist(
      baseInput({ latestSnapshot: null, snapshotPayload: null })
    )

    expect(result.status).toBe("BLOCKED")
    expect(result.blockerCount).toBeGreaterThan(0)
    expect(result.latestSnapshotRef).toBeNull()
    expect(result.items.some((item) => item.id === "snapshot-missing")).toBe(true)
  })

  it("warns when snapshot is stale", () => {
    const result = buildCloseChecklist(
      baseInput({
        latestSnapshot: snapshotHeader({ createdAt: "2026-05-01T00:00:00.000Z" }),
        now: "2026-05-28T00:00:00.000Z",
        staleSnapshotThresholdDays: 7,
      })
    )

    expect(result.status).toBe("WARNING")
    expect(result.items.some((item) => item.id === "snapshot-stale")).toBe(true)
    expect(result.metrics.snapshotAgeDays).toBeGreaterThan(7)
  })

  it("warns when evidence export cannot be verified", () => {
    const result = buildCloseChecklist(baseInput())

    expect(result.status).toBe("WARNING")
    expect(
      result.items.some((item) => item.id === "audit-evidence-export-not-recorded")
    ).toBe(true)
    expect(result.items.some((item) => item.id === "audit-evidence-export-ready")).toBe(
      true
    )
  })

  it("warns on compare drift between prior and latest snapshots", () => {
    const result = buildCloseChecklist(
      baseInput({
        priorSnapshot: snapshotHeader({
          id: "snap-prior",
          issueCount: 0,
          varianceCount: 0,
        }),
        latestSnapshot: snapshotHeader({ issueCount: 2, varianceCount: 1 }),
      })
    )

    expect(result.metrics.compareDriftDetected).toBe(true)
    expect(result.items.some((item) => item.id === "snapshot-compare-drift")).toBe(
      true
    )
  })

  it("blocks on missing source issues in frozen payload", () => {
    const result = buildCloseChecklist(
      baseInput({
        snapshotPayload: {
          ...baseInput().snapshotPayload!,
          issuesPayload: {
            filter: {},
            checkedSales: 1,
            checkedStockDocuments: 0,
            issueCount: 1,
            issues: [
              {
                id: "issue-1",
                sourceType: "SALE",
                sourceId: "s1",
                documentRef: "s1",
                issueType: "TOTAL_MISMATCH",
                severity: "ERROR",
                status: "MISSING_SOURCE",
                message: "missing source",
                expectedAmount: 10,
                actualAmount: 0,
                difference: 10,
                vouchers: [],
                journalEntries: [],
                sourceCreatedAt: null,
                sourcePostedAt: null,
              },
            ],
          },
        },
        latestSnapshot: snapshotHeader({ issueCount: 1, varianceCount: 0 }),
      })
    )

    expect(result.status).toBe("BLOCKED")
    expect(
      result.items.some((item) => item.id === "reconciliation-missing-source-issues")
    ).toBe(true)
  })

  it("derives counts from checklist severities", () => {
    const result = buildCloseChecklist(baseInput())
    const counts = countChecklistSeverities(result.items)

    expect(counts.blockerCount).toBe(result.blockerCount)
    expect(counts.warningCount).toBe(result.warningCount)
    expect(resolveCloseReadinessStatus(result.items)).toBe(result.status)
  })
})