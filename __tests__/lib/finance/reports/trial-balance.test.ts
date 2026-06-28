import { AccountingPeriodStatus, Prisma } from "@/generated/prisma/client"
import { GlAccountType } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import {
  isTrialBalanceBalanced,
  signedBalanceForAccountType,
  trialBalanceDifference,
} from "@/lib/finance/reports/balance-helpers"
import { parseTrialBalanceFilter } from "@/lib/finance/reports/report-filter"
import { getTrialBalance } from "@/lib/finance/reports/trial-balance"
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

describe("balance-helpers", () => {
  it("computes debit-normal signed balance for assets", () => {
    expect(
      signedBalanceForAccountType(GlAccountType.ASSET, d("1000"), d("200")).toString()
    ).toBe("800")
  })

  it("computes credit-normal signed balance for revenue", () => {
    expect(
      signedBalanceForAccountType(GlAccountType.REVENUE, d("50"), d("500")).toString()
    ).toBe("450")
  })

  it("detects balanced totals", () => {
    expect(isTrialBalanceBalanced(d("1000"), d("1000"))).toBe(true)
    expect(isTrialBalanceBalanced(d("1000"), d("900"))).toBe(false)
  })

  it("computes difference", () => {
    expect(trialBalanceDifference(d("1000"), d("750")).toString()).toBe("250")
  })
})

describe("parseTrialBalanceFilter", () => {
  const legalEntityCode = "AS" as const

  it("requires periodKey or date range", () => {
    expect(() => parseTrialBalanceFilter(params({}), legalEntityCode)).toThrow(
      ReportError
    )
  })

  it("rejects mixing periodKey and date range", () => {
    expect(() =>
      parseTrialBalanceFilter(
        params({
          periodKey: "2026-05",
          from: "2026-05-01",
          to: "2026-05-31",
        }),
        legalEntityCode
      )
    ).toThrow(ReportError)
  })
})

describe("getTrialBalance", () => {
  const branchId = "branch-1"
  const legalEntityCode = "AS" as const

  it("returns empty balanced result for unknown period", async () => {
    const { tx } = createFinanceMockTx(branchId)
    const result = await getTrialBalance(tx, {
      legalEntityCode,
      periodKey: "2099-01",
    })
    expect(result.rows).toHaveLength(0)
    expect(result.isBalanced).toBe(true)
    expect(result.totalDebits).toBe("0")
    expect(result.totalCredits).toBe("0")
  })

  it("includes all active accounts with zero activity", async () => {
    const { tx } = createFinanceMockTx(branchId)
    await seedPeriod(tx, branchId, "2026-05")

    const result = await getTrialBalance(tx, {
      legalEntityCode,
      periodKey: "2026-05",
    })

    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.rows.every((row) => row.totalDebit === "0")).toBe(true)
    expect(result.isBalanced).toBe(true)
  })

  it("reports balanced totals for a single journal", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-1",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "1000", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "1000" },
      ],
    })

    const result = await getTrialBalance(tx, {
      legalEntityCode,
      periodKey: "2026-05",
    })

    expect(result.totalDebits).toBe("1000")
    expect(result.totalCredits).toBe("1000")
    expect(result.difference).toBe("0")
    expect(result.isBalanced).toBe(true)

    const cash = result.rows.find((r) => r.accountCode === DEFAULT_ACCOUNT_CODES.CASH)
    const revenue = result.rows.find(
      (r) => r.accountCode === DEFAULT_ACCOUNT_CODES.REVENUE
    )
    expect(cash?.signedBalance).toBe("1000")
    expect(revenue?.signedBalance).toBe("1000")
  })

  it("aggregates multiple balanced journals", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-1",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-10T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "500", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "500" },
      ],
    })
    seedJournal(state, {
      id: "journal-2",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-20T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "300", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "300" },
      ],
    })

    const result = await getTrialBalance(tx, {
      legalEntityCode,
      periodKey: "2026-05",
    })

    expect(result.totalDebits).toBe("800")
    expect(result.totalCredits).toBe("800")
    expect(result.isBalanced).toBe(true)
  })

  it("aggregates all branches under legal entity", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-branch-a",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "100", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "100" },
      ],
    })
    seedJournal(state, {
      id: "journal-branch-b",
      branchId: "branch-2",
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "999", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "999" },
      ],
    })

    const result = await getTrialBalance(tx, { legalEntityCode, periodKey: "2026-05" })
    expect(result.totalDebits).toBe("1099")
    expect(result.totalCredits).toBe("1099")
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

    const asResult = await getTrialBalance(tx, { legalEntityCode: "AS", periodKey: "2026-05" })
    const adResult = await getTrialBalance(tx, { legalEntityCode: "AD", periodKey: "2026-05" })

    expect(asResult.totalDebits).toBe("100")
    expect(adResult.totalDebits).toBe("500")
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

    const result = await getTrialBalance(tx, {
      legalEntityCode,
      from: "2026-05-01",
      to: "2026-05-31",
    })

    expect(result.totalDebits).toBe("120")
    expect(result.totalCredits).toBe("120")
  })

  it("hides zero-balance accounts but keeps footer totals", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-1",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "50", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "50" },
      ],
    })

    const all = await getTrialBalance(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
    })
    const hidden = await getTrialBalance(tx, {
      legalEntityCode,
      periodKey: "2026-05",
      hideZeroBalances: true,
    })

    expect(hidden.rows.length).toBeLessThan(all.rows.length)
    expect(hidden.totalDebits).toBe("50")
    expect(hidden.totalCredits).toBe("50")
  })

  it("matches sum of row debits/credits to footer totals", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-multi",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "400", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.INVENTORY, debit: "200", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "500" },
        { code: DEFAULT_ACCOUNT_CODES.AP, debit: "0", credit: "100" },
      ],
    })

    const result = await getTrialBalance(tx, {
      legalEntityCode,
      periodKey: "2026-05",
    })

    const rowDebitSum = result.rows.reduce(
      (sum, row) => sum.plus(row.totalDebit),
      new Prisma.Decimal(0)
    )
    const rowCreditSum = result.rows.reduce(
      (sum, row) => sum.plus(row.totalCredit),
      new Prisma.Decimal(0)
    )

    expect(rowDebitSum.toString()).toBe(result.totalDebits)
    expect(rowCreditSum.toString()).toBe(result.totalCredits)
    expect(result.isBalanced).toBe(true)
  })

  it("sorts rows by account type then account code", async () => {
    const { tx } = createFinanceMockTx(branchId)
    await seedPeriod(tx, branchId, "2026-05")

    const result = await getTrialBalance(tx, { legalEntityCode, periodKey: "2026-05" })
    const types = result.rows.map((row) => row.accountType)
    const sortedTypes = [...types].sort(
      (a, b) =>
        ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].indexOf(a) -
        ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].indexOf(b)
    )
    expect(types).toEqual(sortedTypes)
  })
})
