import { GlAccountType, Prisma } from "@/generated/prisma/client"
import { postClosingEntry } from "@/lib/finance/closing-entry-post"
import { getChangesInEquity } from "@/lib/finance/reports/changes-in-equity"
import type { ChangesInEquityRowKey } from "@/lib/finance/reports/changes-in-equity-types"
import { RETAINED_EARNINGS_ACCOUNT_CODE } from "@/lib/finance/reports/retained-earnings"
import {
  addRetainedEarningsAccount,
  seedJournal,
  seedOpenPeriod,
  seedProfitPeriod,
} from "../closing-entry-helpers"
import { createFinanceMockTx } from "../mock-finance-tx"

const d = (n: string) => new Prisma.Decimal(n)

function rowByKey(
  rows: { rowKey: ChangesInEquityRowKey; amounts: Record<string, string> }[],
  key: ChangesInEquityRowKey
) {
  const row = rows.find((entry) => entry.rowKey === key)
  if (!row) {
    throw new Error(`Missing row ${key}`)
  }
  return row
}

function seedEquityChart(state: ReturnType<typeof createFinanceMockTx>["state"]) {
  addRetainedEarningsAccount(state)
  if (!state.glAccounts.some((account) => account.code === "1")) {
    state.glAccounts.push({
      id: "gl-share-capital",
      code: "1",
      name: "Share capital",
      accountType: GlAccountType.EQUITY,
      isActive: true,
      deleted: false,
    })
  }
  if (!state.glAccounts.some((account) => account.code === "101")) {
    state.glAccounts.push({
      id: "gl-legal-reserve",
      code: "101",
      name: "Legal reserve",
      accountType: GlAccountType.EQUITY,
      isActive: true,
      deleted: false,
    })
  }
}

describe("getChangesInEquity", () => {
  const branchId = "branch-1"
  const periodKey = "2026-05"

  it("returns empty sections for unknown period", async () => {
    const { tx } = createFinanceMockTx(branchId)

    const result = await getChangesInEquity(tx, { branchId, periodKey: "2099-01" })

    expect(result.columns).toEqual([])
    expect(result.rows).toEqual([])
    expect(result.profitForPeriod).toBe("0")
  })

  it("uses GL opening balance from activity before the report range", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityChart(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)

    seedJournal(state, {
      id: "opening-re",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-20T12:00:00.000Z"),
      lines: [
        { code: RETAINED_EARNINGS_ACCOUNT_CODE, debit: "0", credit: "100000" },
        { code: "1", debit: "0", credit: "100000" },
      ],
    })

    const result = await getChangesInEquity(tx, { branchId, periodKey })

    const opening = rowByKey(result.rows, "OPENING")
    expect(opening.amounts[RETAINED_EARNINGS_ACCOUNT_CODE]).toBe("100000")
    expect(opening.amounts["1"]).toBe("100000")
  })

  it("uses profit and loss net income when no closing entry is posted", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityChart(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)

    seedJournal(state, {
      id: "opening-re",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-20T12:00:00.000Z"),
      lines: [
        { code: RETAINED_EARNINGS_ACCOUNT_CODE, debit: "0", credit: "100000" },
        { code: "1", debit: "0", credit: "100000" },
      ],
    })
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "50000",
      expenseAmount: "0",
    })

    const result = await getChangesInEquity(tx, { branchId, periodKey })

    expect(result.profitSource).toBe("PROFIT_LOSS")
    expect(result.profitForPeriod).toBe("50000")
    expect(result.activeClosingEntry).toBeNull()

    const profitRow = rowByKey(result.rows, "PROFIT_FOR_PERIOD")
    expect(profitRow.amounts[RETAINED_EARNINGS_ACCOUNT_CODE]).toBe("50000")
    expect(profitRow.amounts["1"]).toBe("0")

    const closing = rowByKey(result.rows, "CLOSING")
    expect(closing.amounts[RETAINED_EARNINGS_ACCOUNT_CODE]).toBe("100000")

    expect(result.reconciliation.isBalanced).toBe(false)
    expect(result.warnings.some((warning) => warning.code === "UNCLOSED_PROFIT_PERIOD")).toBe(
      true
    )
    expect(result.warnings.some((warning) => warning.code === "RECONCILIATION_DIFFERENCE")).toBe(
      true
    )
  })

  it("uses closing entry net income when an active closing entry exists", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityChart(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)

    seedJournal(state, {
      id: "opening-re",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-20T12:00:00.000Z"),
      lines: [
        { code: RETAINED_EARNINGS_ACCOUNT_CODE, debit: "0", credit: "100000" },
        { code: "1", debit: "0", credit: "100000" },
      ],
    })
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "1000",
      expenseAmount: "600",
    })

    await postClosingEntry(tx, {
      periodId: period.id,
      branchId,
      periodKey,
    })

    const result = await getChangesInEquity(tx, { branchId, periodKey })

    expect(result.profitSource).toBe("CLOSING_ENTRY")
    expect(result.profitForPeriod).toBe("400")
    expect(result.activeClosingEntry?.netIncome).toBe("400")

    const profitRow = rowByKey(result.rows, "PROFIT_FOR_PERIOD")
    expect(profitRow.amounts[RETAINED_EARNINGS_ACCOUNT_CODE]).toBe("400")

    const closing = rowByKey(result.rows, "CLOSING")
    expect(closing.amounts[RETAINED_EARNINGS_ACCOUNT_CODE]).toBe("100400")

    expect(result.reconciliation.isBalanced).toBe(true)
    expect(rowByKey(result.rows, "RECONCILIATION_CHECK").total).toBe("0")
  })

  it("puts non-closing equity journals in other changes and excludes closing entry lines", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityChart(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)

    seedJournal(state, {
      id: "opening-re",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-20T12:00:00.000Z"),
      lines: [
        { code: RETAINED_EARNINGS_ACCOUNT_CODE, debit: "0", credit: "200000" },
        { code: "1", debit: "0", credit: "200000" },
      ],
    })
    seedJournal(state, {
      id: "re-reduction",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-10T12:00:00.000Z"),
      lines: [
        { code: RETAINED_EARNINGS_ACCOUNT_CODE, debit: "30000", credit: "0" },
        { code: "1", debit: "0", credit: "30000" },
      ],
    })
    seedProfitPeriod(state, {
      branchId,
      periodId: period.id,
      revenueAmount: "50000",
      expenseAmount: "0",
    })
    await postClosingEntry(tx, {
      periodId: period.id,
      branchId,
      periodKey,
    })

    const result = await getChangesInEquity(tx, { branchId, periodKey })

    const other = rowByKey(result.rows, "OTHER_CHANGES")
    expect(other.amounts[RETAINED_EARNINGS_ACCOUNT_CODE]).toBe("-30000")
    expect(other.amounts["1"]).toBe("30000")

    const closing = rowByKey(result.rows, "CLOSING")
    expect(closing.amounts[RETAINED_EARNINGS_ACCOUNT_CODE]).toBe("220000")
    expect(result.reconciliation.isBalanced).toBe(true)
  })

  it("keeps static equity accounts when opening equals closing and no profit applies", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityChart(state)
    const period = await seedOpenPeriod(tx, branchId, periodKey)

    seedJournal(state, {
      id: "opening-capital",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-20T12:00:00.000Z"),
      lines: [
        { code: "101", debit: "0", credit: "200000" },
        { code: "1", debit: "0", credit: "200000" },
      ],
    })

    const result = await getChangesInEquity(tx, { branchId, periodKey })

    expect(result.columns.some((column) => column.accountCode === "101")).toBe(true)
    const profitRow = rowByKey(result.rows, "PROFIT_FOR_PERIOD")
    expect(profitRow.amounts["101"]).toBe("0")

    const opening = rowByKey(result.rows, "OPENING")
    const closing = rowByKey(result.rows, "CLOSING")
    expect(opening.amounts["101"]).toBe("200000")
    expect(closing.amounts["101"]).toBe("200000")
  })
})
