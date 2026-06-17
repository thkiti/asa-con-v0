import type { Prisma } from "@/generated/prisma/client"
import { GlAccountType, type PrismaClient } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "../decimal"
import { signedBalanceForAccountType } from "./balance-helpers"
import { resolveReportDateRange } from "./report-filter"
import { accountingPeriodUniqueWhere } from "../period-lookup"
import type {
  ProfitLossFilter,
  ProfitLossResult,
  ProfitLossRow,
} from "./profit-loss-types"

export type ProfitLossPrisma = Pick<
  PrismaClient,
  "glAccount" | "journalEntryLine" | "accountingPeriod"
>

async function resolvePeriodExists(
  prisma: ProfitLossPrisma,
  periodKey: string,
  legalEntityCode: ProfitLossFilter["legalEntityCode"]
): Promise<boolean> {
  const period = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ periodKey, legalEntityCode }),
    select: { id: true },
  })
  return period != null
}

function hasPeriodActivity(debit: Prisma.Decimal, credit: Prisma.Decimal): boolean {
  return !debit.equals(ZERO) || !credit.equals(ZERO)
}

function buildProfitLossRow(
  account: { code: string; name: string; accountType: GlAccountType },
  debitTotal: Prisma.Decimal,
  creditTotal: Prisma.Decimal
): ProfitLossRow {
  return {
    accountCode: account.code,
    accountName: account.name,
    amount: signedBalanceForAccountType(
      account.accountType,
      debitTotal,
      creditTotal
    ).toString(),
  }
}

export async function getProfitLoss(
  prisma: ProfitLossPrisma,
  filter: ProfitLossFilter
): Promise<ProfitLossResult> {
  if (filter.periodKey) {
    const periodExists = await resolvePeriodExists(
      prisma,
      filter.periodKey,
      filter.legalEntityCode
    )
    if (!periodExists) {
      return {
        filter,
        revenue: [],
        expenses: [],
        totalRevenue: "0",
        totalExpense: "0",
        netIncome: "0",
      }
    }
  }

  const { range } = resolveReportDateRange(filter)

  const accounts = await prisma.glAccount.findMany({
    where: {
      deleted: false,
      isActive: true,
      accountType: { in: [GlAccountType.REVENUE, GlAccountType.EXPENSE] },
    },
    orderBy: { code: "asc" },
  })

  const accountIds = accounts.map((account) => account.id)
  if (accountIds.length === 0) {
    return {
      filter,
      revenue: [],
      expenses: [],
      totalRevenue: "0",
      totalExpense: "0",
      netIncome: "0",
    }
  }

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      glAccountId: { in: accountIds },
      journalEntry: {
        branchId: filter.branchId,
        date: {
          gte: range.start,
          lt: range.endExclusive,
        },
      },
    },
    select: {
      glAccountId: true,
      debit: true,
      credit: true,
    },
  })

  const debitByAccountId = new Map<string, Prisma.Decimal>()
  const creditByAccountId = new Map<string, Prisma.Decimal>()
  for (const accountId of accountIds) {
    debitByAccountId.set(accountId, ZERO)
    creditByAccountId.set(accountId, ZERO)
  }

  for (const line of lines) {
    debitByAccountId.set(
      line.glAccountId,
      addMoney(debitByAccountId.get(line.glAccountId) ?? ZERO, toMoney(line.debit))
    )
    creditByAccountId.set(
      line.glAccountId,
      addMoney(creditByAccountId.get(line.glAccountId) ?? ZERO, toMoney(line.credit))
    )
  }

  const revenue: ProfitLossRow[] = []
  const expenses: ProfitLossRow[] = []
  let totalRevenue = ZERO
  let totalExpense = ZERO

  for (const account of accounts) {
    const debitTotal = debitByAccountId.get(account.id) ?? ZERO
    const creditTotal = creditByAccountId.get(account.id) ?? ZERO
    if (!hasPeriodActivity(debitTotal, creditTotal)) {
      continue
    }

    const row = buildProfitLossRow(account, debitTotal, creditTotal)
    if (account.accountType === GlAccountType.REVENUE) {
      revenue.push(row)
      totalRevenue = addMoney(totalRevenue, toMoney(row.amount))
    } else {
      expenses.push(row)
      totalExpense = addMoney(totalExpense, toMoney(row.amount))
    }
  }

  const netIncome = addMoney(totalRevenue, toMoney(totalExpense).negated())

  return {
    filter,
    revenue,
    expenses,
    totalRevenue: totalRevenue.toString(),
    totalExpense: totalExpense.toString(),
    netIncome: netIncome.toString(),
  }
}
