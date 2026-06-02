import type { PeriodAuditExportBundle } from "@/lib/finance/period-audit-export-types"
import {
  buildPeriodAuditCloseEvidenceIndexCsv,
  buildPeriodAuditExport,
  buildPeriodAuditExportSlug,
  buildPeriodAuditReopenEvidenceCsv,
  buildPeriodAuditReopenRequestsCsv,
  buildPeriodAuditReportMetadataCsv,
  buildPeriodAuditTimelineCsv,
} from "@/lib/finance-ui/period-audit-export"

const exportedAt = "2026-06-02T12:00:00.000Z"

const bundle: PeriodAuditExportBundle = {
  exportVersion: 1,
  exportedAt,
  period: {
    id: "period-1",
    periodKey: "2026-05",
    branchId: "branch-1",
    status: "HARD_CLOSED",
    openedAt: "2026-05-01T00:00:00.000Z",
    closedAt: "2026-05-30T10:00:00.000Z",
  },
  timeline: [
    {
      id: "period-opened:period-1",
      type: "period_opened",
      occurredAt: "2026-05-01T00:00:00.000Z",
      actorId: null,
      actorName: null,
      title: "Period opened",
      description: "Accounting period 2026-05 opened for posting.",
      source: "period",
      sourceId: "period-1",
      metadata: { periodKey: "2026-05", branchId: "branch-1", status: "HARD_CLOSED" },
    },
    {
      id: "close-evidence:ev-1",
      type: "close_evidence_generated",
      occurredAt: "2026-05-30T10:00:01.000Z",
      actorId: "staff-1",
      actorName: "Finance Admin",
      title: "Close evidence generated",
      description: "Immutable close evidence recorded.",
      source: "close_evidence",
      sourceId: "ev-1",
      metadata: {
        closeMode: "HARD",
        readinessStatus: "READY",
        requestNo: null,
        fromStatus: null,
        toStatus: null,
      },
    },
  ],
  closeEvidence: [
    {
      id: "ev-1",
      periodId: "period-1",
      periodKey: "2026-05",
      branchId: "branch-1",
      closeMode: "HARD",
      closedAt: "2026-05-30T10:00:00.000Z",
      closedByStaffId: "staff-1",
      closedByName: "Finance Admin",
      closedByRole: "HO_FINANCE",
      readinessStatus: "READY",
      gatePolicyKey: "default",
      reconciliationSnapshotId: "snap-1",
      priorSnapshotId: null,
      createdAt: "2026-05-30T10:00:01.000Z",
    },
  ],
  reopenEvidence: [],
  reopenRequests: [],
  counts: {
    timelineEventCount: 2,
    closeEvidenceCount: 1,
    reopenEvidenceCount: 0,
    reopenRequestCount: 0,
  },
}

describe("period-audit-export UI serializers (22B)", () => {
  it("builds stable export slug from branch and period key", () => {
    expect(buildPeriodAuditExportSlug(bundle)).toBe("period-audit-branch-1-2026-05")
  })

  it("metadata CSV includes export type and counts", () => {
    const csv = buildPeriodAuditReportMetadataCsv(bundle)
    expect(csv).toContain("exportType")
    expect(csv).toContain("accounting_period_audit_report")
    expect(csv).toContain("timelineEventCount")
    expect(csv).toContain("2")
  })

  it("timeline CSV includes event type and metadata columns", () => {
    const csv = buildPeriodAuditTimelineCsv(bundle)
    expect(csv).toContain("eventType")
    expect(csv).toContain("period_opened")
    expect(csv).toContain("close_evidence_generated")
    expect(csv).toContain("HARD")
  })

  it("close evidence index CSV lists summary rows only", () => {
    const csv = buildPeriodAuditCloseEvidenceIndexCsv(bundle)
    expect(csv).toContain("ev-1")
    expect(csv).not.toContain("payloadVersion")
  })

  it("reopen CSV builders emit headers when empty", () => {
    expect(buildPeriodAuditReopenEvidenceCsv(bundle)).toContain("fromStatus")
    expect(buildPeriodAuditReopenRequestsCsv(bundle)).toContain("requestNo")
  })

  it("buildPeriodAuditExport returns five CSV files", () => {
    const files = buildPeriodAuditExport(bundle, exportedAt)
    expect(files).toHaveLength(5)
    expect(files.map((f) => f.filename)).toEqual([
      "period-audit-branch-1-2026-05-report-metadata.csv",
      "period-audit-branch-1-2026-05-timeline-events.csv",
      "period-audit-branch-1-2026-05-close-evidence-index.csv",
      "period-audit-branch-1-2026-05-reopen-evidence.csv",
      "period-audit-branch-1-2026-05-reopen-requests.csv",
    ])
    for (const file of files) {
      expect(file.content.length).toBeGreaterThan(0)
    }
  })
})
