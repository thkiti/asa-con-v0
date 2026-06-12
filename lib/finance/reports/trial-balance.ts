import type { Prisma } from "@/generated/prisma/client"
import { GlAccountType, type PrismaClient } from "@/generated/prisma/client"
import { normalizeDateRange } from "@/lib/reporting/date-range"
import { addMoney, toMoney, ZERO } from "../decimal"
import {
  isTrialBalanceBalanced,
  signedBalanceForAccountType,
  trialBalanceDifference,
} from "./balance-helpers"
import type { TrialBalanceFilter, TrialBalanceResult, TrialBalanceRow } from "./trial-balance-types"
import { accountingPeriodUniqueWhere } from "../period-lookup"

export type TrialBalancePrisma = Pick<
  PrismaClient,
  "glAccount" | "journalEntryLine" | "accountingPeriod"
>

const ACCOUNT_TYPE_ORDER: Record<GlAccountType, number> = {
  [GlAccountType.ASSET]: 0,
  [GlAccountType.LIABILITY]: 1,
  [GlAccountType.EQUITY]: 2,
  [GlAccountType.REVENUE]: 3,
  [GlAccountType.EXPENSE]: 4,
}

async function resolvePeriodId(
  prisma: TrialBalancePrisma,
  periodKey: string
): Promise<string | null> {
  const period = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ periodKey }),
    select: { id: true },
  })
  return period?.id ?? null
}

function buildJournalEntryWhere(
  filter: TrialBalanceFilter,
  periodId: string | null
): Prisma.JournalEntryWhereInput {
  const where: Prisma.JournalEntryWhereInput = {
    branchId: filter.branchId,
  }

  if (periodId) {
    where.periodId = periodId
  } else if (filter.from && filter.to) {
    const range = normalizeDateRange({ from: filter.from, to: filter.to })
    where.date = {
      gte: range.start,
      lt: range.endExclusive,
    }
  }

  return where
}

function sortTrialBalanceRows(rows: TrialBalanceRow[]): TrialBalanceRow[] {
  return [...rows].sort((a, b) => {
    const typeDiff =
      ACCOUNT_TYPE_ORDER[a.accountType] - ACCOUNT_TYPE_ORDER[b.accountType]
    if (typeDiff !== 0) return typeDiff
    return a.accountCode.localeCompare(b.accountCode)
  })
}

function hasZeroActivity(debit: Prisma.Decimal, credit: Prisma.Decimal): boolean {
  return debit.equals(ZERO) && credit.equals(ZERO)
}

export async function getTrialBalance(
  prisma: TrialBalancePrisma,
  filter: TrialBalanceFilter
): Promise<TrialBalanceResult> {
  let periodId: string | null = null
  if (filter.periodKey) {
    periodId = await resolvePeriodId(prisma, filter.periodKey)
    if (!periodId) {
      return {
        filter,
        rows: [],
        totalDebits: "0",
        totalCredits: "0",
        difference: "0",
        isBalanced: true,
      }
    }
  }

  const accounts = await prisma.glAccount.findMany({
    where: { deleted: false, isActive: true },
    orderBy: [{ accountType: "asc" }, { code: "asc" }],
  })

  const journalEntryWhere = buildJournalEntryWhere(filter, periodId)

  const lines = await prisma.journalEntryLine.findMany({
    where: { journalEntry: journalEntryWhere },
    select: {
      glAccountId: true,
      debit: true,
      credit: true,
    },
  })

  const debitByAccountId = new Map<string, Prisma.Decimal>()
  const creditByAccountId = new Map<string, Prisma.Decimal>()
  for (const account of accounts) {
    debitByAccountId.set(account.id, ZERO)
    creditByAccountId.set(account.id, ZERO)
  }

  for (const line of lines) {
    const debit = addMoney(debitByAccountId.get(line.glAccountId) ?? ZERO, toMoney(line.debit))
    const credit = addMoney(
      creditByAccountId.get(line.glAccountId) ?? ZERO,
      toMoney(line.credit)
    )
    debitByAccountId.set(line.glAccountId, debit)
    creditByAccountId.set(line.glAccountId, credit)
  }

  let totalDebits = ZERO
  let totalCredits = ZERO
  const rows: TrialBalanceRow[] = []

  for (const account of accounts) {
    const debitTotal = debitByAccountId.get(account.id) ?? ZERO
    const creditTotal = creditByAccountId.get(account.id) ?? ZERO

    totalDebits = addMoney(totalDebits, debitTotal)
    totalCredits = addMoney(totalCredits, creditTotal)

    if (filter.hideZeroBalances && hasZeroActivity(debitTotal, creditTotal)) {
      continue
    }

    rows.push({
      accountCode: account.code,
      accountName: account.name,
      accountType: account.accountType,
      totalDebit: debitTotal.toString(),
      totalCredit: creditTotal.toString(),
      signedBalance: signedBalanceForAccountType(
        account.accountType,
        debitTotal,
        creditTotal
      ).toString(),
    })
  }

  const sortedRows = sortTrialBalanceRows(rows)
  const difference = trialBalanceDifference(totalDebits, totalCredits)

  return {
    filter,
    rows: sortedRows,
    totalDebits: totalDebits.toString(),
    totalCredits: totalCredits.toString(),
    difference: difference.toString(),
    isBalanced: isTrialBalanceBalanced(totalDebits, totalCredits),
  }
}
