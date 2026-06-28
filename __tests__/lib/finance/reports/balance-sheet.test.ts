import { AccountingPeriodStatus, GlAccountType, Prisma } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import {
  balanceSheetDifference,
  isBalanceSheetBalanced,
} from "@/lib/finance/reports/balance-helpers"
import { getBalanceSheet } from "@/lib/finance/reports/balance-sheet"
import { getTrialBalance } from "@/lib/finance/reports/trial-balance"
import { balanceSheetToCsv } from "@/lib/finance-ui/balance-sheet"
import { parseBalanceSheetFilter } from "@/lib/finance/reports/report-filter"
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
    legalEntityCode?: string
    lines: { code: string; debit: string; credit: string }[]
  }
) {
  state.journalEntries.push({
    id: input.id,
    voucherId: `voucher-${input.id}`,
    date: input.date,
    branchId: input.branchId,
    legalEntityCode: input.legalEntityCode ?? "AS",
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
  legalEntityCode: string = "AS",
  status: AccountingPeriodStatus = AccountingPeriodStatus.OPEN
) {
  return tx.accountingPeriod.create({
    data: {
      branchId,
      periodKey,
      legalEntityCode,
      status,
    },
  })
}

function seedEquityAccount(state: ReturnType<typeof createFinanceMockTx>["state"]) {
  state.glAccounts.push({
    id: "gl-equity-test",
    code: "3000",
    name: "Retained earnings",
    accountType: GlAccountType.EQUITY,
    isActive: true,
    deleted: false,
  })
}

describe("balance sheet helpers", () => {
  it("detects balanced assets vs liabilities plus equity", () => {
    expect(isBalanceSheetBalanced(d("1000"), d("400"), d("600"))).toBe(true)
    expect(isBalanceSheetBalanced(d("1000"), d("400"), d("500"))).toBe(false)
  })

  it("computes balance sheet difference", () => {
    expect(balanceSheetDifference(d("1000"), d("900")).toString()).toBe("100")
  })
})

describe("parseBalanceSheetFilter", () => {
  it("requires periodKey or date range", () => {
    expect(() => parseBalanceSheetFilter(params({}), "AS")).toThrow(ReportError)
  })
})

describe("getBalanceSheet", () => {
  const branchId = "branch-1"
  const legalEntityCode = "AS" as const

  it("returns empty sections for unknown period", async () => {
    const { tx } = createFinanceMockTx(branchId)

    const result = await getBalanceSheet(tx, { legalEntityCode, periodKey: "2099-01" })

    expect(result.assets).toEqual([])
    expect(result.liabilities).toEqual([])
    expect(result.equity).toEqual([])
    expect(result.totalAssets).toBe("0")
    expect(result.isBalanced).toBe(true)
  })

  it("classifies asset, liability, and equity accounts", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityAccount(state)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-bs",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "1000", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.AP, debit: "0", credit: "400" },
        { code: "3000", debit: "0", credit: "600" },
      ],
    })

    const result = await getBalanceSheet(tx, {
      legalEntityCode,
      periodKey: "2026-05",
      hideZeroBalances: true,
    })

    expect(result.assets).toHaveLength(1)
    expect(result.assets[0]?.accountCode).toBe(DEFAULT_ACCOUNT_CODES.CASH)
    expect(result.liabilities).toHaveLength(1)
    expect(result.equity).toHaveLength(1)
    expect(result.totalAssets).toBe("1000")
    expect(result.totalLiabilities).toBe("400")
    expect(result.totalEquity).toBe("600")
    expect(result.isBalanced).toBe(true)
    expect(result.balanceDifference).toBe("0")
  })

  it("excludes revenue and expense accounts from sections", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-mixed",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "500", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "500" },
      ],
    })

    const result = await getBalanceSheet(tx, {
      legalEntityCode,
      periodKey: "2026-05",
      hideZeroBalances: true,
    })

    expect(result.assets).toHaveLength(1)
    expect(result.liabilities).toHaveLength(0)
    expect(result.equity).toHaveLength(0)
    expect(result.totalAssets).toBe("500")
    expect(result.isBalanced).toBe(false)
    expect(result.balanceDifference).toBe("500")
  })

  it("respects hideZeroBalances from trial balance scope", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityAccount(state)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-one",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "100", credit: "0" },
        { code: "3000", debit: "0", credit: "100" },
      ],
    })

    const hidden = await getBalanceSheet(tx, {
      legalEntityCode,
      periodKey: "2026-05",
      hideZeroBalances: true,
    })
    const shown = await getBalanceSheet(tx, {
      legalEntityCode,
      periodKey: "2026-05",
      hideZeroBalances: false,
    })

    expect(hidden.assets).toHaveLength(1)
    expect(shown.assets.length).toBeGreaterThanOrEqual(1)
  })

  it("reads closed periods without mutation", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityAccount(state)
    const period = await seedPeriod(
      tx,
      branchId,
      "2026-04",
      "AS",
      AccountingPeriodStatus.HARD_CLOSED
    )

    seedJournal(state, {
      id: "journal-closed",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-10"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "250", credit: "0" },
        { code: "3000", debit: "0", credit: "250" },
      ],
    })

    const before = state.journalEntries.length
    const result = await getBalanceSheet(tx, { legalEntityCode, periodKey: "2026-04" })
    const after = state.journalEntries.length

    expect(after).toBe(before)
    expect(result.period.periodStatus).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(result.isBalanced).toBe(true)
  })

  it("reports imbalance without throwing", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedEquityAccount(state)
    const period = await seedPeriod(tx, branchId, "2026-06")

    seedJournal(state, {
      id: "journal-imbalance",
      branchId,
      periodId: period.id,
      date: new Date("2026-06-10"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "300", credit: "0" },
        { code: "3000", debit: "0", credit: "100" },
      ],
    })

    const result = await getBalanceSheet(tx, { legalEntityCode, periodKey: "2026-06" })

    expect(result.isBalanced).toBe(false)
    expect(result.balanceDifference).toBe("200")
  })

  it("handles credit-normal liability sign", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-07")

    seedJournal(state, {
      id: "journal-liab",
      branchId,
      periodId: period.id,
      date: new Date("2026-07-10"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "200", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.AP, debit: "0", credit: "200" },
      ],
    })

    const result = await getBalanceSheet(tx, { legalEntityCode, periodKey: "2026-07" })
    const ap = result.liabilities.find(
      (row) => row.accountCode === DEFAULT_ACCOUNT_CODES.AP
    )

    expect(ap?.amount).toBe("200")
    expect(result.isBalanced).toBe(true)
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

    const asTrial = await getTrialBalance(tx, { legalEntityCode: "AS", periodKey: "2026-05" })
    const adTrial = await getTrialBalance(tx, { legalEntityCode: "AD", periodKey: "2026-05" })
    expect(asTrial.totalDebits).toBe("100")
    expect(adTrial.totalDebits).toBe("500")

    const asResult = await getBalanceSheet(tx, { legalEntityCode: "AS", periodKey: "2026-05" })
    const adResult = await getBalanceSheet(tx, { legalEntityCode: "AD", periodKey: "2026-05" })

    expect(asResult.totalAssets).toBe("100")
    expect(adResult.totalAssets).toBe("500")
  })
})

describe("balanceSheetToCsv", () => {
  it("serializes balanced statement", () => {
    const csv = balanceSheetToCsv({
      filter: { legalEntityCode: "AS", periodKey: "2026-05" },
      period: { legalEntityCode: "AS", periodKey: "2026-05" },
      assets: [{ accountCode: "1000", accountName: "Cash", amount: "100" }],
      liabilities: [],
      equity: [{ accountCode: "3000", accountName: "Equity", amount: "100" }],
      totalAssets: "100",
      totalLiabilities: "0",
      totalEquity: "100",
      totalLiabilitiesAndEquity: "100",
      balanceDifference: "0",
      isBalanced: true,
    })

    expect(csv).toContain("Cash")
    expect(csv).toContain("Balanced")
  })
})
