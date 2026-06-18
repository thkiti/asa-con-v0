import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { postClosingEntry } from "@/lib/finance/closing-entry-post"
import { postJournalReversal } from "@/lib/finance/posting"
import { RETAINED_EARNINGS_ACCOUNT_CODE } from "@/lib/finance/reports/retained-earnings"
import {
  addRetainedEarningsAccount,
  seedClosedPeriod,
  seedOpenPeriod,
  seedProfitPeriod,
} from "./closing-entry-helpers"
import { createFinanceMockTx } from "./mock-finance-tx"

describe("postClosingEntry", () => {
  const branchId = "branch-1"
  const periodKey = "2026-05"

  it("posts closing voucher for profit period", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    addRetainedEarningsAccount(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "1000",
      expenseAmount: "600",
    })

    const result = await postClosingEntry(tx, {
      periodId: period.id,
      periodKey,
    })

    expect(result.posted).toBe(true)
    expect(result.alreadyPosted).toBe(false)
    expect(result.netIncome).toBe("400")
    expect(result.lineCount).toBe(3)
    const closingVouchers = state.vouchers.filter(
      (voucher) => voucher.refType === FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY
    )
    expect(closingVouchers).toHaveLength(1)
    expect(closingVouchers[0]?.refId).toBe(period.id)
  })

  it("posts closing voucher for loss period", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    addRetainedEarningsAccount(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "300",
      expenseAmount: "500",
    })

    const result = await postClosingEntry(tx, {
      periodId: period.id,
      periodKey,
    })

    expect(result.posted).toBe(true)
    expect(result.netIncome).toBe("-200")
    expect(result.lineCount).toBe(3)
  })

  it("returns NOT_REQUIRED without voucher for zero P&L", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    addRetainedEarningsAccount(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)

    const result = await postClosingEntry(tx, {
      periodId: period.id,
      periodKey,
    })

    expect(result.posted).toBe(false)
    expect(result.reason).toBe("NOT_REQUIRED")
    expect(result.lineCount).toBe(0)
    expect(state.vouchers).toHaveLength(0)
  })

  it("is idempotent on second call", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    addRetainedEarningsAccount(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "1000",
      expenseAmount: "0",
    })

    const first = await postClosingEntry(tx, {
      periodId: period.id,
      periodKey,
    })
    const second = await postClosingEntry(tx, {
      periodId: period.id,
      periodKey,
    })

    expect(first.alreadyPosted).toBe(false)
    expect(second.alreadyPosted).toBe(true)
    expect(second.voucherId).toBe(first.voucherId)
    expect(
      state.vouchers.filter(
        (voucher) => voucher.refType === FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY
      )
    ).toHaveLength(1)
  })

  it("allows re-close with suffix refId after reversal", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    addRetainedEarningsAccount(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "800",
      expenseAmount: "200",
    })

    const first = await postClosingEntry(tx, {
      periodId: period.id,
      periodKey,
    })

    await postJournalReversal({
      tx,
      journalEntryId: first.journalEntryId!,
      reversalDate: new Date("2026-05-20T12:00:00.000Z"),
      reason: "Reopen corrections",
    })

    const second = await postClosingEntry(tx, {
      periodId: period.id,
      periodKey,
    })

    expect(second.alreadyPosted).toBe(false)
    expect(second.voucherId).not.toBe(first.voucherId)
    const closingVouchers = state.vouchers.filter(
      (voucher) => voucher.refType === FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY
    )
    expect(closingVouchers).toHaveLength(2)
    expect(closingVouchers[1]?.refId).toBe(`${period.id}:2`)
  })

  it("rejects posting to closed period", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    addRetainedEarningsAccount(state)
    const period = await seedClosedPeriod(tx, branchId, periodKey)
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "500",
      expenseAmount: "0",
    })

    await expect(
      postClosingEntry(tx, {
        periodId: period.id,
        branchId,
        periodKey,
      })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })
  })

  it("rejects clearly when retained earnings account 301 is missing", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedOpenPeriod(tx, branchId, periodKey)
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "500",
      expenseAmount: "0",
    })

    await expect(
      postClosingEntry(tx, {
        periodId: period.id,
        branchId,
        periodKey,
      })
    ).rejects.toMatchObject({
      code: "ACCOUNT_NOT_FOUND",
      message: expect.stringContaining(RETAINED_EARNINGS_ACCOUNT_CODE),
    })
  })
})
