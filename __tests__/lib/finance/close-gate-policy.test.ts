import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { buildCloseChecklist } from "@/lib/finance/close-checklist"
import type { CloseChecklistResult } from "@/lib/finance/close-checklist-types"
import { assertCloseReadiness, selectCloseGateFailures } from "@/lib/finance/close-gate"
import { CloseGateError } from "@/lib/finance/close-gate-errors"
import {
  closeGateAppliesToCloseMode,
  DEFAULT_CLOSE_GATE_POLICY,
  getHardCloseGatePolicy,
  HARD_CLOSE_GATE_POLICY,
  normalizeCloseGatePolicy,
  STRICT_CLOSE_GATE_POLICY,
} from "@/lib/finance/close-gate-policy"

function warningChecklist(): CloseChecklistResult {
  return {
    status: "WARNING",
    blockerCount: 0,
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
  }
}

describe("close-gate-policy", () => {
  it("defines v1 default policy as BLOCKED reject, WARNING allow", () => {
    expect(DEFAULT_CLOSE_GATE_POLICY).toEqual({
      rejectBlocked: true,
      rejectWarnings: false,
      warningExemptRuleIds: [],
    })
    expect(HARD_CLOSE_GATE_POLICY).toBe(DEFAULT_CLOSE_GATE_POLICY)
    expect(getHardCloseGatePolicy()).toBe(HARD_CLOSE_GATE_POLICY)
  })

  it("normalizes undefined policy to hard close policy", () => {
    expect(normalizeCloseGatePolicy()).toBe(getHardCloseGatePolicy())
    expect(normalizeCloseGatePolicy(undefined)).toBe(getHardCloseGatePolicy())
  })

  it("default policy rejects BLOCKED readiness", () => {
    const checklist = buildCloseChecklist({
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
    })

    expect(() =>
      assertCloseReadiness(checklist, getHardCloseGatePolicy())
    ).toThrow(CloseGateError)
  })

  it("default policy allows WARNING readiness", () => {
    expect(() =>
      assertCloseReadiness(warningChecklist(), getHardCloseGatePolicy())
    ).not.toThrow()
    expect(
      selectCloseGateFailures(warningChecklist().items, getHardCloseGatePolicy())
    ).toEqual([])
  })

  it("strict policy rejects WARNING readiness", () => {
    expect(() =>
      assertCloseReadiness(warningChecklist(), STRICT_CLOSE_GATE_POLICY)
    ).toThrow(CloseGateError)

    try {
      assertCloseReadiness(warningChecklist(), STRICT_CLOSE_GATE_POLICY)
    } catch (err) {
      expect(err).toMatchObject({ code: "CLOSE_READINESS_FAILED" })
    }
  })

  it("supports warning exemption rule ids under strict policy", () => {
    const policy = {
      ...STRICT_CLOSE_GATE_POLICY,
      warningExemptRuleIds: ["audit-evidence-export-not-recorded" as const],
    }

    expect(() => assertCloseReadiness(warningChecklist(), policy)).not.toThrow()
    expect(selectCloseGateFailures(warningChecklist().items, policy)).toEqual([])
  })

  it("applies close gate to HARD close mode only", () => {
    expect(closeGateAppliesToCloseMode("HARD")).toBe(true)
    expect(closeGateAppliesToCloseMode("SOFT")).toBe(false)
  })
})
