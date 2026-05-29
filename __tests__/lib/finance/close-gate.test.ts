import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { buildCloseChecklist } from "@/lib/finance/close-checklist"
import type { CloseChecklistInput, CloseChecklistResult } from "@/lib/finance/close-checklist-types"
import {
  assertCloseReadiness,
  buildCloseBlockerError,
  DEFAULT_CLOSE_GATE_POLICY,
  resolveCloseGateErrorCode,
  selectCloseGateFailures,
  sortCloseGateBlockers,
  toCloseGateErrorPayload,
} from "@/lib/finance/close-gate"
import { CloseGateError } from "@/lib/finance/close-gate-errors"

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
    latestSnapshot: null,
    priorSnapshot: null,
    snapshotPayload: null,
    now: "2026-05-28T00:00:00.000Z",
    ...overrides,
  }
}

function checklistResult(
  overrides: Partial<CloseChecklistResult> = {}
): CloseChecklistResult {
  return {
    status: "READY",
    blockerCount: 0,
    warningCount: 0,
    items: [],
    latestSnapshotRef: null,
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

describe("close-gate helpers", () => {
  it("passes READY checklist with default policy", () => {
    const checklist = checklistResult({ status: "READY" })

    expect(() => assertCloseReadiness(checklist)).not.toThrow()
    expect(selectCloseGateFailures(checklist.items)).toEqual([])
  })

  it("throws CLOSE_SNAPSHOT_REQUIRED when snapshot is missing", () => {
    const checklist = buildCloseChecklist(baseInput())

    expect(checklist.status).toBe("BLOCKED")

    expect(() => assertCloseReadiness(checklist)).toThrow(CloseGateError)

    try {
      assertCloseReadiness(checklist)
    } catch (err) {
      expect(err).toMatchObject({
        code: "CLOSE_SNAPSHOT_REQUIRED",
        readinessStatus: "BLOCKED",
      })
      const gateErr = err as CloseGateError
      expect(gateErr.blockers.some((blocker) => blocker.id === "snapshot-missing")).toBe(
        true
      )
      expect(gateErr.blockers.map((blocker) => blocker.id)).toEqual(
        expect.arrayContaining(["snapshot-missing", "reconciliation-no-snapshot"])
      )
    }
  })

  it("throws CLOSE_BLOCKED for missing GL issues with deterministic ordering", () => {
    const checklist = buildCloseChecklist({
      period: {
        id: "period-1",
        branchId: "branch-1",
        periodKey: "2026-05",
        status: AccountingPeriodStatus.OPEN,
        closedAt: null,
      },
      latestSnapshot: {
        id: "snap-1",
        kind: "MANUAL",
        branchId: "branch-1",
        fromDate: "2026-05-01",
        toDate: "2026-05-31",
        periodKey: "2026-05",
        label: null,
        checkedSales: 1,
        checkedStockDocuments: 0,
        issueCount: 1,
        dashboardRowCount: 2,
        matchedCount: 1,
        varianceCount: 1,
        totalVarianceAmount: "10.00",
        payloadVersion: 1,
        createdAt: "2026-05-27T12:00:00.000Z",
        createdByStaffId: "staff-1",
      },
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
        dashboardRows: [
          {
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
          },
          {
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
          },
        ],
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
          ],
        },
      },
      now: "2026-05-28T00:00:00.000Z",
    })

    const err = buildCloseBlockerError({ checklist })

    expect(err.code).toBe("CLOSE_BLOCKED")
    expect(err.blockers[0]?.id).toBe("reconciliation-missing-gl-issues")
    expect(err.blockers.map((blocker) => blocker.id)).toEqual(
      sortCloseGateBlockers(selectCloseGateFailures(checklist.items)).map(
        (blocker) => blocker.id
      )
    )
  })

  it("allows WARNING-only checklist with default policy", () => {
    const checklist = checklistResult({
      status: "WARNING",
      warningCount: 2,
      items: [
        {
          id: "snapshot-stale",
          group: "snapshot_evidence",
          severity: "WARNING",
          title: "Snapshot may be stale",
          detail: "stale",
        },
        {
          id: "audit-evidence-export-not-recorded",
          group: "audit_evidence",
          severity: "WARNING",
          title: "Evidence export not recorded",
          detail: "not recorded",
        },
      ],
    })

    expect(() => assertCloseReadiness(checklist)).not.toThrow()
    expect(DEFAULT_CLOSE_GATE_POLICY.rejectWarnings).toBe(false)
  })

  it("throws CLOSE_READINESS_FAILED when rejectWarnings is enabled", () => {
    const checklist = checklistResult({
      status: "WARNING",
      warningCount: 1,
      items: [
        {
          id: "snapshot-stale",
          group: "snapshot_evidence",
          severity: "WARNING",
          title: "Snapshot may be stale",
          detail: "stale",
        },
      ],
    })

    expect(() =>
      assertCloseReadiness(checklist, {
        ...DEFAULT_CLOSE_GATE_POLICY,
        rejectWarnings: true,
      })
    ).toThrow(CloseGateError)

    try {
      assertCloseReadiness(checklist, {
        ...DEFAULT_CLOSE_GATE_POLICY,
        rejectWarnings: true,
      })
    } catch (err) {
      expect(err).toMatchObject({
        code: "CLOSE_READINESS_FAILED",
        readinessStatus: "WARNING",
      })
    }
  })

  it("respects warningExemptRuleIds when rejectWarnings is enabled", () => {
    const checklist = checklistResult({
      status: "WARNING",
      warningCount: 1,
      items: [
        {
          id: "audit-evidence-export-not-recorded",
          group: "audit_evidence",
          severity: "WARNING",
          title: "Evidence export not recorded",
          detail: "not recorded",
        },
      ],
    })

    expect(() =>
      assertCloseReadiness(checklist, {
        rejectBlocked: true,
        rejectWarnings: true,
        warningExemptRuleIds: ["audit-evidence-export-not-recorded"],
      })
    ).not.toThrow()
  })

  it("resolves CLOSE_EVIDENCE_REQUIRED for blocked evidence rules", () => {
    const code = resolveCloseGateErrorCode(
      [
        {
          id: "audit-evidence-unavailable",
          group: "audit_evidence",
          severity: "BLOCKED",
          title: "Evidence export unavailable",
          detail: "missing",
        },
      ],
      "BLOCKED"
    )

    expect(code).toBe("CLOSE_EVIDENCE_REQUIRED")
  })

  it("builds API-safe payload from CloseGateError", () => {
    const checklist = buildCloseChecklist(baseInput())
    const err = buildCloseBlockerError({ checklist })

    expect(toCloseGateErrorPayload(err)).toEqual({
      error: err.message,
      code: err.code,
      readinessStatus: err.readinessStatus,
      blockers: err.blockers,
    })
  })
})



