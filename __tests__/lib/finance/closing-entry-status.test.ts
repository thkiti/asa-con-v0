import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  allocateClosingEntryRefId,
  getActiveClosingEntry,
  listClosingEntriesForPeriod,
} from "@/lib/finance/closing-entry-status"
import { postClosingEntry } from "@/lib/finance/closing-entry-post"
import { postJournalReversal } from "@/lib/finance/posting"
import type { ClosingEntryStatus } from "@/lib/finance/closing-entry-types"
import {
  addRetainedEarningsAccount,
  seedOpenPeriod,
  seedProfitPeriod,
} from "./closing-entry-helpers"
import { createFinanceMockTx } from "./mock-finance-tx"

describe("closing entry status", () => {
  const branchId = "branch-1"
  const periodKey = "2026-05"

  it("detects active closing entry", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    addRetainedEarningsAccount(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "1000",
      expenseAmount: "400",
    })

    await postClosingEntry(tx, {
      periodId: period.id,
      branchId,
      periodKey,
    })

    const active = await getActiveClosingEntry(tx, period.id)
    expect(active).not.toBeNull()
    expect(active?.isActive).toBe(true)
    expect(active?.isReversed).toBe(false)
    expect(active?.refId).toBe(period.id)
    expect(active?.netIncome).toBe("600")
  })

  it("ignores reversed entry as active", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    addRetainedEarningsAccount(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "500",
      expenseAmount: "0",
    })

    const posted = await postClosingEntry(tx, {
      periodId: period.id,
      branchId,
      periodKey,
    })

    await postJournalReversal({
      tx,
      journalEntryId: posted.journalEntryId!,
      reversalDate: new Date("2026-05-20T12:00:00.000Z"),
      reason: "Test reversal",
    })

    const active = await getActiveClosingEntry(tx, period.id)
    expect(active).toBeNull()

    const entries = await listClosingEntriesForPeriod(tx, period.id)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.isReversed).toBe(true)
    expect(entries[0]?.reversedByJournalId).not.toBeNull()
  })

  it("allocates suffix refId after reversal", async () => {
    const periodId = "period-abc"
    const entries: ClosingEntryStatus[] = [
      {
        voucherId: "v1",
        voucherNo: "V-1",
        journalEntryId: "j1",
        refId: periodId,
        netIncome: "100",
        lineCount: 2,
        postedAt: "2026-05-31T00:00:00.000Z",
        isActive: false,
        isReversed: true,
        reversedByJournalId: "rev-1",
      },
    ]

    expect(allocateClosingEntryRefId(periodId, entries)).toBe(`${periodId}:2`)

    const withSecond: ClosingEntryStatus[] = [
      ...entries,
      {
        voucherId: "v2",
        voucherNo: "V-2",
        journalEntryId: "j2",
        refId: `${periodId}:2`,
        netIncome: "100",
        lineCount: 2,
        postedAt: "2026-06-01T00:00:00.000Z",
        isActive: false,
        isReversed: true,
        reversedByJournalId: "rev-2",
      },
    ]

    expect(allocateClosingEntryRefId(periodId, withSecond)).toBe(`${periodId}:3`)
  })

  it("lists closing entries with PERIOD_CLOSING_ENTRY refType only", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    addRetainedEarningsAccount(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "200",
      expenseAmount: "0",
    })

    await postClosingEntry(tx, {
      periodId: period.id,
      branchId,
      periodKey,
    })

    const entries = await listClosingEntriesForPeriod(tx, period.id)
    expect(entries).toHaveLength(1)
    expect(
      state.vouchers.find(
        (voucher) => voucher.refType === FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY
      )?.refId
    ).toBe(period.id)
  })
})
