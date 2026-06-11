import type { Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "./decimal"
import {
  CLOSING_ENTRY_LINE_REASONS,
  type BuildClosingEntryLinesInput,
  type BuildClosingEntryLinesResult,
  type ClosingEntryLine,
  type ClosingEntryLineReason,
  type ClosingEntrySourceRow,
} from "./closing-entry-types"
import { isTrialBalanceBalanced } from "./reports/balance-helpers"
import { RETAINED_EARNINGS_ACCOUNT_CODE } from "./reports/retained-earnings"

const DEFAULT_RETAINED_EARNINGS_ACCOUNT_NAME = "Retained Earnings"

function sumSignedAmounts(rows: ClosingEntrySourceRow[]): Prisma.Decimal {
  let total = ZERO
  for (const row of rows) {
    total = addMoney(total, toMoney(row.signedAmount))
  }
  return total
}

function hasNonZeroSignedAmount(rows: ClosingEntrySourceRow[]): boolean {
  return rows.some((row) => !toMoney(row.signedAmount).equals(ZERO))
}

function pushCloseLine(
  lines: ClosingEntryLine[],
  input: {
    accountCode: string
    accountName: string
    signedAmount: Prisma.Decimal
    reason: ClosingEntryLineReason
  }
): void {
  if (input.signedAmount.equals(ZERO)) {
    return
  }

  if (input.signedAmount.gt(ZERO)) {
    lines.push({
      accountCode: input.accountCode,
      accountName: input.accountName,
      debit: input.signedAmount.toString(),
      credit: ZERO.toString(),
      reason: input.reason,
    })
    return
  }

  const amount = toMoney(input.signedAmount.abs())
  lines.push({
    accountCode: input.accountCode,
    accountName: input.accountName,
    debit: ZERO.toString(),
    credit: amount.toString(),
    reason: input.reason,
  })
}

function buildRevenueCloseLines(revenue: ClosingEntrySourceRow[]): ClosingEntryLine[] {
  const lines: ClosingEntryLine[] = []
  for (const row of revenue) {
    pushCloseLine(lines, {
      accountCode: row.accountCode,
      accountName: row.accountName,
      signedAmount: toMoney(row.signedAmount),
      reason: CLOSING_ENTRY_LINE_REASONS.CLOSE_REVENUE,
    })
  }
  return lines
}

function buildExpenseCloseLines(expenses: ClosingEntrySourceRow[]): ClosingEntryLine[] {
  const lines: ClosingEntryLine[] = []
  for (const row of expenses) {
    const signedAmount = toMoney(row.signedAmount)
    if (signedAmount.equals(ZERO)) {
      continue
    }

    if (signedAmount.gt(ZERO)) {
      lines.push({
        accountCode: row.accountCode,
        accountName: row.accountName,
        debit: ZERO.toString(),
        credit: signedAmount.toString(),
        reason: CLOSING_ENTRY_LINE_REASONS.CLOSE_EXPENSE,
      })
      continue
    }

    const amount = toMoney(signedAmount.abs())
    lines.push({
      accountCode: row.accountCode,
      accountName: row.accountName,
      debit: amount.toString(),
      credit: ZERO.toString(),
      reason: CLOSING_ENTRY_LINE_REASONS.CLOSE_EXPENSE,
    })
  }
  return lines
}

function buildRetainedEarningsLine(
  netIncome: Prisma.Decimal,
  retainedEarningsAccountCode: string,
  retainedEarningsAccountName: string
): ClosingEntryLine | null {
  if (netIncome.equals(ZERO)) {
    return null
  }

  if (netIncome.gt(ZERO)) {
    return {
      accountCode: retainedEarningsAccountCode,
      accountName: retainedEarningsAccountName,
      debit: ZERO.toString(),
      credit: netIncome.toString(),
      reason: CLOSING_ENTRY_LINE_REASONS.TRANSFER_NET_INCOME_TO_RE,
    }
  }

  const amount = toMoney(netIncome.abs())
  return {
    accountCode: retainedEarningsAccountCode,
    accountName: retainedEarningsAccountName,
    debit: amount.toString(),
    credit: ZERO.toString(),
    reason: CLOSING_ENTRY_LINE_REASONS.TRANSFER_NET_LOSS_TO_RE,
  }
}

function sumLineDebits(lines: ClosingEntryLine[]): Prisma.Decimal {
  let total = ZERO
  for (const line of lines) {
    total = addMoney(total, toMoney(line.debit))
  }
  return total
}

function sumLineCredits(lines: ClosingEntryLine[]): Prisma.Decimal {
  let total = ZERO
  for (const line of lines) {
    total = addMoney(total, toMoney(line.credit))
  }
  return total
}

/**
 * Pure closing-entry line builder from P&L source rows.
 * No DB access, no posting — simulation only (16H-A).
 */
export function buildClosingEntryLines(
  input: BuildClosingEntryLinesInput
): BuildClosingEntryLinesResult {
  const retainedEarningsAccountCode =
    input.retainedEarningsAccountCode?.trim() || RETAINED_EARNINGS_ACCOUNT_CODE
  const retainedEarningsAccountName =
    input.retainedEarningsAccountName?.trim() || DEFAULT_RETAINED_EARNINGS_ACCOUNT_NAME

  const isRequired =
    hasNonZeroSignedAmount(input.revenue) || hasNonZeroSignedAmount(input.expenses)

  if (!isRequired) {
    return {
      periodKey: input.periodKey,
      lines: [],
      totalDebit: ZERO.toString(),
      totalCredit: ZERO.toString(),
      netIncome: ZERO.toString(),
      isBalanced: true,
      isRequired: false,
      retainedEarningsAccountCode,
    }
  }

  const totalRevenue = sumSignedAmounts(input.revenue)
  const totalExpense = sumSignedAmounts(input.expenses)
  const netIncome = addMoney(totalRevenue, toMoney(totalExpense).negated())

  const lines: ClosingEntryLine[] = [
    ...buildRevenueCloseLines(input.revenue),
    ...buildExpenseCloseLines(input.expenses),
  ]

  const retainedEarningsLine = buildRetainedEarningsLine(
    netIncome,
    retainedEarningsAccountCode,
    retainedEarningsAccountName
  )
  if (retainedEarningsLine) {
    lines.push(retainedEarningsLine)
  }

  const totalDebit = sumLineDebits(lines)
  const totalCredit = sumLineCredits(lines)

  return {
    periodKey: input.periodKey,
    lines,
    totalDebit: totalDebit.toString(),
    totalCredit: totalCredit.toString(),
    netIncome: netIncome.toString(),
    isBalanced: isTrialBalanceBalanced(totalDebit, totalCredit),
    isRequired: true,
    retainedEarningsAccountCode,
  }
}
