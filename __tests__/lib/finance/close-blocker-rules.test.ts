import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  CLOSE_BLOCKER_RULES,
  getCloseBlockerRule,
  sortCloseBlockerRuleIds,
} from "@/lib/finance/close-blocker-rules"
import {
  evaluateCloseBlockerRules,
  resolveCloseReadinessStatus,
} from "@/lib/finance/close-checklist"

describe("close-blocker-rules", () => {
  it("defines deterministic rule ordering", () => {
    const blocked = CLOSE_BLOCKER_RULES.filter((rule) => rule.severity === "BLOCKED")
    const sorted = sortCloseBlockerRuleIds(blocked.map((rule) => rule.id))
    expect(sorted[0]).toBe("reconciliation-missing-gl-issues")
    expect(sorted.at(-1)).toBe("period-hard-closed-snapshot-after-close")
  })

  it("returns rule metadata by id", () => {
    expect(getCloseBlockerRule("snapshot-missing").severity).toBe("BLOCKED")
    expect(getCloseBlockerRule("snapshot-stale").severity).toBe("WARNING")
    expect(getCloseBlockerRule("posting-lock-open").severity).toBe("PASS")
  })
})

describe("evaluateCloseBlockerRules", () => {
  const period = {
    id: "period-1",
    branchId: "branch-1",
    periodKey: "2026-05",
    status: AccountingPeriodStatus.OPEN,
    closedAt: null,
  }

  it("blocks when snapshot is missing", () => {
    const items = evaluateCloseBlockerRules({
      period,
      latestSnapshot: null,
      priorSnapshot: null,
      issueSummary: {
        totalCount: 0,
        missingGlCount: 0,
        missingSourceCount: 0,
        varianceStatusCount: 0,
        errorSeverityCount: 0,
      },
      dashboardRows: [],
      nowIso: "2026-05-28T00:00:00.000Z",
      staleSnapshotThresholdDays: 7,
      metrics: { issueCount: 0, varianceCount: 0, matchedCount: 0 },
    })

    expect(resolveCloseReadinessStatus(items)).toBe("BLOCKED")
    expect(items.some((item) => item.id === "snapshot-missing")).toBe(true)
  })

  it("blocks when missing GL issues exist in frozen payload", () => {
    const items = evaluateCloseBlockerRules({
      period,
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
        dashboardRowCount: 3,
        matchedCount: 2,
        varianceCount: 1,
        totalVarianceAmount: "10.00",
        payloadVersion: 1,
        createdAt: "2026-05-27T12:00:00.000Z",
        createdByStaffId: "staff-1",
      },
      priorSnapshot: null,
      issueSummary: {
        totalCount: 1,
        missingGlCount: 1,
        missingSourceCount: 0,
        varianceStatusCount: 0,
        errorSeverityCount: 1,
      },
      dashboardRows: [
        {
          id: "inv",
          sourceType: "inventory",
          reference: "Inventory",
          branchId: "branch-1",
          periodLabel: "2026-05",
          expectedAmount: "1",
          actualAmount: "1",
          variance: "0",
          status: "MATCHED",
          domain: "inventory",
          raw: {
            domain: "inventory",
            label: "Inventory",
            operationalAmount: "1",
            glAmount: "1",
            variance: "0",
          },
        },
        {
          id: "rev",
          sourceType: "revenue",
          reference: "Revenue",
          branchId: "branch-1",
          periodLabel: "2026-05",
          expectedAmount: "1",
          actualAmount: "1",
          variance: "0",
          status: "MATCHED",
          domain: "revenue",
          raw: {
            domain: "revenue",
            label: "Revenue",
            operationalAmount: "1",
            glAmount: "1",
            variance: "0",
          },
        },
      ],
      nowIso: "2026-05-28T00:00:00.000Z",
      staleSnapshotThresholdDays: 7,
      metrics: { issueCount: 1, varianceCount: 1, matchedCount: 2 },
    })

    expect(resolveCloseReadinessStatus(items)).toBe("BLOCKED")
    expect(items.some((item) => item.id === "reconciliation-missing-gl-issues")).toBe(
      true
    )
  })
})