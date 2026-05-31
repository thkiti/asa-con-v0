import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  createCloseEvidenceForHardClose,
  getCloseEvidenceByPeriodId,
  getLatestCloseEvidenceByPeriodId,
  listCloseEvidenceByPeriodId,
  resolveCloseActorSnapshot,
} from "@/lib/finance/close-evidence"
import { DEFAULT_CLOSE_GATE_POLICY } from "@/lib/finance/close-gate-policy"
import type { CloseChecklistResult } from "@/lib/finance/close-checklist-types"
import { createFinanceMockTx } from "./mock-finance-tx"

const branchId = "branch-1"
const periodKey = "2026-05"

function readyChecklist(): CloseChecklistResult {
  return {
    status: "READY",
    blockerCount: 0,
    warningCount: 0,
    items: [],
    latestSnapshotRef: {
      id: "snap-1",
      createdAt: "2026-05-27T12:00:00.000Z",
      periodKey,
      branchId,
      label: null,
    },
    metrics: {
      issueCount: 0,
      varianceCount: 0,
      matchedCount: 2,
      dashboardRowCount: 2,
      totalVarianceAmount: "0.00",
      missingGlIssueCount: 0,
      missingSourceIssueCount: 0,
      inventoryDomainPresent: true,
      revenueDomainPresent: true,
      snapshotAgeDays: 1,
      compareDriftDetected: false,
    },
    period: {
      id: "period-1",
      branchId,
      periodKey,
      status: AccountingPeriodStatus.OPEN,
      closedAt: null,
    },
  }
}

describe("close-evidence", () => {
  it("resolveCloseActorSnapshot uses provided name and role", () => {
    expect(
      resolveCloseActorSnapshot({
        staffId: "staff-uuid",
        name: "Admin User",
        role: "HO_ADMIN",
      })
    ).toEqual({
      closedByStaffId: "staff-uuid",
      closedByName: "Admin User",
      closedByRole: "HO_ADMIN",
    })
  })

  it("createCloseEvidenceForHardClose persists actor snapshot fields", async () => {
    const { tx, state } = createFinanceMockTx()
    const period = await tx.accountingPeriod.create({
      data: { branchId, periodKey, status: AccountingPeriodStatus.HARD_CLOSED },
    })
    const closedAt = new Date("2026-05-30T10:00:00.000Z")

    const detail = await createCloseEvidenceForHardClose(tx, {
      period: {
        id: period.id,
        branchId,
        periodKey,
        statusBefore: AccountingPeriodStatus.OPEN,
        openedAt: period.openedAt,
        closedAt,
      },
      closedBy: {
        staffId: "staff-uuid-2",
        name: "Close Reviewer",
        role: "HO_FINANCE",
      },
      policy: DEFAULT_CLOSE_GATE_POLICY,
      checklist: readyChecklist(),
      priorSnapshotRef: null,
      snapshotPayload: null,
    })

    expect(state.accountingPeriodCloseEvidence).toHaveLength(1)
    expect(detail.closedByStaffId).toBe("staff-uuid-2")
    expect(detail.closedByName).toBe("Close Reviewer")
    expect(detail.closedByRole).toBe("HO_FINANCE")
    expect(detail.payload.close.closedByName).toBe("Close Reviewer")
  })

  it("appends a new evidence row on each successful hard close", async () => {
    const { tx, state } = createFinanceMockTx()
    const period = await tx.accountingPeriod.create({
      data: { branchId, periodKey, status: AccountingPeriodStatus.HARD_CLOSED },
    })
    const closedAt1 = new Date("2026-05-30T10:00:00.000Z")
    const closedAt2 = new Date("2026-06-30T10:00:00.000Z")
    const baseInput = {
      period: {
        id: period.id,
        branchId,
        periodKey,
        statusBefore: AccountingPeriodStatus.OPEN,
        openedAt: period.openedAt,
      },
      closedBy: { staffId: "staff-1", name: "A", role: "HO_FINANCE" },
      policy: DEFAULT_CLOSE_GATE_POLICY,
      checklist: readyChecklist(),
      priorSnapshotRef: null,
      snapshotPayload: null,
    }

    const first = await createCloseEvidenceForHardClose(tx, {
      ...baseInput,
      period: { ...baseInput.period, closedAt: closedAt1 },
    })
    const second = await createCloseEvidenceForHardClose(tx, {
      ...baseInput,
      period: { ...baseInput.period, closedAt: closedAt2 },
      closedBy: { staffId: "other", name: "Other", role: "HO_ADMIN" },
    })

    expect(second.id).not.toBe(first.id)
    expect(state.accountingPeriodCloseEvidence).toHaveLength(2)
    expect(second.closedByName).toBe("Other")

    const latest = await getLatestCloseEvidenceByPeriodId(tx, period.id)
    expect(latest.id).toBe(second.id)

    const history = await listCloseEvidenceByPeriodId(tx, period.id)
    expect(history).toHaveLength(2)
    expect(history[0]?.id).toBe(second.id)
  })

  it("getCloseEvidenceByPeriodId returns stored evidence", async () => {
    const { tx } = createFinanceMockTx()
    const period = await tx.accountingPeriod.create({
      data: { branchId, periodKey, status: AccountingPeriodStatus.HARD_CLOSED },
    })
    const closedAt = new Date("2026-05-30T10:00:00.000Z")

    await createCloseEvidenceForHardClose(tx, {
      period: {
        id: period.id,
        branchId,
        periodKey,
        statusBefore: AccountingPeriodStatus.OPEN,
        openedAt: period.openedAt,
        closedAt,
      },
      closedBy: { staffId: "staff-1", name: "Reviewer", role: "HO_FINANCE" },
      policy: DEFAULT_CLOSE_GATE_POLICY,
      checklist: readyChecklist(),
      priorSnapshotRef: null,
      snapshotPayload: null,
    })

    const loaded = await getCloseEvidenceByPeriodId(tx, period.id)
    expect(loaded.periodId).toBe(period.id)
    expect(loaded.reconciliationSnapshotId).toBe("snap-1")
  })

  it("getCloseEvidenceByPeriodId throws CLOSE_EVIDENCE_NOT_FOUND when missing", async () => {
    const { tx } = createFinanceMockTx()

    await expect(getCloseEvidenceByPeriodId(tx, "missing-period")).rejects.toMatchObject({
      code: "CLOSE_EVIDENCE_NOT_FOUND",
    })
  })
})
