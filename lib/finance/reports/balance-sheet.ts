import type { Prisma } from "@/generated/prisma/client"
import { GlAccountType, type PrismaClient } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "../decimal"
import {
  balanceSheetDifference,
  isBalanceSheetBalanced,
} from "./balance-helpers"
import type {
  BalanceSheetFilter,
  BalanceSheetPeriodMeta,
  BalanceSheetResult,
  BalanceSheetRow,
} from "./balance-sheet-types"
import type { TrialBalanceRow } from "./trial-balance-types"
import { getTrialBalance, type TrialBalancePrisma } from "./trial-balance"
import { accountingPeriodUniqueWhere } from "../period-lookup"

export type BalanceSheetPrisma = TrialBalancePrisma

function toBalanceSheetRow(row: TrialBalanceRow): BalanceSheetRow {
  return {
    accountCode: row.accountCode,
    accountName: row.accountName,
    amount: row.signedBalance,
  }
}

async function resolvePeriodMeta(
  prisma: BalanceSheetPrisma,
  filter: BalanceSheetFilter
): Promise<BalanceSheetPeriodMeta> {
  const base: BalanceSheetPeriodMeta = {
    legalEntityCode: filter.legalEntityCode,
    periodKey: filter.periodKey,
    from: filter.from,
    to: filter.to,
  }

  if (!filter.periodKey) {
    return base
  }

  const period = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({
      periodKey: filter.periodKey,
      legalEntityCode: filter.legalEntityCode,
    }),
    select: { id: true, status: true },
  })

  if (!period) {
    return base
  }

  return {
    ...base,
    periodId: period.id,
    periodStatus: period.status,
  }
}

function accumulateSection(
  rows: TrialBalanceRow[],
  accountType: GlAccountType
): { section: BalanceSheetRow[]; total: Prisma.Decimal } {
  const section: BalanceSheetRow[] = []
  let total = ZERO

  for (const row of rows) {
    if (row.accountType !== accountType) continue
    section.push(toBalanceSheetRow(row))
    total = addMoney(total, toMoney(row.signedBalance))
  }

  return { section, total }
}

/**
 * Read-only balance sheet from posted journal lines in scope.
 * Reuses trial balance aggregation — no separate accounting engine.
 */
export async function getBalanceSheet(
  prisma: BalanceSheetPrisma,
  filter: BalanceSheetFilter
): Promise<BalanceSheetResult> {
  const trialBalance = await getTrialBalance(prisma, filter)
  const period = await resolvePeriodMeta(prisma, filter)

  const { section: assets, total: totalAssets } = accumulateSection(
    trialBalance.rows,
    GlAccountType.ASSET
  )
  const { section: liabilities, total: totalLiabilities } = accumulateSection(
    trialBalance.rows,
    GlAccountType.LIABILITY
  )
  const { section: equity, total: totalEquity } = accumulateSection(
    trialBalance.rows,
    GlAccountType.EQUITY
  )

  const totalLiabilitiesAndEquity = addMoney(totalLiabilities, totalEquity)
  const difference = balanceSheetDifference(totalAssets, totalLiabilitiesAndEquity)

  return {
    filter,
    period,
    assets,
    liabilities,
    equity,
    totalAssets: totalAssets.toString(),
    totalLiabilities: totalLiabilities.toString(),
    totalEquity: totalEquity.toString(),
    totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.toString(),
    balanceDifference: difference.toString(),
    isBalanced: isBalanceSheetBalanced(totalAssets, totalLiabilities, totalEquity),
  }
}
