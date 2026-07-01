import { AccountingPeriodStatus, GlAccountType, Prisma, VoucherStatus } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { toMoney } from "@/lib/finance/decimal"
import { getGeneralLedger } from "@/lib/finance/reports/general-ledger"
import { getTrialBalance } from "@/lib/finance/reports/trial-balance"
import { getBalanceSheet } from "@/lib/finance/reports/balance-sheet"
import { getProfitLoss } from "@/lib/finance/reports/profit-loss"
import { signedBalanceForAccountType } from "@/lib/finance/reports/balance-helpers"
import { createFinanceMockTx } from "../mock-finance-tx"

const d = (n: string) => new Prisma.Decimal(n)

function seedGlAccount(
  state: ReturnType<typeof createFinanceMockTx>["state"],
  input: { id: string; code: string; name: string; accountType: GlAccountType }
) {
  state.glAccounts.push({
    id: input.id,
    code: input.code,
    name: input.name,
    accountType: input.accountType,
    isActive: true,
    deleted: false,
  })
}

function seedJournal(
  state: ReturnType<typeof createFinanceMockTx>["state"],
  input: {
    id: string
    branchId: string
    periodId: string
    date: Date
    legalEntityCode?: string
    voucherNo?: string
    refNo?: string | null
    description?: string | null
    lines: { code: string; debit: string; credit: string; memo?: string | null }[]
  }
) {
  const voucherId = `voucher-${input.id}`
  state.vouchers.push({
    id: voucherId,
    voucherNo: input.voucherNo ?? `V-${input.id}`,
    date: input.date,
    status: VoucherStatus.POSTED,
    branchId: input.branchId,
    periodId: input.periodId,
    refType: "MANUAL_JOURNAL",
    refId: input.id,
    refNo: input.refNo ?? null,
    description: input.description ?? null,
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
      memo: line.memo ?? null,
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

describe("getGeneralLedger", () => {
  const branchId = "branch-1"
  const legalEntityCode = "AS" as const

  it("returns empty account with no transactions when period has no activity", async () => {
    const { tx } = createFinanceMockTx(branchId)
    await seedPeriod(tx, branchId, "2026-05")

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
    })

    expect(result.accounts).toHaveLength(1)
    expect(result.accounts[0]).toMatchObject({
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
      openingBalance: "0",
      closingBalance: "0",
      transactions: [],
    })
  })

  it("calculates opening balance only when activity is before range", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-opening",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-20T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "300", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "300" },
      ],
    })

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      from: "2026-05-01",
      to: "2026-05-31",
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
    })

    expect(result.accounts[0]?.openingBalance).toBe("300")
    expect(result.accounts[0]?.transactions).toHaveLength(0)
    expect(result.accounts[0]?.closingBalance).toBe("300")
  })

  it("calculates opening, period movements, and closing balance", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-opening",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-20T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "200", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "200" },
      ],
    })
    seedJournal(state, {
      id: "journal-period",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      voucherNo: "V-MAY-001",
      description: "May cash receipt",
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "500", credit: "0", memo: "Receipt" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "500" },
      ],
    })

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
    })

    const account = result.accounts[0]!
    expect(account.openingBalance).toBe("200")
    expect(account.transactions).toHaveLength(1)
    expect(account.transactions[0]).toMatchObject({
      entryNo: "V-MAY-001",
      description: "May cash receipt",
      debit: "500",
      credit: "0",
      runningBalance: "700",
    })
    expect(account.closingBalance).toBe("700")
  })

  it("sorts transactions by date, entry no, and line sequence", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-b",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-20T12:00:00.000Z"),
      voucherNo: "V-B",
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "50", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "50" },
      ],
    })
    seedJournal(state, {
      id: "journal-a",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-10T12:00:00.000Z"),
      voucherNo: "V-A",
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "100", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "100" },
      ],
    })

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
    })

    expect(result.accounts[0]?.transactions.map((tx) => tx.entryNo)).toEqual(["V-A", "V-B"])
    expect(result.accounts[0]?.transactions.map((tx) => tx.runningBalance)).toEqual([
      "100",
      "150",
    ])
  })

  it("supports multi-account query", async () => {
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

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
      accountCodes: [DEFAULT_ACCOUNT_CODES.CASH, DEFAULT_ACCOUNT_CODES.REVENUE],
    })

    expect(result.accounts).toHaveLength(2)
    expect(result.accounts.map((a) => a.accountCode).sort()).toEqual([
      DEFAULT_ACCOUNT_CODES.CASH,
      DEFAULT_ACCOUNT_CODES.REVENUE,
    ])
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

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
    })

    expect(result.accounts[0]?.closingBalance).toBe("100")
  })

  it("reconciles cash closing balance with trial balance when opening is zero", async () => {
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

    const filter = {
      legalEntityCode,
      branchId,
      periodKey: "2026-05" as const,
    }
    const [ledger, trialBalance] = await Promise.all([
      getGeneralLedger(tx, { ...filter, accountCode: DEFAULT_ACCOUNT_CODES.CASH }),
      getTrialBalance(tx, filter),
    ])

    const trialCash = trialBalance.rows.find(
      (row) => row.accountCode === DEFAULT_ACCOUNT_CODES.CASH
    )
    const ledgerCash = ledger.accounts[0]

    expect(ledgerCash?.closingBalance).toBe(trialCash?.signedBalance)
    expect(ledgerCash?.closingBalance).toBe("1000")
    expect(trialBalance.isBalanced).toBe(true)
  })

  it("reconciles period movement with trial balance when opening exists", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-opening",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "250", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "250" },
      ],
    })
    seedJournal(state, {
      id: "journal-period",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "100", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "100" },
      ],
    })

    const filter = {
      legalEntityCode,
      branchId,
      from: "2026-05-01",
      to: "2026-05-31",
    }
    const [ledger, trialBalance] = await Promise.all([
      getGeneralLedger(tx, { ...filter, accountCode: DEFAULT_ACCOUNT_CODES.CASH }),
      getTrialBalance(tx, filter),
    ])

    const trialCash = trialBalance.rows.find(
      (row) => row.accountCode === DEFAULT_ACCOUNT_CODES.CASH
    )
    const ledgerCash = ledger.accounts[0]!

    const periodMovement = toMoney(ledgerCash.closingBalance).minus(
      toMoney(ledgerCash.openingBalance)
    )
    expect(periodMovement.toString()).toBe(trialCash?.signedBalance)
    expect(ledgerCash.openingBalance).toBe("250")
    expect(ledgerCash.closingBalance).toBe("350")
  })

  it("validates opening + period activity = closing for every account", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-opening",
      branchId,
      periodId: period.id,
      date: new Date("2026-04-10T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "100", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.INVENTORY, debit: "50", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.AP, debit: "0", credit: "150" },
      ],
    })
    seedJournal(state, {
      id: "journal-period",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-12T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "0", credit: "40" },
        { code: DEFAULT_ACCOUNT_CODES.COGS, debit: "40", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.INVENTORY, debit: "0", credit: "25" },
        { code: DEFAULT_ACCOUNT_CODES.COGS, debit: "25", credit: "0" },
      ],
    })

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
      accountCodes: [
        DEFAULT_ACCOUNT_CODES.CASH,
        DEFAULT_ACCOUNT_CODES.INVENTORY,
        DEFAULT_ACCOUNT_CODES.AP,
        DEFAULT_ACCOUNT_CODES.COGS,
      ],
    })

    for (const account of result.accounts) {
      const opening = toMoney(account.openingBalance)
      let periodNet = toMoney(0)
      for (const txRow of account.transactions) {
        periodNet = periodNet.plus(
          signedBalanceForAccountType(
            account.accountType,
            toMoney(txRow.debit),
            toMoney(txRow.credit)
          )
        )
      }
      const expectedClosing = opening.plus(periodNet)
      expect(toMoney(account.closingBalance).toString()).toBe(expectedClosing.toString())
      if (account.transactions.length > 0) {
        expect(account.transactions.at(-1)?.runningBalance).toBe(account.closingBalance)
      }
    }
  })

  it("filters by accountId", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")
    const cashAccount = state.glAccounts.find((a) => a.code === DEFAULT_ACCOUNT_CODES.CASH)
    if (!cashAccount) throw new Error("missing cash account")

    seedJournal(state, {
      id: "journal-1",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "250", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "250" },
      ],
    })

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
      accountId: cashAccount.id,
    })

    expect(result.accounts).toHaveLength(1)
    expect(result.accounts[0]?.accountCode).toBe(DEFAULT_ACCOUNT_CODES.CASH)
    expect(result.accounts[0]?.closingBalance).toBe("250")
  })

  it("populates journalLineId, sourceRef, and signedMovement on transactions", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-ref",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      voucherNo: "V-REF-001",
      refNo: "MJ-2026-001",
      description: "Manual journal",
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "100", credit: "0", memo: "Cash in" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "100" },
      ],
    })

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
    })

    expect(result.accounts[0]?.transactions[0]).toMatchObject({
      journalLineId: "jline-journal-ref-1",
      entryNo: "V-REF-001",
      sourceRef: "MJ-2026-001",
      sourceRefType: "MANUAL_JOURNAL",
      sourceRefId: "journal-ref",
      voucherId: "voucher-journal-ref",
      signedMovement: "100",
      runningBalance: "100",
    })
  })

  it("applies credit-normal signed movement for revenue accounts", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-revenue",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "400", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "400" },
      ],
    })

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
      accountCode: DEFAULT_ACCOUNT_CODES.REVENUE,
    })

    const account = result.accounts[0]!
    expect(account.transactions[0]?.debit).toBe("0")
    expect(account.transactions[0]?.credit).toBe("400")
    expect(account.transactions[0]?.signedMovement).toBe("400")
    expect(account.transactions[0]?.runningBalance).toBe("400")
    expect(account.closingBalance).toBe("400")
  })

  it("applies credit-normal signed movement for liability accounts", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-ap",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.INVENTORY, debit: "150", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.AP, debit: "0", credit: "150" },
      ],
    })

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
      accountCode: DEFAULT_ACCOUNT_CODES.AP,
    })

    const account = result.accounts[0]!
    expect(account.transactions[0]?.signedMovement).toBe("150")
    expect(account.transactions[0]?.runningBalance).toBe("150")
    expect(account.closingBalance).toBe("150")
  })

  it("excludes journal lines outside the date range", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    await seedPeriod(tx, branchId, "2026-05")
    const periodApr = await seedPeriod(tx, branchId, "2026-04")

    seedJournal(state, {
      id: "journal-april",
      branchId,
      periodId: periodApr.id,
      date: new Date("2026-04-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "50", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "50" },
      ],
    })
    seedJournal(state, {
      id: "journal-may",
      branchId,
      periodId: periodApr.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "75", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "75" },
      ],
    })
    seedJournal(state, {
      id: "journal-june",
      branchId,
      periodId: periodApr.id,
      date: new Date("2026-06-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "999", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "999" },
      ],
    })

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      from: "2026-05-01",
      to: "2026-05-31",
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
    })

    expect(result.accounts[0]?.openingBalance).toBe("50")
    expect(result.accounts[0]?.transactions).toHaveLength(1)
    expect(result.accounts[0]?.transactions[0]?.signedMovement).toBe("75")
    expect(result.accounts[0]?.closingBalance).toBe("125")
  })

  it("sorts by date, voucherNo, lineNo, then journalLineId", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, "2026-05")

    seedJournal(state, {
      id: "journal-z",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-10T12:00:00.000Z"),
      voucherNo: "V-Z",
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "10", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "10" },
      ],
    })
    seedJournal(state, {
      id: "journal-a",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-10T12:00:00.000Z"),
      voucherNo: "V-A",
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "20", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "20" },
      ],
    })

    const result = await getGeneralLedger(tx, {
      legalEntityCode,
      branchId,
      periodKey: "2026-05",
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
    })

    expect(result.accounts[0]?.transactions.map((tx) => tx.entryNo)).toEqual(["V-A", "V-Z"])
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

    const asResult = await getGeneralLedger(tx, {
      legalEntityCode: "AS",
      branchId,
      periodKey: "2026-05",
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
    })
    const adResult = await getGeneralLedger(tx, {
      legalEntityCode: "AD",
      branchId,
      periodKey: "2026-05",
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
    })

    expect(asResult.accounts[0]?.closingBalance).toBe("100")
    expect(adResult.accounts[0]?.closingBalance).toBe("500")
  })

  describe("AD opening balance MJV-260001 (2025-12-31 accounting flow)", () => {
    const internalBranchId = "branch-ho999-internal"
    const openingDate = new Date("2025-12-31T00:00:00.000Z")

    async function seedAdOpeningBalance(
      tx: ReturnType<typeof createFinanceMockTx>["tx"],
      state: ReturnType<typeof createFinanceMockTx>["state"]
    ) {
      seedGlAccount(state, {
        id: "gl-account-1",
        code: "1",
        name: "Opening equity",
        accountType: GlAccountType.EQUITY,
      })
      const period202512 = await seedPeriod(tx, internalBranchId, "2025-12", "AD")
      await seedPeriod(tx, internalBranchId, "2026-01", "AD")
      await seedPeriod(tx, internalBranchId, "2026-01", "AS")

      seedJournal(state, {
        id: "journal-mjv-260001",
        branchId: internalBranchId,
        periodId: period202512.id,
        legalEntityCode: "AD",
        date: openingDate,
        voucherNo: "MJV-260001",
        description: "Opening Balance 2026",
        lines: [
          { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "2000000", credit: "0" },
          { code: "1", debit: "0", credit: "2000000" },
        ],
      })
    }

    it("GL period 2026-01 account 1: opening credit 2M, no January activity, closing 2M", async () => {
      const { tx, state } = createFinanceMockTx(internalBranchId)
      await seedAdOpeningBalance(tx, state)

      const result = await getGeneralLedger(tx, {
        legalEntityCode: "AD",
        periodKey: "2026-01",
        accountCode: "1",
      })

      const account = result.accounts[0]!
      expect(account.openingCredit).toBe("2000000")
      expect(account.openingBalance).toBe("2000000")
      expect(account.transactions).toHaveLength(0)
      expect(account.closingBalance).toBe("2000000")
    })

    it("GL date range 2025-12-31 includes MJV-260001 as period transaction", async () => {
      const { tx, state } = createFinanceMockTx(internalBranchId)
      await seedAdOpeningBalance(tx, state)

      const result = await getGeneralLedger(tx, {
        legalEntityCode: "AD",
        from: "2025-12-31",
        to: "2025-12-31",
        accountCode: "1",
      })

      expect(result.accounts[0]?.transactions).toHaveLength(1)
      expect(result.accounts[0]?.transactions[0]?.entryNo).toBe("MJV-260001")
      expect(result.accounts[0]?.transactions[0]?.credit).toBe("2000000")
    })

    it("entity-wide GL without branch filter includes opening balance in January period", async () => {
      const { tx, state } = createFinanceMockTx(internalBranchId)
      await seedAdOpeningBalance(tx, state)

      const result = await getGeneralLedger(tx, {
        legalEntityCode: "AD",
        periodKey: "2026-01",
        accountCode: "1",
      })

      expect(result.accounts[0]?.openingBalance).toBe("2000000")
      expect(result.accounts[0]?.transactions).toHaveLength(0)
    })

    it("AS session cannot see AD opening balance", async () => {
      const { tx, state } = createFinanceMockTx(internalBranchId)
      await seedAdOpeningBalance(tx, state)

      const result = await getGeneralLedger(tx, {
        legalEntityCode: "AS",
        periodKey: "2026-01",
        accountCode: "1",
      })

      expect(result.accounts[0]?.openingBalance).toBe("0")
      expect(result.accounts[0]?.transactions).toEqual([])
    })

    it("AD balance sheet period 2026-01 includes opening equity from 2025-12-31 journal", async () => {
      const { tx, state } = createFinanceMockTx(internalBranchId)
      await seedAdOpeningBalance(tx, state)

      const result = await getBalanceSheet(tx, {
        legalEntityCode: "AD",
        periodKey: "2026-01",
      })

      const equity = result.equity.find((row) => row.accountCode === "1")
      expect(equity?.amount).toBe("2000000")
      expect(result.totalEquity).toBe("2000000")
    })

    it("AD P&L period 2026-01 is unaffected by equity opening balance", async () => {
      const { tx, state } = createFinanceMockTx(internalBranchId)
      await seedAdOpeningBalance(tx, state)

      const result = await getProfitLoss(tx, {
        legalEntityCode: "AD",
        periodKey: "2026-01",
      })

      expect(result.revenue).toEqual([])
      expect(result.expenses).toEqual([])
      expect(result.netIncome).toBe("0")
    })
  })
})
