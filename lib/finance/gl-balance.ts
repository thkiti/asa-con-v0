import { GlAccountType, Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { normalizeDateRange } from "@/lib/reporting/date-range"
import { addMoney, roundMoney, toMoney, ZERO } from "./decimal"
import type {
  GlAccountBalanceFilter,
  GlAccountBalanceResult,
  GlAccountBalanceRow,
} from "./reconciliation-types"
import { ReconciliationError } from "./reconciliation-errors"

export type GlBalancePrisma = Pick<
  PrismaClient,
  "glAccount" | "journalEntryLine"
>

function signedBalance(
  accountType: GlAccountType,
  debitTotal: Prisma.Decimal,
  creditTotal: Prisma.Decimal
): Prisma.Decimal {
  const net = debitTotal.minus(creditTotal)
  switch (accountType) {
    case GlAccountType.ASSET:
    case GlAccountType.EXPENSE:
      return roundMoney(net)
    case GlAccountType.REVENUE:
    case GlAccountType.LIABILITY:
    case GlAccountType.EQUITY:
      return roundMoney(creditTotal.minus(debitTotal))
    default:
      return roundMoney(net)
  }
}

export async function getGlAccountBalance(
  prisma: GlBalancePrisma,
  filter: GlAccountBalanceFilter
): Promise<GlAccountBalanceResult> {
  if (filter.accountCodes.length === 0) {
    throw new ReconciliationError(
      "At least one account code is required",
      "INVALID_FILTER"
    )
  }

  const accounts = await prisma.glAccount.findMany({
    where: {
      code: { in: filter.accountCodes },
      deleted: false,
      isActive: true,
    },
    orderBy: { code: "asc" },
  })

  const accountById = new Map(accounts.map((a) => [a.id, a]))
  const accountIds = accounts.map((a) => a.id)

  const journalEntryWhere: Prisma.JournalEntryWhereInput = {}
  if (filter.branchId) {
    journalEntryWhere.branchId = filter.branchId
  }
  if (filter.from != null && filter.to != null) {
    const range = normalizeDateRange({ from: filter.from, to: filter.to })
    journalEntryWhere.date = {
      gte: range.start,
      lt: range.endExclusive,
    }
  }

  const lines =
    accountIds.length === 0
      ? []
      : await prisma.journalEntryLine.findMany({
          where: {
            glAccountId: { in: accountIds },
            journalEntry: journalEntryWhere,
          },
        })

  const debitByAccountId = new Map<string, Prisma.Decimal>()
  const creditByAccountId = new Map<string, Prisma.Decimal>()
  for (const id of accountIds) {
    debitByAccountId.set(id, ZERO)
    creditByAccountId.set(id, ZERO)
  }

  for (const line of lines) {
    const debit = addMoney(debitByAccountId.get(line.glAccountId) ?? ZERO, toMoney(line.debit))
    const credit = addMoney(creditByAccountId.get(line.glAccountId) ?? ZERO, toMoney(line.credit))
    debitByAccountId.set(line.glAccountId, debit)
    creditByAccountId.set(line.glAccountId, credit)
  }

  let totalDebits = ZERO
  let totalCredits = ZERO
  const rows: GlAccountBalanceRow[] = []

  for (const account of accounts) {
    const debitTotal = debitByAccountId.get(account.id) ?? ZERO
    const creditTotal = creditByAccountId.get(account.id) ?? ZERO
    totalDebits = addMoney(totalDebits, debitTotal)
    totalCredits = addMoney(totalCredits, creditTotal)

    rows.push({
      accountCode: account.code,
      accountName: account.name,
      accountType: account.accountType,
      debitTotal: debitTotal.toString(),
      creditTotal: creditTotal.toString(),
      balance: signedBalance(account.accountType, debitTotal, creditTotal).toString(),
    })
  }

  for (const code of filter.accountCodes) {
    if (!rows.some((row) => row.accountCode === code)) {
      throw new ReconciliationError(
        `GL account not found for code ${code}`,
        "ACCOUNT_NOT_FOUND"
      )
    }
  }

  return {
    filter,
    accounts: rows,
    totals: {
      debitTotal: totalDebits.toString(),
      creditTotal: totalCredits.toString(),
    },
  }
}
