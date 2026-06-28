import { AccountingPeriodStatus, Prisma, VoucherStatus } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { toMoney } from "@/lib/finance/decimal"
import { profitLossToCsv, netIncomeLabel } from "@/lib/finance-ui/profit-loss"
import { getProfitLoss } from "@/lib/finance/reports/profit-loss"
import { createFinanceMockTx } from "../mock-finance-tx"

const d = (n: string) => new Prisma.Decimal(n)

function seedJournal(
  state: ReturnType<typeof createFinanceMockTx>["state"],
  input: {
    id: string
    branchId: string
    periodId: string
    date: Date
    legalEntityCode?: string
    lines: { code: string; debit: string; credit: string }[]
  }
) {
  const voucherId = `voucher-${input.id}`
  state.vouchers.push({
    id: voucherId,
    voucherNo: `V-${input.id}`,
    date: input.date,
    status: VoucherStatus.POSTED,
    branchId: input.branchId,
    periodId: input.periodId,
    refType: "MANUAL_JOURNAL",
    refId: input.id,
    refNo: null,
    description: null,
    postedAt: input.date,
    createdAt: input.date,
  })

  state.journalEntries.push({
    id: input.id,
    voucherId,
    date: input.date,
    branchId: input.branchId,
    legalEntityCode: input.legalEntityCode ?? "AS",
    periodId: input.periodId,
    postedAt: input.date,
    createdAt: input.date,
    reversalOfJournalEntryId: null,
  })

  let lineNo = 1
  for (const line of input.lines) {
    const account = state.glAccounts.find((a) => a.code === line.code)
    if (!account) throw new Error(`missing account ${line.code}`)
    state.journalEntryLines.push({
      id: `jline-${input.id}-${lineNo}`,
      journalEntryId: input.id,
      lineNo,
      glAccountId: account.id,
      debit: d(line.debit),
      credit: d(line.credit),
      memo: null,
    })
    lineNo += 1
  }
}

async function seedPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  branchId: string,
  periodKey: string,
  legalEntityCode: string = "AS"
) {
  return tx.accountingPeriod.create({
    data: {
      branchId,
      periodKey,
      legalEntityCode,
      status: AccountingPeriodStatus.OPEN,
    },
  })
}

describe("getProfitLoss", () => {
  const branchId = "branch-1"

  it("returns empty sections for period with no activity", async () => {
    const { tx } = createFinanceMockTx(branchId)
    await seedPeriod(tx, branchId, "2026-05")

    const result = await getProfitLoss(tx, { legalEntityCode: "AS", branchId, periodKey: "2026-05" })

    expect(result.revenue).toEqual([])
    expect(result.expenses).toEqual([])
    expect(result.totalRevenue).toBe("0")
    expect(result.totalExpense).toBe("0")
    expect(result.netIncome).toBe("0")
  })

  it("reports revenue-only activity", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-revenue",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "1000", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "1000" },
      ],
    })

    const result = await getProfitLoss(tx, { legalEntityCode: "AS", branchId, periodKey: "2026-05" })

    expect(result.revenue).toHaveLength(1)
    expect(result.revenue[0]).toMatchObject({
      accountCode: DEFAULT_ACCOUNT_CODES.REVENUE,
      amount: "1000",
    })
    expect(result.expenses).toEqual([])
    expect(result.totalRevenue).toBe("1000")
    expect(result.totalExpense).toBe("0")
    expect(result.netIncome).toBe("1000")
  })

  it("reports expense-only activity", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-expense",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.COGS, debit: "300", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "0", credit: "300" },
      ],
    })

    const result = await getProfitLoss(tx, { legalEntityCode: "AS", branchId, periodKey: "2026-05" })

    expect(result.revenue).toEqual([])
    expect(result.expenses).toHaveLength(1)
    expect(result.expenses[0]?.amount).toBe("300")
    expect(result.netIncome).toBe("-300")
  })

  it("calculates net income from revenue and expense", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-revenue",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-10T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "1000", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "1000" },
      ],
    })
    seedJournal(state, {
      id: "journal-expense",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-20T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.COGS, debit: "300", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "0", credit: "300" },
      ],
    })

    const result = await getProfitLoss(tx, { legalEntityCode: "AS", branchId, periodKey: "2026-05" })

    expect(result.totalRevenue).toBe("1000")
    expect(result.totalExpense).toBe("300")
    expect(result.netIncome).toBe("700")
    expect(toMoney(result.netIncome).toString()).toBe(
      toMoney(result.totalRevenue).minus(toMoney(result.totalExpense)).toString()
    )
  })

  it("excludes opening balances before the report range", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-opening",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-20T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "500", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "500" },
      ],
    })
    seedJournal(state, {
      id: "journal-period",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "200", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "200" },
      ],
    })

    const result = await getProfitLoss(tx, { legalEntityCode: "AS", branchId, periodKey: "2026-05" })

    expect(result.totalRevenue).toBe("200")
    expect(result.netIncome).toBe("200")
  })

  it("filters by branch", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-a",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "100", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "100" },
      ],
    })
    seedJournal(state, {
      id: "journal-b",
      branchId: "branch-2",
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "999", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "999" },
      ],
    })

    const result = await getProfitLoss(tx, { legalEntityCode: "AS", branchId, periodKey: "2026-05" })
    expect(result.totalRevenue).toBe("100")
  })

  it("filters by date range", async () => {
    const { tx, state } = createFinanceMockTx(branchId)

    seedJournal(state, {
      id: "journal-in",
      branchId,
      periodId: "period-1",
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "120", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "120" },
      ],
    })
    seedJournal(state, {
      id: "journal-out",
      branchId,
      periodId: "period-1",
      date: new Date("2026-06-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "500", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "500" },
      ],
    })

    const result = await getProfitLoss(tx, {
      branchId,
      from: "2026-05-01",
      to: "2026-05-31",
    })

    expect(result.totalRevenue).toBe("120")
  })

  it("reports break-even when revenue equals expense", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-revenue",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-10T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "400", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "400" },
      ],
    })
    seedJournal(state, {
      id: "journal-expense",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-12T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.COGS, debit: "400", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "0", credit: "400" },
      ],
    })

    const result = await getProfitLoss(tx, { legalEntityCode: "AS", branchId, periodKey: "2026-05" })
    expect(result.netIncome).toBe("0")
    expect(netIncomeLabel(result.netIncome)).toBe("Break Even")
  })

  it("reports loss when expenses exceed revenue", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-revenue",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-10T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "100", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "100" },
      ],
    })
    seedJournal(state, {
      id: "journal-expense",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-12T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.COGS, debit: "250", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "0", credit: "250" },
      ],
    })

    const result = await getProfitLoss(tx, { legalEntityCode: "AS", branchId, periodKey: "2026-05" })
    expect(result.netIncome).toBe("-150")
    expect(netIncomeLabel(result.netIncome)).toBe("Loss")
  })

  it("scopes by legal entity", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const asPeriod = await seedPeriod(tx, branchId, "2026-05", "AS")
    const adPeriod = await seedPeriod(tx, branchId, "2026-05", "AD")

    seedJournal(state, {
      id: "journal-as",
      branchId,
      periodId: asPeriod.id,
      legalEntityCode: "AS",
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "100", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "100" },
      ],
    })
    seedJournal(state, {
      id: "journal-ad",
      branchId,
      periodId: adPeriod.id,
      legalEntityCode: "AD",
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "500", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "500" },
      ],
    })

    const asResult = await getProfitLoss(tx, { legalEntityCode: "AS", branchId, periodKey: "2026-05" })
    const adResult = await getProfitLoss(tx, { legalEntityCode: "AD", branchId, periodKey: "2026-05" })

    expect(asResult.totalRevenue).toBe("100")
    expect(adResult.totalRevenue).toBe("500")
  })
})

describe("profitLossToCsv", () => {
  it("maps revenue, expense, and summary rows", () => {
    const csv = profitLossToCsv({
      filter: { legalEntityCode: "AS", branchId: "branch-1", periodKey: "2026-05" },
      revenue: [{ accountCode: "4000", accountName: "Revenue", amount: "1000" }],
      expenses: [{ accountCode: "5000", accountName: "COGS", amount: "300" }],
      totalRevenue: "1000",
      totalExpense: "300",
      netIncome: "700",
    })

    expect(csv).toContain('"Revenue","4000 • Revenue","1000"')
    expect(csv).toContain('"Revenue","Total Revenue","1000"')
    expect(csv).toContain('"Expense","5000 • COGS","300"')
    expect(csv).toContain('"Expense","Total Expense","300"')
    expect(csv).toContain('"Summary","Net Income","700"')
  })
})
