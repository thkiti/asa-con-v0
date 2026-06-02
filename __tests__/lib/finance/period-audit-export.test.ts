jest.mock("@/lib/finance/close-readiness", () => ({
  buildCloseReadinessWithSnapshotsForPeriod: jest.fn(),
}))

import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { buildCloseReadinessWithSnapshotsForPeriod } from "@/lib/finance/close-readiness"
import type { CloseChecklistResult } from "@/lib/finance/close-checklist-types"
import { closeAccountingPeriod } from "@/lib/finance/period-close"
import { getPeriodAuditExportByPeriodId } from "@/lib/finance/period-audit-export"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import {
  approveReopenRequest,
  createReopenRequest,
} from "@/lib/finance/reopen-request"
import { createFinanceMockTx } from "./mock-finance-tx"

const financeActor = {
  staffId: "finance-uuid-1",
  name: "Finance User",
  role: "HO_FINANCE",
}

const hoAdminActor = {
  staffId: "admin-uuid-1",
  name: "HO Admin",
  role: "HO_ADMIN",
}

const branchId = "branch-1"
const periodKey = "2026-05"

const mockBuildChecklist = buildCloseReadinessWithSnapshotsForPeriod as jest.MockedFunction<
  typeof buildCloseReadinessWithSnapshotsForPeriod
>

function gateReadyChecklist(): CloseChecklistResult {
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
      totalVarianceAmount: "0.00",
      missingGlIssueCount: 0,
      missingSourceIssueCount: 0,
      inventoryDomainPresent: true,
      revenueDomainPresent: true,
      snapshotAgeDays: 0,
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

function snapshotState(state: ReturnType<typeof createFinanceMockTx>["state"]) {
  return JSON.stringify({
    periods: state.accountingPeriods,
    closeEvidence: state.accountingPeriodCloseEvidence,
    reopenEvidence: state.accountingPeriodReopenEvidence,
    reopenRequests: state.accountingPeriodReopenRequest,
  })
}

describe("period-audit-export (22B)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockBuildChecklist.mockResolvedValue({
      checklist: gateReadyChecklist(),
      priorSnapshotRef: null,
      snapshotPayload: null,
    })
  })

  it("throws PERIOD_NOT_FOUND for unknown period", async () => {
    const { tx } = createFinanceMockTx()
    await expect(getPeriodAuditExportByPeriodId(tx, "missing")).rejects.toMatchObject({
      code: "PERIOD_NOT_FOUND",
    })
  })

  it("composes timeline, close evidence, reopen evidence, and requests", async () => {
    const { tx } = createFinanceMockTx()
    const period = await tx.accountingPeriod.create({
      data: { branchId, periodKey, status: AccountingPeriodStatus.OPEN },
    })

    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: financeActor,
    })

    const request = await createReopenRequest(tx, {
      periodId: period.id,
      reason: "Need correction",
      requestedBy: financeActor,
    })

    await approveReopenRequest(tx, {
      requestId: request.id,
      approvedBy: hoAdminActor,
      approvalNote: "OK",
    })

    const bundle = await getPeriodAuditExportByPeriodId(tx, period.id)

    expect(bundle.exportVersion).toBe(1)
    expect(bundle.period.id).toBe(period.id)
    expect(bundle.timeline.length).toBeGreaterThan(0)
    expect(bundle.closeEvidence.length).toBe(1)
    expect(bundle.reopenEvidence.length).toBe(1)
    expect(bundle.reopenRequests.length).toBe(1)
    expect(bundle.counts.timelineEventCount).toBe(bundle.timeline.length)
    expect(bundle.timeline.map((item) => item.type)).toContain("close_evidence_generated")
    expect(bundle.reopenRequests[0]?.requestNo).toMatch(/^RRO-/)
  })

  it("returns OPEN period bundle with minimal timeline only", async () => {
    const { tx } = createFinanceMockTx()
    const period = await tx.accountingPeriod.create({
      data: { branchId, periodKey, status: AccountingPeriodStatus.OPEN },
    })

    const bundle = await getPeriodAuditExportByPeriodId(tx, period.id)

    expect(bundle.closeEvidence).toEqual([])
    expect(bundle.reopenEvidence).toEqual([])
    expect(bundle.reopenRequests).toEqual([])
    expect(bundle.timeline.some((item) => item.type === "period_opened")).toBe(true)
  })

  it("does not mutate audit state when building export bundle", async () => {
    const { tx, state } = createFinanceMockTx()
    const period = await tx.accountingPeriod.create({
      data: { branchId, periodKey, status: AccountingPeriodStatus.OPEN },
    })

    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: financeActor,
    })

    const before = snapshotState(state)
    await getPeriodAuditExportByPeriodId(tx, period.id)
    const after = snapshotState(state)
    expect(after).toBe(before)
  })

  it("rejects blank period id via timeline step", async () => {
    const { tx } = createFinanceMockTx()
    await expect(getPeriodAuditExportByPeriodId(tx, " ")).rejects.toBeInstanceOf(
      FinancePostingError
    )
  })
})
