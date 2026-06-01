jest.mock("@/lib/finance/close-readiness", () => ({
  buildCloseReadinessWithSnapshotsForPeriod: jest.fn(),
}))

import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { buildCloseReadinessWithSnapshotsForPeriod } from "@/lib/finance/close-readiness"
import type { CloseChecklistResult } from "@/lib/finance/close-checklist-types"
import { closeAccountingPeriod } from "@/lib/finance/period-close"
import { assertDirectReopenAllowed } from "@/lib/finance/reopen-request"
import {
  approveReopenRequest,
  cancelReopenRequest,
  createReopenRequest,
  rejectReopenRequest,
} from "@/lib/finance/reopen-request"
import { assertPostingPeriodOpen } from "@/lib/finance/posting-period"
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
const postingDate = new Date("2026-05-15T12:00:00.000Z")

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

async function seedHardClosedPeriod(tx: ReturnType<typeof createFinanceMockTx>["tx"]) {
  const period = await tx.accountingPeriod.create({
    data: { branchId, periodKey, status: AccountingPeriodStatus.OPEN },
  })
  await closeAccountingPeriod(tx, {
    branchId,
    periodKey,
    mode: "HARD",
    closedBy: financeActor,
  })
  return period
}

describe("reopen-request (21B)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockBuildChecklist.mockResolvedValue({
      checklist: gateReadyChecklist(),
      priorSnapshotRef: null,
      snapshotPayload: null,
    })
  })

  it("creates pending HARD reopen request with requestNo", async () => {
    const { tx, state } = createFinanceMockTx()
    const period = await seedHardClosedPeriod(tx)

    const request = await createReopenRequest(tx, {
      periodId: period.id,
      reason: "Correct posting error",
      requestedBy: financeActor,
    })

    expect(request.status).toBe("PENDING")
    expect(request.requestNo).toMatch(/^RRO-2026-05-\d{4}$/)
    expect(request.fromStatus).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(request.toStatus).toBe(AccountingPeriodStatus.SOFT_CLOSED)
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(state.accountingPeriodReopenRequest).toHaveLength(1)
    expect(state.accountingPeriodReopenEvidence).toHaveLength(0)
  })

  it("approve executes reopen, writes evidence, and records approval audit fields", async () => {
    const { tx, state } = createFinanceMockTx()
    const period = await seedHardClosedPeriod(tx)

    const request = await createReopenRequest(tx, {
      periodId: period.id,
      reason: "Admin approved unlock",
      requestedBy: financeActor,
    })

    const approved = await approveReopenRequest(tx, {
      requestId: request.id,
      approvedBy: hoAdminActor,
      approvalNote: "Verified with controller",
    })

    expect(approved.status).toBe("EXECUTED")
    expect(approved.approvedByStaffId).toBe(hoAdminActor.staffId)
    expect(approved.approvalNote).toBe("Verified with controller")
    expect(approved.executedAt).toBeTruthy()
    expect(approved.reopenEvidenceId).toBeTruthy()
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
    expect(state.accountingPeriodReopenEvidence).toHaveLength(1)
    expect(state.accountingPeriodReopenEvidence[0]?.payload).toMatchObject({
      reopenRequestId: request.id,
      approval: expect.objectContaining({
        requestNo: request.requestNo,
        approvedByStaffId: hoAdminActor.staffId,
      }),
    })

    await expect(
      assertPostingPeriodOpen(tx, branchId, postingDate)
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })
  })

  it("reject leaves period HARD_CLOSED with rejection audit fields", async () => {
    const { tx, state } = createFinanceMockTx()
    const period = await seedHardClosedPeriod(tx)

    const request = await createReopenRequest(tx, {
      periodId: period.id,
      reason: "Not enough evidence",
      requestedBy: financeActor,
    })

    const rejected = await rejectReopenRequest(tx, {
      requestId: request.id,
      rejectedBy: hoAdminActor,
      rejectionNote: "Need controller sign-off",
    })

    expect(rejected.status).toBe("REJECTED")
    expect(rejected.rejectedByStaffId).toBe(hoAdminActor.staffId)
    expect(rejected.rejectionNote).toBe("Need controller sign-off")
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(state.accountingPeriodReopenEvidence).toHaveLength(0)
  })

  it("cancel allows requester only", async () => {
    const { tx } = createFinanceMockTx()
    const period = await seedHardClosedPeriod(tx)

    const request = await createReopenRequest(tx, {
      periodId: period.id,
      reason: "Submitted in error",
      requestedBy: financeActor,
    })

    const cancelled = await cancelReopenRequest(tx, {
      requestId: request.id,
      cancelledBy: financeActor,
    })

    expect(cancelled.status).toBe("CANCELLED")
    expect(cancelled.cancelledByStaffId).toBe(financeActor.staffId)

    await expect(
      cancelReopenRequest(tx, {
        requestId: request.id,
        cancelledBy: hoAdminActor,
      })
    ).rejects.toMatchObject({ code: "REOPEN_REQUEST_NOT_PENDING" })
  })

  it("blocks duplicate pending requests", async () => {
    const { tx } = createFinanceMockTx()
    const period = await seedHardClosedPeriod(tx)

    await createReopenRequest(tx, {
      periodId: period.id,
      reason: "First request",
      requestedBy: financeActor,
    })

    await expect(
      createReopenRequest(tx, {
        periodId: period.id,
        reason: "Second request",
        requestedBy: financeActor,
      })
    ).rejects.toMatchObject({ code: "REOPEN_REQUEST_PENDING" })
  })

  it("HO_FINANCE cannot approve HARD reopen", async () => {
    const { tx } = createFinanceMockTx()
    const period = await seedHardClosedPeriod(tx)

    const request = await createReopenRequest(tx, {
      periodId: period.id,
      reason: "Needs admin",
      requestedBy: financeActor,
    })

    await expect(
      approveReopenRequest(tx, {
        requestId: request.id,
        approvedBy: financeActor,
      })
    ).rejects.toMatchObject({ code: "REOPEN_APPROVER_FORBIDDEN" })
  })

  it("HO_ADMIN cannot approve own request", async () => {
    const { tx } = createFinanceMockTx()
    const period = await seedHardClosedPeriod(tx)

    const request = await createReopenRequest(tx, {
      periodId: period.id,
      reason: "Self request",
      requestedBy: hoAdminActor,
    })

    await expect(
      approveReopenRequest(tx, {
        requestId: request.id,
        approvedBy: hoAdminActor,
      })
    ).rejects.toMatchObject({ code: "REOPEN_SELF_APPROVAL_FORBIDDEN" })
  })

  it("assertDirectReopenAllowed blocks HARD reopen", () => {
    expect(() =>
      assertDirectReopenAllowed(AccountingPeriodStatus.HARD_CLOSED)
    ).toThrow(expect.objectContaining({ code: "REOPEN_APPROVAL_REQUIRED" }))
  })
})
