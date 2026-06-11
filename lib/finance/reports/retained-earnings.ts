import type { Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "../decimal"
import { getBalanceSheet, type BalanceSheetPrisma } from "./balance-sheet"
import type { BalanceSheetRow } from "./balance-sheet-types"
import { getProfitLoss } from "./profit-loss"
import type {
  RetainedEarningsFilter,
  RetainedEarningsResult,
  RetainedEarningsWarning,
} from "./retained-earnings-types"

export type RetainedEarningsPrisma = BalanceSheetPrisma &
  Pick<PrismaClient, "glAccount" | "journalEntryLine" | "accountingPeriod">

/** Legacy retained earnings account — confirmed by migration discovery and opening package. */
export const RETAINED_EARNINGS_ACCOUNT_CODE = "301"

// TODO(finance-core): configurable retained earnings account mapping (multi-code / per-branch).

export function isRetainedEarningsAccountCode(accountCode: string): boolean {
  return accountCode.trim() === RETAINED_EARNINGS_ACCOUNT_CODE
}

export function classifyEquityAccounts(rows: BalanceSheetRow[]): {
  retainedEarnings: BalanceSheetRow[]
  otherEquity: BalanceSheetRow[]
} {
  const retainedEarnings: BalanceSheetRow[] = []
  const otherEquity: BalanceSheetRow[] = []

  for (const row of rows) {
    if (isRetainedEarningsAccountCode(row.accountCode)) {
      retainedEarnings.push(row)
    } else {
      otherEquity.push(row)
    }
  }

  return { retainedEarnings, otherEquity }
}

function sumRowAmounts(rows: BalanceSheetRow[]): Prisma.Decimal {
  let total = ZERO
  for (const row of rows) {
    total = addMoney(total, toMoney(row.amount))
  }
  return total
}

function buildWarnings(input: {
  retainedEarnings: BalanceSheetRow[]
  otherEquity: BalanceSheetRow[]
  postedRetainedEarnings: Prisma.Decimal
  currentNetIncome: Prisma.Decimal
  unclosedEarningsGap: Prisma.Decimal
}): RetainedEarningsWarning[] {
  const warnings: RetainedEarningsWarning[] = []

  if (input.retainedEarnings.length === 0 && input.otherEquity.length > 0) {
    warnings.push({
      code: "NO_RETAINED_EARNINGS_ACCOUNT",
      message: `No account ${RETAINED_EARNINGS_ACCOUNT_CODE} (retained earnings) in scope; other equity accounts are present.`,
    })
  }

  if (input.otherEquity.length > 0) {
    warnings.push({
      code: "OTHER_EQUITY_PRESENT",
      message: "Non–retained-earnings equity accounts exist; use the equity bridge for total economic equity.",
    })
  }

  if (!input.unclosedEarningsGap.equals(ZERO)) {
    warnings.push({
      code: "UNEXPLAINED_BALANCE_SHEET_GAP",
      message: "Balance sheet gap does not match current net income — check trial balance integrity.",
    })
  }

  if (input.postedRetainedEarnings.lt(ZERO)) {
    warnings.push({
      code: "NEGATIVE_RETAINED_EARNINGS",
      message: "Posted retained earnings (account 301) is negative in scope.",
    })
  }

  if (input.currentNetIncome.lt(ZERO)) {
    warnings.push({
      code: "LOSS_PERIOD",
      message: "Current period net income is a loss.",
    })
  }

  return warnings
}

/**
 * Read-only retained earnings analysis from posted journal scope.
 * Composes balance sheet and profit & loss — no closing entry or journal creation.
 */
export async function getRetainedEarnings(
  prisma: RetainedEarningsPrisma,
  filter: RetainedEarningsFilter
): Promise<RetainedEarningsResult> {
  const [balanceSheet, profitLoss] = await Promise.all([
    getBalanceSheet(prisma, { ...filter, hideZeroBalances: false }),
    getProfitLoss(prisma, filter),
  ])

  const { retainedEarnings, otherEquity } = classifyEquityAccounts(balanceSheet.equity)
  const postedRetainedEarnings = sumRowAmounts(retainedEarnings)
  const otherEquityTotal = sumRowAmounts(otherEquity)
  const postedTotalEquity = toMoney(balanceSheet.totalEquity)
  const currentNetIncome = toMoney(profitLoss.netIncome)
  const adjustedRetainedEarnings = addMoney(postedRetainedEarnings, currentNetIncome)
  const adjustedTotalEquity = addMoney(postedTotalEquity, currentNetIncome)

  const totalAssets = toMoney(balanceSheet.totalAssets)
  const totalLiabilities = toMoney(balanceSheet.totalLiabilities)
  const balanceSheetDifference = toMoney(balanceSheet.balanceDifference)
  const unclosedEarningsGap = addMoney(
    balanceSheetDifference,
    currentNetIncome.negated()
  )

  const liabilitiesPlusAdjustedEquity = addMoney(totalLiabilities, adjustedTotalEquity)
  const isEconomicallyBalanced = totalAssets.equals(liabilitiesPlusAdjustedEquity)
  const isUnclosedEarningsExplained = unclosedEarningsGap.equals(ZERO)

  const warnings = buildWarnings({
    retainedEarnings,
    otherEquity,
    postedRetainedEarnings,
    currentNetIncome,
    unclosedEarningsGap,
  })

  return {
    filter,
    period: balanceSheet.period,
    retainedEarningsAccounts: retainedEarnings,
    otherEquityAccounts: otherEquity,
    postedRetainedEarnings: postedRetainedEarnings.toString(),
    otherEquityTotal: otherEquityTotal.toString(),
    postedTotalEquity: postedTotalEquity.toString(),
    currentNetIncome: currentNetIncome.toString(),
    adjustedRetainedEarnings: adjustedRetainedEarnings.toString(),
    adjustedTotalEquity: adjustedTotalEquity.toString(),
    totalAssets: totalAssets.toString(),
    totalLiabilities: totalLiabilities.toString(),
    balanceSheetDifference: balanceSheetDifference.toString(),
    unclosedEarningsGap: unclosedEarningsGap.toString(),
    isUnclosedEarningsExplained,
    isEconomicallyBalanced,
    warnings,
  }
}
