import { Prisma } from "@/generated/prisma/client"
import {
  AccountingPeriodStatus,
  GlAccountType,
  VoucherStatus,
} from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { RETAINED_EARNINGS_ACCOUNT_CODE } from "@/lib/finance/reports/retained-earnings"
import { createFinanceMockTx } from "./mock-finance-tx"

const d = (n: string) => new Prisma.Decimal(n)

export function addRetainedEarningsAccount(
  state: ReturnType<typeof createFinanceMockTx>["state"]
) {
  if (!state.glAccounts.some((account) => account.code === RETAINED_EARNINGS_ACCOUNT_CODE)) {
    state.glAccounts.push({
      id: "gl-re",
      code: RETAINED_EARNINGS_ACCOUNT_CODE,
      name: "Retained Earnings",
      accountType: GlAccountType.EQUITY,
      isActive: true,
      deleted: false,
    })
  }
}

export async function seedOpenPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  branchId: string,
  periodKey: string
) {
  return tx.accountingPeriod.create({
    data: {
      branchId,
      periodKey,
      status: AccountingPeriodStatus.OPEN,
    },
  })
}

export async function seedClosedPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  branchId: string,
  periodKey: string,
  status: AccountingPeriodStatus = AccountingPeriodStatus.SOFT_CLOSED
) {
  return tx.accountingPeriod.create({
    data: {
      branchId,
      periodKey,
      status,
    },
  })
}

export function seedJournal(
  state: ReturnType<typeof createFinanceMockTx>["state"],
  input: {
    id: string
    branchId: string
    periodId: string
    date: Date
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

export function seedProfitPeriod(
  state: ReturnType<typeof createFinanceMockTx>["state"],
  input: {
    branchId: string
    periodId: string
    revenueAmount?: string
    expenseAmount?: string
  }
) {
  const date = new Date("2026-05-15T12:00:00.000Z")
  if (input.revenueAmount && input.revenueAmount !== "0") {
    seedJournal(state, {
      id: `revenue-${input.revenueAmount}`,
      branchId: input.branchId,
      periodId: input.periodId,
      date,
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: input.revenueAmount, credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: input.revenueAmount },
      ],
    })
  }
  if (input.expenseAmount && input.expenseAmount !== "0") {
    seedJournal(state, {
      id: `expense-${input.expenseAmount}`,
      branchId: input.branchId,
      periodId: input.periodId,
      date,
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.COGS, debit: input.expenseAmount, credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "0", credit: input.expenseAmount },
      ],
    })
  }
}
