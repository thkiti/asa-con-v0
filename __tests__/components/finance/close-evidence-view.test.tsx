import { renderToStaticMarkup } from "react-dom/server"
import { CloseEvidenceReview, CloseEvidenceView } from "@/components/finance/CloseEvidencePage"
import type { CloseEvidenceDetail } from "@/lib/finance/close-evidence-types"

const evidence: CloseEvidenceDetail = {
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
  reconciliationSnapshotId: "snap-1",
  priorSnapshotId: null,
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
      items: [
        {
          id: "audit-evidence-export-not-recorded",
          group: "audit_evidence",
          severity: "WARNING",
          title: "Evidence export not recorded",
        },
      ],
    },
    reconciliationSummary: {
      issueCount: 0,
      varianceCount: 1,
      matchedCount: 1,
      dashboardRowCount: 2,
      totalVarianceAmount: "10.00",
      missingGlIssueCount: 0,
      missingSourceIssueCount: 0,
      inventoryDomainPresent: true,
      revenueDomainPresent: true,
      snapshotAgeDays: 2,
      compareDriftDetected: false,
    },
    financialTotals: {
      operationalInventoryValue: "1000.00",
      glInventoryBalance: "990.00",
      operationalRevenue: "500.00",
      glRevenueBalance: "500.00",
    },
    traceabilityRefs: {
      reconciliationSnapshotId: "snap-1",
      priorSnapshotId: null,
      latestSnapshotRef: {
        id: "snap-1",
        createdAt: "2026-05-27T12:00:00.000Z",
        periodKey: "2026-05",
        branchId: "branch-1",
        label: null,
      },
      priorSnapshotRef: null,
      compareDriftDetected: false,
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

describe("CloseEvidenceView", () => {
  it("renders frozen header, gate, reconciliation, financial, and trace sections", () => {
    const html = renderToStaticMarkup(<CloseEvidenceView evidence={evidence} />)

    expect(html).toContain("2026-05")
    expect(html).toContain("Finance Admin")
    expect(html).toContain("Gate summary")
    expect(html).toContain("Reconciliation summary")
    expect(html).toContain("Financial totals")
    expect(html).toContain("Traceability")
    expect(html).toContain("1000.00")
    expect(html).toContain("snap-1")
    expect(html).toContain("Immutable close evidence")
    expect(html).not.toContain("Refresh")
    expect(html).not.toContain("HARD CLOSE")
    expect(html).not.toContain("SOFT CLOSE")
  })

  it("marks navigation and trace links as no-print", () => {
    const html = renderToStaticMarkup(<CloseEvidenceView evidence={evidence} />)

    expect(html).toContain('class="no-print mt-4"')
    expect(html).toContain('class="no-print mt-4 flex flex-wrap gap-2"')
    expect(html).toContain('class="print-only mt-3 text-sm text-zinc-900"')
  })
})

describe("CloseEvidenceReview", () => {
  it("renders print and export controls with print-only audit header", () => {
    const html = renderToStaticMarkup(<CloseEvidenceReview evidence={evidence} />)

    expect(html).toContain("Print audit report")
    expect(html).toContain("Export evidence pack")
    expect(html).toContain("Accounting period close evidence audit")
    expect(html).toContain("Frozen close evidence")
    expect(html).toContain('class="print-only print-break-inside-avoid mb-4 border-b border-zinc-300 pb-4"')
    expect(html).toContain("Gate summary")
    expect(html).not.toContain("Refresh")
  })
})