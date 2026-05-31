import type { CloseEvidenceDetail } from "@/lib/finance/close-evidence-types"
import {
  buildCloseEvidenceChecklistCsv,
  buildCloseEvidenceExport,
  buildCloseEvidenceExportSlug,
  buildCloseEvidenceFinancialTotalsCsv,
  buildCloseEvidenceMetadataCsv,
  buildCloseEvidenceReconciliationSummaryCsv,
  buildCloseEvidenceTraceabilityCsv,
} from "@/lib/finance-ui/close-evidence-export"

const exportedAt = "2026-05-31T12:00:00.000Z"

const fullEvidence: CloseEvidenceDetail = {
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

function minimalEvidence(): CloseEvidenceDetail {
  return {
    id: "evidence-min",
    periodId: "period-min",
    branchId: "b1",
    periodKey: "2026-01",
    closeMode: "HARD",
    closedAt: "2026-01-31T00:00:00.000Z",
    closedByStaffId: "staff-min",
    closedByName: "Admin",
    closedByRole: "HO_ADMIN",
    readinessStatus: "READY",
    gatePolicyKey: "default",
    reconciliationSnapshotId: null,
    priorSnapshotId: null,
    payloadVersion: 1,
    createdAt: "2026-01-31T00:00:01.000Z",
    payload: {
      payloadVersion: 1,
      period: {
        id: "period-min",
        branchId: "b1",
        periodKey: "2026-01",
        statusBefore: "SOFT_CLOSED",
        statusAfter: "HARD_CLOSED",
        openedAt: "2026-01-01T00:00:00.000Z",
        closedAt: "2026-01-31T00:00:00.000Z",
      },
      close: {
        mode: "HARD",
        closedAt: "2026-01-31T00:00:00.000Z",
        closedByStaffId: "staff-min",
        closedByName: "Admin",
        closedByRole: "HO_ADMIN",
      },
      gate: {
        policyKey: "default",
        rejectBlocked: true,
        rejectWarnings: false,
      },
      checklist: {
        status: "READY",
        blockerCount: 0,
        warningCount: 0,
        items: [],
      },
      reconciliationSummary: {
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
      financialTotals: {
        operationalInventoryValue: null,
        glInventoryBalance: null,
        operationalRevenue: null,
        glRevenueBalance: null,
      },
      traceabilityRefs: {
        reconciliationSnapshotId: null,
        priorSnapshotId: null,
        latestSnapshotRef: null,
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
}

describe("buildCloseEvidenceExportSlug", () => {
  it("builds a stable slug from branch and period key", () => {
    expect(buildCloseEvidenceExportSlug(fullEvidence)).toBe(
      "close-evidence-branch-1-2026-05"
    )
  })
})

describe("close evidence CSV exports", () => {
  it("buildCloseEvidenceMetadataCsv includes audit headers and export timestamp", () => {
    const csv = buildCloseEvidenceMetadataCsv(fullEvidence, exportedAt)

    expect(csv).toContain('"exportType","accounting_period_close_evidence"')
    expect(csv).toContain('"evidenceId","evidence-1"')
    expect(csv).toContain('"periodKey","2026-05"')
    expect(csv).toContain('"closedByName","Finance Admin"')
    expect(csv).toContain(`"exportedAt","${exportedAt}"`)
  })

  it("buildCloseEvidenceChecklistCsv exports checklist items", () => {
    const csv = buildCloseEvidenceChecklistCsv(fullEvidence)

    expect(csv).toContain(
      '"audit-evidence-export-not-recorded","audit_evidence","WARNING","Evidence export not recorded"'
    )
  })

  it("buildCloseEvidenceReconciliationSummaryCsv exports frozen metrics", () => {
    const csv = buildCloseEvidenceReconciliationSummaryCsv(fullEvidence)

    expect(csv).toContain('"dashboardRowCount","2"')
    expect(csv).toContain('"totalVarianceAmount","10.00"')
    expect(csv).toContain('"traceTotalIssueCount","0"')
  })

  it("buildCloseEvidenceFinancialTotalsCsv exports frozen totals", () => {
    const csv = buildCloseEvidenceFinancialTotalsCsv(fullEvidence)

    expect(csv).toContain('"operationalInventoryValue","1000.00"')
    expect(csv).toContain('"glInventoryBalance","990.00"')
    expect(csv).toContain('"operationalRevenue","500.00"')
    expect(csv).toContain('"glRevenueBalance","500.00"')
  })

  it("buildCloseEvidenceTraceabilityCsv exports snapshot refs", () => {
    const csv = buildCloseEvidenceTraceabilityCsv(fullEvidence)

    expect(csv).toContain('"reconciliationSnapshotId","snap-1"')
    expect(csv).toContain('"latestSnapshotId","snap-1"')
    expect(csv).toContain('"compareDriftDetected","false"')
  })
})

describe("buildCloseEvidenceExport", () => {
  it("returns five CSV files with stable filenames", () => {
    const files = buildCloseEvidenceExport(fullEvidence)

    expect(files).toHaveLength(5)
    expect(files.map((file) => file.filename)).toEqual([
      "close-evidence-branch-1-2026-05-metadata.csv",
      "close-evidence-branch-1-2026-05-checklist.csv",
      "close-evidence-branch-1-2026-05-reconciliation-summary.csv",
      "close-evidence-branch-1-2026-05-financial-totals.csv",
      "close-evidence-branch-1-2026-05-traceability.csv",
    ])
  })

  it("includes all export sections in the pack", () => {
    const files = buildCloseEvidenceExport(fullEvidence)
    const byName = Object.fromEntries(files.map((file) => [file.filename, file.content]))

    expect(byName["close-evidence-branch-1-2026-05-metadata.csv"]).toContain(
      "accounting_period_close_evidence"
    )
    expect(byName["close-evidence-branch-1-2026-05-checklist.csv"]).toContain(
      "audit-evidence-export-not-recorded"
    )
    expect(
      byName["close-evidence-branch-1-2026-05-reconciliation-summary.csv"]
    ).toContain("dashboardRowCount")
    expect(byName["close-evidence-branch-1-2026-05-financial-totals.csv"]).toContain(
      "operationalInventoryValue"
    )
    expect(byName["close-evidence-branch-1-2026-05-traceability.csv"]).toContain(
      "latestSnapshotId"
    )
  })

  it("does not mutate the source evidence object", () => {
    const evidence = structuredClone(fullEvidence)
    const before = JSON.stringify(evidence)

    buildCloseEvidenceExport(evidence)

    expect(JSON.stringify(evidence)).toBe(before)
  })

  it("works with a minimal valid CloseEvidenceDetail fixture", () => {
    const evidence = minimalEvidence()
    const files = buildCloseEvidenceExport(evidence)

    expect(files).toHaveLength(5)
    expect(files.every((file) => file.filename.startsWith("close-evidence-b1-2026-01-"))).toBe(
      true
    )
    expect(
      files.every(
        (file) =>
          file.content.includes('"field"') ||
          file.content.includes('"metric"') ||
          file.content.includes('"id"')
      )
    ).toBe(true)
    expect(buildCloseEvidenceChecklistCsv(evidence)).toBe('"id","group","severity","title"')
  })
})
