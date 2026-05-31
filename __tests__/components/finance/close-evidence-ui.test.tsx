import { renderToStaticMarkup } from "react-dom/server"
import {
  CloseEvidenceActionBar,
  CloseEvidenceAuditPrintHeader,
  CLOSE_EVIDENCE_FROZEN_DISCLAIMER,
  runCloseEvidenceExportDownload,
} from "@/components/finance/close-evidence-ui"
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

jest.mock("@/lib/finance-ui/close-evidence-export", () => ({
  buildCloseEvidenceExport: jest.fn(() => [
    { filename: "close-evidence-branch-1-2026-05-metadata.csv", content: "field,value" },
  ]),
}))

jest.mock("@/lib/finance-ui/reconciliation-export", () => ({
  downloadEvidenceCsvFiles: jest.fn(() => Promise.resolve()),
}))

const { buildCloseEvidenceExport } = jest.requireMock(
  "@/lib/finance-ui/close-evidence-export"
) as {
  buildCloseEvidenceExport: jest.Mock
}

const { downloadEvidenceCsvFiles } = jest.requireMock(
  "@/lib/finance-ui/reconciliation-export"
) as {
  downloadEvidenceCsvFiles: jest.Mock
}

describe("CloseEvidenceAuditPrintHeader", () => {
  it("renders print-only audit header and frozen disclaimer", () => {
    const html = renderToStaticMarkup(<CloseEvidenceAuditPrintHeader evidence={evidence} />)

    expect(html).toContain("print-only")
    expect(html).toContain("Accounting period close evidence audit")
    expect(html).toContain(CLOSE_EVIDENCE_FROZEN_DISCLAIMER)
    expect(html).toContain("evidence-1")
  })
})

describe("CloseEvidenceActionBar", () => {
  it("renders print and export controls as no-print", () => {
    const html = renderToStaticMarkup(<CloseEvidenceActionBar evidence={evidence} />)

    expect(html).toContain("Print audit report")
    expect(html).toContain("Export evidence pack")
    expect(html).toContain("no-print")
    expect(html).not.toContain("Refresh")
  })
})

describe("runCloseEvidenceExportDownload", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("uses buildCloseEvidenceExport output for browser download", async () => {
    await runCloseEvidenceExportDownload(evidence)

    expect(buildCloseEvidenceExport).toHaveBeenCalledWith(evidence)
    expect(downloadEvidenceCsvFiles).toHaveBeenCalledWith([
      { filename: "close-evidence-branch-1-2026-05-metadata.csv", content: "field,value" },
    ])
  })
})