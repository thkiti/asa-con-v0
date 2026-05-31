import {
  buildCloseEvidencePath,
  buildCloseEvidenceTraceLinks,
  formatMoneyDisplay,
} from "@/lib/finance-ui/close-evidence"
import type { CloseEvidenceDetail } from "@/lib/finance/close-evidence-types"

function sampleEvidence(): CloseEvidenceDetail {
  return {
    id: "evidence-1",
    periodId: "period-1",
    branchId: "branch-1",
    periodKey: "2026-05",
    closeMode: "HARD",
    closedAt: "2026-05-30T10:00:00.000Z",
    closedByStaffId: "staff-1",
    closedByName: "Finance Admin",
    closedByRole: "HO_FINANCE",
    readinessStatus: "WARNING",
    gatePolicyKey: "default",
    reconciliationSnapshotId: "snap-latest",
    priorSnapshotId: "snap-prior",
    payloadVersion: 1,
    createdAt: "2026-05-30T10:00:01.000Z",
    payload: {
      payloadVersion: 1,
      period: {
        id: "period-1",
        branchId: "branch-1",
        periodKey: "2026-05",
        statusBefore: "OPEN",
        statusAfter: "HARD_CLOSED",
        openedAt: "2026-05-01T00:00:00.000Z",
        closedAt: "2026-05-30T10:00:00.000Z",
      },
      close: {
        mode: "HARD",
        closedAt: "2026-05-30T10:00:00.000Z",
        closedByStaffId: "staff-1",
        closedByName: "Finance Admin",
        closedByRole: "HO_FINANCE",
      },
      gate: {
        policyKey: "default",
        rejectBlocked: true,
        rejectWarnings: false,
      },
      checklist: {
        status: "WARNING",
        blockerCount: 0,
        warningCount: 1,
        items: [{ id: "snapshot-stale", group: "snapshot_evidence", severity: "WARNING", title: "Stale" }],
      },
      reconciliationSummary: {
        issueCount: 0,
        varianceCount: 0,
        matchedCount: 2,
        dashboardRowCount: 2,
        totalVarianceAmount: "0.00",
        missingGlIssueCount: 0,
        missingSourceIssueCount: 0,
        inventoryDomainPresent: true,
        revenueDomainPresent: true,
        snapshotAgeDays: 3,
        compareDriftDetected: true,
      },
      financialTotals: {
        operationalInventoryValue: "100.00",
        glInventoryBalance: "100.00",
        operationalRevenue: "50.00",
        glRevenueBalance: "50.00",
      },
      traceabilityRefs: {
        reconciliationSnapshotId: "snap-latest",
        priorSnapshotId: "snap-prior",
        latestSnapshotRef: {
          id: "snap-latest",
          createdAt: "2026-05-27T12:00:00.000Z",
          periodKey: "2026-05",
          branchId: "branch-1",
          label: null,
        },
        priorSnapshotRef: {
          id: "snap-prior",
          createdAt: "2026-04-27T12:00:00.000Z",
          periodKey: "2026-05",
          branchId: "branch-1",
          label: null,
        },
        compareDriftDetected: true,
        issueSummary: {
          totalCount: 0,
          missingGlCount: 0,
          missingSourceCount: 0,
          varianceStatusCount: 0,
          errorSeverityCount: 0,
        },
      },
    },
  }
}

describe("close-evidence UI helpers", () => {
  it("buildCloseEvidencePath encodes period id", () => {
    expect(buildCloseEvidencePath("period 1")).toBe(
      "/finance/periods/period%201/close-evidence"
    )
  })

  it("buildCloseEvidenceTraceLinks includes snapshot and compare links", () => {
    const links = buildCloseEvidenceTraceLinks(sampleEvidence())
    const hrefs = links.map((link) => link.href)
    expect(hrefs.some((href) => href.includes("/finance/reconciliation/snapshots/snap-latest"))).toBe(
      true
    )
    expect(hrefs.some((href) => href.includes("compare"))).toBe(true)
    expect(hrefs.some((href) => href.includes("branchId=branch-1"))).toBe(true)
  })

  it("formatMoneyDisplay returns dash for empty values", () => {
    expect(formatMoneyDisplay(null)).toBe("—")
    expect(formatMoneyDisplay("12.50")).toBe("12.50")
  })
})
