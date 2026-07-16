import type { Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { normalizeDateRange } from "@/lib/reporting/date-range"
import { addMoney, toMoney, ZERO } from "../decimal"
import {
  isTrialBalanceBalanced,
  signedBalanceForAccountType,
  trialBalanceDifference,
} from "./balance-helpers"
import type { TrialBalanceFilter, TrialBalanceResult, TrialBalanceRow } from "./trial-balance-types"
import { accountingPeriodUniqueWhere } from "../period-lookup"
import { periodKeyToReportDateRange } from "./report-filter"

export type TrialBalancePrisma = Pick<
  PrismaClient,
  "glAccount" | "journalEntryLine" | "accountingPeriod"
>

/**
 * Business account-code order for Trial Balance rows.
 * Uses numeric-aware string compare so "1000" < "1001" < "1100" < "5001"
 * regardless of account type or insertion order.
 */
export function compareTrialBalanceAccountCodes(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
}

async function resolvePeriodId(
  prisma: TrialBalancePrisma,
  periodKey: string,
  legalEntityCode: TrialBalanceFilter["legalEntityCode"]
): Promise<string | null> {
  const period = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ periodKey, legalEntityCode }),
    select: { id: true },
  })
  return period?.id ?? null
}

function buildJournalEntryWhere(
  filter: TrialBalanceFilter,
  scope:
    | { mode: "periodKey"; endExclusive: Date }
    | { mode: "dateRange"; start: Date; endExclusive: Date }
    | null
): Prisma.JournalEntryWhereInput {
  const where: Prisma.JournalEntryWhereInput = {
    legalEntityCode: filter.legalEntityCode,
    ...(filter.branchId ? { branchId: filter.branchId } : {}),
  }

  if (scope?.mode === "periodKey") {
    where.date = { lt: scope.endExclusive }
  } else if (scope?.mode === "dateRange") {
    where.date = {
      gte: scope.start,
      lt: scope.endExclusive,
    }
  }

  return where
}

function sortTrialBalanceRows(rows: TrialBalanceRow[]): TrialBalanceRow[] {
  return [...rows].sort((a, b) =>
    compareTrialBalanceAccountCodes(a.accountCode, b.accountCode)
  )
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
    periodId = await resolvePeriodId(
      prisma,
      filter.periodKey,
      filter.legalEntityCode
    )
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
    orderBy: [{ code: "asc" }],
  })

  const journalScope = filter.periodKey
    ? {
        mode: "periodKey" as const,
        endExclusive: periodKeyToReportDateRange(filter.periodKey).range.endExclusive,
      }
    : filter.from && filter.to
      ? {
          mode: "dateRange" as const,
          ...normalizeDateRange({ from: filter.from, to: filter.to }),
        }
      : null

  const journalEntryWhere = buildJournalEntryWhere(filter, journalScope)

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
