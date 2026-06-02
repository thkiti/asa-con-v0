jest.mock("@/lib/finance/close-readiness", () => ({
  buildCloseReadinessWithSnapshotsForPeriod: jest.fn(),
}))

import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { CloseChecklistResult } from "@/lib/finance/close-checklist-types"
import { buildCloseReadinessWithSnapshotsForPeriod } from "@/lib/finance/close-readiness"
import { closeAccountingPeriod, reopenAccountingPeriod } from "@/lib/finance/period-close"
import { getPeriodAuditTimelineByPeriodId } from "@/lib/finance/period-audit-timeline"
import {
  approveReopenRequest,
  cancelReopenRequest,
  createReopenRequest,
  rejectReopenRequest,
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

describe("period-audit-timeline (22A)", () => {
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
    await expect(getPeriodAuditTimelineByPeriodId(tx, "missing")).rejects.toMatchObject({
      code: "PERIOD_NOT_FOUND",
    })
  })

  it("returns timeline sorted ascending by occurredAt", async () => {
    const { tx } = createFinanceMockTx()
    const period = await tx.accountingPeriod.create({
      data: { branchId, periodKey, status: AccountingPeriodStatus.OPEN },
    })

    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "SOFT",
    })
    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: financeActor,
    })

    const result = await getPeriodAuditTimelineByPeriodId(tx, period.id)
    const times = result.timeline.map((item) => item.occurredAt)
    const sorted = [...times].sort((a, b) => a.localeCompare(b))
    expect(times).toEqual(sorted)
    expect(result.timeline[0]?.type).toBe("period_opened")
  })

  it("includes close evidence and hard close events", async () => {
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

    const result = await getPeriodAuditTimelineByPeriodId(tx, period.id)
    const types = result.timeline.map((item) => item.type)
    expect(types).toContain("period_hard_closed")
    expect(types).toContain("close_evidence_generated")
  })

  it("includes reopen request workflow events", async () => {
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

    const result = await getPeriodAuditTimelineByPeriodId(tx, period.id)
    const types = result.timeline.map((item) => item.type)
    expect(types).toContain("reopen_requested")
    expect(types).toContain("reopen_approved")
    expect(types).toContain("period_reopened")
  })

  it("includes rejected reopen request event", async () => {
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
      reason: "Insufficient support",
      requestedBy: financeActor,
    })

    await rejectReopenRequest(tx, {
      requestId: request.id,
      rejectedBy: hoAdminActor,
      rejectionNote: "Denied",
    })

    const result = await getPeriodAuditTimelineByPeriodId(tx, period.id)
    expect(result.timeline.map((item) => item.type)).toContain("reopen_rejected")
  })

  it("includes canceled reopen request event", async () => {
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
      reason: "Submitted in error",
      requestedBy: financeActor,
    })

    await cancelReopenRequest(tx, {
      requestId: request.id,
      cancelledBy: financeActor,
    })

    const result = await getPeriodAuditTimelineByPeriodId(tx, period.id)
    expect(result.timeline.map((item) => item.type)).toContain("reopen_canceled")
  })

  it("includes period_soft_closed when period is SOFT_CLOSED", async () => {
    const { tx } = createFinanceMockTx()
    const period = await tx.accountingPeriod.create({
      data: { branchId, periodKey, status: AccountingPeriodStatus.OPEN },
    })

    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "SOFT",
    })

    const result = await getPeriodAuditTimelineByPeriodId(tx, period.id)
    expect(result.timeline.map((item) => item.type)).toContain("period_soft_closed")
  })

  it("does not mutate audit state when building timeline", async () => {
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

    await reopenAccountingPeriod(tx, {
      branchId,
      periodKey,
      reason: "Direct soft reopen",
      reopenedBy: hoAdminActor,
    })

    const before = snapshotState(state)
    await getPeriodAuditTimelineByPeriodId(tx, period.id)
    const after = snapshotState(state)
    expect(after).toBe(before)
  })
})
