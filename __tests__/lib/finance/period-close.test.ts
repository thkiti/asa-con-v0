jest.mock("@/lib/finance/close-readiness", () => ({
  buildCloseReadinessWithSnapshotsForPeriod: jest.fn(),
}))

import { AccountingPeriodStatus, Prisma } from "@/generated/prisma/client"
import type { CloseChecklistResult } from "@/lib/finance/close-checklist-types"
import { buildCloseReadinessWithSnapshotsForPeriod } from "@/lib/finance/close-readiness"
import { CloseGateError } from "@/lib/finance/close-gate-errors"
import {
  closeAccountingPeriod,
  reopenAccountingPeriod,
} from "@/lib/finance/period-close"
import { postOperationalVoucher } from "@/lib/finance/posting"
import { assertPostingPeriodOpen } from "@/lib/finance/posting-period"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { buildCloseChecklist } from "@/lib/finance/close-checklist"
import * as closeGateModule from "@/lib/finance/close-gate"
import { getHardCloseGatePolicy } from "@/lib/finance/close-gate-policy"
import { createFinanceMockTx } from "./mock-finance-tx"

const defaultClosedBy = {
  staffId: "staff-uuid-1",
  name: "Finance Admin",
  role: "HO_FINANCE",
}

const mockBuildChecklist = buildCloseReadinessWithSnapshotsForPeriod as jest.MockedFunction<
  typeof buildCloseReadinessWithSnapshotsForPeriod
>

function mockReadySnapshots(checklist = gateReadyChecklist()) {
  return {
    checklist,
    priorSnapshotRef: null,
    snapshotPayload: null,
  }
}

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
      legalEntityCode: "AS",
      branchId,
      periodKey,
      status: AccountingPeriodStatus.OPEN,
      closedAt: null,
    },
  }
}

function gateBlockedChecklist(): CloseChecklistResult {
  return buildCloseChecklist({
    period: {
      id: "period-1",
      legalEntityCode: "AS",
      branchId,
      periodKey,
      status: AccountingPeriodStatus.OPEN,
      closedAt: null,
    },
    latestSnapshot: null,
    priorSnapshot: null,
    snapshotPayload: null,
    now: "2026-05-28T00:00:00.000Z",
  })
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

describe("period-close", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockBuildChecklist.mockResolvedValue(mockReadySnapshots())
  })

  it("closes OPEN period to SOFT_CLOSED with closedAt set", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)

    const closed = await closeAccountingPeriod(tx, {
      periodKey,
      mode: "SOFT",
    })

    expect(closed.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
    expect(closed.closedAt).toBeInstanceOf(Date)
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
    expect(state.accountingPeriods[0]?.closedAt).toBeInstanceOf(Date)
    expect(mockBuildChecklist).not.toHaveBeenCalled()
  })

  it("closes OPEN period to HARD_CLOSED when readiness passes", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)

    const closed = await closeAccountingPeriod(tx, {
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    expect(closed.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(closed.closedAt).toBeInstanceOf(Date)
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(mockBuildChecklist).toHaveBeenCalledTimes(1)
    expect(state.accountingPeriodCloseEvidence).toHaveLength(1)
    expect(state.accountingPeriodCloseEvidence[0]).toMatchObject({
      periodId: closed.id,
      closedByStaffId: defaultClosedBy.staffId,
      closedByName: defaultClosedBy.name,
      closedByRole: defaultClosedBy.role,
    })
  })

  it("closes SOFT_CLOSED period to HARD_CLOSED when readiness passes", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })
    mockBuildChecklist.mockClear()

    const closed = await closeAccountingPeriod(tx, {
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    expect(closed.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(mockBuildChecklist).toHaveBeenCalledTimes(1)
    expect(state.accountingPeriodCloseEvidence).toHaveLength(1)
  })

  describe("close gate policy integration", () => {
    it("uses centralized HARD close policy", async () => {
      const spy = jest.spyOn(closeGateModule, "assertCloseReadiness")
      const { tx } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)
      const checklist = gateReadyChecklist()
      mockBuildChecklist.mockResolvedValue(mockReadySnapshots(checklist))

      await closeAccountingPeriod(tx, {
        periodKey,
        mode: "HARD",
        closedBy: defaultClosedBy,
      })

      expect(spy).toHaveBeenCalledWith(checklist, getHardCloseGatePolicy())
      spy.mockRestore()
    })

    it("skips close gate on SOFT close", async () => {
      const spy = jest.spyOn(closeGateModule, "assertCloseReadiness")
      const { tx } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)

      await closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })

      expect(spy).not.toHaveBeenCalled()
      expect(mockBuildChecklist).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe("close gate enforcement", () => {
    it("rejects HARD close when readiness is BLOCKED and leaves period unchanged", async () => {
      const { tx, state } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)
      mockBuildChecklist.mockResolvedValue(mockReadySnapshots(gateBlockedChecklist()))

      await expect(
        closeAccountingPeriod(tx, {
          periodKey,
          mode: "HARD",
          closedBy: defaultClosedBy,
        })
      ).rejects.toBeInstanceOf(CloseGateError)

      await expect(
        closeAccountingPeriod(tx, {
          periodKey,
          mode: "HARD",
          closedBy: defaultClosedBy,
        })
      ).rejects.toMatchObject({
        code: "CLOSE_SNAPSHOT_REQUIRED",
        blockers: expect.arrayContaining([
          expect.objectContaining({ id: "snapshot-missing", severity: "BLOCKED" }),
        ]),
      })

      expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.OPEN)
      expect(state.accountingPeriods[0]?.closedAt).toBeNull()
      expect(state.accountingPeriodCloseEvidence).toHaveLength(0)
    })

    it("allows HARD close when readiness is WARNING-only", async () => {
      const { tx, state } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)
      mockBuildChecklist.mockResolvedValue(
        mockReadySnapshots({
          ...gateReadyChecklist(),
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
      )

      const closed = await closeAccountingPeriod(tx, {
        periodKey,
        mode: "HARD",
        closedBy: defaultClosedBy,
      })

      expect(closed.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
      expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    })

    it("skips close gate when period is already HARD_CLOSED", async () => {
      const { tx } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)
      await closeAccountingPeriod(tx, {
        periodKey,
        mode: "HARD",
        closedBy: defaultClosedBy,
      })
      mockBuildChecklist.mockClear()

      await closeAccountingPeriod(tx, {
        periodKey,
        mode: "HARD",
        closedBy: defaultClosedBy,
      })

      expect(mockBuildChecklist).not.toHaveBeenCalled()
    })
  })

  const defaultReopenedBy = {
    staffId: "staff-uuid-1",
    name: "Finance Admin",
    role: "HO_FINANCE",
  }

  const hoAdminReopenedBy = {
    staffId: "admin-uuid-1",
    name: "HO Admin",
    role: "HO_ADMIN",
  }

  it("reopens SOFT_CLOSED period to OPEN with closedAt null", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })

    const reopened = await reopenAccountingPeriod(tx, {
      periodKey,
      reason: "Resume posting",
      reopenedBy: defaultReopenedBy,
    })

    expect(reopened.status).toBe(AccountingPeriodStatus.OPEN)
    expect(reopened.closedAt).toBeNull()
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.OPEN)
    expect(state.accountingPeriods[0]?.closedAt).toBeNull()
    expect(state.accountingPeriodReopenEvidence).toHaveLength(1)
  })

  it("reopens HARD_CLOSED to SOFT_CLOSED with HO_ADMIN", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, {
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    const reopened = await reopenAccountingPeriod(tx, {
      periodKey,
      reason: "Admin hard reopen",
      reopenedBy: hoAdminReopenedBy,
    })

    expect(reopened.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
    expect(state.accountingPeriodReopenEvidence).toHaveLength(1)
  })

  it("throws PERIOD_NOT_FOUND when period is missing", async () => {
    const { tx } = createFinanceMockTx()

    await expect(
      closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })
    ).rejects.toMatchObject({ code: "PERIOD_NOT_FOUND" })

    await expect(
      reopenAccountingPeriod(tx, {
        periodKey,
        reason: "test",
        reopenedBy: defaultReopenedBy,
      })
    ).rejects.toMatchObject({
      code: "PERIOD_NOT_FOUND",
    })
  })

  it("is idempotent on SOFT close when already SOFT_CLOSED", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    const first = await closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })

    const second = await closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })

    expect(second.id).toBe(first.id)
    expect(second.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
    expect(state.accountingPeriods).toHaveLength(1)
  })

  it("is idempotent on HARD close when already HARD_CLOSED", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    const first = await closeAccountingPeriod(tx, {
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    const second = await closeAccountingPeriod(tx, {
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    expect(second.id).toBe(first.id)
    expect(second.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(state.accountingPeriods).toHaveLength(1)
    expect(state.accountingPeriodCloseEvidence).toHaveLength(1)
  })

  it("is idempotent on reopen when already OPEN", async () => {
    const { tx, state } = createFinanceMockTx()
    const created = await seedOpenPeriod(tx, branchId, periodKey)

    const reopened = await reopenAccountingPeriod(tx, {
      periodKey,
      reason: "noop",
      reopenedBy: defaultReopenedBy,
    })

    expect(reopened.id).toBe(created.id)
    expect(reopened.status).toBe(AccountingPeriodStatus.OPEN)
    expect(state.accountingPeriods).toHaveLength(1)
    expect(state.accountingPeriodReopenEvidence).toHaveLength(0)
  })

  it("rejects SOFT close when HARD_CLOSED with PERIOD_ALREADY_HARD_CLOSED", async () => {
    const { tx } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, {
      periodKey,
      mode: "HARD",
      closedBy: defaultClosedBy,
    })

    await expect(
      closeAccountingPeriod(tx, { periodKey, mode: "SOFT" })
    ).rejects.toMatchObject({ code: "PERIOD_ALREADY_HARD_CLOSED" })
  })

  describe("posting integration", () => {
    it("assertPostingPeriodOpen succeeds when period is OPEN", async () => {
      const { tx } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)

      const period = await assertPostingPeriodOpen(tx, postingDate)

      expect(period.status).toBe(AccountingPeriodStatus.OPEN)
    })

    it.each([
      ["SOFT", "SOFT" as const],
      ["HARD", "HARD" as const],
    ])(
      "assertPostingPeriodOpen throws PERIOD_CLOSED after %s close",
      async (_label, mode) => {
        const { tx } = createFinanceMockTx()
        await seedOpenPeriod(tx, branchId, periodKey)
        await closeAccountingPeriod(tx, {
          periodKey,
          mode,
          ...(mode === "HARD" ? { closedBy: defaultClosedBy } : {}),
        })

        await expect(
          assertPostingPeriodOpen(tx, postingDate)
        ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })
      }
    )

    it("postOperationalVoucher succeeds on OPEN period", async () => {
      const { tx, state } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)

      await expect(
        postOperationalVoucher({
          tx,
          branchId,
          date: postingDate,
          refType: FINANCE_REF_TYPES.POS_SALE,
          refId: "period-close-open",
          lines: balancedLines(state),
        })
      ).resolves.toMatchObject({ alreadyPosted: false })

      expect(state.vouchers).toHaveLength(1)
    })

    it.each([
      ["SOFT", "SOFT" as const],
      ["HARD", "HARD" as const],
    ])(
      "postOperationalVoucher throws PERIOD_CLOSED after %s close",
      async (_label, mode) => {
        const { tx, state } = createFinanceMockTx()
        await seedOpenPeriod(tx, branchId, periodKey)
        await closeAccountingPeriod(tx, {
          periodKey,
          mode,
          ...(mode === "HARD" ? { closedBy: defaultClosedBy } : {}),
        })

        await expect(
          postOperationalVoucher({
            tx,
            branchId,
            date: postingDate,
            refType: FINANCE_REF_TYPES.POS_SALE,
            refId: `period-close-${mode.toLowerCase()}`,
            lines: balancedLines(state),
          })
        ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

        expect(state.vouchers).toHaveLength(0)
      }
    )
  })
})
