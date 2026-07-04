import { AccountingPeriodStatus, GlAccountType, Prisma, VoucherStatus } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { getBankCashJournal } from "@/lib/finance/bank-cash-journal"
import { createFinanceMockTx } from "../mock-finance-tx"

const d = (n: string) => new Prisma.Decimal(n)

function seedGlAccount(
  state: ReturnType<typeof createFinanceMockTx>["state"],
  input: { id: string; code: string; name: string; accountType: GlAccountType }
) {
  if (state.glAccounts.some((account) => account.id === input.id)) return
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
    legalEntityCode: string
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
    legalEntityCode: input.legalEntityCode,
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
  legalEntityCode: string
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

type BankAccountSeed = {
  id: string
  legalEntityCode: string
  bankName: string
  accountNumber: string
  accountName: string
  currencyCode: string
  glAccountId: string
  isActive: boolean
}

function withBankAccounts(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  state: ReturnType<typeof createFinanceMockTx>["state"],
  bankAccounts: BankAccountSeed[]
) {
  return {
    ...tx,
    bankAccount: {
      findFirst: async ({
        where,
        select,
      }: {
        where: { id?: string; legalEntityCode?: string }
        select?: unknown
      }) => {
        const row = bankAccounts.find(
          (account) =>
            account.id === where.id && account.legalEntityCode === where.legalEntityCode
        )
        if (!row) return null
        const glAccount = state.glAccounts.find((account) => account.id === row.glAccountId)
        if (!glAccount) return null
        const mapped = {
          ...row,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          glAccount: {
            id: glAccount.id,
            code: glAccount.code,
            name: glAccount.name,
          },
        }
        if (!select) return mapped
        return mapped
      },
      findMany: async () => bankAccounts,
      count: async () => bankAccounts.length,
      create: async () => {
        throw new Error("not implemented in test mock")
      },
      findUnique: async () => null,
    },
  }
}

describe("getBankCashJournal", () => {
  const branchId = "branch-1"
  const bankGlAd = "gl-bank-ad"
  const bankAccountAs = "bank-account-as"
  const bankAccountAd = "bank-account-ad"

  it("returns AD journal lines only for AD scope", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const bankAsGl = state.glAccounts.find((account) => account.code === DEFAULT_ACCOUNT_CODES.BANK)!
    seedGlAccount(state, {
      id: bankGlAd,
      code: "1021002",
      name: "Bank AD",
      accountType: GlAccountType.ASSET,
    })

    const periodAs = await seedPeriod(tx, branchId, "2026-01", "AS")
    const periodAd = await seedPeriod(tx, branchId, "2026-01", "AD")

    seedJournal(state, {
      id: "journal-as",
      branchId,
      periodId: periodAs.id,
      date: new Date("2026-01-10T00:00:00.000Z"),
      legalEntityCode: "AS",
      voucherNo: "AS-V-1",
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.BANK, debit: "100", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "100" },
      ],
    })

    seedJournal(state, {
      id: "journal-ad",
      branchId,
      periodId: periodAd.id,
      date: new Date("2026-01-15T00:00:00.000Z"),
      legalEntityCode: "AD",
      voucherNo: "AD-V-1",
      lines: [
        { code: "1021002", debit: "0", credit: "500", memo: "AD withdrawal" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "500", credit: "0" },
      ],
    })

    const prisma = withBankAccounts(tx, state, [
      {
        id: bankAccountAs,
        legalEntityCode: "AS",
        bankName: "BBL",
        accountNumber: "1111111111",
        accountName: "AS Current",
        currencyCode: "THB",
        glAccountId: bankAsGl.id,
        isActive: true,
      },
      {
        id: bankAccountAd,
        legalEntityCode: "AD",
        bankName: "BBL",
        accountNumber: "2193020266",
        accountName: "AD Current",
        currencyCode: "THB",
        glAccountId: bankGlAd,
        isActive: true,
      },
    ])

    const adResult = await getBankCashJournal(prisma, {
      legalEntityCode: "AD",
      periodKey: "2026-01",
      bankAccountId: bankAccountAd,
    })

    expect(adResult.lines).toHaveLength(1)
    expect(adResult.lines[0]?.entryNo).toBe("AD-V-1")
    expect(adResult.lines[0]?.withdrawalAmount).toBe("500")
    expect(adResult.lines[0]?.depositAmount).toBe("0")

    const asResult = await getBankCashJournal(prisma, {
      legalEntityCode: "AS",
      periodKey: "2026-01",
      bankAccountId: bankAccountAs,
    })

    expect(asResult.lines).toHaveLength(1)
    expect(asResult.lines[0]?.entryNo).toBe("AS-V-1")
    expect(asResult.lines[0]?.depositAmount).toBe("100")
  })

  it("uses prior posted balance as beginning balance", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedGlAccount(state, {
      id: bankGlAd,
      code: "1021002",
      name: "Bank AD",
      accountType: GlAccountType.ASSET,
    })

    const periodDec = await seedPeriod(tx, branchId, "2025-12", "AD")
    const periodJan = await seedPeriod(tx, branchId, "2026-01", "AD")

    seedJournal(state, {
      id: "journal-dec",
      branchId,
      periodId: periodDec.id,
      date: new Date("2025-12-31T00:00:00.000Z"),
      legalEntityCode: "AD",
      lines: [
        { code: "1021002", debit: "908539.12", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "908539.12" },
      ],
    })

    seedJournal(state, {
      id: "journal-jan",
      branchId,
      periodId: periodJan.id,
      date: new Date("2026-01-05T00:00:00.000Z"),
      legalEntityCode: "AD",
      lines: [
        { code: "1021002", debit: "0", credit: "166250", memo: "Salary" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "166250", credit: "0" },
      ],
    })

    const prisma = withBankAccounts(tx, state, [
      {
        id: bankAccountAd,
        legalEntityCode: "AD",
        bankName: "BBL",
        accountNumber: "2193020266",
        accountName: "AD Current",
        currencyCode: "THB",
        glAccountId: bankGlAd,
        isActive: true,
      },
    ])

    const result = await getBankCashJournal(prisma, {
      legalEntityCode: "AD",
      periodKey: "2026-01",
      bankAccountId: bankAccountAd,
    })

    expect(result.beginningBalance).toBe("908539.12")
    expect(result.endingBalance).toBe("742289.12")
  })

  it("keeps beginning and ending equal when the selected period has no movements", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedGlAccount(state, {
      id: bankGlAd,
      code: "1021002",
      name: "Bank AD",
      accountType: GlAccountType.ASSET,
    })

    const periodDec = await seedPeriod(tx, branchId, "2025-12", "AD")
    const periodJan = await seedPeriod(tx, branchId, "2026-01", "AD")

    seedJournal(state, {
      id: "journal-dec",
      branchId,
      periodId: periodDec.id,
      date: new Date("2025-12-15T00:00:00.000Z"),
      legalEntityCode: "AD",
      lines: [
        { code: "1021002", debit: "100000", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "100000" },
      ],
    })

    const prisma = withBankAccounts(tx, state, [
      {
        id: bankAccountAd,
        legalEntityCode: "AD",
        bankName: "BBL",
        accountNumber: "2193020266",
        accountName: "AD Current",
        currencyCode: "THB",
        glAccountId: bankGlAd,
        isActive: true,
      },
    ])

    const result = await getBankCashJournal(prisma, {
      legalEntityCode: "AD",
      periodKey: "2026-01",
      bankAccountId: bankAccountAd,
    })

    expect(result.lines).toHaveLength(0)
    expect(result.beginningBalance).toBe("100000")
    expect(result.endingBalance).toBe("100000")
  })

  it("uses the prior period closing balance as beginning for a later inactive period", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedGlAccount(state, {
      id: bankGlAd,
      code: "1021002",
      name: "Bank AD",
      accountType: GlAccountType.ASSET,
    })

    const periodMay = await seedPeriod(tx, branchId, "2026-05", "AD")
    const periodJun = await seedPeriod(tx, branchId, "2026-06", "AD")

    seedJournal(state, {
      id: "journal-may",
      branchId,
      periodId: periodMay.id,
      date: new Date("2026-05-20T00:00:00.000Z"),
      legalEntityCode: "AD",
      lines: [
        { code: "1021002", debit: "25000", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "25000" },
      ],
    })

    const prisma = withBankAccounts(tx, state, [
      {
        id: bankAccountAd,
        legalEntityCode: "AD",
        bankName: "BBL",
        accountNumber: "2193020266",
        accountName: "AD Current",
        currencyCode: "THB",
        glAccountId: bankGlAd,
        isActive: true,
      },
    ])

    const mayResult = await getBankCashJournal(prisma, {
      legalEntityCode: "AD",
      periodKey: "2026-05",
      bankAccountId: bankAccountAd,
    })
    const juneResult = await getBankCashJournal(prisma, {
      legalEntityCode: "AD",
      periodKey: "2026-06",
      bankAccountId: bankAccountAd,
    })

    expect(mayResult.endingBalance).toBe("25000")
    expect(juneResult.beginningBalance).toBe("25000")
    expect(juneResult.endingBalance).toBe("25000")
    expect(juneResult.lines).toHaveLength(0)
  })

  it("calculates running balance across period movements", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedGlAccount(state, {
      id: bankGlAd,
      code: "1021002",
      name: "Bank AD",
      accountType: GlAccountType.ASSET,
    })

    const periodJan = await seedPeriod(tx, branchId, "2026-01", "AD")

    seedJournal(state, {
      id: "journal-open",
      branchId,
      periodId: periodJan.id,
      date: new Date("2026-01-01T00:00:00.000Z"),
      legalEntityCode: "AD",
      voucherNo: "OPEN",
      lines: [
        { code: "1021002", debit: "1000", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "1000" },
      ],
    })

    seedJournal(state, {
      id: "journal-out",
      branchId,
      periodId: periodJan.id,
      date: new Date("2026-01-05T00:00:00.000Z"),
      legalEntityCode: "AD",
      voucherNo: "OUT-1",
      lines: [
        { code: "1021002", debit: "0", credit: "200" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "200", credit: "0" },
      ],
    })

    seedJournal(state, {
      id: "journal-in",
      branchId,
      periodId: periodJan.id,
      date: new Date("2026-01-30T00:00:00.000Z"),
      legalEntityCode: "AD",
      voucherNo: "IN-1",
      lines: [
        { code: "1021002", debit: "300", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "300" },
      ],
    })

    const prisma = withBankAccounts(tx, state, [
      {
        id: bankAccountAd,
        legalEntityCode: "AD",
        bankName: "BBL",
        accountNumber: "2193020266",
        accountName: "AD Current",
        currencyCode: "THB",
        glAccountId: bankGlAd,
        isActive: true,
      },
    ])

    const result = await getBankCashJournal(prisma, {
      legalEntityCode: "AD",
      periodKey: "2026-01",
      bankAccountId: bankAccountAd,
    })

    expect(result.lines.map((line) => line.entryNo)).toEqual(["OPEN", "OUT-1", "IN-1"])
    expect(result.lines.map((line) => line.runningBalance)).toEqual([
      "1000",
      "800",
      "1100",
    ])
    expect(result.beginningBalance).toBe("0")
    expect(result.endingBalance).toBe("1100")
  })

  it("rejects bank account from another legal entity", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    seedGlAccount(state, {
      id: bankGlAd,
      code: "1021002",
      name: "Bank AD",
      accountType: GlAccountType.ASSET,
    })

    await seedPeriod(tx, branchId, "2026-01", "AS")

    const prisma = withBankAccounts(tx, state, [
      {
        id: bankAccountAd,
        legalEntityCode: "AD",
        bankName: "BBL",
        accountNumber: "2193020266",
        accountName: "AD Current",
        currencyCode: "THB",
        glAccountId: bankGlAd,
        isActive: true,
      },
    ])

    await expect(
      getBankCashJournal(prisma, {
        legalEntityCode: "AS",
        periodKey: "2026-01",
        bankAccountId: bankAccountAd,
      })
    ).rejects.toThrow("Bank account not found")
  })
})
