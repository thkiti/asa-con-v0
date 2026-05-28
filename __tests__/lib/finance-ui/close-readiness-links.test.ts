import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { CloseReadinessResult } from "@/lib/finance-ui/close-readiness"
import {
  buildCloseReadinessQuickLinks,
  buildReconciliationDashboardPath,
  buildSnapshotComparePath,
  resolveChecklistItemLinks,
} from "@/lib/finance-ui/close-readiness-links"

function readiness(overrides: Partial<CloseReadinessResult> = {}): CloseReadinessResult {
  return {
    status: "BLOCKED",
    blockerCount: 1,
    warningCount: 0,
    items: [],
    latestSnapshotRef: null,
    priorSnapshotRef: null,
    metrics: {
      issueCount: 0,
      varianceCount: 0,
      matchedCount: 0,
      dashboardRowCount: 0,
      totalVarianceAmount: null,
      missingGlIssueCount: 0,
      missingSourceIssueCount: 0,
      inventoryDomainPresent: false,
      revenueDomainPresent: false,
      snapshotAgeDays: null,
      compareDriftDetected: false,
    },
    period: {
      id: "period-1",
      branchId: "branch-1",
      periodKey: "2026-05",
      status: AccountingPeriodStatus.OPEN,
      closedAt: null,
    },
    ...overrides,
  }
}

describe("close-readiness-links", () => {
  it("builds scoped reconciliation dashboard path", () => {
    expect(
      buildReconciliationDashboardPath({
        branchId: "branch-1",
        periodKey: "2026-05",
      })
    ).toBe("/finance/reconciliation?branchId=branch-1&periodKey=2026-05")
  })

  it("builds compare path for two snapshot ids", () => {
    expect(buildSnapshotComparePath("left-id", "right-id")).toBe(
      "/finance/reconciliation/snapshots/compare?left=left-id&right=right-id"
    )
  })

  it("offers capture link when snapshot is missing", () => {
    const links = buildCloseReadinessQuickLinks(readiness())
    expect(links.some((link) => link.label === "Capture reconciliation snapshot")).toBe(
      true
    )
  })

  it("offers trace and evidence links when snapshot exists", () => {
    const links = buildCloseReadinessQuickLinks(
      readiness({
        latestSnapshotRef: {
          id: "snap-1",
          createdAt: "2026-05-27T12:00:00.000Z",
          periodKey: "2026-05",
          branchId: "branch-1",
          label: null,
        },
        priorSnapshotRef: {
          id: "snap-0",
          createdAt: "2026-05-20T12:00:00.000Z",
          periodKey: "2026-05",
          branchId: "branch-1",
          label: null,
        },
      })
    )

    expect(links.some((link) => link.label === "Investigate frozen trace")).toBe(true)
    expect(links.some((link) => link.label === "Export evidence pack")).toBe(true)
    expect(links.some((link) => link.label === "Compare latest snapshots")).toBe(true)
  })

  it("maps missing snapshot checklist item to capture links", () => {
    const links = resolveChecklistItemLinks(
      {
        id: "snapshot-missing",
        group: "snapshot_evidence",
        severity: "BLOCKED",
        title: "No reconciliation snapshot for period",
        detail: "Capture a snapshot",
        refs: { branchId: "branch-1", periodKey: "2026-05" },
      },
      readiness()
    )

    expect(links.map((link) => link.label)).toEqual([
      "Capture snapshot",
      "Snapshot history",
    ])
  })
})