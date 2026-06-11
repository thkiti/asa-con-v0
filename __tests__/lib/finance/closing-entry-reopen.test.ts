import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { postClosingEntry } from "@/lib/finance/closing-entry-post"
import { reopenAccountingPeriod } from "@/lib/finance/period-close"
import {
  addRetainedEarningsAccount,
  seedOpenPeriod,
  seedProfitPeriod,
} from "./closing-entry-helpers"
import { createFinanceMockTx } from "./mock-finance-tx"

const reopenedBy = {
  staffId: "staff-uuid-1",
  name: "Finance Admin",
  role: "HO_FINANCE",
}

describe("closing entry reopen guard", () => {
  const branchId = "branch-1"
  const periodKey = "2026-05"

  it("blocks SOFT_CLOSED to OPEN when active closing entry exists", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    addRetainedEarningsAccount(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "1000",
      expenseAmount: "0",
    })

    await postClosingEntry(tx, {
      periodId: period.id,
      branchId,
      periodKey,
    })

    await tx.accountingPeriod.update({
      where: { id: period.id },
      data: { status: AccountingPeriodStatus.SOFT_CLOSED },
    })

    await expect(
      reopenAccountingPeriod(tx, {
        branchId,
        periodKey,
        reason: "Need corrections",
        reopenedBy,
      })
    ).rejects.toMatchObject({ code: "CLOSING_ENTRY_REOPEN_BLOCKED" })
  })

  it("does not block HARD_CLOSED to SOFT_CLOSED reopen with active closing entry", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    addRetainedEarningsAccount(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "1000",
      expenseAmount: "0",
    })

    await postClosingEntry(tx, {
      periodId: period.id,
      branchId,
      periodKey,
    })

    expect(
      state.vouchers.some(
        (voucher) => voucher.refType === FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY
      )
    ).toBe(true)

    await tx.accountingPeriod.update({
      where: { id: period.id },
      data: { status: AccountingPeriodStatus.HARD_CLOSED },
    })

    state.accountingPeriodCloseEvidence.push({
      id: "close-evidence-1",
      periodId: period.id,
      branchId,
      periodKey,
      closeMode: "HARD",
      closedAt: new Date("2026-05-31T12:00:00.000Z"),
      closedByStaffId: "staff-1",
      closedByName: "Finance Admin",
      closedByRole: "HO_FINANCE",
      readinessStatus: "READY",
      gatePolicyKey: "default",
      reconciliationSnapshotId: null,
      priorSnapshotId: null,
      payloadVersion: 1,
      payload: {},
      createdAt: new Date("2026-05-31T12:00:00.000Z"),
    })

    const reopened = await reopenAccountingPeriod(tx, {
      branchId,
      periodKey,
      reason: "Approval granted",
      reopenedBy: {
        staffId: "admin-uuid-1",
        name: "HO Admin",
        role: "HO_ADMIN",
      },
    })

    expect(reopened.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
  })
})
