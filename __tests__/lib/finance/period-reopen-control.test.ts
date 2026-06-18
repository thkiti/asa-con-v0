jest.mock("@/lib/finance/close-readiness", () => ({
  buildCloseReadinessWithSnapshotsForPeriod: jest.fn(),
}))

import { AccountingPeriodStatus, Prisma } from "@/generated/prisma/client"
import type { CloseChecklistResult } from "@/lib/finance/close-checklist-types"
import { buildCloseReadinessWithSnapshotsForPeriod } from "@/lib/finance/close-readiness"
import {
  closeAccountingPeriod,
  reopenAccountingPeriod,
} from "@/lib/finance/period-close"
import {
  approveReopenRequest,
  assertDirectReopenAllowed,
  createReopenRequest,
} from "@/lib/finance/reopen-request"
import { assertPostingPeriodOpen } from "@/lib/finance/posting-period"
import { postOperationalVoucher } from "@/lib/finance/posting"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { createFinanceMockTx } from "./mock-finance-tx"

const defaultClosedBy = {
  staffId: "staff-uuid-1",
  name: "Finance Admin",
  role: "HO_FINANCE",
}

const hoAdminActor = {
  staffId: "admin-uuid-1",
  name: "HO Admin",
  role: "HO_ADMIN",
}

const mockBuildChecklist = buildCloseReadinessWithSnapshotsForPeriod as jest.MockedFunction<
  typeof buildCloseReadinessWithSnapshotsForPeriod
>

const branchId = "branch-1"
const periodKey = "2026-05"
const postingDate = new Date("2026-05-15T12:00:00.000Z")

function gateReadyChecklist(): CloseChecklistResult {
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

function mockReadySnapshots() {
  return {
    checklist: gateReadyChecklist(),
    priorSnapshotRef: null,
    snapshotPayload: null,
  }
}

async function seedOpenPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  bId: string,
  pKey: string
) {
  return tx.accountingPeriod.create({
    data: { branchId: bId, periodKey: pKey, status: AccountingPeriodStatus.OPEN },
  })
}

function balancedLines(state: ReturnType<typeof createFinanceMockTx>["state"]) {
  const cash = state.glAccounts.find((a) => a.code === "1100")!
  const revenue = state.glAccounts.find((a) => a.code === "4000")!
  return [
    {
      glAccountId: cash.id,
      debit: new Prisma.Decimal("25"),
      credit: new Prisma.Decimal("0"),
    },
    {
      glAccountId: revenue.id,
      debit: new Prisma.Decimal("0"),
      credit: new Prisma.Decimal("25"),
    },
  ]
}

describe("period-reopen-control (21A)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockBuildChecklist.mockResolvedValue(mockReadySnapshots())
  })

  it("HARD_CLOSED → SOFT_CLOSED creates reopen evidence and keeps posting blocked", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    const reopened = await reopenAccountingPeriod(tx, {
      periodKey,
      reason: "Correct prior close",
      reopenedBy: hoAdminActor,
    })

    expect(reopened.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
    expect(state.accountingPeriodReopenEvidence).toHaveLength(1)
    expect(state.accountingPeriodReopenEvidence[0]).toMatchObject({
      fromStatus: AccountingPeriodStatus.HARD_CLOSED,
      toStatus: AccountingPeriodStatus.SOFT_CLOSED,
      reason: "Correct prior close",
      reopenedByRole: "HO_ADMIN",
      closeEvidenceId: state.accountingPeriodCloseEvidence[0]?.id,
    })

    await expect(
      assertPostingPeriodOpen(tx, postingDate)
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })
  })

  it("SOFT_CLOSED → OPEN creates reopen evidence and allows posting", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })

    const reopened = await reopenAccountingPeriod(tx, {
      periodKey,
      reason: "Resume month-end work",
      reopenedBy: defaultClosedBy,
    })

    expect(reopened.status).toBe(AccountingPeriodStatus.OPEN)
    expect(reopened.closedAt).toBeNull()
    expect(state.accountingPeriodReopenEvidence).toHaveLength(1)
    expect(state.accountingPeriodReopenEvidence[0]).toMatchObject({
      fromStatus: AccountingPeriodStatus.SOFT_CLOSED,
      toStatus: AccountingPeriodStatus.OPEN,
      reason: "Resume month-end work",
    })

    await expect(assertPostingPeriodOpen(tx, postingDate)).resolves.toMatchObject({
      status: AccountingPeriodStatus.OPEN,
    })

    await expect(
      postOperationalVoucher({
        tx,
        branchId,
        date: postingDate,
        refType: FINANCE_REF_TYPES.POS_SALE,
        refId: "after-soft-reopen",
        lines: balancedLines(state),
      })
    ).resolves.toMatchObject({ alreadyPosted: false })
  })

  it("rejects missing reason on reopen", async () => {
    const { tx } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })

    await expect(
      reopenAccountingPeriod(tx, {
        periodKey,
        reason: "  ",
        reopenedBy: defaultClosedBy,
      })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  })

  it("HO_FINANCE cannot HARD reopen via execution kernel", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    await expect(
      reopenAccountingPeriod(tx, {
        periodKey,
        reason: "Should fail",
        reopenedBy: defaultClosedBy,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })

    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(state.accountingPeriodReopenEvidence).toHaveLength(0)
  })

  it("HO_ADMIN can HARD reopen with reason", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    await reopenAccountingPeriod(tx, {
      periodKey,
      reason: "Admin unlock",
      reopenedBy: hoAdminActor,
    })

    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
    expect(state.accountingPeriodReopenEvidence).toHaveLength(1)
  })

  it("re-hard-close creates a second close evidence row; prior rows unchanged", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)

    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })
    const firstEvidence = { ...state.accountingPeriodCloseEvidence[0]! }

    await reopenAccountingPeriod(tx, {
      periodKey,
      reason: "Hard reopen",
      reopenedBy: hoAdminActor,
    })
    await reopenAccountingPeriod(tx, {
      periodKey,
      reason: "Soft reopen",
      reopenedBy: defaultClosedBy,
    })
    await closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })
    mockBuildChecklist.mockClear()

    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    expect(state.accountingPeriodCloseEvidence).toHaveLength(2)
    expect(state.accountingPeriodCloseEvidence[0]).toEqual(firstEvidence)
    expect(state.accountingPeriodCloseEvidence[1]?.id).not.toBe(firstEvidence.id)
    expect(mockBuildChecklist).toHaveBeenCalledTimes(1)
  })

  it("idempotent OPEN reopen and HARD close do not duplicate evidence", async () => {
    const { tx, state } = createFinanceMockTx()
    const created = await seedOpenPeriod(tx, branchId, periodKey)

    await reopenAccountingPeriod(tx, {
      periodKey,
      reason: "noop",
      reopenedBy: defaultClosedBy,
    })
    expect(state.accountingPeriodReopenEvidence).toHaveLength(0)

    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })
    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    expect(state.accountingPeriodCloseEvidence).toHaveLength(1)
    expect(state.accountingPeriods[0]?.id).toBe(created.id)
  })

  it("direct HARD reopen is blocked by approval guard", () => {
    expect(() =>
      assertDirectReopenAllowed(AccountingPeriodStatus.HARD_CLOSED)
    ).toThrow(expect.objectContaining({ code: "REOPEN_APPROVAL_REQUIRED" }))
  })

  it("full lifecycle with approval: request → approve → soft reopen → OPEN", async () => {
    const { tx, state } = createFinanceMockTx()
    const period = await seedOpenPeriod(tx, branchId, periodKey)

    await closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })
    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    const request = await createReopenRequest(tx, {
      periodId: period.id,
      reason: "Hard reopen 1",
      requestedBy: defaultClosedBy,
    })
    await approveReopenRequest(tx, {
      requestId: request.id,
      approvedBy: hoAdminActor,
    })

    await reopenAccountingPeriod(tx, {
      periodKey,
      reason: "Soft reopen 1",
      reopenedBy: defaultClosedBy,
    })
    await closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })
    await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    const closeIds = state.accountingPeriodCloseEvidence.map((row) => row.id)
    const reopenIds = state.accountingPeriodReopenEvidence.map((row) => row.id)

    expect(state.accountingPeriodCloseEvidence).toHaveLength(2)
    expect(state.accountingPeriodReopenEvidence).toHaveLength(2)
    expect(state.accountingPeriodReopenRequest.filter((r) => r.status === "EXECUTED")).toHaveLength(1)
    expect(new Set(closeIds).size).toBe(2)
    expect(new Set(reopenIds).size).toBe(2)
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
  })
})
