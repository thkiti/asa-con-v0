import { AccountingPeriodStatus, GlAccountType, Prisma } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { getProfitLoss } from "@/lib/finance/reports/profit-loss"
import {
  classifyEquityAccounts,
  getRetainedEarnings,
  isRetainedEarningsAccountCode,
  RETAINED_EARNINGS_ACCOUNT_CODE,
} from "@/lib/finance/reports/retained-earnings"
import {
  retainedEarningsToCsv,
} from "@/lib/finance-ui/retained-earnings"
import { parseRetainedEarningsFilter } from "@/lib/finance/reports/report-filter"
import { ReportError } from "@/lib/reporting/report-errors"
import { createFinanceMockTx } from "../mock-finance-tx"

const d = (n: string) => new Prisma.Decimal(n)

function params(input: Record<string, string>): { get: (name: string) => string | null } {
  return {
    get: (name: string) => input[name] ?? null,
  }
}

function seedJournal(
  state: ReturnType<typeof createFinanceMockTx>["state"],
  input: {
    id: string
    branchId: string
    periodId: string
    date: Date
    lines: { code: string; debit: string; credit: string }[]
  }
) {
  state.journalEntries.push({
    id: input.id,
    voucherId: `voucher-${input.id}`,
    date: input.date,
    branchId: input.branchId,
    periodId: input.periodId,
    postedAt: new Date(),
    createdAt: new Date(),
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
  status: AccountingPeriodStatus = AccountingPeriodStatus.OPEN
) {
  return tx.accountingPeriod.create({
    data: {
      branchId,
      periodKey,
      status,
    },
  })
}

function seedEquityAccounts(state: ReturnType<typeof createFinanceMockTx>["state"]) {
  state.glAccounts.push(
    {
      id: "gl-re-301",
      code: RETAINED_EARNINGS_ACCOUNT_CODE,
      name: "Retained earnings",
      accountType: GlAccountType.EQUITY,
      isActive: true,
      deleted: false,
    },
    {
      id: "gl-capital-101",
      code: "101",
      name: "Legal reserve",
      accountType: GlAccountType.EQUITY,
      isActive: true,
      deleted: false,
    }
  )
}

describe("retained earnings account identification", () => {
  it("matches account code 301 only", () => {
    expect(isRetainedEarningsAccountCode("301")).toBe(true)
    expect(isRetainedEarningsAccountCode("3000")).toBe(false)
    expect(isRetainedEarningsAccountCode("3010")).toBe(false)
  })

  it("classifies equity rows by code 301", () => {
    const result = classifyEquityAccounts([
      { accountCode: "301", accountName: "Retained earnings", amount: "1500000" },
      { accountCode: "101", accountName: "Legal reserve", amount: "200000" },
      { accountCode: "3000", accountName: "Other equity", amount: "100" },
    ])

    expect(result.retainedEarnings).toHaveLength(1)
    expect(result.retainedEarnings[0]?.accountCode).toBe("301")
    expect(result.otherEquity).toHaveLength(2)
  })
})

describe("parseRetainedEarningsFilter", () => {
  it("requires branchId", () => {
    expect(() =>
      parseRetainedEarningsFilter(params({ periodKey: "2026-05" }))
    ).toThrow(ReportError)
  })

  it("accepts period scope", () => {
    const filter = parseRetainedEarningsFilter(
      params({ branchId: "branch-1", periodKey: "2026-05" })
    )
    expect(filter).toEqual({ branchId: "branch-1", periodKey: "2026-05" })
  })
})

describe("getRetainedEarnings", () => {
  const branchId = "branch-1"

  it("returns zeroed bridge for unknown period", async () => {
    const { tx } = createFinanceMockTx(branchId)

    const result = await getRetainedEarnings(tx, { branchId, periodKey: "2099-01" })

    expect(result.postedRetainedEarnings).toBe("0")
    expect(result.currentNetIncome).toBe("0")
    expect(result.adjustedRetainedEarnings).toBe("0")
    expect(result.isEconomicallyBalanced).toBe(true)
  })

  it("computes RE bridge: posted RE + net income = adjusted RE", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityAccounts(state)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-re",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-01"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "1700000", credit: "0" },
        { code: RETAINED_EARNINGS_ACCOUNT_CODE, debit: "0", credit: "1500000" },
        { code: "101", debit: "0", credit: "200000" },
      ],
    })

    seedJournal(state, {
      id: "journal-pl",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "250000", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "250000" },
      ],
    })

    const result = await getRetainedEarnings(tx, { branchId, periodKey: "2026-05" })
    const profitLoss = await getProfitLoss(tx, { branchId, periodKey: "2026-05" })

    expect(result.postedRetainedEarnings).toBe("1500000")
    expect(result.otherEquityTotal).toBe("200000")
    expect(result.postedTotalEquity).toBe("1700000")
    expect(result.currentNetIncome).toBe("250000")
    expect(result.currentNetIncome).toBe(profitLoss.netIncome)
    expect(result.adjustedRetainedEarnings).toBe("1750000")
    expect(result.adjustedTotalEquity).toBe("1950000")
    expect(result.totalAssets).toBe("1950000")
    expect(result.isUnclosedEarningsExplained).toBe(true)
    expect(result.unclosedEarningsGap).toBe("0")
    expect(result.isEconomicallyBalanced).toBe(true)
  })

  it("explains balance sheet gap with unclosed P&L", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityAccounts(state)
    const period = await seedPeriod(tx, branchId, "2026-06")

    seedJournal(state, {
      id: "journal-unclosed",
      branchId,
      periodId: period.id,
      date: new Date("2026-06-10"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "500", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "500" },
      ],
    })

    const result = await getRetainedEarnings(tx, { branchId, periodKey: "2026-06" })

    expect(result.postedRetainedEarnings).toBe("0")
    expect(result.currentNetIncome).toBe("500")
    expect(result.adjustedRetainedEarnings).toBe("500")
    expect(result.balanceSheetDifference).toBe("500")
    expect(result.isUnclosedEarningsExplained).toBe(true)
    expect(result.isEconomicallyBalanced).toBe(true)
  })

  it("handles loss periods", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityAccounts(state)
    const period = await seedPeriod(tx, branchId, "2026-07")

    seedJournal(state, {
      id: "journal-loss",
      branchId,
      periodId: period.id,
      date: new Date("2026-07-05"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.COGS, debit: "300", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "0", credit: "300" },
      ],
    })

    const result = await getRetainedEarnings(tx, { branchId, periodKey: "2026-07" })

    expect(result.currentNetIncome).toBe("-300")
    expect(result.adjustedRetainedEarnings).toBe("-300")
    expect(result.warnings.some((w) => w.code === "LOSS_PERIOD")).toBe(true)
  })

  it("handles negative posted retained earnings", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityAccounts(state)
    const period = await seedPeriod(tx, branchId, "2026-08")

    seedJournal(state, {
      id: "journal-negative-re",
      branchId,
      periodId: period.id,
      date: new Date("2026-08-01"),
      lines: [
        { code: RETAINED_EARNINGS_ACCOUNT_CODE, debit: "100", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "0", credit: "100" },
      ],
    })

    const result = await getRetainedEarnings(tx, { branchId, periodKey: "2026-08" })

    expect(result.postedRetainedEarnings).toBe("-100")
    expect(result.warnings.some((w) => w.code === "NEGATIVE_RETAINED_EARNINGS")).toBe(true)
  })

  it("warns when other equity exists without account 301", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    state.glAccounts.push({
      id: "gl-capital-only",
      code: "101",
      name: "Legal reserve",
      accountType: GlAccountType.EQUITY,
      isActive: true,
      deleted: false,
    })
    const period = await seedPeriod(tx, branchId, "2026-09")

    seedJournal(state, {
      id: "journal-capital",
      branchId,
      periodId: period.id,
      date: new Date("2026-09-01"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "0", credit: "100" },
        { code: "101", debit: "0", credit: "100" },
      ],
    })

    const result = await getRetainedEarnings(tx, { branchId, periodKey: "2026-09" })

    expect(result.retainedEarningsAccounts).toHaveLength(0)
    expect(result.warnings.some((w) => w.code === "NO_RETAINED_EARNINGS_ACCOUNT")).toBe(true)
    expect(result.warnings.some((w) => w.code === "OTHER_EQUITY_PRESENT")).toBe(true)
  })

  it("reads closed periods without mutation", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityAccounts(state)
    const period = await seedPeriod(
      tx,
      branchId,
      "2026-04",
      AccountingPeriodStatus.HARD_CLOSED
    )

    seedJournal(state, {
      id: "journal-closed",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-10"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "250", credit: "0" },
        { code: RETAINED_EARNINGS_ACCOUNT_CODE, debit: "0", credit: "250" },
      ],
    })

    const before = state.journalEntries.length
    const result = await getRetainedEarnings(tx, { branchId, periodKey: "2026-04" })
    const after = state.journalEntries.length

    expect(after).toBe(before)
    expect(result.period.periodStatus).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(result.postedRetainedEarnings).toBe("250")
  })
})

describe("retainedEarningsToCsv", () => {
  it("includes bridge and reconciliation rows", () => {
    const csv = retainedEarningsToCsv({
      filter: { branchId: "branch-1", periodKey: "2026-05" },
      period: { branchId: "branch-1", periodKey: "2026-05" },
      retainedEarningsAccounts: [
        { accountCode: "301", accountName: "Retained earnings", amount: "1500000" },
      ],
      otherEquityAccounts: [],
      postedRetainedEarnings: "1500000",
      otherEquityTotal: "0",
      postedTotalEquity: "1500000",
      currentNetIncome: "250000",
      adjustedRetainedEarnings: "1750000",
      adjustedTotalEquity: "1750000",
      totalAssets: "1750000",
      totalLiabilities: "0",
      balanceSheetDifference: "250000",
      unclosedEarningsGap: "0",
      isUnclosedEarningsExplained: true,
      isEconomicallyBalanced: true,
      warnings: [],
    })

    expect(csv).toContain("Posted Retained Earnings")
    expect(csv).toContain("Adjusted Retained Earnings")
    expect(csv).toContain("Economically Balanced")
  })
})
