import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { buildCloseEvidencePayload } from "@/lib/finance/close-evidence-build"
import { DEFAULT_CLOSE_GATE_POLICY } from "@/lib/finance/close-gate-policy"
import { CLOSE_EVIDENCE_PAYLOAD_VERSION } from "@/lib/finance/close-evidence-types"
import type { CloseChecklistResult } from "@/lib/finance/close-checklist-types"

function minimalChecklist(
  overrides?: Partial<CloseChecklistResult>
): CloseChecklistResult {
  return {
    status: "WARNING",
    blockerCount: 0,
    warningCount: 1,
    items: [
      {
        id: "snapshot-stale",
        group: "snapshot_evidence",
        severity: "WARNING",
        title: "Snapshot may be stale",
        detail: "ignored in evidence payload",
      },
    ],
    latestSnapshotRef: {
      id: "snap-1",
      createdAt: "2026-05-27T12:00:00.000Z",
      periodKey: "2026-05",
      branchId: "branch-1",
      label: null,
    },
    metrics: {
      issueCount: 2,
      varianceCount: 0,
      matchedCount: 2,
      dashboardRowCount: 2,
      totalVarianceAmount: "0.00",
      missingGlIssueCount: 0,
      missingSourceIssueCount: 0,
      inventoryDomainPresent: true,
      revenueDomainPresent: true,
      snapshotAgeDays: 3,
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

describe("buildCloseEvidencePayload", () => {
  it("builds compact payload without issue rows or voucher data", () => {
    const closedAt = new Date("2026-05-30T10:00:00.000Z")
    const payload = buildCloseEvidencePayload({
      period: {
        id: "period-1",
        branchId: "branch-1",
        periodKey: "2026-05",
        statusBefore: AccountingPeriodStatus.SOFT_CLOSED,
        openedAt: new Date("2026-05-01T00:00:00.000Z"),
      },
      closedAt,
      actor: {
        closedByStaffId: "staff-uuid-1",
        closedByName: "Finance Admin",
        closedByRole: "HO_FINANCE",
      },
      policy: DEFAULT_CLOSE_GATE_POLICY,
      checklist: minimalChecklist(),
      priorSnapshotRef: null,
      snapshotPayload: {
        inventoryResult: {
          filter: {},
          operationalTotalValue: "1000.00",
          glInventoryBalance: "1000.00",
          variances: [],
        },
        salesResult: {
          filter: {},
          operationalRevenue: "500.00",
          glRevenueBalance: "500.00",
          paymentBreakdown: [],
          variances: [],
        },
        dashboardRows: [],
        issuesPayload: {
          filter: {},
          checkedSales: 0,
          checkedStockDocuments: 0,
          issueCount: 2,
          issues: [
            {
              id: "SALE:1:MISSING_GL",
              sourceType: "SALE",
              sourceId: "sale-1",
              documentRef: "R-1",
              issueType: "MISSING_GL",
              severity: "ERROR",
              status: "MISSING_GL",
              message: "test",
              expectedAmount: null,
              actualAmount: null,
              difference: null,
              vouchers: [{ id: "v1", voucherNo: "V-1", refType: "POS_SALE", refId: "sale-1", postedAt: null }],
              journalEntries: [],
              sourceCreatedAt: null,
              sourcePostedAt: null,
            },
          ],
        },
      },
    })

    expect(payload.payloadVersion).toBe(CLOSE_EVIDENCE_PAYLOAD_VERSION)
    expect(payload.close).toMatchObject({
      mode: "HARD",
      closedByStaffId: "staff-uuid-1",
      closedByName: "Finance Admin",
      closedByRole: "HO_FINANCE",
    })
    expect(payload.checklist.items).toEqual([
      {
        id: "snapshot-stale",
        group: "snapshot_evidence",
        severity: "WARNING",
        title: "Snapshot may be stale",
      },
    ])
    expect(payload.checklist.items[0]).not.toHaveProperty("detail")
    expect(payload.financialTotals).toEqual({
      operationalInventoryValue: "1000.00",
      glInventoryBalance: "1000.00",
      operationalRevenue: "500.00",
      glRevenueBalance: "500.00",
    })
    expect(payload.traceabilityRefs.issueSummary).toEqual({
      totalCount: 1,
      missingGlCount: 1,
      missingSourceCount: 0,
      varianceStatusCount: 0,
      errorSeverityCount: 1,
    })
    expect(payload).not.toHaveProperty("issuesPayload")
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain("voucherNo")
    expect(serialized).not.toContain("issuesPayload")
  })
})
